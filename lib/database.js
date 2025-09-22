import mysql from "mysql2/promise"
import { readFileSync } from "fs"
import { join } from "path"
import bcrypt from "bcryptjs"

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "cbt_platform",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}

// Create MySQL connection pool
const pool = mysql.createPool(dbConfig)

// Initialize database with schema
export async function initializeDatabase() {
  try {
    const connection = await pool.getConnection()
    const schemaSQL = readFileSync(join(process.cwd(), "scripts", "01-create-tables.sql"), "utf8")

    // Split SQL statements and execute them one by one
    const statements = schemaSQL.split(";").filter((stmt) => stmt.trim())
    for (const statement of statements) {
      if (statement.trim()) {
        await connection.execute(statement)
      }
    }

    connection.release()
    console.log("Database initialized successfully")

    // Create default admin user if not exists
    await createDefaultAdmin()
  } catch (error) {
    console.error("Database initialization failed:", error)
  }
}

async function createDefaultAdmin() {
  try {
    const [rows] = await pool.execute("SELECT id FROM users WHERE role = ? LIMIT 1", ["admin"])

    if (rows.length === 0) {
      const hashedPassword = bcrypt.hashSync("admin123", 10)
      await pool.execute(
        `
        INSERT INTO users (username, email, password_hash, role, full_name)
        VALUES (?, ?, ?, ?, ?)
      `,
        ["admin", "admin@cbtplatform.com", hashedPassword, "admin", "System Administrator"],
      )

      console.log("Default admin user created: admin / admin123")
    }
  } catch (error) {
    console.error("Error creating default admin:", error)
  }
}

export const userQueries = {
  async findByUsername(username) {
    const [rows] = await pool.execute("SELECT * FROM users WHERE username = ? AND is_active = true", [username])
    return rows[0]
  },
  async findByEmail(email) {
    const [rows] = await pool.execute("SELECT * FROM users WHERE email = ? AND is_active = true", [email])
    return rows[0]
  },
  async findById(id) {
    const [rows] = await pool.execute("SELECT * FROM users WHERE id = ? AND is_active = true", [id])
    return rows[0]
  },
  async getAll() {
    const [rows] = await pool.execute("SELECT * FROM users ORDER BY created_at DESC")
    return rows
  },
  async create(username, email, passwordHash, role, fullName) {
    const [result] = await pool.execute(
      `
      INSERT INTO users (username, email, password_hash, role, full_name)
      VALUES (?, ?, ?, ?, ?)
    `,
      [username, email, passwordHash, role, fullName],
    )
    return result
  },
  async updateLastActivity(id) {
    await pool.execute("UPDATE users SET updated_at = NOW() WHERE id = ?", [id])
  },
}

export const licenseQueries = {
  async findByKey(key) {
    const [rows] = await pool.execute("SELECT * FROM license_keys WHERE license_key = ?", [key])
    return rows[0]
  },
  async create(licenseKey, productKey, generatedBy, expiresAt) {
    const [result] = await pool.execute(
      `
      INSERT INTO license_keys (license_key, product_key, generated_by, expiry_date)
      VALUES (?, ?, ?, ?)
    `,
      [licenseKey, productKey, generatedBy, expiresAt],
    )
    return result
  },
}

export const subjectQueries = {
  async getAll() {
    const [rows] = await pool.execute("SELECT * FROM subjects ORDER BY name")
    return rows
  },
  async getById(id) {
    const [rows] = await pool.execute("SELECT * FROM subjects WHERE id = ?", [id])
    return rows[0]
  },
  async create(name, description, createdBy) {
    const [result] = await pool.execute(
      `
      INSERT INTO subjects (name, description, created_by)
      VALUES (?, ?, ?)
    `,
      [name, description, createdBy],
    )
    return result
  },
  async update(name, description, id) {
    const [result] = await pool.execute(
      `
      UPDATE subjects SET name = ?, description = ? WHERE id = ?
    `,
      [name, description, id],
    )
    return result
  },
  async delete(id) {
    const [result] = await pool.execute("DELETE FROM subjects WHERE id = ?", [id])
    return result
  },
}

export const questionQueries = {
  async getBySubject(subjectId) {
    const [rows] = await pool.execute(
      `
      SELECT q.*, s.name as subject_name, u.full_name as created_by_name
      FROM questions q
      JOIN subjects s ON q.subject_id = s.id
      JOIN users u ON q.created_by = u.id
      WHERE q.subject_id = ? AND q.is_active = true
      ORDER BY q.created_at DESC
    `,
      [subjectId],
    )
    return rows
  },
  async getById(id) {
    const [rows] = await pool.execute("SELECT * FROM questions WHERE id = ? AND is_active = true", [id])
    return rows[0]
  },
  async create(subjectId, questionText, questionType, difficulty, points, explanation, createdBy) {
    const [result] = await pool.execute(
      `
      INSERT INTO questions (subject_id, question_text, question_type, difficulty, points, explanation, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [subjectId, questionText, questionType, difficulty, points, explanation, createdBy],
    )
    return result
  },
  async update(questionText, questionType, difficulty, points, explanation, id) {
    const [result] = await pool.execute(
      `
      UPDATE questions 
      SET question_text = ?, question_type = ?, difficulty = ?, points = ?, explanation = ?, updated_at = NOW()
      WHERE id = ?
    `,
      [questionText, questionType, difficulty, points, explanation, id],
    )
    return result
  },
  async delete(id) {
    const [result] = await pool.execute("UPDATE questions SET is_active = false WHERE id = ?", [id])
    return result
  },
}

export const optionQueries = {
  async getByQuestion(questionId) {
    const [rows] = await pool.execute("SELECT * FROM question_options WHERE question_id = ? ORDER BY option_order", [
      questionId,
    ])
    return rows
  },
  async create(questionId, optionText, isCorrect, optionOrder) {
    const [result] = await pool.execute(
      `
      INSERT INTO question_options (question_id, option_text, is_correct, option_order)
      VALUES (?, ?, ?, ?)
    `,
      [questionId, optionText, isCorrect, optionOrder],
    )
    return result
  },
  async deleteByQuestion(questionId) {
    const [result] = await pool.execute("DELETE FROM question_options WHERE question_id = ?", [questionId])
    return result
  },
}

export function getDatabase() {
  return pool
}

export default pool
