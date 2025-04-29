"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2, ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Form validation schema
const doctorSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  first_name: z.string().min(2, "First name is required"),
  last_name: z.string().min(2, "Last name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  specialization: z.string().min(2, "Specialization is required"),
  qualification: z.string().min(2, "Qualification is required"),
  experience_years: z.string().min(1, "Years of experience is required"),
  bio: z.string().min(10, "Brief bio is required"),
  consultation_fee: z.string().min(1, "Consultation fee is required"),
  available_days: z.string().optional(),
  username: z.string().optional(), // Add username field
})

type FormData = z.infer<typeof doctorSchema>

// Define a proper type for debug info
interface DebugInfo {
  authInfo?: {
    tokenPreview?: string
    endpoint?: string
    requestMethod?: string
    userRole?: string
    usedUrl?: string
  }
  responseInfo?: {
    status?: number
    statusText?: string
    data?: any
    text?: string
  }
}

const specializations = [
  "General Medicine",
  "Pediatrics",
  "Cardiology",
  "Dermatology",
  "Orthopedics",
  "Neurology",
  "Psychiatry",
  "Gynecology",
  "Ophthalmology",
  "ENT",
  "Other",
]

export default function CreateDoctorPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormData>({
    resolver: zodResolver(doctorSchema),
    defaultValues: {
      consultation_fee: "20.00",
      experience_years: "0",
    },
  })

  const formValues = watch()

  useEffect(() => {
    const checkAdminAccess = () => {
      const token = localStorage.getItem("token")
      const user = localStorage.getItem("user")

      if (!token || !user) {
        toast({
          title: "Access Denied",
          description: "You must be logged in to access this page",
          variant: "destructive",
        })
        router.push("/login")
        return
      }

      try {
        const userData = JSON.parse(user)
        if (userData.role !== "admin") {
          toast({
            title: "Access Denied",
            description: "Only administrators can create doctor accounts",
            variant: "destructive",
          })
          router.push("/")
        }
      } catch (e) {
        console.error("Error parsing user data:", e)
        localStorage.removeItem("user")
        localStorage.removeItem("token")
        router.push("/login")
      }
    }

    checkAdminAccess()
  }, [router, toast])

  // Update the onSubmit function to include more debugging and handle the response better

  // Find the onSubmit function and replace it with this implementation
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setAuthError(null)
    setDebugInfo(null)

    try {
      // Generate username from email if not provided
      const username = data.username || data.email.split("@")[0]

      // Prepare the doctor registration data
      const doctorData = {
        username,
        email: data.email,
        password: data.password,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone,
        role: "doctor",
        // Doctor specific fields
        specialization: data.specialization,
        qualification: data.qualification,
        experience_years: Number.parseInt(data.experience_years),
        consultation_fee: Number.parseFloat(data.consultation_fee).toFixed(2),
        available_days: data.available_days || null,
        bio: data.bio,
      }

      // Get the admin token
      const token = localStorage.getItem("token")
      if (!token) {
        setAuthError("No authentication token found. Please log in as admin.")
        throw new Error("No authentication token found. Please log in as admin.")
      }

      // Get user data for debugging
      let userData = null
      try {
        const userStr = localStorage.getItem("user")
        if (userStr) {
          userData = JSON.parse(userStr)
        }
      } catch (e) {
        console.error("Error parsing user data:", e)
      }

      // Debug info for token
      const newDebugInfo: DebugInfo = {
        authInfo: {
          tokenPreview: token.substring(0, 10) + "...",
          endpoint: "/api/register/doctor", // Local API route
          requestMethod: "POST",
          userRole: userData?.role || "unknown",
        },
      }

      console.log("Sending doctor registration request with token:", token.substring(0, 10) + "...")
      console.log("Current user role:", userData?.role)

      // Use our local API route with the enhanced implementation
      const response = await fetch("/api/register/doctor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorData,
          adminToken: token,
        }),
      })

      // Log response status for debugging
      if (response) {
        newDebugInfo.responseInfo = {
          status: response.status,
          statusText: response.statusText,
        }
      }

      console.log("Server response status:", response.status, response.statusText)

      // Try to parse response as JSON
      let responseData
      try {
        responseData = await response.json()
        if (newDebugInfo.responseInfo) {
          newDebugInfo.responseInfo.data = responseData
        }
        console.log("Server response:", responseData)

        // Add the URL that was used to the debug info
        if (responseData.usedUrl) {
          if (newDebugInfo.authInfo) {
            newDebugInfo.authInfo.usedUrl = responseData.usedUrl
          }
          console.log("Used URL:", responseData.usedUrl)
        }
      } catch (e) {
        const textResponse = await response.text()
        if (newDebugInfo.responseInfo) {
          newDebugInfo.responseInfo.text = textResponse
        }
        console.log("Server text response:", textResponse)
      }

      setDebugInfo(newDebugInfo)

      if (!response.ok) {
        // Handle specific validation errors
        if (responseData && responseData.errors) {
          const errorMessage = Object.entries(responseData.errors)
            .map(([key, value]) => `${key}: ${value}`)
            .join("\n")
          throw new Error(errorMessage)
        }

        // Handle authentication errors
        if (response.status === 401) {
          setAuthError("Authentication failed. Please log out and log in again.")
          throw new Error("Authentication failed. Please log out and log in again.")
        }

        throw new Error(
          responseData?.message || responseData?.error || responseData?.detail || "Failed to create doctor account",
        )
      }

      toast({
        title: "Success",
        description: "Doctor account created successfully",
      })

      router.push("/admin/doctors")
      router.refresh()
    } catch (error) {
      console.error("Error creating doctor:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create doctor account",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Function to handle logout and redirect to login
  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/doctors">
                <ArrowLeft className="h-4 w-4" />
                Back to Doctors
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Create Doctor Account</h1>
          <p className="text-muted-foreground">Add a new doctor to the medical system.</p>
        </div>
      </div>

      {authError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-col gap-2">
            <p>{authError}</p>
            <div className="flex gap-2 mt-2">
              <Button onClick={handleLogout} variant="outline" size="sm">
                Log Out and Log In Again
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {debugInfo && (
        <Card className="bg-muted">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>Technical details for troubleshooting</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-40">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Doctor Information</CardTitle>
            <CardDescription>Enter the doctor&apos;s personal and professional details.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-250px)] pr-4">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input id="first_name" {...register("first_name")} placeholder="John" />
                    {errors.first_name && <p className="text-sm text-destructive">{errors.first_name.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input id="last_name" {...register("last_name")} placeholder="Doe" />
                    {errors.last_name && <p className="text-sm text-destructive">{errors.last_name.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register("email")} placeholder="doctor@example.com" />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" {...register("password")} placeholder="••••••••" />
                  {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...register("phone")} placeholder="+1 (555) 000-0000" />
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Select
                    onValueChange={(value) => setValue("specialization", value)}
                    defaultValue={formValues.specialization}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      {specializations.map((spec) => (
                        <SelectItem key={spec} value={spec}>
                          {spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.specialization && <p className="text-sm text-destructive">{errors.specialization.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input id="qualification" {...register("qualification")} placeholder="MD, MBBS, etc." />
                  {errors.qualification && <p className="text-sm text-destructive">{errors.qualification.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experience_years">Years of Experience</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    min="0"
                    {...register("experience_years")}
                    placeholder="5"
                  />
                  {errors.experience_years && (
                    <p className="text-sm text-destructive">{errors.experience_years.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consultation_fee">
                    Consultation Fee (£)
                    <span className="text-sm text-muted-foreground ml-2">Minimum: £20.00</span>
                  </Label>
                  <Input
                    id="consultation_fee"
                    type="number"
                    step="0.01"
                    min="20.00"
                    {...register("consultation_fee")}
                    placeholder="20.00"
                  />
                  {errors.consultation_fee && (
                    <p className="text-sm text-destructive">{errors.consultation_fee.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="available_days">Available Days</Label>
                  <Input id="available_days" {...register("available_days")} placeholder="Monday to Friday" />
                  {errors.available_days && <p className="text-sm text-destructive">{errors.available_days.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    {...register("bio")}
                    placeholder="Brief professional background and expertise..."
                    className="min-h-[100px]"
                  />
                  {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting || !!authError}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    "Create Doctor Account"
                  )}
                </Button>
                <div className="mt-4 border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    If the normal registration fails, try the direct method:
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={async () => {
                      setIsSubmitting(true)
                      try {
                        // Get form values
                        const formValuesSnapshot = watch()
                        const username = formValuesSnapshot.email.split("@")[0]
                        const formValues = {
                          username: username,
                          email: formValuesSnapshot.email,
                          password: formValuesSnapshot.password,
                          first_name: formValuesSnapshot.first_name,
                          last_name: formValuesSnapshot.last_name,
                          phone: formValuesSnapshot.phone,
                          role: "doctor",
                          specialization: formValuesSnapshot.specialization,
                          qualification: formValuesSnapshot.qualification,
                          experience_years: Number.parseInt(formValuesSnapshot.experience_years),
                          consultation_fee: Number.parseFloat(formValuesSnapshot.consultation_fee).toFixed(2),
                          available_days: formValuesSnapshot.available_days || null,
                          bio: formValuesSnapshot.bio,
                        }

                        // Try direct registration endpoint without requiring admin token
                        const response = await fetch("/api/direct-register/doctor", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            doctorData: formValues,
                          }),
                        })

                        const data = await response.json()

                        if (!response.ok) {
                          throw new Error(data.error || data.detail || "Direct registration failed")
                        }

                        toast({
                          title: "Success",
                          description: "Doctor account created successfully via direct method",
                        })

                        router.push("/admin/doctors")
                      } catch (error) {
                        console.error("Direct registration error:", error)
                        toast({
                          title: "Direct Registration Failed",
                          description: error instanceof Error ? error.message : "Failed to create doctor account",
                          variant: "destructive",
                        })
                      } finally {
                        setIsSubmitting(false)
                      }
                    }}
                  >
                    Try Direct Registration Method
                  </Button>
                </div>
              </form>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Preview of the doctor&apos;s profile information.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-250px)] pr-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">
                    Dr. {formValues.first_name || "First"} {formValues.last_name || "Last"}
                  </h3>
                  <p className="text-sm text-muted-foreground">{formValues.specialization || "Specialization"}</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Email:</span> {formValues.email || "email@example.com"}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Phone:</span> {formValues.phone || "Not provided"}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Qualification:</span> {formValues.qualification || "Not provided"}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Experience:</span>{" "}
                    {formValues.experience_years ? `${formValues.experience_years} years` : "Not provided"}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Consultation Fee:</span>{" "}
                    {formValues.consultation_fee ? `£${formValues.consultation_fee}` : "Not provided"}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Available:</span> {formValues.available_days || "Not provided"}
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Professional Bio</h4>
                  <p className="text-sm text-muted-foreground">{formValues.bio || "No bio provided yet..."}</p>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
