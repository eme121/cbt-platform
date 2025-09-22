import { verifyToken } from "@/lib/auth"
import { getDatabase } from "@/lib/database"

export async function POST(request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    const verification = verifyToken(token)

    if (!verification.success) {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { licenseKey } = await request.json()

    if (!licenseKey) {
      return Response.json({ success: false, message: "License Key is required" }, { status: 400 })
    }

    const db = await getDatabase()

    // Get user's product key
    const [userProductKeys] = await db.execute("SELECT product_key FROM product_keys WHERE user_id = ?", [
      verification.user.userId,
    ])

    if (userProductKeys.length === 0) {
      return Response.json({ success: false, message: "No Product Key found for user" }, { status: 404 })
    }

    const userProductKey = userProductKeys[0].product_key

    // Verify license key matches user's product key
    const [licenseKeys] = await db.execute(
      "SELECT * FROM license_keys WHERE license_key = ? AND product_key = ? AND status = 'active'",
      [licenseKey, userProductKey],
    )

    if (licenseKeys.length === 0) {
      return Response.json({ success: false, message: "Invalid License Key or already used" }, { status: 400 })
    }

    const license = licenseKeys[0]

    // Check if license is expired
    if (license.expiry_date && new Date() > new Date(license.expiry_date)) {
      return Response.json({ success: false, message: "License Key has expired" }, { status: 400 })
    }

    // Check activation limit
    if (license.current_activations >= license.max_activations) {
      return Response.json({ success: false, message: "License Key activation limit reached" }, { status: 400 })
    }

    // Activate the account
    await db.execute("BEGIN")

    try {
      // Update user account type
      await db.execute("UPDATE users SET account_type = 'premium', activation_date = NOW() WHERE id = ?", [
        verification.user.userId,
      ])

      // Update product key status
      await db.execute(
        "UPDATE product_keys SET activation_status = 'activated', activated_at = NOW() WHERE user_id = ?",
        [verification.user.userId],
      )

      // Update license key
      await db.execute(
        "UPDATE license_keys SET status = 'used', current_activations = current_activations + 1, activated_at = NOW() WHERE license_key = ?",
        [licenseKey],
      )

      await db.execute("COMMIT")

      return Response.json({
        success: true,
        message: "Account activated successfully! You now have unlimited access.",
      })
    } catch (error) {
      await db.execute("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Account activation error:", error)
    return Response.json({ success: false, message: "Failed to activate account" }, { status: 500 })
  }
}
