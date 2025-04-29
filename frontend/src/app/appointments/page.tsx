"use client"

import { Suspense, useEffect } from "react"
import { AppointmentList } from "./appointment-list"
import { Loading } from "@/components/loading"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"

export default function AppointmentsPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Check if we have a token and user in localStorage
    const token = localStorage.getItem("token")
    const user = localStorage.getItem("user")

    // If we have both, we can consider the user authenticated without validation
    const hasLocalAuth = !!token && !!user

    // Only redirect if we don't have local auth data and auth check is complete
    if (!isLoading && !isAuthenticated && !hasLocalAuth) {
      console.log("Not authenticated, redirecting from appointments page")
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading state while checking authentication
  if (isLoading) {
    return <Loading />
  }

  // Try to get user from localStorage as a fallback
  const hasLocalAuth = !!localStorage.getItem("token") && !!localStorage.getItem("user")

  // Don't render anything if not authenticated (by context or localStorage)
  if (!isAuthenticated && !hasLocalAuth) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Appointments</h1>
        <Button asChild>
          <Link href="/appointments/new">
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Link>
        </Button>
      </div>

      <Suspense fallback={<Loading />}>
        <AppointmentList />
      </Suspense>
    </div>
  )
}
