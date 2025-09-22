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

    const battleId = params.id

    // Get battle details
    const battle = db
      .prepare(`
      SELECT b.*, s.name as subject_name, u2.full_name as player2_name
      FROM battles b
      JOIN subjects s ON b.subject_id = s.id
      LEFT JOIN users u2 ON b.player2_id = u2.id
      WHERE b.id = ? AND (b.player1_id = ? OR b.player2_id = ?)
    `)
      .get(battleId, tokenResult.user.userId, tokenResult.user.userId)

    if (!battle) {
      return Response.json({ success: false, message: "Battle not found or access denied" }, { status: 404 })
    }

    // Get random questions from the subject
    const questions = db
      .prepare(`
      SELECT q.*, qo.id as option_id, qo.option_text, qo.is_correct, qo.option_order
      FROM questions q
      LEFT JOIN question_options qo ON q.id = qo.question_id
      WHERE q.subject_id = ? AND q.is_active = true
      ORDER BY RANDOM()
      LIMIT ?
    `)
      .all(battle.subject_id, battle.total_questions)

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

    const battleQuestions = Object.values(questionsMap)

    const battleData = {
      ...battle,
      questions: battleQuestions,
    }

    return Response.json({ success: true, battle: battleData })
  } catch (error) {
    console.error("Start battle error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
