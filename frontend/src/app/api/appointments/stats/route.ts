import { NextResponse } from "next/server"
import { validateToken } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    // Validate the token
    const tokenValidation = await validateToken(request)
    if (!tokenValidation.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Forward the request to the backend API
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/appointments/stats/`

    const response = await fetch(backendUrl, {
      headers: {
        Authorization: request.headers.get("Authorization") || "",
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      // If the dedicated stats endpoint doesn't exist, we'll handle this in the frontend
      return NextResponse.json({ error: "Failed to fetch appointment stats" }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error in appointments stats API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
