import { verifyToken } from "@/lib/auth"
import { questionQueries, optionQueries } from "@/lib/database"

export async function PUT(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success || tokenResult.user.role === "student") {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const questionId = params.id
    const { subject_id, question_text, question_type, difficulty, points, explanation, options } = await request.json()

    // Update question
    questionQueries.update.run(question_text, question_type, difficulty, points, explanation || null, questionId)

    // Delete existing options and create new ones
    optionQueries.deleteByQuestion.run(questionId)

    if (question_type === "multiple_choice" && options) {
      for (let i = 0; i < options.length; i++) {
        const option = options[i]
        if (option.text.trim()) {
          optionQueries.create.run(questionId, option.text, option.is_correct, i)
        }
      }
    } else if (question_type === "true_false") {
      optionQueries.create.run(questionId, "True", options[0]?.is_correct || false, 0)
      optionQueries.create.run(questionId, "False", !options[0]?.is_correct || true, 1)
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("Update question error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const authHeader = request.headers.get("authorization")
    const token = authHeader?.substring(7)
    const tokenResult = verifyToken(token)

    if (!tokenResult.success || tokenResult.user.role === "student") {
      return Response.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const questionId = params.id
    questionQueries.delete.run(questionId)

    return Response.json({ success: true })
  } catch (error) {
    console.error("Delete question error:", error)
    return Response.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
