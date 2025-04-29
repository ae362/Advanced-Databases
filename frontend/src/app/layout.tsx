import "./globals.css"
import { Inter } from "next/font/google"
import { MainNav } from "@/components/main-nav"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import type React from "react"
import { AuthProvider } from "@/context/auth-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Medical Appointments",
  description: "Medical Appointment Management System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get the current path
  const isAdminRoute = typeof window !== "undefined" ? window.location.pathname.startsWith("/admin") : false

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            {isAdminRoute ? (
              children
            ) : (
              <div className="min-h-screen bg-background">
                <MainNav />
                <main className="container mx-auto py-6 px-4">{children}</main>
              </div>
            )}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
