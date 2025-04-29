import { NextResponse } from "next/server"
import { API_BASE_URL } from "@/config/api"

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json()
    const { appointmentId, status } = body

    if (!appointmentId || !status) {
      return NextResponse.json({ error: "Missing appointmentId or status" }, { status: 400 })
    }

    // Get the auth token from the request headers
    const authHeader = request.headers.get("Authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header provided" }, { status: 401 })
    }

    console.log(`Updating appointment ${appointmentId} to status ${status}`)

    // Try multiple endpoints in sequence until one works
    const endpoints = [
      // Try the direct update endpoint first (new solution)
      `${API_BASE_URL}/api/api/appointments/${appointmentId}/direct-update/`,
      `${API_BASE_URL}/api/api/direct-update-appointment/${appointmentId}/`,
      // Then try the regular update-status endpoint
      `${API_BASE_URL}/api/api/appointments/${appointmentId}/update-status/`,
      // Finally try the standard PATCH endpoint
      `${API_BASE_URL}/api/api/appointments/${appointmentId}/`,
    ]

    let successResponse = null
    let lastError = null

    // Try each endpoint in sequence
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`)

        const response = await fetch(endpoint, {
          method: endpoint.includes("direct-update") ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
          },
          body: JSON.stringify({ status }),
        })

        // Get response data
        let responseData
        try {
          const contentType = response.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            responseData = await response.json()
          } else {
            const textResponse = await response.text()
            responseData = { message: textResponse }
          }
        } catch (error) {
          console.error(`Error parsing response from ${endpoint}:`, error)
          responseData = { message: "Could not parse response" }
        }

        console.log(`Response from ${endpoint}:`, response.status, responseData)

        if (response.ok) {
          successResponse = {
            success: true,
            message: "Appointment status updated successfully",
            data: responseData,
            endpoint: endpoint,
          }
          break
        } else {
          lastError = {
            error: responseData.error || responseData.detail || "Failed to update appointment status",
            status: response.status,
            statusText: response.statusText,
            endpoint: endpoint,
          }
        }
      } catch (error) {
        console.error(`Error with endpoint ${endpoint}:`, error)
        lastError = {
          error: error instanceof Error ? error.message : `Error with endpoint ${endpoint}`,
          endpoint: endpoint,
        }
      }
    }

    // Return success response if any endpoint worked
    if (successResponse) {
      return NextResponse.json(successResponse)
    }

    // Otherwise return the last error
    return NextResponse.json(
      {
        error: lastError?.error || "All endpoints failed",
        details: lastError,
      },
      { status: lastError?.status || 500 },
    )
  } catch (error) {
    console.error("Error in appointment status update API route:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An error occurred during appointment status update",
      },
      { status: 500 },
    )
  }
}
