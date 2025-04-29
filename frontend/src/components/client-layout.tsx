"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { MainNav } from "@/components/main-nav"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdminRoute = pathname.startsWith("/admin")
  const isDoctorRoute = pathname.startsWith("/doctor-panel")
  const isHomePage = pathname === "/"

  // For admin routes, just render the children directly
  if (isAdminRoute) {
    return <>{children}</>
  }

  // For doctor routes, use a specialized layout
  if (isDoctorRoute) {
    return (
      <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
        {/* Doctor sidebar is rendered by the doctor-panel layout */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-gray-900 border-b border-gray-800 py-4 px-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold">
              {pathname.includes("/appointments")
                ? "My Appointments"
                : pathname.includes("/availability")
                  ? "My Availability"
                  : pathname.includes("/patients")
                    ? "My Patients"
                    : pathname.includes("/profile")
                      ? "My Profile"
                      : "Doctor Dashboard"}
            </h1>
            <div className="flex items-center gap-4">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors">
                {pathname.includes("/appointments")
                  ? "New Appointment"
                  : pathname.includes("/availability")
                    ? "Set Availability"
                    : pathname.includes("/patients")
                      ? "Add Patient"
                      : "Action"}
              </button>
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                <span className="text-sm font-medium">DR</span>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 bg-gray-950">{children}</main>
        </div>
      </div>
    )
  }

  // For the home page, don't add any layout
  if (isHomePage) {
    return <>{children}</>
  }

  // For regular routes, wrap with MainNav
  return (
    <div className="min-h-screen bg-background">
      <MainNav />
      <main className="container mx-auto py-6 px-4">{children}</main>
    </div>
  )
}
