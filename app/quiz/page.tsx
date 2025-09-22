"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, Play, BookOpen, CheckCircle, XCircle } from "lucide-react"

export default function QuizPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quizzes, setQuizzes] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [currentQuiz, setCurrentQuiz] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [quizStarted, setQuizStarted] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [quizResult, setQuizResult] = useState(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    let timer
    if (quizStarted && timeLeft > 0 && !quizCompleted) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSubmitQuiz()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [quizStarted, timeLeft, quizCompleted])

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

      const [quizzesRes, subjectsRes] = await Promise.all([
        fetch("/api/quiz", { headers }),
        fetch("/api/subjects", { headers }),
      ])

      if (quizzesRes.ok) setQuizzes(await quizzesRes.json())
      if (subjectsRes.ok) setSubjects(await subjectsRes.json())
    } catch (error) {
      console.error("Failed to load data:", error)
    }
  }

  const startQuiz = async (quiz) => {
    try {
      const token = localStorage.getItem("cbt_token")
      const response = await fetch(`/api/quiz/${quiz.id}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setCurrentQuiz(data.quiz)
        setCurrentQuestion(0)
        setAnswers({})
        setTimeLeft(quiz.time_limit * 60) // Convert minutes to seconds
        setQuizStarted(true)
        setQuizCompleted(false)
        setQuizResult(null)
      } else {
        setMessage(data.message || "Failed to start quiz")
      }
    } catch (error) {
      setMessage("Network error occurred")
    }
  }

  const handleAnswer = (questionId, answer) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }))
  }

  const nextQuestion = () => {
    if (currentQuestion < currentQuiz.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
    }
  }

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1)
    }
  }

  const handleSubmitQuiz = async () => {
    try {
      const token = localStorage.getItem("cbt_token")
      const response = await fetch(`/api/quiz/${currentQuiz.id}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answers,
          timeSpent: currentQuiz.time_limit * 60 - timeLeft,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setQuizResult(data.result)
        setQuizCompleted(true)
        setQuizStarted(false)
      } else {
        setMessage(data.message || "Failed to submit quiz")
      }
    } catch (error) {
      setMessage("Network error occurred")
    }
  }

  const resetQuiz = () => {
    setCurrentQuiz(null)
    setCurrentQuestion(0)
    setAnswers({})
    setTimeLeft(0)
    setQuizStarted(false)
    setQuizCompleted(false)
    setQuizResult(null)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const filteredQuizzes = quizzes.filter(
    (quiz) => selectedSubject === "all" || quiz.subject_id.toString() === selectedSubject,
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quizzes...</p>
        </div>
      </div>
    )
  }

  // Quiz Results Dialog
  if (quizCompleted && quizResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {quizResult.percentage >= 70 ? (
                <CheckCircle className="h-16 w-16 text-green-500" />
              ) : (
                <XCircle className="h-16 w-16 text-red-500" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {quizResult.percentage >= 70 ? "Congratulations!" : "Quiz Completed"}
            </CardTitle>
            <CardDescription>You have completed the quiz: {currentQuiz.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">{quizResult.score}</div>
                <div className="text-sm text-gray-600">Score</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">{quizResult.percentage}%</div>
                <div className="text-sm text-gray-600">Percentage</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-3xl font-bold text-purple-600">{quizResult.correct_answers}</div>
                <div className="text-sm text-gray-600">Correct</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-3xl font-bold text-orange-600">{formatTime(quizResult.time_taken)}</div>
                <div className="text-sm text-gray-600">Time Taken</div>
              </div>
            </div>

            <div className="text-center">
              <Badge
                variant={quizResult.percentage >= 70 ? "default" : "destructive"}
                className={quizResult.percentage >= 70 ? "bg-green-100 text-green-800" : ""}
              >
                {quizResult.percentage >= 70 ? "PASSED" : "FAILED"}
              </Badge>
              <p className="text-sm text-gray-600 mt-2">Passing score: {currentQuiz.passing_score}%</p>
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={resetQuiz}>Take Another Quiz</Button>
              <Button variant="outline" onClick={() => (window.location.href = "/")}>
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Quiz Taking Interface
  if (quizStarted && currentQuiz) {
    const question = currentQuiz.questions[currentQuestion]
    const progress = ((currentQuestion + 1) / currentQuiz.questions.length) * 100

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Quiz Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{currentQuiz.title}</h1>
                <p className="text-gray-600">
                  Question {currentQuestion + 1} of {currentQuiz.questions.length}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-red-600">
                  <Clock className="h-5 w-5" />
                  <span className="font-mono text-lg">{formatTime(timeLeft)}</span>
                </div>
                <Button variant="outline" onClick={handleSubmitQuiz}>
                  Submit Quiz
                </Button>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{question.question_text}</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline">{question.difficulty}</Badge>
                    <Badge variant="secondary">
                      {question.points} point{question.points !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <div key={option.id} className="flex items-center space-x-3">
                    <input
                      type={question.question_type === "multiple_choice" ? "radio" : "checkbox"}
                      id={`option-${option.id}`}
                      name={`question-${question.id}`}
                      value={option.id}
                      checked={
                        question.question_type === "multiple_choice"
                          ? answers[question.id] === option.id
                          : answers[question.id]?.includes(option.id)
                      }
                      onChange={(e) => {
                        if (question.question_type === "multiple_choice") {
                          handleAnswer(question.id, Number.parseInt(e.target.value))
                        } else {
                          const currentAnswers = answers[question.id] || []
                          const optionId = Number.parseInt(e.target.value)
                          if (e.target.checked) {
                            handleAnswer(question.id, [...currentAnswers, optionId])
                          } else {
                            handleAnswer(
                              question.id,
                              currentAnswers.filter((id) => id !== optionId),
                            )
                          }
                        }
                      }}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label
                      htmlFor={`option-${option.id}`}
                      className="flex-1 text-gray-700 cursor-pointer p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {option.option_text}
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={previousQuestion} disabled={currentQuestion === 0}>
              Previous
            </Button>

            <div className="flex gap-2">
              {currentQuiz.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    index === currentQuestion
                      ? "bg-blue-600 text-white"
                      : answers[currentQuiz.questions[index].id]
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            {currentQuestion === currentQuiz.questions.length - 1 ? (
              <Button onClick={handleSubmitQuiz}>Submit Quiz</Button>
            ) : (
              <Button onClick={nextQuestion}>Next</Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Quiz Selection Interface
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Available Quizzes</h1>
            <p className="text-gray-600">Choose a quiz to test your knowledge</p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              Back to Home
            </Button>
          </div>
        </div>

        {/* Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="subject-filter">Filter by Subject:</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-48">
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
          </CardContent>
        </Card>

        {/* Quiz Grid */}
        {filteredQuizzes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quizzes available</h3>
              <p className="text-gray-600">
                {selectedSubject !== "all"
                  ? "Try selecting a different subject or check back later"
                  : "Check back later for new quizzes"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredQuizzes.map((quiz) => (
              <Card key={quiz.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg">{quiz.title}</CardTitle>
                    <Badge variant="outline">{quiz.subject_name}</Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {quiz.description || "Test your knowledge with this quiz"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Questions:</span>
                      <span className="font-medium">{quiz.total_questions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Time Limit:</span>
                      <span className="font-medium">{quiz.time_limit} minutes</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Passing Score:</span>
                      <span className="font-medium">{quiz.passing_score}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Type:</span>
                      <Badge variant="secondary" className="text-xs">
                        {quiz.quiz_type}
                      </Badge>
                    </div>
                  </div>

                  <Button className="w-full mt-4" onClick={() => startQuiz(quiz)}>
                    <Play className="h-4 w-4 mr-2" />
                    Start Quiz
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {message && (
          <Alert className="mt-4">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
