import { verifyToken, generateLicenseKey } from "@/lib/auth"
import { getDatabase } from "@/lib/database"

export async function GET(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    const verification = verifyToken(token)

    if (!verification.success || verification.user.role !== "admin") {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const db = await getDatabase()

    // Get all license keys with product key info
    const [licenseKeys] = await db.execute(`
      SELECT lk.*, pk.user_id, u.username, u.full_name, u.email
      FROM license_keys lk
      JOIN product_keys pk ON lk.product_key = pk.product_key
      JOIN users u ON pk.user_id = u.id
      ORDER BY lk.created_at DESC
    `)

    return Response.json({ success: true, licenseKeys })
  } catch (error) {
    console.error("License keys fetch error:", error)
    return Response.json({ success: false, message: "Failed to fetch license keys" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    const verification = verifyToken(token)

    if (!verification.success || verification.user.role !== "admin") {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { productKey, expiryDays } = await request.json()

    if (!productKey) {
      return Response.json({ success: false, message: "Product Key is required" }, { status: 400 })
    }

    const db = await getDatabase()

    // Verify product key exists and is not already activated
    const [productKeys] = await db.execute("SELECT * FROM product_keys WHERE product_key = ?", [productKey])

    if (productKeys.length === 0) {
      return Response.json({ success: false, message: "Product Key not found" }, { status: 404 })
    }

    // Check if license already exists for this product key
    const [existingLicense] = await db.execute("SELECT * FROM license_keys WHERE product_key = ?", [productKey])

    if (existingLicense.length > 0) {
      return Response.json({ success: false, message: "License already exists for this Product Key" }, { status: 400 })
    }

    // Generate license key
    const licenseKey = generateLicenseKey()

    // Calculate expiry date
    const expiryDate = expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000) : null

    // Create license key
    await db.execute(
      "INSERT INTO license_keys (license_key, product_key, generated_by, expiry_date) VALUES (?, ?, ?, ?)",
      [licenseKey, productKey, verification.user.userId, expiryDate],
    )

    return Response.json({
      success: true,
      message: "License Key generated successfully",
      licenseKey: licenseKey,
    })
  } catch (error) {
    console.error("License key generation error:", error)
    return Response.json({ success: false, message: "Failed to generate license key" }, { status: 500 })
  }
}
