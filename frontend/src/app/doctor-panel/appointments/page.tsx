"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RequireAuth } from "@/components/auth/require-auth"
import { useToast } from "@/hooks/use-toast"
import { fetchWithAuth } from "@/utils/api"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Calendar, Clock, ClipboardList, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Appointment {
  id: number
  patient_name: string
  date: string
  notes: string
  status: string
  blood_type?: string
  medications?: string
  allergies?: string
  medical_conditions?: string
  reason_for_visit?: string
  patient_phone?: string
  doctor?: number | string
  gender?: string
  address?: string
  chronic_diseases?: string
}

export default function DoctorAppointmentsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [activeTab, setActiveTab] = useState("upcoming")
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  const filteredAppointments = appointments.filter((appointment) => {
    console.log(`Filtering appointment: ${appointment.id}, status: ${appointment.status}, tab: ${activeTab}`)

    if (activeTab === "upcoming") {
      return appointment.status === "scheduled"
    } else if (activeTab === "today") {
      const appointmentDate = new Date(appointment.date)
      const today = new Date()
      return (
        appointmentDate.getDate() === today.getDate() &&
        appointmentDate.getMonth() === today.getMonth() &&
        appointmentDate.getFullYear() === today.getFullYear() &&
        appointment.status === "scheduled"
      )
    } else if (activeTab === "completed") {
      return appointment.status === "completed"
    } else if (activeTab === "cancelled") {
      return appointment.status === "cancelled"
    }
    return true
  })

  // Update the useEffect to first fetch the doctor's profile to get the actual doctor ID
  useEffect(() => {
    async function fetchDoctorId() {
      try {
        // Get user ID from localStorage
        const userStr = localStorage.getItem("user")
        if (!userStr) {
          throw new Error("No user data found in localStorage")
        }

        const user = JSON.parse(userStr)
        if (!user || !user.id) {
          throw new Error("No user ID found in localStorage")
        }

        const userId = user.id
        console.log("User ID from localStorage:", userId)

        // First, fetch the doctor profile to get the doctor's actual ID
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const profileUrl = `${apiBaseUrl}/api/api/doctors/`
        console.log("Fetching doctors list from:", profileUrl)

        const response = await fetchWithAuth(profileUrl)

        if (!response.ok) {
          throw new Error(`Failed to fetch doctors list: ${response.status}`)
        }

        const doctors = await response.json()
        console.log("Doctors list:", doctors)

        // Find the doctor with matching user_id
        const doctorProfile = doctors.find((doc: any) => doc.user_id === userId)

        if (!doctorProfile) {
          throw new Error("Doctor profile not found for current user")
        }

        console.log("Found doctor profile:", doctorProfile)

        // Use the doctor's actual ID, not the user_id
        const actualDoctorId = doctorProfile.id
        console.log("Using actual doctor ID:", actualDoctorId)

        setDoctorId(actualDoctorId)

        // Now fetch appointments using the actual doctor ID
        fetchAppointments(actualDoctorId)
      } catch (error) {
        console.error("Error getting doctor ID:", error)
        setError(error instanceof Error ? error.message : "Could not determine doctor ID")
        toast({
          title: "Error",
          description: "Could not determine doctor ID. Please try again later.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    fetchDoctorId()
  }, [toast])

  // Fetch doctor appointments
  async function fetchAppointments(id: string) {
    setIsLoading(true)
    setError(null)
    try {
      console.log("Fetching appointments for doctor ID:", id)

      // Try the appointments endpoint with doctor query parameter
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      const url = `${apiBaseUrl}/api/api/appointments/?doctor=${id}`
      console.log("Fetching appointments from:", url)

      // Collect debug info
      let debugText = `Appointments request to: ${url}\n`

      const response = await fetchWithAuth(url)
      debugText += `Response status: ${response.status}\n`

      if (!response.ok) {
        const errorText = await response.text()
        debugText += `Error response: ${errorText}\n`
        console.error("Error response:", errorText)
        setDebugInfo(debugText)
        throw new Error(`Failed to fetch appointments: ${response.status}`)
      }

      const data = await response.json()
      debugText += `Response data: ${JSON.stringify(data).substring(0, 200)}...\n`
      console.log("Fetched appointments data:", data)
      setDebugInfo(debugText)

      // Set appointments without any additional filtering
      setAppointments(data)

      // Log each appointment for debugging
      data.forEach((apt: any) => {
        console.log(
          `Appointment: ID=${apt.id}, Patient=${apt.patient_name}, Doctor=${apt.doctor}, Date=${apt.date}, Status=${apt.status}`,
        )
      })
    } catch (error) {
      console.error("Error fetching appointments:", error)
      setError(error instanceof Error ? error.message : "Failed to load appointments")
      toast({
        title: "Error",
        description: "Failed to load appointments. Please try refreshing the page.",
        variant: "destructive",
      })
      // Set empty array to avoid undefined errors
      setAppointments([])
    } finally {
      setIsLoading(false)
    }
  }

  // Count today's appointments
  const todayAppointments = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.date)
    const today = new Date()
    return (
      appointmentDate.getDate() === today.getDate() &&
      appointmentDate.getMonth() === today.getMonth() &&
      appointmentDate.getFullYear() === today.getFullYear() &&
      appointment.status === "scheduled"
    )
  })

  // Get next appointment
  const nextAppointment = appointments
    .filter((appointment) => {
      const appointmentDate = new Date(appointment.date)
      const now = new Date()
      return appointmentDate > now && appointment.status === "scheduled"
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]

  // Mark appointment as completed - UPDATED to use our new API route
  async function markAsCompleted(appointmentId: number) {
    if (!doctorId) {
      toast({
        title: "Error",
        description: "Doctor ID not available. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    setIsUpdating(true)
    try {
      console.log(`Marking appointment ${appointmentId} as completed...`)

      // Get the auth token
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      // Use our custom API route with enhanced error handling
      const response = await fetch("/api/appointments/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          appointmentId,
          status: "completed",
        }),
      })

      console.log(`Response status: ${response.status}`)
      const data = await response.json()
      console.log("Response data:", data)

      if (!response.ok) {
        throw new Error(data.error || "Failed to update appointment status")
      }

      // Update the appointments array with the new status
      setAppointments(appointments.map((apt) => (apt.id === appointmentId ? { ...apt, status: "completed" } : apt)))

      // If the selected appointment is the one being updated, update it too
      if (selectedAppointment && selectedAppointment.id === appointmentId) {
        setSelectedAppointment({ ...selectedAppointment, status: "completed" })
      }

      toast({
        title: "Success",
        description: "Appointment marked as completed",
      })

      // Refresh the appointments list to ensure we have the latest data
      fetchAppointments(doctorId)
    } catch (error) {
      console.error("Error updating appointment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update appointment status",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <RequireAuth allowedRoles={["doctor"]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Appointments</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => doctorId && fetchAppointments(doctorId)}>
              Refresh Appointments
            </Button>
            <Button onClick={() => router.push("/doctor-panel")}>Back to Dashboard</Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {debugInfo && (
          <Alert>
            <AlertDescription>
              <details>
                <summary className="cursor-pointer font-medium">Debug Information</summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs">{debugInfo}</pre>
              </details>
            </AlertDescription>
          </Alert>
        )}

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
              {nextAppointment ? (
                <>
                  <div className="text-2xl font-bold">{format(new Date(nextAppointment.date), "h:mm a")}</div>
                  <p className="text-xs text-muted-foreground">{nextAppointment.patient_name}</p>
                </>
              ) : (
                <div className="text-sm text-muted-foreground">No upcoming appointments</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Appointments</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {appointments.filter((apt) => apt.status === "completed").length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Appointments</CardTitle>
            <Tabs defaultValue="upcoming" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="today">Today</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No appointments found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell>{appointment.patient_name}</TableCell>
                      <TableCell>{format(new Date(appointment.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{format(new Date(appointment.date), "h:mm a")}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {appointment.reason_for_visit || appointment.notes || "No reason provided"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            appointment.status === "scheduled"
                              ? "default"
                              : appointment.status === "completed"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {appointment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedAppointment(appointment)}>
                            View Details
                          </Button>
                          {appointment.status === "scheduled" && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => markAsCompleted(appointment.id)}
                              disabled={isUpdating}
                            >
                              {isUpdating ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                "Mark Completed"
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointment Details Dialog */}
      <Dialog open={selectedAppointment !== null} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              Appointment with {selectedAppointment?.patient_name} on{" "}
              {selectedAppointment && format(new Date(selectedAppointment.date), "MMMM d, yyyy")} at{" "}
              {selectedAppointment && format(new Date(selectedAppointment.date), "h:mm a")}
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 p-1 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium">Patient</h3>
                    <p className="text-sm">{selectedAppointment.patient_name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium">Status</h3>
                    <Badge
                      variant={
                        selectedAppointment.status === "scheduled"
                          ? "default"
                          : selectedAppointment.status === "completed"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {selectedAppointment.status}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1">Contact Phone</h3>
                  <p className="text-sm p-3 bg-muted rounded-md">
                    {selectedAppointment.patient_phone || "No phone provided"}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1">Gender</h3>
                  <p className="text-sm p-3 bg-muted rounded-md">{selectedAppointment.gender || "Not specified"}</p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1">Address</h3>
                  <p className="text-sm p-3 bg-muted rounded-md">
                    {selectedAppointment.address || "No address provided"}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1">Reason for Visit</h3>
                  <p className="text-sm p-3 bg-muted rounded-md">
                    {selectedAppointment.reason_for_visit || "No reason provided"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-1">Blood Type</h3>
                    <p className="text-sm p-2 bg-muted rounded-md">
                      {selectedAppointment.blood_type || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-1">Medical Conditions</h3>
                    <p className="text-sm p-2 bg-muted rounded-md max-h-24 overflow-auto">
                      {selectedAppointment.medical_conditions || "None reported"}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1">Chronic Diseases</h3>
                  <p className="text-sm p-3 bg-muted rounded-md max-h-32 overflow-auto">
                    {selectedAppointment.chronic_diseases || "None reported"}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1">Current Medications</h3>
                  <p className="text-sm p-3 bg-muted rounded-md max-h-32 overflow-auto">
                    {selectedAppointment.medications || "None reported"}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1">Allergies</h3>
                  <p className="text-sm p-3 bg-muted rounded-md max-h-32 overflow-auto">
                    {selectedAppointment.allergies || "None reported"}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-1">Additional Notes</h3>
                  <p className="text-sm p-3 bg-muted rounded-md max-h-32 overflow-auto">
                    {selectedAppointment.notes || "No additional notes"}
                  </p>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            {selectedAppointment && selectedAppointment.status === "scheduled" && (
              <Button
                variant="secondary"
                onClick={() => {
                  markAsCompleted(selectedAppointment.id)
                  setSelectedAppointment(null)
                }}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Mark as Completed"
                )}
              </Button>
            )}
            <Button onClick={() => setSelectedAppointment(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RequireAuth>
  )
}
