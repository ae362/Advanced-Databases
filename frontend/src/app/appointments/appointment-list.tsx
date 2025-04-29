"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Appointment } from "@/types"
import { ENDPOINTS } from "@/config/api"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { Loader2, AlertCircle } from "lucide-react"

export function AppointmentList() {
  const router = useRouter()
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<number | string | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  useEffect(() => {
    fetchAppointments()
  }, [])

  async function fetchAppointments() {
    setIsLoading(true)
    setError(null)

    try {
      console.log("Fetching appointments...")
      const token = localStorage.getItem("token")

      if (!token) {
        throw new Error("No authentication token found")
      }

      // Direct fetch without middleware
      const response = await fetch(ENDPOINTS.appointments(), {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("Appointments response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error(`Failed to fetch appointments: ${response.status}`)
      }

      const data = await response.json()
      console.log("Fetched appointments data:", data)

      setAppointments(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error fetching appointments:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
      toast({
        title: "Error",
        description: "Failed to load appointments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function cancelAppointment(id: number | string) {
    setIsLoading(true)
    setCancellingId(id)
    try {
      const token = localStorage.getItem("token")

      if (!token) {
        throw new Error("No authentication token found")
      }

      const response = await fetch(`${ENDPOINTS.appointments(id)}/cancel/`, {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to cancel appointment" }))
        throw new Error(errorData.error || "Failed to cancel appointment")
      }

      setAppointments((current) => current.filter((apt) => apt.id !== id))

      toast({
        title: "Success",
        description: "Appointment cancelled successfully",
      })
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel appointment",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setCancellingId(null)
    }
  }

  // Check if we have a token in localStorage
  const hasToken = typeof window !== "undefined" && !!localStorage.getItem("token")

  if (!hasToken) {
    return null
  }

  return (
    <div className="rounded-md border">
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-md bg-destructive/15 text-destructive flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          <div>
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchAppointments} className="mt-2">
              Try Again
            </Button>
          </div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No appointments found. Create a new appointment to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appointment) => (
              <TableRow key={appointment.id}>
                <TableCell>{appointment.id}</TableCell>
                <TableCell>{appointment.doctor_name}</TableCell>
                <TableCell>{format(new Date(appointment.date), "PPp")}</TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {appointment.reason_for_visit || appointment.notes || "No reason provided"}
                </TableCell>
                <TableCell>
                  <Badge variant="default">{appointment.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedAppointment(appointment)}>
                      View Details
                    </Button>

                    {appointment.status === "scheduled" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isLoading && cancellingId === appointment.id}
                          >
                            {isLoading && cancellingId === appointment.id ? "Cancelling..." : "Cancel"}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to cancel this appointment? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>No, keep appointment</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => cancelAppointment(appointment.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Yes, cancel appointment
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Appointment Details Dialog */}
      <Dialog open={selectedAppointment !== null} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>
              Appointment #{selectedAppointment?.id} with {selectedAppointment?.doctor_name} on{" "}
              {selectedAppointment && format(new Date(selectedAppointment.date), "MMMM d, yyyy")} at{" "}
              {selectedAppointment && format(new Date(selectedAppointment.date), "h:mm a")}
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6 p-1 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium">Doctor</h3>
                    <p className="text-sm">{selectedAppointment.doctor_name}</p>
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
            <Button onClick={() => setSelectedAppointment(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
