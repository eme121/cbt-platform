import { verifyToken, generateLicenseKey } from "@/lib/auth"
import db from "@/lib/database"

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success || tokenResult.user.role !== "admin") {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const licenses = db
      .prepare(
        `
      SELECT l.*, u.username
      FROM license_keys l
      LEFT JOIN product_keys pk ON l.product_key = pk.product_key
      LEFT JOIN users u ON pk.user_id = u.id
      ORDER BY l.created_at DESC
    `,
      )
      .all()

    return Response.json(licenses)
  } catch (error) {
    console.error("Get licenses error:", error)
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

    const { productKey } = await request.json()
    if (!productKey) {
      return Response.json({ success: false, message: "Product Key is required" }, { status: 400 })
    }

    const adminId = tokenResult.user.userId
    const newLicenseKey = generateLicenseKey()
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1) // 1 year expiry

    await licenseQueries.create(newLicenseKey, productKey, adminId, expiresAt.toISOString())

    return Response.json({ success: true, licenseKey: newLicenseKey })
  } catch (error) {
    console.error("Create license error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
