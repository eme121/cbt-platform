import { verifyToken } from "@/lib/auth"
import { getDatabase } from "@/lib/database"

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json({ success: false, message: "No token provided" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success) {
      return Response.json({ success: false, message: "Invalid token" }, { status: 401 })
    }

    const db = await getDatabase()
    const [users] = await db.execute("SELECT * FROM users WHERE id = ? AND is_active = true", [tokenResult.user.userId])

    if (users.length === 0) {
      return Response.json({ success: false, message: "User not found" }, { status: 404 })
    }

    const user = users[0]

    return Response.json({
      success: true,
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    })
  } catch (error) {
    console.error("Profile API error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
