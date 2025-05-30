import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import type React from "react"
import { AuthProvider } from "@/context/auth-context"
import { ClientLayout } from "@/components/client-layout"

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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <AuthProvider>
            <ClientLayout>{children}</ClientLayout>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
