import { registerUser } from "@/lib/auth"

export async function POST(request) {
  try {
    const { username, email, password, fullName } = await request.json()

    if (!username || !email || !password || !fullName) {
      return Response.json({ success: false, message: "All fields are required" }, { status: 400 })
    }

    const result = await registerUser({ username, email, password, fullName })

    if (result.success) {
      return Response.json(result)
    } else {
      return Response.json(result, { status: 400 })
    }
  } catch (error) {
    console.error("Registration API error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
