import { verifyToken } from "@/lib/auth"
import { questionQueries, optionQueries } from "@/lib/database"
import db from "@/lib/database"

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const subjectId = searchParams.get("subjectId")

    let query = `
      SELECT q.*, s.name as subject_name, u.full_name as created_by_name
      FROM questions q
      JOIN subjects s ON q.subject_id = s.id
      JOIN users u ON q.created_by = u.id
      WHERE q.is_active = true
    `
    const params = []

    if (subjectId && subjectId !== "all") {
      query += ` AND q.subject_id = ?`
      params.push(subjectId)
    }

    query += ` ORDER BY q.created_at DESC`

    const questions = db.prepare(query).all(...params)

    // Get options for each question
    for (const question of questions) {
      question.options = optionQueries.getByQuestion.all(question.id)
    }

    return Response.json(questions)
  } catch (error) {
    console.error("Get questions error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success || tokenResult.user.role === "student") {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { subject_id, question_text, question_type, difficulty, points, explanation, options } = await request.json()

    // Create question
    const result = questionQueries.create.run(
      subject_id,
      question_text,
      question_type,
      difficulty,
      points,
      explanation || null,
      tokenResult.user.userId,
    )

    const questionId = result.lastInsertRowid

    // Create options for multiple choice questions
    if (question_type === "multiple_choice" && options) {
      for (let i = 0; i < options.length; i++) {
        const option = options[i]
        if (option.text.trim()) {
          optionQueries.create.run(questionId, option.text, option.is_correct, i)
        }
      }
    } else if (question_type === "true_false") {
      // Create True/False options
      optionQueries.create.run(questionId, "True", options[0]?.is_correct || false, 0)
      optionQueries.create.run(questionId, "False", !options[0]?.is_correct || true, 1)
    }

    return Response.json({ success: true, questionId })
  } catch (error) {
    console.error("Create question error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
