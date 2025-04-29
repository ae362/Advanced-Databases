"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, Users, Activity, Loader2, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { useRouter } from "next/navigation"

interface Appointment {
  id: number
  patient_name: string
  date: string
  status: string
  notes?: string
  reason_for_visit?: string
  doctor: number
}

interface Patient {
  id: number
  name: string
  last_visit: string
}

export default function DoctorDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [doctorId, setDoctorId] = useState<number | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [stats, setStats] = useState({
    todayAppointments: 0,
    totalPatients: 0,
    availableHours: 0,
    completionRate: 0,
  })

  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    async function fetchDoctorData() {
      try {
        setLoading(true)
        setError(null)

        // Get token from localStorage
        const token = localStorage.getItem("token")
        if (!token) {
          throw new Error("Authentication token not found")
        }

        // Get doctor ID from user object in auth context
        if (!user || !user.id) {
          throw new Error("User information not found")
        }

        // Convert string ID to number if needed
        const id = typeof user.id === "string" ? Number.parseInt(user.id, 10) : user.id
        setDoctorId(id)
        console.log("Using doctor ID:", id)

        // Fetch appointments for this doctor using the correct API pattern
        const appointmentsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/api/appointments/`,
          {
            headers: {
              Authorization: `Token ${token}`,
              "Content-Type": "application/json",
            },
          },
        )

        if (!appointmentsResponse.ok) {
          throw new Error(`Failed to fetch appointments: ${appointmentsResponse.status}`)
        }

        const contentType = appointmentsResponse.headers.get("content-type")
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format from appointments endpoint")
        }

        const allAppointments = await appointmentsResponse.json()

        // Check if allAppointments is an array
        if (!Array.isArray(allAppointments)) {
          console.warn("Appointments response is not an array:", allAppointments)
          setAppointments([])
        } else {
          const doctorAppointments = allAppointments.filter((apt: Appointment) => apt.doctor === id)
          setAppointments(doctorAppointments)
          console.log("Doctor appointments:", doctorAppointments)

          // Extract unique patients from appointments
          const patientSet = new Set()
          const patientList: Patient[] = []

          doctorAppointments.forEach((apt: Appointment) => {
            if (apt.patient_name && !patientSet.has(apt.patient_name)) {
              patientSet.add(apt.patient_name)
              patientList.push({
                id: patientSet.size,
                name: apt.patient_name,
                last_visit: apt.date,
              })
            }
          })
          setPatients(patientList)

          // Calculate stats
          const today = new Date().toISOString().split("T")[0]
          const todayAppointments = doctorAppointments.filter(
            (apt: Appointment) => apt.date && apt.date.includes(today),
          ).length

          // Calculate completion rate (completed appointments / total appointments)
          const completedAppointments = doctorAppointments.filter(
            (apt: Appointment) => apt.status === "completed",
          ).length

          const completionRate =
            doctorAppointments.length > 0 ? Math.round((completedAppointments / doctorAppointments.length) * 100) : 0

          setStats({
            todayAppointments,
            totalPatients: patientSet.size,
            availableHours: 24, // This would ideally come from availability data
            completionRate,
          })
        }
      } catch (error) {
        console.error("Error fetching doctor data:", error)
        setError(error instanceof Error ? error.message : "An unknown error occurred")
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated && user) {
      fetchDoctorData()
    }
  }, [isAuthenticated, user])

  // Sort appointments by date (most recent first)
  const sortedAppointments = [...appointments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Get upcoming appointments (future dates)
  const upcomingAppointments = sortedAppointments.filter((apt) => new Date(apt.date) > new Date())

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <Alert variant="destructive" className="mb-4 max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/login")}>Return to Login</Button>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-3xl font-bold text-white mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
        Doctor Dashboard
      </h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card className="bg-gray-900/50 backdrop-blur-lg border border-gray-800/50 shadow-lg hover:shadow-blue-900/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-200">Today's Appointments</CardTitle>
            <Calendar className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.todayAppointments}</div>
            <p className="text-xs text-blue-300/80">
              {stats.todayAppointments > 0 ? "Scheduled for today" : "No appointments today"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-lg border border-gray-800/50 shadow-lg hover:shadow-blue-900/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-200">Total Patients</CardTitle>
            <Users className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalPatients}</div>
            <p className="text-xs text-blue-300/80">Unique patients</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-lg border border-gray-800/50 shadow-lg hover:shadow-blue-900/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-200">Available Hours</CardTitle>
            <Clock className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.availableHours}h</div>
            <p className="text-xs text-blue-300/80">Next 7 days</p>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-lg border border-gray-800/50 shadow-lg hover:shadow-blue-900/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-gray-200">Completion Rate</CardTitle>
            <Activity className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.completionRate}%</div>
            <p className="text-xs text-blue-300/80">Appointments completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-gray-900/50 backdrop-blur-lg border border-gray-800/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-100">Upcoming Appointments</CardTitle>
            <CardDescription className="text-blue-300/80">Your scheduled appointments</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-auto custom-scrollbar">
            {upcomingAppointments.length > 0 ? (
              upcomingAppointments.slice(0, 5).map((appointment) => (
                <div
                  key={appointment.id}
                  className="mb-4 p-3 bg-gray-800/60 border border-gray-700/50 rounded-lg hover:bg-gray-800/80 transition-colors duration-200"
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium text-white">{appointment.patient_name}</div>
                    <div className="text-xs text-blue-300/80">
                      {format(new Date(appointment.date), "MMM d, yyyy h:mm a")}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-300">
                      {appointment.reason_for_visit || appointment.notes || "General Consultation"}
                    </div>
                    <Badge
                      variant={appointment.status === "scheduled" ? "default" : "secondary"}
                      className={appointment.status === "scheduled" ? "bg-blue-600 hover:bg-blue-700" : ""}
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">No upcoming appointments</div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-lg border border-gray-800/50 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-100">Recent Patients</CardTitle>
            <CardDescription className="text-blue-300/80">Patients you've seen recently</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-auto custom-scrollbar">
            {patients.length > 0 ? (
              patients.slice(0, 5).map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center gap-3 mb-4 p-2 rounded-lg hover:bg-gray-800/40 transition-colors duration-200"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-md">
                    <span className="text-sm font-medium text-white">{patient.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="font-medium text-white">{patient.name}</div>
                    <div className="text-xs text-blue-300/80">
                      Last visit: {format(new Date(patient.last_visit), "MMM d, yyyy")}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">No patient records found</div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
