import { verifyToken } from "@/lib/auth"
import db from "@/lib/database"

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const quizzes = db
      .prepare(`
      SELECT q.*, s.name as subject_name
      FROM quizzes q
      JOIN subjects s ON q.subject_id = s.id
      WHERE q.is_active = true
      ORDER BY q.created_at DESC
    `)
      .all()

    return Response.json(quizzes)
  } catch (error) {
    console.error("Get quizzes error:", error)
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

    const { title, description, subject_id, time_limit, total_questions, passing_score, quiz_type, question_ids } =
      await request.json()

    // Create quiz
    const result = db
      .prepare(`
      INSERT INTO quizzes (title, description, subject_id, created_by, time_limit, total_questions, passing_score, quiz_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .run(
        title,
        description,
        subject_id,
        tokenResult.user.userId,
        time_limit,
        total_questions,
        passing_score,
        quiz_type,
      )

    const quizId = result.lastInsertRowid

    // Add questions to quiz
    if (question_ids && question_ids.length > 0) {
      const stmt = db.prepare("INSERT INTO quiz_questions (quiz_id, question_id, question_order) VALUES (?, ?, ?)")
      question_ids.forEach((questionId, index) => {
        stmt.run(quizId, questionId, index)
      })
    }

    return Response.json({ success: true, quizId })
  } catch (error) {
    console.error("Create quiz error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
