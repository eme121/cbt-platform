import { verifyToken } from "@/lib/auth"
import db from "@/lib/database"

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success || tokenResult.user.role !== "admin") {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const licenses = db
      .prepare(`
      SELECT l.*, u.username 
      FROM licenses l 
      LEFT JOIN users u ON l.user_id = u.id 
      ORDER BY l.created_at DESC
    `)
      .all()

    return Response.json(licenses)
  } catch (error) {
    console.error("Get licenses error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
