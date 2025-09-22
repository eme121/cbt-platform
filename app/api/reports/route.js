import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { getDatabase } from "@/lib/database"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "30"
    const subjectId = searchParams.get("subject") || "all"

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
    const dateFilter = `NOW() - INTERVAL ${parseInt(period)} DAY`
    const subjectFilter = subjectId !== "all" ? `AND s.id = ${parseInt(subjectId)}` : ""

    // Overview statistics
    const [[overviewUsers]] = await db.execute("SELECT COUNT(*) as count FROM users")
    const [[overviewNewUsers]] = await db.execute(
      `SELECT COUNT(*) as count FROM users WHERE created_at >= ${dateFilter}`,
    )
    const [[overviewQuizzes]] = await db.execute(
      `SELECT COUNT(*) as count FROM quiz_attempts WHERE start_time >= ${dateFilter}`,
    )
    const [[overviewBattles]] = await db.execute(
      `SELECT COUNT(*) as count FROM battles WHERE created_at >= ${dateFilter}`,
    )
    const [[overviewQuestions]] = await db.execute("SELECT COUNT(*) as count FROM questions")
    const [[overviewActiveBattles]] = await db.execute(
      "SELECT COUNT(*) as count FROM battles WHERE status = 'in_progress'",
    )
    const [[avgScoreResult]] = await db.execute(
      `SELECT AVG(score) as avgScore FROM quiz_attempts WHERE start_time >= ${dateFilter}`,
    )

    const overview = {
      totalUsers: overviewUsers.count,
      newUsers: overviewNewUsers.count,
      totalQuizzes: overviewQuizzes.count,
      totalBattles: overviewBattles.count,
      totalQuestions: overviewQuestions.count,
      activeBattles: overviewActiveBattles.count,
      avgScore: Math.round(avgScoreResult.avgScore || 0),
    }

    // Quiz performance trends
    const [quizzes] = await db.execute(
      `
      SELECT 
        DATE(qa.start_time) as date,
        AVG(qa.score) as avgScore,
        COUNT(*) as attempts,
        q.title,
        s.name as subject
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN subjects s ON q.subject_id = s.id
      WHERE qa.start_time >= ${dateFilter} ${subjectFilter}
      GROUP BY DATE(qa.start_time), q.id
      ORDER BY date DESC
    `,
    )

    // Battle statistics (Top Champions)
    const [battles] = await db.execute(
      `
      SELECT 
        u.username,
        COUNT(b.id) as wins
      FROM users u
      JOIN battles b ON u.id = b.winner_id
      WHERE b.ended_at >= ${dateFilter}
      GROUP BY u.id, u.username
      ORDER BY wins DESC
      LIMIT 5
    `,
    )

    // User activity report
    const [users] = await db.execute(
      `
      SELECT 
        u.username,
        u.email,
        u.role,
        COUNT(qa.id) as quizzesTaken,
        ROUND(AVG(qa.score), 1) as avgScore
      FROM users u
      LEFT JOIN quiz_attempts qa ON u.id = qa.user_id AND qa.start_time >= ${dateFilter}
      GROUP BY u.id
      ORDER BY quizzesTaken DESC
      LIMIT 10
    `,
    )

    // Subject performance
    const [subjects] = await db.execute(
      `
      SELECT 
        s.id,
        s.name,
        COUNT(q.id) as questionCount,
        ROUND(AVG(qa.score), 1) as avgScore
      FROM subjects s
      LEFT JOIN questions q ON s.id = q.subject_id
      LEFT JOIN quizzes qz ON s.id = qz.subject_id
      LEFT JOIN quiz_attempts qa ON qz.id = qa.quiz_id AND qa.start_time >= ${dateFilter}
      GROUP BY s.id
      ORDER BY s.name
    `,
    )

    return NextResponse.json({
      overview,
      quizzes,
      battles,
      users,
      subjects,
    })
  } catch (error) {
    console.error("Reports error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}