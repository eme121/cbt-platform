"use client"

import { useState } from "react"
import { useAuth } from "@/components/auth-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BookOpen, Users, Trophy, BarChart3, Settings, Play, Plus, Sword, Key, Copy } from "lucide-react"

export default function HomePage() {
  const { user, login, logout, isLoading } = useAuth()
  const [loginForm, setLoginForm] = useState({ username: "", password: "" })
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
  })
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [productKeyInfo, setProductKeyInfo] = useState(null)
  const [showActivation, setShowActivation] = useState(false)
  const [licenseKeyInput, setLicenseKeyInput] = useState("")

  const fetchProductKeyInfo = async () => {
    try {
      const token = localStorage.getItem("cbt_token")
      const response = await fetch("/api/user/product-key", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setProductKeyInfo(data.productKey)
      }
    } catch (error) {
      console.error("Failed to fetch product key info:", error)
    }
  }

  const handleActivation = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const token = localStorage.getItem("cbt_token")
      const response = await fetch("/api/user/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ licenseKey: licenseKeyInput }),
      })

      const data = await response.json()
      setMessage(data.message)

      if (data.success) {
        setLicenseKeyInput("")
        setShowActivation(false)
        fetchProductKeyInfo()
        window.location.reload()
      }
    } catch (error) {
      setMessage("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const copyProductKey = () => {
    if (productKeyInfo?.key) {
      navigator.clipboard.writeText(productKeyInfo.key)
      setMessage("Product Key copied to clipboard!")
      setTimeout(() => setMessage(""), 3000)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      })

      const data = await response.json()

      if (data.success) {
        login(data.token, data.user)
        setMessage("Login successful!")
        fetchProductKeyInfo()
      } else {
        setMessage(data.message || "Login failed")
      }
    } catch (error) {
      setMessage("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerForm),
      })

      const data = await response.json()
      setMessage(data.message)

      if (data.success) {
        setRegisterForm({
          username: "",
          email: "",
          password: "",
          fullName: "",
        })
      }
    } catch (error) {
      setMessage("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    setMessage("Logged out successfully")
    setProductKeyInfo(null)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    if (!productKeyInfo) {
      fetchProductKeyInfo()
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CBT Platform</h1>
              <p className="text-gray-600">Welcome back, {user.fullName}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user.accountType === "premium" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {user.accountType === "premium" ? "Premium" : "Trial"}
              </span>
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </div>
          </div>

          {/* Product Key and Activation Section */}
          {user.accountType === "trial" && productKeyInfo && (
            <Card className="mb-8 border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Account Activation
                </CardTitle>
                <CardDescription>
                  You have limited access ({productKeyInfo.quizzesTaken}/{productKeyInfo.quizLimit} quizzes used). Send
                  your Product Key to an Admin to get a License Key for full access.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Your Product Key:</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input value={productKeyInfo.key} readOnly className="font-mono" />
                    <Button onClick={copyProductKey} size="sm" variant="outline">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {!showActivation ? (
                  <Button onClick={() => setShowActivation(true)} className="w-full">
                    Activate Account with License Key
                  </Button>
                ) : (
                  <form onSubmit={handleActivation} className="space-y-4">
                    <div>
                      <Label htmlFor="licenseKey">Enter License Key:</Label>
                      <Input
                        id="licenseKey"
                        type="text"
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        value={licenseKeyInput}
                        onChange={(e) => setLicenseKeyInput(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={loading}>
                        {loading ? "Activating..." : "Activate"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setShowActivation(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Subjects</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">Available subjects</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Quizzes Taken</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{productKeyInfo?.quizzesTaken || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {user.accountType === "trial"
                    ? `${productKeyInfo?.quizLimit - productKeyInfo?.quizzesTaken || 5} remaining`
                    : "Unlimited"}
                </p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Battle Wins</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">8</div>
                <p className="text-xs text-muted-foreground">Win rate: 67%</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">85%</div>
                <p className="text-xs text-muted-foreground">+2% from last month</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Take a Quiz</CardTitle>
                <CardDescription>Practice with available quizzes</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => (window.location.href = "/quiz")}
                  disabled={user.accountType === "trial" && productKeyInfo?.quizzesTaken >= productKeyInfo?.quizLimit}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {user.accountType === "trial" && productKeyInfo?.quizzesTaken >= productKeyInfo?.quizLimit
                    ? "Quiz Limit Reached"
                    : "Start Quiz"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Battle Mode</CardTitle>
                <CardDescription>Challenge other students</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={() => (window.location.href = "/battle")}
                  disabled={user.accountType === "trial" && productKeyInfo?.quizzesTaken >= productKeyInfo?.quizLimit}
                >
                  <Sword className="h-4 w-4 mr-2" />
                  {user.accountType === "trial" && productKeyInfo?.quizzesTaken >= productKeyInfo?.quizLimit
                    ? "Activation Required"
                    : "Join Battle"}
                </Button>
              </CardContent>
            </Card>

            {(user.role === "admin" || user.role === "teacher") && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Question Bank</CardTitle>
                    <CardDescription>Create and manage questions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() => (window.location.href = "/questions")}
                    >
                      Manage Questions
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Create Quiz</CardTitle>
                    <CardDescription>Build new quizzes for students</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() => (window.location.href = "/quiz/create")}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Quiz
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Reports & Analytics</CardTitle>
                    <CardDescription>View detailed performance reports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full" variant="secondary" onClick={() => (window.location.href = "/reports")}>
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Reports
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {user.role === "admin" && (
              <Card>
                <CardHeader>
                  <CardTitle>Admin Panel</CardTitle>
                  <CardDescription>System administration</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="secondary" onClick={() => (window.location.href = "/admin")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Admin Dashboard
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Message Display */}
          {message && (
            <Alert className="mt-4">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">CBT Platform</h1>
          <p className="text-gray-600">Computer-Based Testing System</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in to your account or register for a free trial</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      type="text"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || isLoading}>
                    {loading || isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={registerForm.fullName}
                      onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regUsername">Username</Label>
                    <Input
                      id="regUsername"
                      type="text"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regPassword">Password</Label>
                    <Input
                      id="regPassword"
                      type="password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || isLoading}>
                    {loading || isLoading ? "Registering..." : "Register"}
                  </Button>
                </form>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800 font-medium">Free Trial Includes:</p>
                  <p className="text-sm text-blue-600">• 5 practice quizzes</p>
                  <p className="text-sm text-blue-600">• Basic features access</p>
                  <p className="text-sm text-blue-600">• Product Key for activation</p>
                </div>
              </TabsContent>
            </Tabs>

            {message && (
              <Alert className="mt-4">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">Demo Credentials:</p>
              <p className="text-sm text-blue-600">Username: admin</p>
              <p className="text-sm text-blue-600">Password: admin123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
