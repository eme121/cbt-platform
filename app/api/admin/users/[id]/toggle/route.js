import { verifyToken } from "@/lib/auth"
import db from "@/lib/database"

export async function PATCH(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success || tokenResult.user.role !== "admin") {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { isActive } = await request.json()
    const userId = params.id

    const stmt = db.prepare("UPDATE users SET is_active = ? WHERE id = ?")
    stmt.run(isActive, userId)

    return Response.json({ success: true })
  } catch (error) {
    console.error("Toggle user status error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
