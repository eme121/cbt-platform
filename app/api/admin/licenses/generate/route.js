import { verifyToken, generateLicenseKey } from "@/lib/auth"
import { licenseQueries } from "@/lib/database"

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success || tokenResult.user.role !== "admin") {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { count } = await request.json()
    const licenseCount = Math.min(Math.max(1, count), 100) // Limit between 1-100
    const generatedKeys = []

    for (let i = 0; i < licenseCount; i++) {
      const licenseKey = generateLicenseKey()
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1 year expiry

      await licenseQueries.create(licenseKey, licenseKey, tokenResult.user.userId, expiresAt.toISOString())
      generatedKeys.push(licenseKey)
    }

    return Response.json({ success: true, keys: generatedKeys })
  } catch (error) {
    console.error("Generate licenses error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
