"use client"

import type React from "react"

import { useState, useEffect } from "react"
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

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<string>("patient")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  // Check if we're already authenticated
  useEffect(() => {
    // Clear any "just logged in" flags when the login page loads
    localStorage.removeItem("justLoggedIn")

    // Check if we're already authenticated
    const token = localStorage.getItem("token")
    const user = localStorage.getItem("user")

    if (token && user) {
      try {
        const userData = JSON.parse(user)
        // If already authenticated, redirect to appropriate page
        if (userData.role === "admin") {
          router.push("/admin")
        } else if (userData.role === "doctor") {
          router.push("/doctor-panel")
        } else {
          router.push("/appointments")
        }
      } catch (e) {
        // If parsing fails, clear invalid data
        localStorage.removeItem("token")
        localStorage.removeItem("user")
      }
    }
  }, [router])

  // Clear any redirect flags when the login page loads
  useEffect(() => {
    sessionStorage.removeItem("isRedirecting")
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    setDebugInfo(null)

    try {
      console.log("Login attempt with:", { email, role })

      // Create the request body
      const requestBody = {
        username: email, // Backend might use username for authentication
        email: email,
        password: password,
        role: role,
      }

      // Collect debug info
      let debugLog = "Login attempt debug log:\n"
      debugLog += `Endpoint: ${ENDPOINTS.login}\n`
      debugLog += `Request data: ${JSON.stringify({ ...requestBody, password: "***" })}\n\n`

      // Try multiple login endpoints to ensure we hit the right one
      const loginEndpoints = [
        `${API_BASE_URL}/api/login/`,
        `${API_BASE_URL}/api/api/login/`,
        `${API_BASE_URL}/api/auth/login/`,
        `${API_BASE_URL}/login/`,
      ]

      let response = null
      let successfulEndpoint = null

      for (const endpoint of loginEndpoints) {
        try {
          debugLog += `Trying endpoint: ${endpoint}\n`

          // Direct fetch without any middleware or helper functions
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
            credentials: "include", // Include cookies for cross-origin requests
            mode: "cors", // Add CORS mode explicitly
          })

          debugLog += `Response status: ${response.status} ${response.statusText}\n`

          if (response.status !== 404) {
            successfulEndpoint = endpoint
            break
          }
        } catch (error) {
          debugLog += `Error with endpoint ${endpoint}: ${error}\n`
        }
      }

      if (!response) {
        throw new Error("All login endpoints failed")
      }

      debugLog += `Using endpoint: ${successfulEndpoint}\n`
      console.log("Login response status:", response.status)

      if (!response.ok) {
        let errorMessage = "Login failed"
        try {
          const contentType = response.headers.get("content-type")
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json()
            console.error("Login error data:", errorData)
            errorMessage = errorData.error || errorData.detail || errorData.message || "Login failed"
            debugLog += `Error data: ${JSON.stringify(errorData)}\n`
          } else {
            const errorText = await response.text()
            console.error("Login error text:", errorText)
            debugLog += `Error text: ${errorText}\n`
          }
        } catch (e) {
          console.error("Could not parse error response:", e)
          debugLog += `Error parsing response: ${e instanceof Error ? e.message : String(e)}\n`
        }

        setDebugInfo(debugLog)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log("Login success, received data:", data)
      debugLog += `Success data: ${JSON.stringify(data)}\n`

      // Check if we have the expected data structure
      if (!data.token || !data.user) {
        console.error("Invalid response format:", data)
        debugLog += "Missing token or user data in response\n"
        setDebugInfo(debugLog)
        throw new Error("Invalid response from server")
      }

      // Store authentication data
      localStorage.setItem("token", data.token)
      localStorage.setItem("user", JSON.stringify(data.user))
      localStorage.setItem("justLoggedIn", "true")

      // Store intended role if provided
      if (role) {
        localStorage.setItem("intendedRole", role)
      }

      // Reset any unauthorized counters
      sessionStorage.removeItem("unauthorizedCount")

      // Set the authentication state
      console.log("Authentication state updated:", {
        user: data.user,
        isAuthenticated: true,
      })

      toast({
        title: "Success",
        description: `Logged in successfully as ${role}`,
      })

      // Force direct navigation instead of using router
      const destination = role === "admin" ? "/admin" : role === "doctor" ? "/doctor-panel" : "/appointments"

      console.log(`Redirecting to ${destination} using window.location`)
      window.location.href = destination
    } catch (error) {
      console.error("Login error:", error)
      setError(error instanceof Error ? error.message : "Login failed. Please check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Login</CardTitle>
          <CardDescription className="text-center">Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                placeholder="your.email@example.com"
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
              />
            </div>
            <div>
              <Label htmlFor="role">Login As</Label>
              <Select value={role} onValueChange={setRole} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Patient</SelectItem>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p>
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Register here
              </Link>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              <Link href="/forgot-password" className="hover:underline">
                Forgot your password?
              </Link>
            </p>
          </div>

          {/* Debug info section */}
          {debugInfo && (
            <div className="mt-6 p-3 bg-muted rounded-md">
              <p className="text-xs font-medium mb-2">Debug Information:</p>
              <pre className="text-xs overflow-auto max-h-40 whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          )}

          <div className="mt-4 text-center">
            <Link href="/auth-debug" className="text-xs text-muted-foreground hover:underline">
              Authentication Debug Tool
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
