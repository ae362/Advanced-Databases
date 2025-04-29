"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import {
  Loader2,
  AlertCircle,
  Eye,
  XCircle,
  Clock,
  User,
  Plus,
  Phone,
  MapPin,
  FileText,
  Activity,
  Heart,
  Pill,
  AlertTriangle,
  Stethoscope,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-blue-500/10 text-blue-600 border-blue-200"
      case "completed":
        return "bg-green-500/10 text-green-600 border-green-200"
      case "cancelled":
        return "bg-red-500/10 text-red-600 border-red-200"
      case "no-show":
        return "bg-amber-500/10 text-amber-600 border-amber-200"
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-200"
    }
  }

  return (
    <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-md overflow-hidden">
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="p-6 rounded-md bg-red-500/10 text-red-600 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <div>
            <p>{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAppointments}
              className="mt-2 border-red-200 text-red-600 hover:bg-red-50"
            >
              Try Again
            </Button>
          </div>
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16 px-4">
          <Clock className="h-12 w-12 mx-auto text-blue-500/50 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No appointments found</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            You don't have any appointments scheduled. Create a new appointment to get started with your healthcare
            journey.
          </p>
          <Button asChild className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
            <Link href="/appointments/new">
              <Plus className="mr-2 h-4 w-4" />
              Schedule Appointment
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden">
          <Table>
            <TableHeader className="bg-blue-50/50 dark:bg-blue-950/30">
              <TableRow>
                <TableHead className="font-medium">ID</TableHead>
                <TableHead className="font-medium">Doctor</TableHead>
                <TableHead className="font-medium">Date</TableHead>
                <TableHead className="font-medium">Reason</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow
                  key={appointment.id}
                  className="border-b border-blue-100 dark:border-blue-900/40 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <TableCell className="font-mono text-sm text-gray-500">{appointment.id}</TableCell>
                  <TableCell className="font-medium">{appointment.doctor_name}</TableCell>
                  <TableCell>{format(new Date(appointment.date), "PPp")}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {appointment.reason_for_visit || appointment.notes || "No reason provided"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("px-2 py-1 rounded-md font-medium", getStatusColor(appointment.status))}
                    >
                      {appointment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAppointment(appointment)}
                        className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/30"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        View
                      </Button>

                      {appointment.status === "scheduled" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isLoading && cancellingId === appointment.id}
                              className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20"
                            >
                              {isLoading && cancellingId === appointment.id ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                  Cancelling...
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  Cancel
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-blue-100 dark:border-blue-900/40">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                                Cancel Appointment
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel this appointment? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/30">
                                No, keep appointment
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => cancelAppointment(appointment.id)}
                                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
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
        </div>
      )}

      {/* Appointment Details Dialog */}
      <Dialog open={selectedAppointment !== null} onOpenChange={(open) => !open && setSelectedAppointment(null)}>
        <DialogContent className="max-w-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-blue-100 dark:border-blue-900/40">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Appointment Details
            </DialogTitle>
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
                  <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-lg flex items-start">
                    <User className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Doctor</h3>
                      <p className="text-sm font-semibold">{selectedAppointment.doctor_name}</p>
                    </div>
                  </div>
                  <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-lg flex items-start">
                    <Clock className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</h3>
                      <Badge
                        variant="outline"
                        className={cn(
                          "mt-1 px-2 py-0.5 rounded-md font-medium",
                          getStatusColor(selectedAppointment.status),
                        )}
                      >
                        {selectedAppointment.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-lg flex items-start">
                  <Phone className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Contact Phone</h3>
                    <p className="text-sm">{selectedAppointment.patient_phone || "No phone provided"}</p>
                  </div>
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-lg flex items-start">
                  <User className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Gender</h3>
                    <p className="text-sm">{selectedAppointment.gender || "Not specified"}</p>
                  </div>
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-lg flex items-start">
                  <MapPin className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</h3>
                    <p className="text-sm">{selectedAppointment.address || "No address provided"}</p>
                  </div>
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-lg flex items-start">
                  <FileText className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Reason for Visit</h3>
                    <p className="text-sm">{selectedAppointment.reason_for_visit || "No reason provided"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-lg flex items-start">
                    <Heart className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Blood Type</h3>
                      <p className="text-sm">{selectedAppointment.blood_type || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-lg flex items-start">
                    <Stethoscope className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Medical Conditions</h3>
                      <p className="text-sm max-h-24 overflow-auto">
                        {selectedAppointment.medical_conditions || "None reported"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-lg flex items-start">
                  <Activity className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Chronic Diseases</h3>
                    <p className="text-sm max-h-32 overflow-auto">
                      {selectedAppointment.chronic_diseases || "None reported"}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-lg flex items-start">
                  <Pill className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Medications</h3>
                    <p className="text-sm max-h-32 overflow-auto">
                      {selectedAppointment.medications || "None reported"}
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-lg flex items-start">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Allergies</h3>
                    <p className="text-sm max-h-32 overflow-auto">{selectedAppointment.allergies || "None reported"}</p>
                  </div>
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-950/30 p-4 rounded-lg flex items-start">
                  <FileText className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Additional Notes</h3>
                    <p className="text-sm max-h-32 overflow-auto">
                      {selectedAppointment.notes || "No additional notes"}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button
              onClick={() => setSelectedAppointment(null)}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
