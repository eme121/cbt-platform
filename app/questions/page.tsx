"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, BookOpen, Search } from "lucide-react"

export default function QuestionBankPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [questions, setQuestions] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [message, setMessage] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState(null)

  // Form state for new/edit question
  const [questionForm, setQuestionForm] = useState({
    subject_id: "",
    question_text: "",
    question_type: "multiple_choice",
    difficulty: "medium",
    points: 1,
    explanation: "",
    options: [
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ],
  })

  useEffect(() => {
    checkAuth()
    loadSubjects()
  }, [])

  useEffect(() => {
    if (user) {
      fetchQuestions()
    }
  }, [user, selectedSubject])

  const checkAuth = async () => {
    const token = localStorage.getItem("cbt_token")
    if (!token) {
      window.location.href = "/"
      return
    }

    try {
      const response = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const userData = await response.json()
        if (userData.role === "student") {
          window.location.href = "/"
          return
        }
        setUser(userData)
      } else {
        localStorage.removeItem("cbt_token")
        window.location.href = "/"
      }
    } catch (error) {
      console.error("Auth check failed:", error)
      window.location.href = "/"
    } finally {
      setLoading(false)
    }
  }

  const loadSubjects = async () => {
    try {
      const token = localStorage.getItem("cbt_token")
      const headers = { Authorization: `Bearer ${token}` }
      const subjectsRes = await fetch("/api/subjects", { headers })
      if (subjectsRes.ok) setSubjects(await subjectsRes.json())
    } catch (error) {
      console.error("Failed to load subjects:", error)
    }
  }

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem("cbt_token")
      const headers = { Authorization: `Bearer ${token}` }
      const questionsRes = await fetch(`/api/questions?subjectId=${selectedSubject}`, { headers })
      if (questionsRes.ok) setQuestions(await questionsRes.json())
    } catch (error) {
      console.error("Failed to load questions:", error)
    }
  }

  const resetForm = () => {
    setQuestionForm({
      subject_id: "",
      question_text: "",
      question_type: "multiple_choice",
      difficulty: "medium",
      points: 1,
      explanation: "",
      options: [
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ],
    })
    setEditingQuestion(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate form
    if (!questionForm.subject_id || !questionForm.question_text.trim()) {
      setMessage("Please fill in all required fields")
      return
    }

    if (questionForm.question_type === "multiple_choice") {
      const hasCorrectAnswer = questionForm.options.some((opt) => opt.is_correct && opt.text.trim())
      const hasOptions = questionForm.options.filter((opt) => opt.text.trim()).length >= 2

      if (!hasCorrectAnswer) {
        setMessage("Please mark at least one correct answer")
        return
      }
      if (!hasOptions) {
        setMessage("Please provide at least 2 answer options")
        return
      }
    }

    try {
      const token = localStorage.getItem("cbt_token")
      const url = editingQuestion ? `/api/questions/${editingQuestion.id}` : "/api/questions"
      const method = editingQuestion ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(questionForm),
      })

      const data = await response.json()
      if (data.success) {
        setMessage(editingQuestion ? "Question updated successfully" : "Question created successfully")
        setIsDialogOpen(false)
        resetForm()
        fetchQuestions()
      } else {
        setMessage(data.message || "Failed to save question")
      }
    } catch (error) {
      setMessage("Network error occurred")
    }
  }

  const handleEdit = (question) => {
    setEditingQuestion(question)
    setQuestionForm({
      subject_id: question.subject_id.toString(),
      question_text: question.question_text,
      question_type: question.question_type,
      difficulty: question.difficulty,
      points: question.points,
      explanation: question.explanation || "",
      options: question.options || [
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
        { text: "", is_correct: false },
      ],
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (questionId) => {
    if (!confirm("Are you sure you want to delete this question?")) return

    try {
      const token = localStorage.getItem("cbt_token")
      const response = await fetch(`/api/questions/${questionId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setMessage("Question deleted successfully")
        fetchQuestions()
      } else {
        setMessage(data.message || "Failed to delete question")
      }
    } catch (error) {
      setMessage("Network error occurred")
    }
  }

  const updateOption = (index, field, value) => {
    const newOptions = [...questionForm.options]
    newOptions[index] = { ...newOptions[index], [field]: value }
    setQuestionForm({ ...questionForm, options: newOptions })
  }

  const filteredQuestions = questions.filter((question) => {
    const matchesSearch =
      question.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (question.subject_name && question.subject_name.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading question bank...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Question Bank</h1>
            <p className="text-gray-600">Create and manage questions for quizzes and exams</p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              Back to Home
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingQuestion ? "Edit Question" : "Create New Question"}</DialogTitle>
                  <DialogDescription>
                    {editingQuestion ? "Update the question details" : "Add a new question to the question bank"}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Select
                        value={questionForm.subject_id}
                        onValueChange={(value) => setQuestionForm({ ...questionForm, subject_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id.toString()}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="questionType">Question Type</Label>
                      <Select
                        value={questionForm.question_type}
                        onValueChange={(value) => setQuestionForm({ ...questionForm, question_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                          <SelectItem value="true_false">True/False</SelectItem>
                          <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select
                        value={questionForm.difficulty}
                        onValueChange={(value) => setQuestionForm({ ...questionForm, difficulty: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="points">Points</Label>
                      <Input
                        id="points"
                        type="number"
                        min="1"
                        max="10"
                        value={questionForm.points}
                        onChange={(e) => setQuestionForm({ ...questionForm, points: Number.parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="questionText">Question Text *</Label>
                    <Textarea
                      id="questionText"
                      rows={3}
                      value={questionForm.question_text}
                      onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                      placeholder="Enter your question here..."
                      required
                    />
                  </div>

                  {questionForm.question_type === "multiple_choice" && (
                    <div className="space-y-4">
                      <Label>Answer Options *</Label>
                      {questionForm.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          <Checkbox
                            checked={option.is_correct}
                            onCheckedChange={(checked) => updateOption(index, "is_correct", checked)}
                          />
                          <Input
                            placeholder={`Option ${index + 1}`}
                            value={option.text}
                            onChange={(e) => updateOption(index, "text", e.target.value)}
                            className="flex-1"
                          />
                          <span className="text-sm text-gray-500">{option.is_correct ? "Correct" : "Incorrect"}</span>
                        </div>
                      ))}
                      <p className="text-sm text-gray-600">
                        Check the box next to correct answers. You can have multiple correct answers.
                      </p>
                    </div>
                  )}

                  {questionForm.question_type === "true_false" && (
                    <div className="space-y-2">
                      <Label>Correct Answer</Label>
                      <Select
                        value={questionForm.options[0]?.is_correct ? "true" : "false"}
                        onValueChange={(value) => {
                          const newOptions = [
                            { text: "True", is_correct: value === "true" },
                            { text: "False", is_correct: value === "false" },
                          ]
                          setQuestionForm({ ...questionForm, options: newOptions })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">True</SelectItem>
                          <SelectItem value="false">False</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="explanation">Explanation (Optional)</Label>
                    <Textarea
                      id="explanation"
                      rows={2}
                      value={questionForm.explanation}
                      onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                      placeholder="Provide an explanation for the correct answer..."
                    />
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">{editingQuestion ? "Update Question" : "Create Question"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id.toString()}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Questions ({filteredQuestions.length})
            </CardTitle>
            <CardDescription>Manage your question bank for quizzes and exams</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || selectedSubject !== "all"
                    ? "Try adjusting your search or filter criteria"
                    : "Get started by creating your first question"}
                </p>
                {!searchTerm && selectedSubject === "all" && (
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Question
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuestions.map((question) => (
                    <TableRow key={question.id}>
                      <TableCell className="max-w-md">
                        <div className="space-y-1">
                          <p className="font-medium line-clamp-2">{question.question_text}</p>
                          {question.explanation && (
                            <p className="text-sm text-gray-600 line-clamp-1">Explanation: {question.explanation}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{question.subject_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{question.question_type.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            question.difficulty === "easy"
                              ? "default"
                              : question.difficulty === "medium"
                                ? "secondary"
                                : "destructive"
                          }
                          className={
                            question.difficulty === "easy"
                              ? "bg-green-100 text-green-800"
                              : question.difficulty === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }
                        >
                          {question.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>{question.points}</TableCell>
                      <TableCell>{new Date(question.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(question)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(question.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {message && (
          <Alert className="mt-4">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}