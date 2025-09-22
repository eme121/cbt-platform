import { verifyToken } from "@/lib/auth"
import { subjectQueries } from "@/lib/database"

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const subjects = await subjectQueries.getAll()
    return Response.json(subjects)
  } catch (error) {
    console.error("Get subjects error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
