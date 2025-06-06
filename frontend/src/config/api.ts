// Base API URL - ensure this matches your Django backend URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Base URLs
export const FRONTEND_BASE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000"
export const MEDIA_BASE_URL = process.env.NEXT_PUBLIC_MEDIA_URL || "http://localhost:8000"

// Helper function to ensure trailing slash
const createResourceUrl = (baseUrl: string, id?: number | string) => {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`
  return id ? `${base}${id}/` : base
}

export const ENDPOINTS = {
  base: API_BASE_URL,

  // Auth endpoints - ensure all have /api/ prefix
  login: `${API_BASE_URL}/api/api/login/`,
  logout: `${API_BASE_URL}/api/api/logout/`,
  patientRegister: `${API_BASE_URL}/api/api/register/patient/`,
  doctorRegister: `${API_BASE_URL}/api/api/register/doctor/`,
  validateToken: `${API_BASE_URL}/api/api/validate-token/`,
  csrfToken: `${API_BASE_URL}/api/api/csrf/`,

  // User endpoints
  userProfile: `${API_BASE_URL}/api/api/profile/`,
  avatarUpload: `${API_BASE_URL}/api/api/profile/avatar/`,
  users: (id?: number | string) => (id ? `${API_BASE_URL}/api/api/users/${id}/` : `${API_BASE_URL}/api/api/users/`),

  // Resource endpoints
  appointments: (id?: number | string) =>
    id ? `${API_BASE_URL}/api/api/appointments/${id}/` : `${API_BASE_URL}/api/api/appointments/`,
  doctors: (id?: number | string) => (id ? `${API_BASE_URL}/api/api/doctors/${id}/` : `${API_BASE_URL}/api/api/doctors/`),
  patients: (id?: number | string) => (id ? `${API_BASE_URL}/api/api/patients/${id}/` : `${API_BASE_URL}/api/api/patients/`),

  // Action endpoints
  updateAppointmentStatus: (id: number | string) => `${API_BASE_URL}/api/api/appointments/${id}/update_status/`,
  cancelAppointment: (id: number | string) => `${API_BASE_URL}/api/api/appointments/${id}/cancel/`,

  // Doctor specific endpoints
  doctorAppointments: (doctorId?: number | string) =>
    doctorId ? `${API_BASE_URL}/api/api/appointments/?doctor=${doctorId}` : `${API_BASE_URL}/api/appointments/`,
  patientAppointments: (patientId?: number | string) =>
    patientId ? `${API_BASE_URL}/api/api/appointments/?patient=${patientId}` : `${API_BASE_URL}/api/appointments/`,
  doctorAvailability: (doctorId?: number | string, availabilityId?: number | string) => {
    if (!doctorId) {
      return `${API_BASE_URL}/api/api/doctors/availability/`
    }
    const base = `${API_BASE_URL}/api/api/doctors/${doctorId}/availability`
    return availabilityId ? `${base}/${availabilityId}/` : `${base}/`
  },
  doctorExceptions: (doctorId?: number | string, exceptionId?: number | string) => {
    if (!doctorId) {
      return `${API_BASE_URL}/api/api/doctors/exceptions/`
    }
    const base = `${API_BASE_URL}/api/api/doctors/${doctorId}/exceptions`
    return exceptionId ? `${base}/${exceptionId}/` : `${base}/`
  },
}

export const getMediaUrl = (path?: string) => {
  if (!path) return ""
  // If the path is already a full URL, return it as is
  if (path.startsWith("http")) return path
  // Otherwise, combine it with the media base URL
  return `${MEDIA_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`
}
