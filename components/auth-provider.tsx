"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect } from "react"

interface User {
  id: number
  username: string
  email: string
  role: string
  fullName: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string, userData: User) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    const storedToken = localStorage.getItem("cbt_token")
    if (storedToken) {
      verifyToken(storedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${tokenToVerify}` },
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setToken(tokenToVerify)
      } else {
        // Token is invalid, clear it
        localStorage.removeItem("cbt_token")
        setUser(null)
        setToken(null)
      }
    } catch (error) {
      console.error("Token verification failed:", error)
      localStorage.removeItem("cbt_token")
      setUser(null)
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = (newToken: string, userData: User) => {
    localStorage.setItem("cbt_token", newToken)
    setToken(newToken)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem("cbt_token")
    setToken(null)
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
