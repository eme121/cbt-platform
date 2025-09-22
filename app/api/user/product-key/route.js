import { verifyToken } from "@/lib/auth"
import { getDatabase } from "@/lib/database"

export async function GET(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    const verification = verifyToken(token)

    if (!verification.success) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const db = await getDatabase()

    // Get user's product key info
    const [productKeys] = await db.execute(
      `
      SELECT pk.*, u.account_type, u.activation_date,
             CASE WHEN lk.license_key IS NOT NULL THEN lk.license_key ELSE NULL END as license_key,
             CASE WHEN lk.status IS NOT NULL THEN lk.status ELSE NULL END as license_status
      FROM product_keys pk
      JOIN users u ON pk.user_id = u.id
      LEFT JOIN license_keys lk ON pk.product_key = lk.product_key
      WHERE pk.user_id = ?
    `,
      [verification.user.userId],
    )

    if (productKeys.length === 0) {
      return Response.json({ success: false, message: "No Product Key found" }, { status: 404 })
    }

    const productKeyInfo = productKeys[0]

    return Response.json({
      success: true,
      productKey: {
        key: productKeyInfo.product_key,
        activationStatus: productKeyInfo.activation_status,
        quizzesTaken: productKeyInfo.quizzes_taken,
        quizLimit: productKeyInfo.quiz_limit,
        accountType: productKeyInfo.account_type,
        activationDate: productKeyInfo.activation_date,
        licenseKey: productKeyInfo.license_key,
        licenseStatus: productKeyInfo.license_status,
      },
    })
  } catch (error) {
    console.error("Product key fetch error:", error)
    return Response.json({ success: false, message: "Failed to fetch product key" }, { status: 500 })
  }
}
