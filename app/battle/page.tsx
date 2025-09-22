"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sword, Trophy, Clock, Users, Play, Plus, Crown, Target, Zap, CheckCircle } from "lucide-react"

export default function BattlePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [battles, setBattles] = useState([])
  const [subjects, setSubjects] = useState([])
  const [currentBattle, setCurrentBattle] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(0)
  const [battleStarted, setBattleStarted] = useState(false)
  const [battleCompleted, setBattleCompleted] = useState(false)
  const [battleResult, setBattleResult] = useState(null)
  const [message, setMessage] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Battle creation form
  const [battleForm, setBattleForm] = useState({
    title: "",
    subject_id: "",
    total_questions: 10,
    time_per_question: 30,
  })

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    let timer
    if (battleStarted && timeLeft > 0 && !battleCompleted) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleNextQuestion()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [battleStarted, timeLeft, battleCompleted, currentQuestion])

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

      const [battlesRes, subjectsRes] = await Promise.all([
        fetch("/api/battle", { headers }),
        fetch("/api/subjects", { headers }),
      ])

      if (battlesRes.ok) setBattles(await battlesRes.json())
      if (subjectsRes.ok) setSubjects(await subjectsRes.json())
    } catch (error) {
      console.error("Failed to load data:", error)
    }
  }

  const createBattle = async (e) => {
    e.preventDefault()

    if (!battleForm.title || !battleForm.subject_id) {
      setMessage("Please fill in all required fields")
      return
    }

    try {
      const token = localStorage.getItem("cbt_token")
      const response = await fetch("/api/battle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(battleForm),
      })

      const data = await response.json()
      if (data.success) {
        setMessage("Battle created successfully! Waiting for opponent...")
        setShowCreateDialog(false)
        setBattleForm({
          title: "",
          subject_id: "",
          total_questions: 10,
          time_per_question: 30,
        })
        loadData()
      } else {
        setMessage(data.message || "Failed to create battle")
      }
    } catch (error) {
      setMessage("Network error occurred")
    }
  }

  const joinBattle = async (battleId) => {
    try {
      const token = localStorage.getItem("cbt_token")
      const response = await fetch(`/api/battle/${battleId}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setMessage("Joined battle! Starting soon...")
        loadData()
      } else {
        setMessage(data.message || "Failed to join battle")
      }
    } catch (error) {
      setMessage("Network error occurred")
    }
  }

  const startBattle = async (battleId) => {
    try {
      const token = localStorage.getItem("cbt_token")
      const response = await fetch(`/api/battle/${battleId}/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setCurrentBattle(data.battle)
        setCurrentQuestion(0)
        setAnswers({})
        setTimeLeft(data.battle.time_per_question)
        setBattleStarted(true)
        setBattleCompleted(false)
        setBattleResult(null)
      } else {
        setMessage(data.message || "Failed to start battle")
      }
    } catch (error) {
      setMessage("Network error occurred")
    }
  }

  const handleAnswer = async (questionId, answer) => {
    if (!battleStarted || battleCompleted) return

    try {
      const token = localStorage.getItem("cbt_token")
      const response = await fetch(`/api/battle/${currentBattle.id}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question_id: questionId,
          selected_option_id: answer,
          response_time: (currentBattle.time_per_question - timeLeft) * 1000,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setAnswers((prev) => ({
          ...prev,
          [questionId]: answer,
        }))

        // Auto-advance to next question after answering
        setTimeout(() => {
          handleNextQuestion()
        }, 1000)
      }
    } catch (error) {
      console.error("Failed to submit answer:", error)
    }
  }

  const handleNextQuestion = () => {
    if (currentQuestion < currentBattle.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1)
      setTimeLeft(currentBattle.time_per_question)
    } else {
      // Battle completed
      finishBattle()
    }
  }

  const finishBattle = async () => {
    try {
      const token = localStorage.getItem("cbt_token")
      const response = await fetch(`/api/battle/${currentBattle.id}/finish`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setBattleResult(data.result)
        setBattleCompleted(true)
        setBattleStarted(false)
      }
    } catch (error) {
      console.error("Failed to finish battle:", error)
    }
  }

  const resetBattle = () => {
    setCurrentBattle(null)
    setCurrentQuestion(0)
    setAnswers({})
    setTimeLeft(0)
    setBattleStarted(false)
    setBattleCompleted(false)
    setBattleResult(null)
    loadData()
  }

  const formatTime = (seconds) => {
    return `${seconds}s`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading battle arena...</p>
        </div>
      </div>
    )
  }

  // Battle Results Dialog
  if (battleCompleted && battleResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {battleResult.winner_id === user.id ? (
                <Crown className="h-16 w-16 text-yellow-500" />
              ) : (
                <Trophy className="h-16 w-16 text-gray-400" />
              )}
            </div>
            <CardTitle className="text-3xl">
              {battleResult.winner_id === user.id ? "Victory!" : "Battle Complete"}
            </CardTitle>
            <CardDescription className="text-lg">{currentBattle.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Battle Summary */}
            <div className="grid grid-cols-2 gap-6">
              {/* Player 1 */}
              <div
                className={`p-6 rounded-lg ${battleResult.winner_id === battleResult.player1.id ? "bg-green-50 border-2 border-green-200" : "bg-gray-50"}`}
              >
                <div className="text-center">
                  <Avatar className="h-16 w-16 mx-auto mb-3">
                    <AvatarFallback className="text-lg font-bold">
                      {battleResult.player1.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg">{battleResult.player1.full_name}</h3>
                  {battleResult.winner_id === battleResult.player1.id && (
                    <Badge className="mt-2 bg-green-100 text-green-800">Winner</Badge>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Score:</span>
                    <span className="font-bold">{battleResult.player1_score}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Correct:</span>
                    <span className="font-bold">{battleResult.player1_correct}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Time:</span>
                    <span className="font-bold">{battleResult.player1_avg_time}ms</span>
                  </div>
                </div>
              </div>

              {/* VS Divider */}
              <div className="flex items-center justify-center">
                <div className="text-4xl font-bold text-red-500">VS</div>
              </div>

              {/* Player 2 */}
              <div
                className={`p-6 rounded-lg ${battleResult.winner_id === battleResult.player2?.id ? "bg-green-50 border-2 border-green-200" : "bg-gray-50"}`}
              >
                <div className="text-center">
                  <Avatar className="h-16 w-16 mx-auto mb-3">
                    <AvatarFallback className="text-lg font-bold">
                      {battleResult.player2?.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="font-semibold text-lg">{battleResult.player2?.full_name || "Waiting..."}</h3>
                  {battleResult.winner_id === battleResult.player2?.id && (
                    <Badge className="mt-2 bg-green-100 text-green-800">Winner</Badge>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Score:</span>
                    <span className="font-bold">{battleResult.player2_score || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Correct:</span>
                    <span className="font-bold">{battleResult.player2_correct || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Time:</span>
                    <span className="font-bold">{battleResult.player2_avg_time || 0}ms</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={resetBattle}>New Battle</Button>
              <Button variant="outline" onClick={() => (window.location.href = "/")}>
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Battle Interface
  if (battleStarted && currentBattle) {
    const question = currentBattle.questions[currentQuestion]
    const progress = ((currentQuestion + 1) / currentBattle.questions.length) * 100

    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
        <div className="container mx-auto px-4 py-8">
          {/* Battle Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Sword className="h-6 w-6 text-red-600" />
                  {currentBattle.title}
                </h1>
                <p className="text-gray-600">
                  Question {currentQuestion + 1} of {currentBattle.questions.length}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-red-600">
                  <Clock className="h-5 w-5" />
                  <span className="font-mono text-2xl font-bold">{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>
            <Progress value={progress} className="h-3" />
          </div>

          {/* Players Status */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{user.fullName}</p>
                    <p className="text-sm text-gray-600">You</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{currentBattle.player2_name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{currentBattle.player2_name || "Opponent"}</p>
                    <p className="text-sm text-gray-600">Opponent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">{question.question_text}</CardTitle>
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
              <div className="space-y-4">
                {question.options.map((option, index) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(question.id, option.id)}
                    disabled={answers[question.id]}
                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                      answers[question.id] === option.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    } ${answers[question.id] ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${
                          answers[question.id] === option.id
                            ? "border-blue-500 bg-blue-500 text-white"
                            : "border-gray-300"
                        }`}
                      >
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="text-gray-700">{option.option_text}</span>
                      {answers[question.id] === option.id && <CheckCircle className="h-5 w-5 text-blue-500 ml-auto" />}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Battle Lobby
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Sword className="h-8 w-8 text-red-600" />
              Battle Arena
            </h1>
            <p className="text-gray-600">Challenge other students in real-time quiz battles</p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              Back to Home
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Battle
            </Button>
          </div>
        </div>

        {/* Battle Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Battles</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{battles.filter((b) => b.status === "in_progress").length}</div>
              <p className="text-xs text-muted-foreground">Currently ongoing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Waiting for Players</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{battles.filter((b) => b.status === "waiting").length}</div>
              <p className="text-xs text-muted-foreground">Ready to join</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Your Wins</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">Total victories</p>
            </CardContent>
          </Card>
        </div>

        {/* Available Battles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Available Battles
            </CardTitle>
            <CardDescription>Join an existing battle or create your own</CardDescription>
          </CardHeader>
          <CardContent>
            {battles.length === 0 ? (
              <div className="text-center py-12">
                <Sword className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No battles available</h3>
                <p className="text-gray-600 mb-4">Be the first to create a battle!</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Battle
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {battles.map((battle) => (
                  <div
                    key={battle.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{battle.title}</h3>
                        <Badge
                          variant={
                            battle.status === "waiting"
                              ? "default"
                              : battle.status === "in_progress"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {battle.status}
                        </Badge>
                        <Badge variant="outline">{battle.subject_name}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{battle.total_questions} questions</span>
                        <span>{battle.time_per_question}s per question</span>
                        <span>Created by {battle.created_by_name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">{battle.player1_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{battle.player1_name}</span>
                        {battle.player2_name && (
                          <>
                            <span className="text-gray-400">vs</span>
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">{battle.player2_name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{battle.player2_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {battle.status === "waiting" && battle.player1_id !== user.id && (
                        <Button onClick={() => joinBattle(battle.id)}>
                          <Play className="h-4 w-4 mr-2" />
                          Join Battle
                        </Button>
                      )}
                      {battle.status === "in_progress" &&
                        (battle.player1_id === user.id || battle.player2_id === user.id) && (
                          <Button onClick={() => startBattle(battle.id)}>
                            <Play className="h-4 w-4 mr-2" />
                            Continue Battle
                          </Button>
                        )}
                      {battle.status === "waiting" && battle.player1_id === user.id && (
                        <Button variant="outline" disabled>
                          Waiting for opponent...
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Battle Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Battle</DialogTitle>
              <DialogDescription>Set up a new quiz battle for other students to join</DialogDescription>
            </DialogHeader>

            <form onSubmit={createBattle} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="battleTitle">Battle Title *</Label>
                <Input
                  id="battleTitle"
                  value={battleForm.title}
                  onChange={(e) => setBattleForm({ ...battleForm, title: e.target.value })}
                  placeholder="Enter battle title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="battleSubject">Subject *</Label>
                <Select
                  value={battleForm.subject_id}
                  onValueChange={(value) => setBattleForm({ ...battleForm, subject_id: value })}
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
                  <Label htmlFor="totalQuestions">Total Questions</Label>
                  <Input
                    id="totalQuestions"
                    type="number"
                    min="5"
                    max="20"
                    value={battleForm.total_questions}
                    onChange={(e) => setBattleForm({ ...battleForm, total_questions: Number.parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timePerQuestion">Time per Question (seconds)</Label>
                  <Input
                    id="timePerQuestion"
                    type="number"
                    min="10"
                    max="60"
                    value={battleForm.time_per_question}
                    onChange={(e) =>
                      setBattleForm({ ...battleForm, time_per_question: Number.parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Battle</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {message && (
          <Alert className="mt-4">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
