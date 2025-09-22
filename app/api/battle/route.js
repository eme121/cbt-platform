import { verifyToken } from "@/lib/auth"
import { getDatabase } from "@/lib/database"

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const db = getDatabase()
    const [battles] = await db.execute(`
      SELECT 
        b.*,
        s.name as subject_name,
        u1.full_name as created_by_name,
        u1.full_name as player1_name,
        u2.full_name as player2_name
      FROM battles b
      JOIN subjects s ON b.subject_id = s.id
      JOIN users u1 ON b.created_by = u1.id
      LEFT JOIN users u2 ON b.player2_id = u2.id
      WHERE b.status IN ('waiting', 'in_progress')
      ORDER BY b.created_at DESC
    `)

    return Response.json(battles)
  } catch (error) {
    console.error("Get battles error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { title, subject_id, total_questions, time_per_question } = await request.json()

    const db = getDatabase()
    const [result] = await db.execute(
      `
      INSERT INTO battles (title, subject_id, created_by, player1_id, total_questions, time_per_question, status)
      VALUES (?, ?, ?, ?, ?, ?, 'waiting')
    `,
      [title, subject_id, tokenResult.user.userId, tokenResult.user.userId, total_questions, time_per_question],
    )

    return Response.json({ success: true, battleId: result.insertId })
  } catch (error) {
    console.error("Create battle error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
