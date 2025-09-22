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

    // Check if battle exists and is waiting
    const battle = db
      .prepare(`
      SELECT * FROM battles 
      WHERE id = ? AND status = 'waiting' AND player2_id IS NULL
    `)
      .get(battleId)

    if (!battle) {
      return Response.json({ success: false, message: "Battle not available" }, { status: 404 })
    }

    if (battle.player1_id === tokenResult.user.userId) {
      return Response.json({ success: false, message: "Cannot join your own battle" }, { status: 400 })
    }

    // Join battle
    db.prepare(`
      UPDATE battles 
      SET player2_id = ?, status = 'in_progress', started_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(tokenResult.user.userId, battleId)

    return Response.json({ success: true })
  } catch (error) {
    console.error("Join battle error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
