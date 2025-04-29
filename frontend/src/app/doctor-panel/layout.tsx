import type React from "react"
import "../globals.css"
import { Inter } from "next/font/google"
import { DoctorSidebar } from "@/components/doctor/doctor-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ThemeProvider } from "@/components/theme-provider"
import { RequireAuth } from "@/components/auth/require-auth"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Doctor Panel - Medical Appointments",
  description: "Medical Appointment Management System Doctor Panel",
}

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${inter.className} dark`}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <RequireAuth allowedRoles={["doctor"]}>
          <SidebarProvider defaultOpen={true}>
            <div className="flex min-h-screen bg-background">
              <DoctorSidebar />
              <main className="flex-1 overflow-auto">{children}</main>
            </div>
          </SidebarProvider>
        </RequireAuth>
      </ThemeProvider>
    </div>
  )
}

