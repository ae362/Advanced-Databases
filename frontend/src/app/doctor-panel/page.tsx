"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"
import { format } from "date-fns"
import { Calendar, Clock, ClipboardList } from "lucide-react"

// Mock data for doctor's appointments
const mockAppointments = [
  {
    id: 1,
    patient_name: "John Doe",
    date: new Date(2025, 2, 15, 10, 30),
    status: "scheduled",
    notes: "Regular checkup",
  },
  {
    id: 2,
    patient_name: "Jane Smith",
    date: new Date(2025, 2, 15, 11, 30),
    status: "scheduled",
    notes: "Follow-up appointment",
  },
  {
    id: 3,
    patient_name: "Robert Johnson",
    date: new Date(2025, 2, 15, 14, 0),
    status: "scheduled",
    notes: "New patient consultation",
  },
]

export default function DoctorPanel() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [todayAppointments, setTodayAppointments] = useState(mockAppointments)

  // Update the useEffect to automatically fetch appointments on page load
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }

    // Check if user has doctor role
    const storedUser = localStorage.getItem("user")
    if (storedUser) {
      const userData = JSON.parse(storedUser)
      if (userData.role !== "doctor" && localStorage.getItem("intendedRole") !== "doctor") {
        router.push("/appointments")
      }
    }

    // Automatically check all appointments in the system
    async function checkAllAppointments() {
      try {
        const token = localStorage.getItem("token")
        if (!token) return

        // First, fetch the doctor profile to get the doctor's ID
        const doctorProfileResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/doctors/profile/`,
          {
            headers: {
              Authorization: `Token ${token}`,
              "Content-Type": "application/json",
            },
          },
        )

        if (!doctorProfileResponse.ok) {
          console.error("Failed to fetch doctor profile:", doctorProfileResponse.status)
          return
        }

        const doctorProfile = await doctorProfileResponse.json()
        const doctorId = doctorProfile.id // Use the doctor's ID, not the user_id

        if (!doctorId) {
          console.error("Doctor ID not found in profile")
          return
        }

        console.log("Using doctor ID for appointments:", doctorId)

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/appointments/`,
          {
            headers: {
              Authorization: `Token ${token}`,
              "Content-Type": "application/json",
            },
          },
        )

        if (!response.ok) return

        const data = await response.json()
        console.log("ALL APPOINTMENTS IN SYSTEM:", data)

        // Filter appointments for the current doctor using doctorId
        const doctorAppointments = data.filter(
          (apt: any) => apt.doctor === Number.parseInt(doctorId) || apt.doctor === doctorId,
        )

        console.log("DOCTOR'S APPOINTMENTS:", doctorAppointments)

        // Update mock data with real appointments if available
        if (doctorAppointments.length > 0) {
          const formattedAppointments = doctorAppointments.map((apt: any) => ({
            id: apt.id,
            patient_name: apt.patient_name,
            date: new Date(apt.date),
            status: apt.status,
            notes: apt.notes || apt.reason_for_visit || "No notes",
          }))

          setTodayAppointments(formattedAppointments)
        }
      } catch (error) {
        console.error("Error checking appointments:", error)
      }
    }

    checkAllAppointments()
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Doctor Dashboard</h1>
        <Button onClick={() => router.push("/appointments")}>Back to Appointments</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayAppointments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Appointment</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(todayAppointments[0].date, "h:mm a")}</div>
            <p className="text-xs text-muted-foreground">{todayAppointments[0].patient_name}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patient Records</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">Total patient records</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today's Schedule</CardTitle>
          <CardDescription>Your appointments for {format(new Date(), "MMMM d, yyyy")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {todayAppointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>{format(appointment.date, "h:mm a")}</TableCell>
                  <TableCell className="font-medium">{appointment.patient_name}</TableCell>
                  <TableCell>{appointment.notes}</TableCell>
                  <TableCell>
                    <Badge variant="default">{appointment.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
