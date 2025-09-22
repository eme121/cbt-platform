"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, BookOpen } from "lucide-react"

export default function CreateQuizPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState([])
  const [questions, setQuestions] = useState([])
  const [selectedQuestions, setSelectedQuestions] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [message, setMessage] = useState("")

  const [quizForm, setQuizForm] = useState({
    title: "",
    description: "",
    subject_id: "",
    time_limit: 30,
    passing_score: 70,
    quiz_type: "practice",
  })

  useEffect(() => {
    checkAuth()
  }, [])

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
        await loadData()
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

  const loadData = async () => {
    try {
      const token = localStorage.getItem("cbt_token")
      const headers = { Authorization: `Bearer ${token}` }

      const [subjectsRes, questionsRes] = await Promise.all([
        fetch("/api/subjects", { headers }),
        fetch("/api/questions", { headers }),
      ])

      if (subjectsRes.ok) setSubjects(await subjectsRes.json())
      if (questionsRes.ok) setQuestions(await questionsRes.json())
    } catch (error) {
      console.error("Failed to load data:", error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!quizForm.title || !quizForm.subject_id || selectedQuestions.length === 0) {
      setMessage("Please fill in all required fields and select at least one question")
      return
    }

    try {
      const token = localStorage.getItem("cbt_token")
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...quizForm,
          total_questions: selectedQuestions.length,
          question_ids: selectedQuestions,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setMessage("Quiz created successfully!")
        // Reset form
        setQuizForm({
          title: "",
          description: "",
          subject_id: "",
          time_limit: 30,
          passing_score: 70,
          quiz_type: "practice",
        })
        setSelectedQuestions([])
      } else {
        setMessage(data.message || "Failed to create quiz")
      }
    } catch (error) {
      setMessage("Network error occurred")
    }
  }

  const toggleQuestion = (questionId) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId],
    )
  }

  const filteredQuestions = questions.filter((question) => {
    const matchesSubject = !selectedSubject || question.subject_id.toString() === selectedSubject
    const matchesSearch = question.question_text.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSubject && matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Create Quiz</h1>
            <p className="text-gray-600">Build a new quiz for students</p>
          </div>
          <Button onClick={() => (window.location.href = "/quiz")} variant="outline">
            Back to Quizzes
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Quiz Details Form */}
          <Card>
            <CardHeader>
              <CardTitle>Quiz Details</CardTitle>
              <CardDescription>Configure your quiz settings</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Quiz Title *</Label>
                  <Input
                    id="title"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                    placeholder="Enter quiz title"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={quizForm.description}
                    onChange={(e) => setQuizForm({ ...quizForm, description: e.target.value })}
                    placeholder="Enter quiz description"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Select
                    value={quizForm.subject_id}
                    onValueChange={(value) => setQuizForm({ ...quizForm, subject_id: value })}
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                    <Input
                      id="timeLimit"
                      type="number"
                      min="1"
                      max="180"
                      value={quizForm.time_limit}
                      onChange={(e) => setQuizForm({ ...quizForm, time_limit: Number.parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="passingScore">Passing Score (%)</Label>
                    <Input
                      id="passingScore"
                      type="number"
                      min="0"
                      max="100"
                      value={quizForm.passing_score}
                      onChange={(e) => setQuizForm({ ...quizForm, passing_score: Number.parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quizType">Quiz Type</Label>
                  <Select
                    value={quizForm.quiz_type}
                    onValueChange={(value) => setQuizForm({ ...quizForm, quiz_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="practice">Practice</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <Label>Selected Questions</Label>
                    <Badge variant="secondary">{selectedQuestions.length} selected</Badge>
                  </div>
                  <p className="text-sm text-gray-600">Select questions from the panel on the right</p>
                </div>

                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Quiz
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Question Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Questions</CardTitle>
              <CardDescription>Choose questions for your quiz</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="space-y-4 mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by subject" />
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

              {/* Questions List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredQuestions.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">No questions found</p>
                  </div>
                ) : (
                  filteredQuestions.map((question) => (
                    <div
                      key={question.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedQuestions.includes(question.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => toggleQuestion(question.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={selectedQuestions.includes(question.id)}
                          onChange={() => toggleQuestion(question.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2 mb-1">{question.question_text}</p>
                          <div className="flex gap-2">
                            <Badge variant="outline" className="text-xs">
                              {question.subject_name}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                question.difficulty === "easy"
                                  ? "bg-green-100 text-green-800"
                                  : question.difficulty === "medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                              }`}
                            >
                              {question.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {question.points} pts
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {message && (
          <Alert className="mt-6">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
