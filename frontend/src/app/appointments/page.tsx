"use client"

import { Suspense, useEffect } from "react"
import { AppointmentList } from "./appointment-list"
import { Loading } from "@/components/loading"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Calendar } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-blue-500/10">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Appointments
          </h1>
        </div>
        <Button
          asChild
          className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
        >
          <Link href="/appointments/new">
            <Plus className="mr-2 h-4 w-4" />
            New Appointment
          </Link>
        </Button>
      </div>

      <Suspense fallback={<Loading />}>
        <AppointmentList />
      </Suspense>
    </motion.div>
  )
}
