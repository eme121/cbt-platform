"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Users, Key, BookOpen, BarChart3, Plus, Edit, Trash2, Copy, CheckCircle, XCircle } from "lucide-react"

export default function AdminDashboard() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [licenses, setLicenses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [stats, setStats] = useState({})
  const [message, setMessage] = useState("")

  // Form states
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    role: "student",
  })
  const [newSubject, setNewSubject] = useState({
    name: "",
    description: "",
  })
  const [licenseCount, setLicenseCount] = useState(1)

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
        if (userData.role !== "admin") {
          window.location.href = "/"
          return
        }
        setUser(userData)
        await loadDashboardData()
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

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem("cbt_token")
      const headers = { Authorization: `Bearer ${token}` }

      const [usersRes, licensesRes, subjectsRes, statsRes] = await Promise.all([
        fetch("/api/admin/users", { headers }),
        fetch("/api/admin/licenses", { headers }),
        fetch("/api/admin/subjects", { headers }),
        fetch("/api/admin/stats", { headers }),
      ])

      if (usersRes.ok) setUsers(await usersRes.json())
      if (licensesRes.ok) setLicenses(await licensesRes.json())
      if (subjectsRes.ok) setSubjects(await subjectsRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    }
  }

  const createUser = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("cbt_token")
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      })

      const data = await response.json()
      if (data.success) {
        setMessage("User created successfully")
        setNewUser({ username: "", email: "", password: "", fullName: "", role: "student" })
        loadDashboardData()
      } else {
        setMessage(data.message || "Failed to create user")
      }
    } catch (error) {
      setMessage("Network error occurred")
    }
  }

  const createSubject = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem("cbt_token")
      const response = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSubject),
      })

      const data = await response.json()
      if (data.success) {
        setMessage("Subject created successfully")
        setNewSubject({ name: "", description: "" })
        loadDashboardData()
      } else {
        setMessage(data.message || "Failed to create subject")
      }
    } catch (error) {
      setMessage("Network error occurred")
    }
  }

  const generateLicenses = async () => {
    try {
      const token = localStorage.getItem("cbt_token")
      const response = await fetch("/api/admin/licenses/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ count: licenseCount }),
      })

      const data = await response.json()
      if (data.success) {
        setMessage(`Generated ${licenseCount} license keys`)
        loadDashboardData()
      } else {
        setMessage(data.message || "Failed to generate licenses")
      }
    } catch (error) {
      setMessage("Network error occurred")
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setMessage("Copied to clipboard")
  }

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const token = localStorage.getItem("cbt_token")
      const response = await fetch(`/api/admin/users/${userId}/toggle`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      })

      const data = await response.json()
      if (data.success) {
        setMessage(`User ${!currentStatus ? "activated" : "deactivated"}`)
        loadDashboardData()
      }
    } catch (error) {
      setMessage("Failed to update user status")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Manage users, licenses, and system settings</p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              Back to Home
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers || 0}</div>
              <p className="text-xs text-muted-foreground">{stats.activeUsers || 0} active users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">License Keys</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLicenses || 0}</div>
              <p className="text-xs text-muted-foreground">{stats.usedLicenses || 0} used</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Subjects</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSubjects || 0}</div>
              <p className="text-xs text-muted-foreground">{stats.totalQuestions || 0} questions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quiz Attempts</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAttempts || 0}</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="licenses">Licenses</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">User Management</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>Add a new user to the system</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createUser} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          value={newUser.fullName}
                          onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={newUser.username}
                          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Role</Label>
                        <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button type="submit" className="w-full">
                      Create User
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              user.role === "admin" ? "destructive" : user.role === "teacher" ? "default" : "secondary"
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.is_active ? (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleUserStatus(user.id, user.is_active)}
                            >
                              {user.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Licenses Tab */}
          <TabsContent value="licenses" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">License Management</h2>
              <div className="flex gap-4 items-center">
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={licenseCount}
                  onChange={(e) => setLicenseCount(Number.parseInt(e.target.value))}
                  className="w-20"
                />
                <Button onClick={generateLicenses}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Licenses
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>License Key</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Used By</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Activated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licenses.map((license) => (
                      <TableRow key={license.id}>
                        <TableCell className="font-mono text-sm">{license.license_key}</TableCell>
                        <TableCell>
                          {license.is_used ? (
                            <Badge variant="secondary" className="bg-red-100 text-red-800">
                              Used
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Available
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{license.username || "-"}</TableCell>
                        <TableCell>{new Date(license.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {license.activated_at ? new Date(license.activated_at).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(license.license_key)}>
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subjects Tab */}
          <TabsContent value="subjects" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">Subject Management</h2>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Subject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Subject</DialogTitle>
                    <DialogDescription>Add a new subject for organizing questions</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={createSubject} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="subjectName">Subject Name</Label>
                      <Input
                        id="subjectName"
                        value={newSubject.name}
                        onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="subjectDescription">Description</Label>
                      <Input
                        id="subjectDescription"
                        value={newSubject.description}
                        onChange={(e) => setNewSubject({ ...newSubject, description: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      Create Subject
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <Card key={subject.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{subject.name}</CardTitle>
                    <CardDescription>{subject.description || "No description"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        <p>{subject.question_count || 0} questions</p>
                        <p>Created: {new Date(subject.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <h2 className="text-2xl font-semibold">System Reports</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Activity</CardTitle>
                  <CardDescription>Recent user registrations and activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>New users this week:</span>
                      <span className="font-semibold">{stats.newUsersThisWeek || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active users today:</span>
                      <span className="font-semibold">{stats.activeUsersToday || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total quiz attempts:</span>
                      <span className="font-semibold">{stats.totalAttempts || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>Platform performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Database size:</span>
                      <span className="font-semibold">{stats.dbSize || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average response time:</span>
                      <span className="font-semibold">{stats.avgResponseTime || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uptime:</span>
                      <span className="font-semibold text-green-600">99.9%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {message && (
          <Alert className="mt-4">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
