import { NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { subjectQueries } from "@/lib/database"

// PUT handler for updating a subject
export async function PUT(request, { params }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    const tokenResult = verifyToken(token)

    if (!tokenResult.success || tokenResult.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const { name, description } = await request.json()

    if (!name) {
      return NextResponse.json({ success: false, message: "Subject name is required" }, { status: 400 })
    }

    await subjectQueries.update(name, description, id)

    return NextResponse.json({ success: true, message: "Subject updated successfully" })
  } catch (error) {
    console.error(`Error updating subject ${params.id}:`, error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}

// DELETE handler for deleting a subject
export async function DELETE(request, { params }) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    const tokenResult = verifyToken(token)

    if (!tokenResult.success || tokenResult.user.role !== "admin") {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
    }

    const { id } = params

    await subjectQueries.delete(id)

    return NextResponse.json({ success: true, message: "Subject deleted successfully" })
  } catch (error) {
    console.error(`Error deleting subject ${params.id}:`, error)
    // Check for foreign key constraint error
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot delete subject because it is being used by questions, quizzes, or battles.",
        },
        { status: 409 }, // 409 Conflict
      )
    }
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
