import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { getDatabase } from "@/lib/database"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
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

    // Overview statistics
    const overview = {
      totalUsers: db.prepare("SELECT COUNT(*) as count FROM users").get().count,
      newUsers: db.prepare(`SELECT COUNT(*) as count FROM users WHERE created_at >= ${dateFilter}`).get().count,
      totalQuizzes: db.prepare(`SELECT COUNT(*) as count FROM quiz_attempts WHERE created_at >= ${dateFilter}`).get()
        .count,
      totalBattles: db.prepare(`SELECT COUNT(*) as count FROM battles WHERE created_at >= ${dateFilter}`).get().count,
      totalQuestions: db.prepare("SELECT COUNT(*) as count FROM questions").get().count,
      activeBattles: db.prepare("SELECT COUNT(*) as count FROM battles WHERE status = 'active'").get().count,
    }

    // Calculate average score
    const avgScoreResult = db
      .prepare(`
      SELECT AVG(score) as avgScore 
      FROM quiz_attempts 
      WHERE created_at >= ${dateFilter}
    `)
      .get()
    overview.avgScore = Math.round(avgScoreResult.avgScore || 0)

    // Quiz performance trends
    const quizzes = db.prepare(`
      SELECT 
        DATE(qa.created_at) as date,
        AVG(qa.score) as avgScore,
        COUNT(*) as attempts,
        q.title,
        s.name as subject
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      JOIN subjects s ON q.subject_id = s.id
      WHERE qa.created_at >= ${dateFilter}
      ${subject !== "all" ? "AND s.id = ?" : ""}
      GROUP BY DATE(qa.created_at), q.id
      ORDER BY qa.created_at DESC
    `)

    const quizzesData = subject !== "all" ? quizzes.all(Number.parseInt(subject)) : quizzes.all()

    // Battle statistics
    const battles = db
      .prepare(`
      SELECT 
        DATE(b.created_at) as date,
        COUNT(*) as battles,
        u.username,
        COUNT(CASE WHEN b.winner_id = u.id THEN 1 END) as wins,
        ROUND(COUNT(CASE WHEN b.winner_id = u.id THEN 1 END) * 100.0 / COUNT(*), 1) as winRate
      FROM battles b
      LEFT JOIN users u ON b.winner_id = u.id
      WHERE b.created_at >= ${dateFilter}
      GROUP BY DATE(b.created_at), u.id
      ORDER BY b.created_at DESC
    `)
      .all()

    // User activity
    const users = db
      .prepare(`
      SELECT 
        u.username,
        u.email,
        u.role,
        COUNT(qa.id) as quizzesTaken,
        ROUND(AVG(qa.score), 1) as avgScore,
        DATE(u.created_at) as date,
        COUNT(DISTINCT DATE(qa.created_at)) as activeUsers
      FROM users u
      LEFT JOIN quiz_attempts qa ON u.id = qa.user_id AND qa.created_at >= ${dateFilter}
      WHERE u.created_at >= ${dateFilter}
      GROUP BY u.id
      ORDER BY quizzesTaken DESC
    `)
      .all()

    // Subject performance
    const subjects = db
      .prepare(`
      SELECT 
        s.id,
        s.name,
        COUNT(q.id) as questionCount,
        ROUND(AVG(qa.score), 1) as avgScore
      FROM subjects s
      LEFT JOIN questions q ON s.id = q.subject_id
      LEFT JOIN quizzes qz ON s.id = qz.subject_id
      LEFT JOIN quiz_attempts qa ON qz.id = qa.quiz_id AND qa.created_at >= ${dateFilter}
      GROUP BY s.id
      ORDER BY s.name
    `)
      .all()

    // Activity distribution
    const activityStats = db
      .prepare(`
      SELECT 
        CASE 
          WHEN quiz_count >= 10 THEN 'high'
          WHEN quiz_count >= 3 THEN 'medium'
          ELSE 'low'
        END as activity_level,
        COUNT(*) as user_count
      FROM (
        SELECT 
          u.id,
          COUNT(qa.id) as quiz_count
        FROM users u
        LEFT JOIN quiz_attempts qa ON u.id = qa.user_id AND qa.created_at >= ${dateFilter}
        GROUP BY u.id
      ) user_activity
      GROUP BY activity_level
    `)
      .all()

    overview.highActivity = activityStats.find((a) => a.activity_level === "high")?.user_count || 0
    overview.mediumActivity = activityStats.find((a) => a.activity_level === "medium")?.user_count || 0
    overview.lowActivity = activityStats.find((a) => a.activity_level === "low")?.user_count || 0

    return NextResponse.json({
      overview,
      quizzes: quizzesData,
      battles,
      users,
      subjects,
    })
  } catch (error) {
    console.error("Reports error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
