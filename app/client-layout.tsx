"use client"

import type React from "react"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/components/auth-provider"
import { ThemeProvider } from "next-themes"
import { Toaster } from "react-hot-toast"
import { Suspense } from "react"

const ClientLayout = ({
  children,
}: {
  children: React.ReactNode
}) => {
  return (
    <Suspense fallback={null}>
      <AuthProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
          suppressHydrationWarning
        >
          {children}
          <Toaster position="top-right" />
        </ThemeProvider>
      </AuthProvider>
      <Analytics />
    </Suspense>
  )
}

export { ClientLayout }
export default ClientLayout
