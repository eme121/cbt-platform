import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { getDatabase } from "./database.js"
import crypto from "crypto"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production"

// Generate unique Product Key
function generateProductKey() {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomBytes(8).toString("hex").toUpperCase()
  return `PK-${timestamp}-${random}`.substring(0, 20)
}

// Generate License Key
export function generateLicenseKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let result = ""
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) result += "-"
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Authentication functions
export async function authenticateUser(username, password) {
  try {
    const db = await getDatabase()

    // Find user by username with product key info
    const [users] = await db.execute(
      `
      SELECT u.*, pk.product_key, pk.activation_status, pk.quizzes_taken, pk.quiz_limit 
      FROM users u 
      LEFT JOIN product_keys pk ON u.id = pk.user_id 
      WHERE u.username = ? AND u.is_active = true
    `,
      [username],
    )

    if (users.length === 0) {
      return { success: false, message: "Invalid username or password" }
    }

    const user = users[0]
    const isValidPassword = await bcrypt.compare(password, user.password_hash)

    if (!isValidPassword) {
      return { success: false, message: "Invalid username or password" }
    }

    // Update last activity in user_stats
    await db.execute(
      "INSERT INTO user_stats (user_id, last_activity) VALUES (?, NOW()) ON DUPLICATE KEY UPDATE last_activity = NOW()",
      [user.id],
    )

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        accountType: user.account_type,
        productKey: user.product_key,
        activationStatus: user.activation_status,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    )

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        accountType: user.account_type,
        productKey: user.product_key,
        activationStatus: user.activation_status,
        quizzesTaken: user.quizzes_taken || 0,
        quizLimit: user.quiz_limit || 5,
      },
      token,
    }
  } catch (error) {
    console.error("Authentication error:", error)
    return { success: false, message: "Authentication failed" }
  }
}

export async function registerUser(userData) {
  try {
    const db = await getDatabase()

    // Check if username/email already exists
    const [existingUsers] = await db.execute("SELECT id FROM users WHERE username = ? OR email = ?", [
      userData.username,
      userData.email,
    ])

    if (existingUsers.length > 0) {
      return { success: false, message: "Username or email already exists" }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10)

    // Generate unique Product Key
    const productKey = generateProductKey()

    // Create user with trial account
    const [result] = await db.execute(
      "INSERT INTO users (username, email, password_hash, role, full_name, product_key, account_type) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        userData.username,
        userData.email,
        hashedPassword,
        userData.role || "student",
        userData.fullName,
        productKey,
        "trial",
      ],
    )

    // Create Product Key record
    await db.execute(
      "INSERT INTO product_keys (user_id, product_key, quiz_limit, activation_status) VALUES (?, ?, ?, ?)",
      [result.insertId, productKey, 5, "trial"],
    )

    return {
      success: true,
      message: "User registered successfully! You can now log in with limited access.",
      userId: result.insertId,
      productKey: productKey,
    }
  } catch (error) {
    console.error("Registration error:", error)
    return { success: false, message: "Registration failed" }
  }
}

// Verify JWT token
export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return { success: true, user: decoded }
  } catch (error) {
    return { success: false, message: "Invalid token" }
  }
}

export async function checkQuizAccess(userId) {
  try {
    const db = await getDatabase()

    const [productKeys] = await db.execute(
      "SELECT quizzes_taken, quiz_limit, activation_status FROM product_keys WHERE user_id = ?",
      [userId],
    )

    if (productKeys.length === 0) {
      return { hasAccess: false, message: "No product key found" }
    }

    const { quizzes_taken, quiz_limit, activation_status } = productKeys[0]

    if (activation_status === "activated") {
      return { hasAccess: true, unlimited: true }
    }

    if (quizzes_taken >= quiz_limit) {
      return {
        hasAccess: false,
        message: `Quiz limit reached (${quiz_limit}). Please activate your account.`,
        quizzesTaken: quizzes_taken,
        quizLimit: quiz_limit,
      }
    }

    return {
      hasAccess: true,
      unlimited: false,
      quizzesTaken: quizzes_taken,
      quizLimit: quiz_limit,
      remaining: quiz_limit - quizzes_taken,
    }
  } catch (error) {
    console.error("Quiz access check error:", error)
    return { hasAccess: false, message: "Error checking access" }
  }
}

export async function incrementQuizCount(userId) {
  try {
    const db = await getDatabase()

    await db.execute("UPDATE product_keys SET quizzes_taken = quizzes_taken + 1 WHERE user_id = ?", [userId])

    return { success: true }
  } catch (error) {
    console.error("Quiz count increment error:", error)
    return { success: false, message: "Error updating quiz count" }
  }
}
