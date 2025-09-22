import { verifyToken } from "@/lib/auth"
import { subjectQueries, getDatabase } from "@/lib/database"

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success || tokenResult.user.role !== "admin") {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const db = getDatabase()
    const [subjects] = await db.execute(`
      SELECT s.*, COUNT(q.id) as question_count
      FROM subjects s
      LEFT JOIN questions q ON s.id = q.subject_id AND q.is_active = true
      GROUP BY s.id
      ORDER BY s.name
    `)

    return Response.json(subjects)
  } catch (error) {
    console.error("Get subjects error:", error)
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

    const { name, description } = await request.json()
    const result = await subjectQueries.create(name, description, tokenResult.user.userId)

    return Response.json({ success: true, subjectId: result.insertId })
  } catch (error) {
    console.error("Create subject error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
