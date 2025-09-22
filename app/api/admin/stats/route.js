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

    // Get various statistics
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users").get().count
    const activeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_active = true").get().count
    const totalLicenses = db.prepare("SELECT COUNT(*) as count FROM licenses").get().count
    const usedLicenses = db.prepare("SELECT COUNT(*) as count FROM licenses WHERE is_used = true").get().count
    const totalSubjects = db.prepare("SELECT COUNT(*) as count FROM subjects").get().count
    const totalQuestions = db.prepare("SELECT COUNT(*) as count FROM questions WHERE is_active = true").get().count
    const totalAttempts = db.prepare("SELECT COUNT(*) as count FROM quiz_attempts").get().count
    const totalBattles = db.prepare("SELECT COUNT(*) as count FROM battles WHERE status = 'completed'").get().count
    const totalWins = db.prepare("SELECT SUM(battles_won) as count FROM user_stats").get().count
    const winRate = totalBattles > 0 ? (totalWins / totalBattles) * 100 : 0


    // Weekly stats
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const newUsersThisWeek = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE created_at > ?")
      .get(weekAgo.toISOString()).count

    // Daily stats
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const activeUsersToday = db
      .prepare("SELECT COUNT(*) as count FROM users WHERE updated_at > ?")
      .get(today.toISOString()).count

    const stats = {
      totalUsers,
      activeUsers,
      totalLicenses,
      usedLicenses,
      totalSubjects,
      totalQuestions,
      totalAttempts,
      totalBattles,
      totalWins,
      winRate: winRate.toFixed(2),
      newUsersThisWeek,
      activeUsersToday,
      dbSize: "N/A",
      avgResponseTime: "N/A",
    }

    return Response.json(stats)
  } catch (error) {
    console.error("Get stats error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
