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
    const { question_id, selected_option_id, response_time } = await request.json()

    // Check if option is correct
    const option = db
      .prepare(`
      SELECT is_correct FROM question_options WHERE id = ?
    `)
      .get(selected_option_id)

    const isCorrect = option?.is_correct || false

    // Record battle response
    db.prepare(`
      INSERT INTO battle_responses (battle_id, user_id, question_id, selected_option_id, is_correct, response_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(battleId, tokenResult.user.userId, question_id, selected_option_id, isCorrect, response_time)

    return Response.json({ success: true, isCorrect })
  } catch (error) {
    console.error("Submit battle answer error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
