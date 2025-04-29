import { ENDPOINTS } from "@/config/api"

// Helper function to fetch with authentication
export const fetchWithAuth = async (url: string) => {
  try {
    const token = localStorage.getItem("token")
    const response = await fetch(url, {
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    })
    return response
  } catch (error) {
    console.error("API Error:", error)
    throw error
  }
}

// Fetch all patients from the API
export const fetchPatients = async () => {
  try {
    const response = await fetchWithAuth(ENDPOINTS.patients())
    if (response.ok) {
      const data = await response.json()
      return data.length || data.count || 0
    }
    return 0
  } catch (error) {
    console.error("Failed to fetch patients:", error)
    return 0
  }
}

// Fetch all doctors from the API
export const fetchDoctors = async () => {
  try {
    const response = await fetchWithAuth(ENDPOINTS.doctors())
    if (response.ok) {
      const data = await response.json()
      return data.length || data.count || 0
    }
    return 0
  } catch (error) {
    console.error("Failed to fetch doctors:", error)
    return 0
  }
}

// Fetch all appointments and process them
export const fetchAppointments = async () => {
  try {
    const response = await fetchWithAuth(ENDPOINTS.appointments())
    if (response.ok) {
      const appointments = await response.json()
      const allAppointments = Array.isArray(appointments) ? appointments : appointments.results || []

      // Count completed and scheduled appointments
      let completed = 0
      let pending = 0
      let today = 0

      const currentDate = new Date().toISOString().split("T")[0]

      allAppointments.forEach((appointment: any) => {
        // Check for MongoDB style status field (lowercase "completed" or "scheduled")
        if (appointment.status && appointment.status.toLowerCase() === "completed") {
          completed++
        } else if (
          appointment.status &&
          (appointment.status.toLowerCase() === "scheduled" || appointment.status.toLowerCase() === "pending")
        ) {
          pending++
        }

        // Check if appointment is today
        if (appointment.date) {
          // Handle ISO date format from MongoDB
          const appointmentDate = appointment.date.split("T")[0]
          if (appointmentDate === currentDate) {
            today++
          }
        }
      })

      return {
        total: allAppointments.length,
        completed,
        pending,
        today,
      }
    }
    return { total: 0, completed: 0, pending: 0, today: 0 }
  } catch (error) {
    console.error("Failed to fetch appointments:", error)
    return { total: 0, completed: 0, pending: 0, today: 0 }
  }
}

// Direct MongoDB query for appointment stats (if available)
export const fetchAppointmentStats = async () => {
  try {
    // Try to use a dedicated stats endpoint if available
    const response = await fetchWithAuth(`${ENDPOINTS.base}/api/appointments/stats`)
    if (response.ok) {
      return await response.json()
    }
    return null
  } catch (error) {
    console.error("Failed to fetch appointment stats:", error)
    return null
  }
}
