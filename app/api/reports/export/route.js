import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { getDatabase } from "@/lib/database"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const period = searchParams.get("period") || "30"
    const subject = searchParams.get("subject") || "all"

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    if (decoded.role !== "admin" && decoded.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const db = getDatabase()
    const dateFilter = `datetime('now', '-${period} days')`
    let csvData = ""

    if (type === "quiz") {
      const data = db.prepare(`
        SELECT 
          q.title as "Quiz Title",
          s.name as "Subject",
          u.username as "Student",
          qa.score as "Score",
          qa.time_taken as "Time Taken (seconds)",
          datetime(qa.created_at) as "Date Taken"
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        JOIN subjects s ON q.subject_id = s.id
        JOIN users u ON qa.user_id = u.id
        WHERE qa.created_at >= ${dateFilter}
        ${subject !== "all" ? "AND s.id = ?" : ""}
        ORDER BY qa.created_at DESC
      `)

      const results = subject !== "all" ? data.all(Number.parseInt(subject)) : data.all()

      if (results.length > 0) {
        const headers = Object.keys(results[0]).join(",")
        const rows = results.map((row) => Object.values(row).join(",")).join("\n")
        csvData = `${headers}\n${rows}`
      }
    } else if (type === "users") {
      const data = db
        .prepare(`
        SELECT 
          u.username as "Username",
          u.email as "Email",
          u.role as "Role",
          COUNT(qa.id) as "Quizzes Taken",
          ROUND(AVG(qa.score), 1) as "Average Score",
          COUNT(b.id) as "Battles Participated",
          datetime(u.created_at) as "Registration Date"
        FROM users u
        LEFT JOIN quiz_attempts qa ON u.id = qa.user_id AND qa.created_at >= ${dateFilter}
        LEFT JOIN battles b ON (u.id = b.player1_id OR u.id = b.player2_id) AND b.created_at >= ${dateFilter}
        GROUP BY u.id
        ORDER BY u.username
      `)
        .all()

      if (data.length > 0) {
        const headers = Object.keys(data[0]).join(",")
        const rows = data.map((row) => Object.values(row).join(",")).join("\n")
        csvData = `${headers}\n${rows}`
      }
    }

    return new NextResponse(csvData, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${type}-report-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
