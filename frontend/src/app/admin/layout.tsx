import type React from "react"
import "../globals.css"
import { Inter } from "next/font/google"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Admin Panel - Medical Appointments",
  description: "Medical Appointment Management System Admin Panel",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${inter.className} dark`}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <SidebarProvider defaultOpen={true}>
          <div className="flex min-h-screen bg-background">
            <AdminSidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        </SidebarProvider>
        <Toaster />
      </ThemeProvider>
    </div>
  )
}

