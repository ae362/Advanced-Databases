"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ENDPOINTS, API_BASE_URL } from "@/config/api"

export default function RegisterPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [phone, setPhone] = useState("")
  const [birthday, setBirthday] = useState("")
  const [gender, setGender] = useState("")
  const [address, setAddress] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setDebugInfo(null)

    try {
      // Format request data
      const requestData = {
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        username: email.split("@")[0], // Generate username from email
        role: "patient", // Explicitly set role as patient
        phone: phone || undefined,
        birthday: birthday || undefined,
        gender: gender || undefined,
        address: address || undefined,
      }

      console.log("Sending registration data:", { ...requestData, password: "***" })

      // Log the full URL for debugging
      console.log("Registration endpoint:", ENDPOINTS.patientRegister)

      // Try both with and without trailing slash
      const endpointWithSlash = ENDPOINTS.patientRegister.endsWith("/")
        ? ENDPOINTS.patientRegister
        : `${ENDPOINTS.patientRegister}/`

      const endpointWithoutSlash = ENDPOINTS.patientRegister.endsWith("/")
        ? ENDPOINTS.patientRegister.slice(0, -1)
        : ENDPOINTS.patientRegister

      // Try direct URL construction
      const directUrl = `${API_BASE_URL}/api/register/patient/`

      console.log("Trying endpoints:", {
        original: ENDPOINTS.patientRegister,
        withSlash: endpointWithSlash,
        withoutSlash: endpointWithoutSlash,
        directUrl: directUrl,
      })

      // Collect debug info
      let debugLog = "Registration attempt debug log:\n"
      debugLog += `Original endpoint: ${ENDPOINTS.patientRegister}\n`
      debugLog += `With slash: ${endpointWithSlash}\n`
      debugLog += `Without slash: ${endpointWithoutSlash}\n`
      debugLog += `Direct URL: ${directUrl}\n\n`

      // First try with the original endpoint
      debugLog += "Attempt 1: Using original endpoint\n"
      let response = await fetch(ENDPOINTS.patientRegister, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      debugLog += `Response status: ${response.status} ${response.statusText}\n`

      // If that fails with 404, try with explicit slash
      if (response.status === 404) {
        debugLog += "\nAttempt 2: Using endpoint with explicit slash\n"
        console.log("First attempt failed with 404, trying with explicit slash")
        response = await fetch(endpointWithSlash, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        })
        debugLog += `Response status: ${response.status} ${response.statusText}\n`
      }

      // If that still fails, try without slash
      if (response.status === 404) {
        debugLog += "\nAttempt 3: Using endpoint without slash\n"
        console.log("Second attempt failed with 404, trying without slash")
        response = await fetch(endpointWithoutSlash, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        })
        debugLog += `Response status: ${response.status} ${response.statusText}\n`
      }

      // If all attempts fail, try a direct URL
      if (response.status === 404) {
        debugLog += "\nAttempt 4: Using direct URL construction\n"
        console.log("All attempts failed with 404, trying direct URL")
        response = await fetch(directUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestData),
        })
        debugLog += `Response status: ${response.status} ${response.statusText}\n`
      }

      console.log("Registration response status:", response.status)
      debugLog += `\nFinal response status: ${response.status} ${response.statusText}\n`

      if (!response.ok) {
        let errorMessage = "Registration failed"
        try {
          const contentType = response.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json()
            console.error("Registration error data:", errorData)
            errorMessage = errorData.error || errorData.message || "Registration failed"
            debugLog += `Error data: ${JSON.stringify(errorData)}\n`
          } else {
            const errorText = await response.text()
            console.error("Registration error text:", errorText)
            debugLog += `Error text: ${errorText}\n`
          }
        } catch (e) {
          console.error("Could not parse error response:", e)
          debugLog += `Error parsing response: ${e instanceof Error ? e.message : String(e)}\n`
        }

        // Set debug info for display
        setDebugInfo(debugLog)
        throw new Error(errorMessage)
      }

      // Try to parse the response
      try {
        const data = await response.json()
        console.log("Registration success, received data:", data)
        debugLog += `Success data: ${JSON.stringify(data)}\n`

        // Store authentication data
        if (data.token && data.user) {
          localStorage.setItem("token", data.token)
          localStorage.setItem("user", JSON.stringify(data.user))

          toast({
            title: "Success",
            description: "Registered successfully",
          })

          // Redirect to appointments page
          router.push("/appointments")
        } else {
          debugLog += "Missing token or user data in response\n"
          throw new Error("Invalid response from server")
        }
      } catch (parseError) {
        console.error("Error parsing response:", parseError)
        debugLog += `Error parsing success response: ${parseError instanceof Error ? parseError.message : String(parseError)}\n`

        // Set debug info for display
        setDebugInfo(debugLog)
        throw new Error("Invalid response format from server")
      }
    } catch (error) {
      console.error("Registration error:", error)
      setError(error instanceof Error ? error.message : "Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Register as Patient</CardTitle>
          <CardDescription className="text-center">Create an account to book appointments</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={8}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="birthday">Date of Birth</Label>
              <Input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                disabled={isLoading}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label htmlFor="gender">Gender</Label>
              <Select value={gender} onValueChange={setGender} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isLoading}
                placeholder="Optional"
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </Button>
          </form>
          <p className="mt-4 text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Login here
            </Link>
          </p>

          {/* Debug info section */}
          {debugInfo && (
            <div className="mt-6 p-3 bg-muted rounded-md">
              <p className="text-xs font-medium mb-2">Debug Information:</p>
              <pre className="text-xs overflow-auto max-h-40 whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          )}

          <div className="mt-4 text-center">
            <Link href="/api-debug" className="text-xs text-muted-foreground hover:underline">
              Debug API Endpoints
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
