import { authenticateUser } from "@/lib/auth"
import { initializeDatabase } from "@/lib/database"

// Initialize database on first request
initializeDatabase()

export async function POST(request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return Response.json({ success: false, message: "Username and password are required" }, { status: 400 })
    }

    const result = await authenticateUser(username, password)

    if (result.success) {
      return Response.json(result)
    } else {
      return Response.json(result, { status: 401 })
    }
  } catch (error) {
    console.error("Login API error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
