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

    // Get battle info
    const battle = db
      .prepare(`
      SELECT * FROM battles WHERE id = ?
    `)
      .get(battleId)

    if (!battle) {
      return Response.json({ success: false, message: "Battle not found" }, { status: 404 })
    }

    // Calculate scores for both players
    const player1Stats = db
      .prepare(`
      SELECT 
        COUNT(*) as total_answers,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
        AVG(response_time) as avg_response_time
      FROM battle_responses 
      WHERE battle_id = ? AND user_id = ?
    `)
      .get(battleId, battle.player1_id)

    const player2Stats = db
      .prepare(`
      SELECT 
        COUNT(*) as total_answers,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
        AVG(response_time) as avg_response_time
      FROM battle_responses 
      WHERE battle_id = ? AND user_id = ?
    `)
      .get(battleId, battle.player2_id)

    // Determine winner (more correct answers wins, faster time breaks ties)
    let winnerId = null
    if (player1Stats.correct_answers > player2Stats.correct_answers) {
      winnerId = battle.player1_id
    } else if (player2Stats.correct_answers > player1Stats.correct_answers) {
      winnerId = battle.player2_id
    } else if (player1Stats.avg_response_time < player2Stats.avg_response_time) {
      winnerId = battle.player1_id
    } else {
      winnerId = battle.player2_id
    }

    // Update battle status
    db.prepare(`
      UPDATE battles 
      SET status = 'completed', ended_at = CURRENT_TIMESTAMP, winner_id = ?
      WHERE id = ?
    `).run(winnerId, battleId)

    // Get player details for result
    const player1 = db.prepare("SELECT * FROM users WHERE id = ?").get(battle.player1_id)
    const player2 = db.prepare("SELECT * FROM users WHERE id = ?").get(battle.player2_id)

    // Update user stats
    if (winnerId === battle.player1_id) {
      db.prepare(`
        UPDATE user_stats 
        SET total_battles_played = total_battles_played + 1, battles_won = battles_won + 1
        WHERE user_id = ?
      `).run(battle.player1_id)

      db.prepare(`
        UPDATE user_stats 
        SET total_battles_played = total_battles_played + 1
        WHERE user_id = ?
      `).run(battle.player2_id)
    } else {
      db.prepare(`
        UPDATE user_stats 
        SET total_battles_played = total_battles_played + 1
        WHERE user_id = ?
      `).run(battle.player1_id)

      db.prepare(`
        UPDATE user_stats 
        SET total_battles_played = total_battles_played + 1, battles_won = battles_won + 1
        WHERE user_id = ?
      `).run(battle.player2_id)
    }

    const result = {
      winner_id: winnerId,
      player1: player1,
      player2: player2,
      player1_score: player1Stats.correct_answers,
      player1_correct: player1Stats.correct_answers,
      player1_avg_time: Math.round(player1Stats.avg_response_time || 0),
      player2_score: player2Stats.correct_answers,
      player2_correct: player2Stats.correct_answers,
      player2_avg_time: Math.round(player2Stats.avg_response_time || 0),
    }

    return Response.json({ success: true, result })
  } catch (error) {
    console.error("Finish battle error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
