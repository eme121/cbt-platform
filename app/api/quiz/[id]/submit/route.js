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
    const { answers, timeSpent } = await request.json()

    // Get the current attempt
    const attempt = db
      .prepare(`
      SELECT * FROM quiz_attempts 
      WHERE quiz_id = ? AND user_id = ? AND status = 'in_progress'
      ORDER BY start_time DESC LIMIT 1
    `)
      .get(quizId, tokenResult.user.userId)

    if (!attempt) {
      return Response.json({ success: false, message: "No active quiz attempt found" }, { status: 404 })
    }

    // Get quiz questions with correct answers
    const questions = db
      .prepare(`
      SELECT q.*, qo.id as option_id, qo.is_correct
      FROM quiz_questions qq
      JOIN questions q ON qq.question_id = q.id
      LEFT JOIN question_options qo ON q.id = qo.question_id
      WHERE qq.quiz_id = ? AND q.is_active = true
      ORDER BY qq.question_order
    `)
      .all(quizId)

    // Group by question and calculate score
    const questionsMap = {}
    questions.forEach((row) => {
      if (!questionsMap[row.id]) {
        questionsMap[row.id] = {
          id: row.id,
          points: row.points,
          options: [],
        }
      }

      if (row.option_id) {
        questionsMap[row.id].options.push({
          id: row.option_id,
          is_correct: row.is_correct,
        })
      }
    })

    let totalScore = 0
    let correctAnswers = 0
    let totalPossibleScore = 0

    // Process each answer
    for (const [questionId, userAnswer] of Object.entries(answers)) {
      const question = questionsMap[questionId]
      if (!question) continue

      totalPossibleScore += question.points

      const correctOptions = question.options.filter((opt) => opt.is_correct).map((opt) => opt.id)
      let isCorrect = false

      if (Array.isArray(userAnswer)) {
        // Multiple selection
        isCorrect = correctOptions.length === userAnswer.length && correctOptions.every((id) => userAnswer.includes(id))
      } else {
        // Single selection
        isCorrect = correctOptions.includes(userAnswer)
      }

      if (isCorrect) {
        totalScore += question.points
        correctAnswers++
      }

      // Record individual response
      const selectedOptionId = Array.isArray(userAnswer) ? userAnswer[0] : userAnswer
      db.prepare(`
        INSERT INTO quiz_responses (attempt_id, question_id, selected_option_id, is_correct)
        VALUES (?, ?, ?, ?)
      `).run(attempt.id, questionId, selectedOptionId, isCorrect)
    }

    const percentage = totalPossibleScore > 0 ? Math.round((totalScore / totalPossibleScore) * 100) : 0

    // Update quiz attempt
    db.prepare(`
      UPDATE quiz_attempts 
      SET end_time = CURRENT_TIMESTAMP, score = ?, correct_answers = ?, status = 'completed', time_taken = ?
      WHERE id = ?
    `).run(totalScore, correctAnswers, timeSpent, attempt.id)

    // Update user stats
    db.prepare(`
      INSERT OR REPLACE INTO user_stats (user_id, total_quizzes_taken, average_score, total_time_spent, last_activity)
      VALUES (
        ?, 
        COALESCE((SELECT total_quizzes_taken FROM user_stats WHERE user_id = ?), 0) + 1,
        COALESCE((SELECT average_score FROM user_stats WHERE user_id = ?), 0),
        COALESCE((SELECT total_time_spent FROM user_stats WHERE user_id = ?), 0) + ?,
        CURRENT_TIMESTAMP
      )
    `).run(
      tokenResult.user.userId,
      tokenResult.user.userId,
      tokenResult.user.userId,
      tokenResult.user.userId,
      timeSpent,
    )

    const result = {
      score: totalScore,
      total_possible: totalPossibleScore,
      correct_answers: correctAnswers,
      total_questions: Object.keys(questionsMap).length,
      percentage,
      time_taken: timeSpent,
      passed: percentage >= 70, // Default passing score
    }

    return Response.json({ success: true, result })
  } catch (error) {
    console.error("Submit quiz error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
