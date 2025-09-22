import { verifyToken } from "@/lib/auth"
import db from "@/lib/database"

export async function POST(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const quizId = params.id

    // Get quiz details
    const quiz = db
      .prepare(`
      SELECT q.*, s.name as subject_name
      FROM quizzes q
      JOIN subjects s ON q.subject_id = s.id
      WHERE q.id = ? AND q.is_active = true
    `)
      .get(quizId)

    if (!quiz) {
      return Response.json({ success: false, message: "Quiz not found" }, { status: 404 })
    }

    // Get quiz questions with options
    const questions = db
      .prepare(`
      SELECT q.*, qo.id as option_id, qo.option_text, qo.is_correct, qo.option_order
      FROM quiz_questions qq
      JOIN questions q ON qq.question_id = q.id
      LEFT JOIN question_options qo ON q.id = qo.question_id
      WHERE qq.quiz_id = ? AND q.is_active = true
      ORDER BY qq.question_order, qo.option_order
    `)
      .all(quizId)

    // Group options by question
    const questionsMap = {}
    questions.forEach((row) => {
      if (!questionsMap[row.id]) {
        questionsMap[row.id] = {
          id: row.id,
          question_text: row.question_text,
          question_type: row.question_type,
          difficulty: row.difficulty,
          points: row.points,
          explanation: row.explanation,
          options: [],
        }
      }

      if (row.option_id) {
        questionsMap[row.id].options.push({
          id: row.option_id,
          option_text: row.option_text,
          is_correct: row.is_correct,
          option_order: row.option_order,
        })
      }
    })

    const quizQuestions = Object.values(questionsMap)

    // Create quiz attempt
    const attemptResult = db
      .prepare(`
      INSERT INTO quiz_attempts (quiz_id, user_id, total_questions, status)
      VALUES (?, ?, ?, 'in_progress')
    `)
      .run(quizId, tokenResult.user.userId, quizQuestions.length)

    const quizData = {
      ...quiz,
      questions: quizQuestions,
      attemptId: attemptResult.lastInsertRowid,
    }

    return Response.json({ success: true, quiz: quizData })
  } catch (error) {
    console.error("Start quiz error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
