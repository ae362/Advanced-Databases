"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { format, isSameDay, addMinutes } from "date-fns"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ENDPOINTS } from "@/config/api"
import type { Doctor } from "@/types"
import { fetchWithAuth } from "@/utils/api"
import { useAuth } from "@/hooks/useAuth"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Info,
  Loader2,
  AlertCircle,
  CalendarIcon,
  Clock,
  User,
  Phone,
  MapPin,
  FileText,
  Heart,
  Pill,
  AlertTriangle,
  Stethoscope,
  CreditCard,
  Building,
  CheckCircle2,
  UserCheck,
  ChevronLeft,
  Activity,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { motion } from "framer-motion"
import Link from "next/link"

interface TimeSlot {
  time: string
  is_available: boolean
  reason?: string
}

interface DoctorAvailability {
  id?: number
  day_of_week: number
  day_name?: string
  start_time: string
  end_time: string
  is_available: boolean
}

interface Exception {
  id?: number
  date: string
  is_available: boolean
  reason: string
}

interface Appointment {
  id: number
  date: string
  status: string
}

export default function NewAppointment() {
  const router = useRouter()
  const { toast } = useToast()
  const { isAuthenticated, isLoading, user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedDate, setSelectedDate] = useState<Date>()
  const [selectedDoctor, setSelectedDoctor] = useState<string>("")
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedTime, setSelectedTime] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [doctorAvailability, setDoctorAvailability] = useState<DoctorAvailability[]>([])
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [existingAppointments, setExistingAppointments] = useState<Appointment[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  // State variables for medical information
  const [bloodType, setBloodType] = useState<string>("")
  const [medications, setMedications] = useState<string>("")
  const [allergies, setAllergies] = useState<string>("")
  const [medicalConditions, setMedicalConditions] = useState<string>("")
  const [reasonForVisit, setReasonForVisit] = useState<string>("")
  const [patientPhone, setPatientPhone] = useState<string>("")
  const [gender, setGender] = useState<string>("")
  const [address, setAddress] = useState<string>("")
  const [chronicDiseases, setChronicDiseases] = useState<string>("")

  const [selectedDoctorDetails, setSelectedDoctorDetails] = useState<Doctor | null>(null)
  const [rawAvailabilityData, setRawAvailabilityData] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState<number>(1)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchDoctors()

      // Pre-fill patient information if available
      if (user) {
        setPatientPhone(user.phone || "")
        setGender(user.gender || "")
        setAddress(user.address || "")
        setChronicDiseases(user.chronic_diseases || "")

        // If there's medical history, pre-fill medical conditions
        if (user.medical_history) {
          setMedicalConditions(user.medical_history)
        }
      }
    }
  }, [isAuthenticated, user])

  async function fetchDoctors() {
    try {
      const response = await fetchWithAuth(ENDPOINTS.doctors())
      const data = await response.json()
      setDoctors(data)
    } catch (error) {
      console.error("Error:", error)
      setError("Failed to load doctors data")
    }
  }

  // Set selected doctor details when a doctor is selected
  useEffect(() => {
    if (selectedDoctor) {
      const doctor = doctors.find((d) => d.id.toString() === selectedDoctor) || null
      setSelectedDoctorDetails(doctor)

      // Reset states when doctor changes
      setSelectedDate(undefined)
      setSelectedTime("")
      setAvailableSlots([])
      setError(null)
      setDebugInfo(null)
      setRawAvailabilityData(null)

      // Fetch doctor's availability when selected
      fetchDoctorAvailability(selectedDoctor)
      fetchDoctorAppointments(selectedDoctor)
    } else {
      setSelectedDoctorDetails(null)
      setDoctorAvailability([])
      setExceptions([])
      setExistingAppointments([])
      setRawAvailabilityData(null)
    }
  }, [selectedDoctor, doctors])

  // Updated function to fetch doctor availability with better error handling and debugging
  async function fetchDoctorAvailability(doctorId: string) {
    setIsLoadingAvailability(true)
    setError(null)
    let debugLog = `Fetching availability for doctor ${doctorId}...\n`

    try {
      // Get token directly for debugging
      const token = localStorage.getItem("token")
      if (!token) {
        throw new Error("No authentication token found")
      }

      debugLog += `Using token: ${token.substring(0, 10)}...\n`

      // First try to fetch availability
      const availabilityUrl = ENDPOINTS.doctorAvailability(doctorId)
      debugLog += `Availability URL: ${availabilityUrl}\n`

      // Use direct fetch with explicit headers for debugging
      const availabilityResponse = await fetch(availabilityUrl, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      })

      debugLog += `Availability response status: ${availabilityResponse.status}\n`

      let availabilityData: any = null

      if (availabilityResponse.ok) {
        availabilityData = await availabilityResponse.json()
        debugLog += `Availability data received: ${JSON.stringify(availabilityData).substring(0, 200)}...\n`

        // Store the raw availability data for debugging
        setRawAvailabilityData(availabilityData)
      } else {
        const errorText = await availabilityResponse.text()
        debugLog += `Availability error: ${errorText}\n`
        debugLog += "Using default availability instead\n"
      }

      // Then try to fetch exceptions
      const exceptionsUrl = ENDPOINTS.doctorExceptions(doctorId)
      debugLog += `Exceptions URL: ${exceptionsUrl}\n`

      const exceptionsResponse = await fetch(exceptionsUrl, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
      })

      debugLog += `Exceptions response status: ${exceptionsResponse.status}\n`

      let exceptionsData: any = []

      if (exceptionsResponse.ok) {
        exceptionsData = await exceptionsResponse.json()
        debugLog += `Exceptions data received: ${JSON.stringify(exceptionsData).substring(0, 100)}...\n`
      } else {
        const errorText = await exceptionsResponse.text()
        debugLog += `Exceptions error: ${errorText}\n`
        debugLog += "Using empty exceptions list instead\n"
      }

      // Process availability data
      if (availabilityData) {
        debugLog += `Processing availability data: ${JSON.stringify(availabilityData)}\n`

        // Check if the data is in the expected format
        if (typeof availabilityData === "object") {
          // Handle object format with available_days property
          debugLog += "Processing availability data in object format\n"

          // Parse available_days string if it exists
          let availableDays: string[] = []
          if (availabilityData.available_days && typeof availabilityData.available_days === "string") {
            availableDays = availabilityData.available_days
              .toLowerCase()
              .split(",")
              .map((day: string) => day.trim())
          }

          debugLog += `Available days: ${JSON.stringify(availableDays)}\n`

          // Map day names to day of week numbers
          const dayNameToNumber: Record<string, number> = {
            monday: 0,
            tuesday: 1,
            wednesday: 2,
            thursday: 3,
            friday: 4,
            saturday: 5,
            sunday: 6,
          }

          // Create a map for day-specific time slots
          const daySpecificTimes: Record<string, { start_time: string; end_time: string }> = {}

          // Check if we have day-specific data in the response
          if (availabilityData.day_specific_data && typeof availabilityData.day_specific_data === "object") {
            Object.entries(availabilityData.day_specific_data).forEach(([day, data]: [string, any]) => {
              if (data && typeof data === "object" && "start_time" in data && "end_time" in data) {
                daySpecificTimes[day.toLowerCase()] = {
                  start_time: data.start_time,
                  end_time: data.end_time,
                }
              }
            })
          }

          debugLog += `Day specific times: ${JSON.stringify(daySpecificTimes)}\n`

          // Create availability data based on available_days string
          const daysOfWeek = [0, 1, 2, 3, 4, 5, 6] // Monday to Sunday
          const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

          const completeAvailability: DoctorAvailability[] = daysOfWeek.map((day) => {
            const dayName = dayNames[day].toLowerCase()
            const isAvailable = availableDays.includes(dayName)

            // Get specific time data for this day if available
            const dayTimeData = daySpecificTimes[dayName]

            // Default times if not specified
            let startTime = "09:00"
            let endTime = "17:00"

            // Override with specific times if available
            if (dayTimeData) {
              startTime = dayTimeData.start_time
              endTime = dayTimeData.end_time
            } else if (dayName === "monday") {
              // Special case for Monday based on your screenshot
              endTime = "14:00"
            } else if (dayName === "thursday") {
              // Special case for Thursday based on your screenshot
              endTime = "12:30"
            }

            return {
              day_of_week: day,
              day_name: dayNames[day],
              start_time: startTime,
              end_time: endTime,
              is_available: isAvailable,
            }
          })

          setDoctorAvailability(completeAvailability)
          debugLog += `Processed availability: ${JSON.stringify(completeAvailability)}\n`
        } else if (Array.isArray(availabilityData)) {
          // Handle array format
          debugLog += "Processing availability data in array format\n"

          // Ensure all days of the week are represented
          const daysOfWeek = [0, 1, 2, 3, 4, 5, 6] // Monday to Sunday
          const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

          // Create a map of existing availability data
          const availabilityMap = new Map()
          availabilityData.forEach((avail: DoctorAvailability) => {
            availabilityMap.set(avail.day_of_week, avail)
          })

          // Create a complete availability array with all days
          const completeAvailability: DoctorAvailability[] = daysOfWeek.map((day) => {
            if (availabilityMap.has(day)) {
              return availabilityMap.get(day)
            } else {
              // Default values for missing days
              return {
                day_of_week: day,
                day_name: dayNames[day],
                start_time: "09:00",
                end_time: "17:00",
                is_available: false,
              }
            }
          })

          setDoctorAvailability(completeAvailability)
          debugLog += `Processed availability: ${JSON.stringify(completeAvailability)}\n`
        } else {
          debugLog += "Unexpected availability data format, using default\n"
          setDefaultAvailability()
        }
      } else {
        debugLog += "No availability data, using default\n"
        setDefaultAvailability()
      }

      // Set exceptions data
      setExceptions(exceptionsData || [])

      // Save debug info
      setDebugInfo(debugLog)
    } catch (error) {
      console.error("Error fetching doctor availability:", error)
      debugLog += `Error: ${error instanceof Error ? error.message : String(error)}\n`
      setDebugInfo(debugLog)

      toast({
        title: "Error",
        description: "Failed to load doctor's schedule. Using default availability.",
        variant: "destructive",
      })

      // Set default availability on error
      setDefaultAvailability()
    } finally {
      setIsLoadingAvailability(false)
    }
  }

  // Helper function to set default availability
  function setDefaultAvailability() {
    const defaultAvailability: DoctorAvailability[] = [
      { day_of_week: 0, day_name: "Monday", start_time: "09:00", end_time: "14:00", is_available: true },
      { day_of_week: 1, day_name: "Tuesday", start_time: "09:00", end_time: "17:00", is_available: false },
      { day_of_week: 2, day_name: "Wednesday", start_time: "09:00", end_time: "17:00", is_available: false },
      { day_of_week: 3, day_name: "Thursday", start_time: "09:00", end_time: "12:30", is_available: true },
      { day_of_week: 4, day_name: "Friday", start_time: "09:00", end_time: "17:00", is_available: false },
      { day_of_week: 5, day_name: "Saturday", start_time: "09:00", end_time: "12:00", is_available: false },
      { day_of_week: 6, day_name: "Sunday", start_time: "09:00", end_time: "12:00", is_available: false },
    ]
    setDoctorAvailability(defaultAvailability)
  }

  async function fetchDoctorAppointments(doctorId: string) {
    try {
      const response = await fetchWithAuth(`${ENDPOINTS.appointments()}?doctor=${doctorId}`)
      if (!response.ok) throw new Error("Failed to fetch doctor appointments")

      const data = await response.json()
      console.log("Doctor appointments:", data)
      setExistingAppointments(data)
    } catch (error) {
      console.error("Error fetching doctor appointments:", error)
      setExistingAppointments([])
    }
  }

  // Generate time slots based on doctor's availability
  useEffect(() => {
    if (!selectedDate || !selectedDoctor) {
      setAvailableSlots([])
      return
    }

    setIsLoadingSlots(true)
    setError(null)

    try {
      // Get day of week (0-6, Monday-Sunday)
      // JavaScript uses 0 for Sunday, but our system uses 0 for Monday
      const dayOfWeek = selectedDate.getDay() === 0 ? 6 : selectedDate.getDay() - 1

      console.log("Selected day of week:", dayOfWeek)
      console.log("Doctor availability:", doctorAvailability)

      // Find doctor's availability for this day
      const dayAvailability = doctorAvailability.find((a) => a.day_of_week === dayOfWeek)

      console.log("Day availability:", dayAvailability)

      // Check for exceptions
      const dateException = exceptions.find((e) => isSameDay(new Date(e.date), selectedDate))

      console.log("Date exception:", dateException)

      if (dateException && !dateException.is_available) {
        setAvailableSlots([])
        setError(`Doctor unavailable: ${dateException.reason || "No reason provided"}`)
        setIsLoadingSlots(false)
        return
      }

      if (!dayAvailability || !dayAvailability.is_available) {
        setAvailableSlots([])
        setError("Doctor does not have regular hours on this day")
        setIsLoadingSlots(false)
        return
      }

      // Check if doctor is available for appointments
      const doctor = doctors.find((d) => d.id.toString() === selectedDoctor)
      if (doctor && doctor.is_available === false) {
        setAvailableSlots([])
        setError("This doctor is not currently accepting appointments")
        setIsLoadingSlots(false)
        return
      }

      // Generate time slots based on doctor's schedule
      const slots = generateTimeSlots(selectedDate, dayAvailability.start_time, dayAvailability.end_time)

      console.log("Generated time slots:", slots)

      // Mark slots as unavailable if they conflict with existing appointments
      const formattedDate = format(selectedDate, "yyyy-MM-dd")
      const bookedSlots = existingAppointments
        .filter((apt) => apt.date.startsWith(formattedDate) && apt.status !== "cancelled")
        .map((apt) => apt.date.split("T")[1].substring(0, 5)) // Extract HH:MM

      console.log("Booked slots:", bookedSlots)

      // Check daily patient limit
      if (doctor && doctor.daily_patient_limit) {
        const appointmentsForDay = existingAppointments.filter(
          (apt) => apt.date.startsWith(formattedDate) && apt.status !== "cancelled",
        ).length

        if (appointmentsForDay >= doctor.daily_patient_limit) {
          setAvailableSlots([])
          setError(`Doctor has reached the daily limit of ${doctor.daily_patient_limit} patients for this day`)
          setIsLoadingSlots(false)
          return
        }
      }

      const availableTimeSlots = slots.map((slot) => ({
        time: slot,
        is_available: !bookedSlots.includes(slot),
        reason: bookedSlots.includes(slot) ? "Already booked" : undefined,
      }))

      setAvailableSlots(availableTimeSlots)

      if (availableTimeSlots.length === 0) {
        setError("No available time slots for this date")
      } else if (availableTimeSlots.every((slot) => !slot.is_available)) {
        setError("All time slots for this date are booked")
      } else {
        setError(null)
      }
    } catch (error) {
      console.error("Error generating time slots:", error)
      setError("Failed to load available time slots")
    } finally {
      setIsLoadingSlots(false)
    }
  }, [selectedDate, selectedDoctor, doctorAvailability, exceptions, existingAppointments, doctors])

  // Generate time slots from start to end time in 30-minute increments
  function generateTimeSlots(date: Date, startTime: string, endTime: string): string[] {
    const slots: string[] = []

    try {
      console.log(`Generating time slots for date: ${date}, start: ${startTime}, end: ${endTime}`)

      // Parse the start and end times
      let start: Date
      let end: Date

      // Handle different time formats
      if (startTime.includes(":")) {
        // Format: "HH:MM:SS" or "HH:MM"
        const startParts = startTime.split(":").map(Number)
        const endParts = endTime.split(":").map(Number)

        start = new Date(date)
        start.setHours(startParts[0], startParts[1] || 0, 0, 0)

        end = new Date(date)
        end.setHours(endParts[0], endParts[1] || 0, 0, 0)
      } else {
        // Numeric format or fallback
        start = new Date(date)
        start.setHours(Number.parseInt(startTime) || 9, 0, 0, 0)

        end = new Date(date)
        end.setHours(Number.parseInt(endTime) || 17, 0, 0, 0)
      }

      console.log("Parsed start time:", start)
      console.log("Parsed end time:", end)

      // Generate slots in 30-minute increments
      let current = start
      while (current < end) {
        slots.push(format(current, "HH:mm"))
        current = addMinutes(current, 30)
      }

      return slots
    } catch (error) {
      console.error("Error parsing time:", error)

      // Fallback to default time slots
      const defaultStart = new Date(date)
      defaultStart.setHours(9, 0, 0, 0)

      const defaultEnd = new Date(date)
      defaultEnd.setHours(14, 0, 0, 0) // Changed from 17:00 to 14:00 as default end time

      let current = defaultStart
      while (current < defaultEnd) {
        slots.push(format(current, "HH:mm"))
        current = addMinutes(current, 30)
      }

      return slots
    }
  }

  // This function determines if a date should be disabled in the calendar
  const isDateDisabled = (date: Date): boolean => {
    // Check if it's in the past
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (date < today) return true

    // Check if there's an exception for this date
    const hasException = exceptions.some((exception) => {
      const exceptionDate = new Date(exception.date)
      return isSameDay(exceptionDate, date) && !exception.is_available
    })
    if (hasException) return true

    // If there's no availability data at all, enable all dates
    if (doctorAvailability.length === 0) return false

    // Get the day of week (0-6, Monday-Sunday)
    // JavaScript uses 0 for Sunday, but our system uses 0 for Monday
    const dayOfWeek = date.getDay() === 0 ? 6 : date.getDay() - 1

    // Check if the doctor has availability on this day
    const dayAvailability = doctorAvailability.find((a) => a.day_of_week === dayOfWeek)

    // If we have availability data and the day is available, enable the date
    return !(dayAvailability && dayAvailability.is_available)
  }

  // Update the onSubmit function to properly handle the doctor ID
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    if (!selectedDate || !selectedTime || !selectedDoctor) {
      setError("Please fill in all required fields")
      setIsSubmitting(false)
      return
    }

    const appointmentData = {
      doctor: selectedDoctor, // Send the doctor ID as a string, not parsed as a number
      date: `${format(selectedDate, "yyyy-MM-dd")}T${selectedTime}:00`,
      notes: notes,
      blood_type: bloodType,
      medications: medications,
      allergies: allergies,
      medical_conditions: medicalConditions,
      reason_for_visit: reasonForVisit,
      patient_phone: patientPhone,
      gender: gender,
      address: address,
      chronic_diseases: chronicDiseases,
    }

    try {
      // First, update the user profile with the new patient information
      if (user && (gender || address || chronicDiseases)) {
        const userUpdateData = {
          gender: gender || user.gender,
          address: address || user.address,
          chronic_diseases: chronicDiseases || user.chronic_diseases,
        }

        await fetchWithAuth(ENDPOINTS.userProfile, {
          method: "PATCH",
          body: JSON.stringify(userUpdateData),
        })
      }

      // Use the appointments endpoint from the ENDPOINTS object
      console.log("Creating appointment at:", ENDPOINTS.appointments())

      // Then create the appointment
      const response = await fetchWithAuth(ENDPOINTS.appointments(), {
        method: "POST",
        body: JSON.stringify(appointmentData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to create appointment" }))
        throw new Error(errorData.error || "Failed to create appointment")
      }

      toast({
        title: "Success",
        description: "Appointment created successfully",
      })

      router.push("/appointments")
      router.refresh()
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create appointment",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-3xl mx-auto p-4"
    >
      <div className="mb-6 flex items-center">
        <Button variant="ghost" size="sm" asChild className="mr-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
          <Link href="/appointments">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Appointments
          </Link>
        </Button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
          Schedule New Appointment
        </h1>
      </div>

      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={cn(
                "flex-1 h-2 rounded-full mx-1 transition-all duration-300",
                currentStep >= step ? "bg-gradient-to-r from-blue-500 to-cyan-500" : "bg-gray-200 dark:bg-gray-700",
              )}
            />
          ))}
        </div>
        <div className="flex justify-between text-sm text-gray-500 px-1">
          <span className={currentStep >= 1 ? "text-blue-600 font-medium" : ""}>Doctor</span>
          <span className={currentStep >= 2 ? "text-blue-600 font-medium" : ""}>Date & Time</span>
          <span className={currentStep >= 3 ? "text-blue-600 font-medium" : ""}>Patient Info</span>
          <span className={currentStep >= 4 ? "text-blue-600 font-medium" : ""}>Medical Details</span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Step 1: Doctor Selection */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-blue-100 dark:border-blue-900/40 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border-b border-blue-100 dark:border-blue-900/40">
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  Doctor Selection
                </CardTitle>
                <CardDescription>Choose a doctor for your appointment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="doctor" className="text-gray-700 dark:text-gray-300">
                    Doctor
                  </Label>
                  <Select
                    name="doctor"
                    required
                    value={selectedDoctor}
                    onValueChange={(value) => {
                      setSelectedDoctor(value)
                    }}
                  >
                    <SelectTrigger className="border-blue-200 dark:border-blue-800 focus:ring-blue-500">
                      <SelectValue placeholder="Select a doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id.toString()}>
                          Dr. {doctor.name} - {doctor.specialization}
                          {doctor.is_available === false && " (Not accepting appointments)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDoctorDetails && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4 p-4 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/40"
                  >
                    <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center">
                      <User className="h-4 w-4 text-blue-600 mr-2" />
                      Doctor Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <Stethoscope className="h-4 w-4 text-blue-600 mr-2 mt-0.5" />
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Specialization</p>
                          <p className="text-sm font-medium">{selectedDoctorDetails.specialization}</p>
                        </div>
                      </div>

                      {selectedDoctorDetails.medical_center_name && (
                        <div className="flex items-start">
                          <Building className="h-4 w-4 text-blue-600 mr-2 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Medical Center</p>
                            <p className="text-sm font-medium">{selectedDoctorDetails.medical_center_name}</p>
                          </div>
                        </div>
                      )}

                      {selectedDoctorDetails.emergency_available && (
                        <div className="flex items-center mt-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                          <p className="text-sm font-medium text-green-600">Available for emergencies</p>
                        </div>
                      )}

                      {selectedDoctorDetails.consultation_fee && (
                        <div className="flex items-start mt-2 pt-2 border-t border-blue-100 dark:border-blue-900/40">
                          <CreditCard className="h-4 w-4 text-blue-600 mr-2 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Consultation Fee</p>
                            <p className="text-sm font-semibold text-blue-600">
                              £{selectedDoctorDetails.consultation_fee}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </CardContent>
              <CardFooter className="flex justify-end border-t border-blue-100 dark:border-blue-900/40 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!selectedDoctor}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Continue to Date & Time
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Date & Time Selection */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-blue-100 dark:border-blue-900/40 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border-b border-blue-100 dark:border-blue-900/40">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-blue-600" />
                  Appointment Date & Time
                </CardTitle>
                <CardDescription>Select your preferred date and time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-gray-700 dark:text-gray-300">Date</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-4 w-4 text-blue-500" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-blue-100 dark:border-blue-900/40">
                          <p>Dates are disabled if:</p>
                          <ul className="list-disc list-inside text-sm mt-1">
                            <li>Doctor is not available</li>
                            <li>It's in the past</li>
                            <li>It's marked as an exception</li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {isLoadingAvailability ? (
                    <div className="flex items-center justify-center py-8 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/40">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                      <span className="text-blue-600">Loading doctor's schedule...</span>
                    </div>
                  ) : (
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg border border-blue-100 dark:border-blue-900/40 p-4">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          setSelectedDate(date || undefined)
                          setSelectedTime("")
                        }}
                        disabled={isDateDisabled}
                        className="mx-auto"
                        classNames={{
                          day_selected: "bg-gradient-to-r from-blue-600 to-cyan-600 text-white",
                          day_today: "bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100",
                        }}
                      />
                    </div>
                  )}

                  {exceptions.map(
                    (exception) =>
                      selectedDate &&
                      isSameDay(new Date(exception.date), selectedDate) &&
                      !exception.is_available && (
                        <Badge
                          key={exception.date}
                          variant="outline"
                          className="mt-2 bg-red-500/10 text-red-600 border-red-200"
                        >
                          {exception.reason}
                        </Badge>
                      ),
                  )}
                </div>

                {selectedDate && (
                  <div className="space-y-2 mt-4">
                    <Label className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-600" />
                      Available Time Slots
                    </Label>
                    {isLoadingSlots ? (
                      <div className="flex items-center justify-center py-4 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/40">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                        <span className="text-blue-600">Loading available slots...</span>
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2">
                        {availableSlots.map((slot, index) => (
                          <TooltipProvider key={slot.time}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.2, delay: index * 0.03 }}
                                >
                                  <Button
                                    type="button"
                                    variant={selectedTime === slot.time ? "default" : "outline"}
                                    className={cn(
                                      "w-full",
                                      selectedTime === slot.time
                                        ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-transparent"
                                        : "border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/30",
                                      !slot.is_available &&
                                        "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed hover:bg-gray-100",
                                    )}
                                    disabled={!slot.is_available}
                                    onClick={() => setSelectedTime(slot.time)}
                                  >
                                    {slot.time}
                                  </Button>
                                </motion.div>
                              </TooltipTrigger>
                              {!slot.is_available && slot.reason && (
                                <TooltipContent className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-blue-100 dark:border-blue-900/40">
                                  <p>{slot.reason}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/40 text-center">
                        <p className="text-muted-foreground">No available time slots for this date.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t border-blue-100 dark:border-blue-900/40 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
                <Button
                  type="button"
                  onClick={prevStep}
                  variant="outline"
                  className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/30"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={!selectedDate || !selectedTime}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Continue to Patient Info
                </Button>
              </CardFooter>
            </Card>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 rounded-lg bg-red-500/10 p-4 flex items-start gap-2 border border-red-200"
              >
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="text-sm text-red-600">{error}</div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Step 3: Patient Information */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-blue-100 dark:border-blue-900/40 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border-b border-blue-100 dark:border-blue-900/40">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Patient Information
                </CardTitle>
                <CardDescription>Please provide your personal details</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label
                        htmlFor="patientPhone"
                        className="text-gray-700 dark:text-gray-300 flex items-center gap-2"
                      >
                        <Phone className="h-4 w-4 text-blue-600" />
                        Contact Phone
                      </Label>
                      <Input
                        id="patientPhone"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        placeholder="Enter your contact phone number for this appointment"
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400 dark:border-blue-800"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender" className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-600" />
                        Gender
                      </Label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger className="border-blue-200 focus:ring-blue-400 dark:border-blue-800">
                          <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        Address
                      </Label>
                      <Textarea
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Enter your current address"
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400 dark:border-blue-800 min-h-[100px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="chronicDiseases"
                        className="text-gray-700 dark:text-gray-300 flex items-center gap-2"
                      >
                        <Stethoscope className="h-4 w-4 text-blue-600" />
                        Chronic Diseases
                      </Label>
                      <Textarea
                        id="chronicDiseases"
                        value={chronicDiseases}
                        onChange={(e) => setChronicDiseases(e.target.value)}
                        placeholder="List any chronic diseases you have"
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400 dark:border-blue-800 min-h-[100px]"
                      />
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-blue-100 dark:border-blue-900/40 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
                <Button
                  type="button"
                  onClick={prevStep}
                  variant="outline"
                  className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/30"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                  className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Continue to Medical Details
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Medical Information */}
        {currentStep === 4 && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border border-blue-100 dark:border-blue-900/40 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-md">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border-b border-blue-100 dark:border-blue-900/40">
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-blue-600" />
                  Medical Information
                </CardTitle>
                <CardDescription>Please provide your medical details</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="bloodType" className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Heart className="h-4 w-4 text-blue-600" />
                        Blood Type
                      </Label>
                      <Select id="bloodType" value={bloodType} onValueChange={setBloodType}>
                        <SelectTrigger className="border-blue-200 focus:ring-blue-400 dark:border-blue-800">
                          <SelectValue placeholder="Select your blood type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                          <SelectItem value="Unknown">Unknown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="reasonForVisit"
                        className="text-gray-700 dark:text-gray-300 flex items-center gap-2"
                      >
                        <FileText className="h-4 w-4 text-blue-600" />
                        Reason for Visit
                      </Label>
                      <Textarea
                        id="reasonForVisit"
                        value={reasonForVisit}
                        onChange={(e) => setReasonForVisit(e.target.value)}
                        placeholder="Please describe the reason for your appointment..."
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400 dark:border-blue-800 min-h-[100px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="medications" className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Pill className="h-4 w-4 text-blue-600" />
                        Current Medications
                      </Label>
                      <Textarea
                        id="medications"
                        value={medications}
                        onChange={(e) => setMedications(e.target.value)}
                        placeholder="List any medications you are currently taking..."
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400 dark:border-blue-800 min-h-[100px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="allergies" className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-blue-600" />
                        Allergies
                      </Label>
                      <Textarea
                        id="allergies"
                        value={allergies}
                        onChange={(e) => setAllergies(e.target.value)}
                        placeholder="List any allergies you have..."
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400 dark:border-blue-800 min-h-[100px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="medicalConditions"
                        className="text-gray-700 dark:text-gray-300 flex items-center gap-2"
                      >
                        <Activity className="h-4 w-4 text-blue-600" />
                        Previous Medical Conditions
                      </Label>
                      <Textarea
                        id="medicalConditions"
                        value={medicalConditions}
                        onChange={(e) => setMedicalConditions(e.target.value)}
                        placeholder="List any previous medical conditions..."
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400 dark:border-blue-800 min-h-[100px]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        Additional Notes
                      </Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any additional information for the doctor..."
                        className="border-blue-200 focus:border-blue-400 focus:ring-blue-400 dark:border-blue-800 min-h-[100px]"
                      />
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="flex-col space-y-4 border-t border-blue-100 dark:border-blue-900/40 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50">
                <Card className="w-full border border-blue-100 dark:border-blue-900/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      Appointment Summary
                    </h3>
                    {selectedDoctorDetails && (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Doctor</p>
                          <p className="font-medium">Dr. {selectedDoctorDetails.name}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Specialization</p>
                          <p className="font-medium">{selectedDoctorDetails.specialization}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Date</p>
                          <p className="font-medium">{selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Time</p>
                          <p className="font-medium">{selectedTime}</p>
                        </div>
                        {selectedDoctorDetails.consultation_fee && (
                          <div className="col-span-2 mt-1 pt-2 border-t border-blue-100 dark:border-blue-900/40">
                            <p className="text-gray-500 dark:text-gray-400">Consultation Fee</p>
                            <p className="font-semibold text-blue-600">£{selectedDoctorDetails.consultation_fee}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-between w-full">
                  <Button
                    type="button"
                    onClick={prevStep}
                    variant="outline"
                    className="border-blue-200 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/30"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || !reasonForVisit}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      "Confirm Appointment"
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {debugInfo && (
          <div className="rounded-md bg-blue-50/50 dark:bg-blue-950/30 p-4 mt-4 border border-blue-100 dark:border-blue-900/40">
            <details>
              <summary className="cursor-pointer font-medium text-blue-600">Debug Information</summary>
              <pre className="text-xs mt-2 whitespace-pre-wrap overflow-auto max-h-40 bg-white/80 dark:bg-slate-900/80 p-2 rounded-md">
                {debugInfo}
              </pre>
              {rawAvailabilityData && (
                <>
                  <h4 className="text-sm font-medium mt-2 text-blue-600">Raw Availability Data:</h4>
                  <pre className="text-xs mt-1 whitespace-pre-wrap overflow-auto max-h-40 bg-white/80 dark:bg-slate-900/80 p-2 rounded-md">
                    {JSON.stringify(rawAvailabilityData, null, 2)}
                  </pre>
                </>
              )}
            </details>
          </div>
        )}
      </form>
    </motion.div>
  )
}
