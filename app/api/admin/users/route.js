import { verifyToken } from "@/lib/auth"
import { userQueries } from "@/lib/database"
import bcrypt from "bcryptjs"

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success || tokenResult.user.role !== "admin") {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const users = await userQueries.getAll()
    return Response.json(users)
  } catch (error) {
    console.error("Get users error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success || tokenResult.user.role !== "admin") {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { username, email, password, fullName, role } = await request.json()

    const existingUserByUsername = await userQueries.findByUsername(username)
    const existingUserByEmail = await userQueries.findByEmail(email)

    if (existingUserByUsername || existingUserByEmail) {
      return Response.json({ success: false, message: "Username or email already exists" }, { status: 400 })
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await userQueries.create(username, email, hashedPassword, role, fullName)

    return Response.json({ success: true, userId: result.insertId })
  } catch (error) {
    console.error("Create user error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
