// Script to generate properly hashed password for admin user
import bcrypt from "bcryptjs"
import { getDatabase } from "../lib/database.js"

async function createAdminUser() {
  try {
    const db = await getDatabase()

    // Hash the password 'admin123'
    const hashedPassword = await bcrypt.hash("admin123", 10)

    // Insert or update admin user
    await db.execute(
      `
      INSERT INTO users (username, email, password_hash, role, full_name, is_active) 
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        password_hash = VALUES(password_hash),
        role = VALUES(role),
        is_active = VALUES(is_active)
    `,
      ["admin", "admin@cbtplatform.com", hashedPassword, "admin", "System Administrator", true],
    )

    console.log("✅ Admin user created successfully!")
    console.log("Username: admin")
    console.log("Password: admin123")

    process.exit(0)
  } catch (error) {
    console.error("❌ Error creating admin user:", error)
    process.exit(1)
  }
}

createAdminUser()
