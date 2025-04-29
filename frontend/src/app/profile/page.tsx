"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { fetchWithAuth } from "@/utils/api"
import { getMediaUrl } from "@/config/api"
import { Camera, Loader2 } from "lucide-react"
import { getDoctorId } from "@/utils/doctor-utils"

interface DoctorProfile {
  first_name: string
  last_name: string
  email: string
  phone: string
  specialization: string
  qualification: string
  experience_years: string
  consultation_fee: string
  bio: string
  avatar?: string
}

export default function DoctorProfilePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [profile, setProfile] = useState<DoctorProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [doctorId, setDoctorId] = useState<string | null>(null)

  // First, get the doctor ID
  useEffect(() => {
    async function fetchDoctorId() {
      const id = await getDoctorId()
      if (id) {
        setDoctorId(id)
        console.log("Set doctor ID:", id)
        fetchProfile(id)
      } else {
        toast({
          title: "Error",
          description: "Could not determine doctor ID. Please try again later.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }

    fetchDoctorId()
  }, [toast])

  // Update the fetchProfile function to use the correct endpoint with /api/api/ prefix
  async function fetchProfile(id: string) {
    try {
      // Use the correct endpoint with the doctor's ID and /api/api/ prefix
      const endpoint = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/api/doctors/${id}/profile/`
      console.log("Fetching profile from:", endpoint)

      const response = await fetchWithAuth(endpoint)
      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error("Failed to fetch profile")
      }

      const data = await response.json()
      console.log("Profile data:", data)
      setProfile(data)
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Update the handleSubmit function to use the correct endpoint with /api/api/ prefix
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!doctorId) {
      toast({
        title: "Error",
        description: "Doctor ID not available. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const profileData = Object.fromEntries(formData.entries())

    try {
      // Use the correct endpoint with the doctor's ID and /api/api/ prefix
      const endpoint = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/api/doctors/${doctorId}/profile/`
      console.log("Updating profile at:", endpoint)

      const response = await fetchWithAuth(endpoint, {
        method: "PATCH",
        body: JSON.stringify(profileData),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error("Failed to update profile")
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)

      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Update the handleAvatarChange function to use the correct endpoint with /api/api/ prefix
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!doctorId) {
      toast({
        title: "Error",
        description: "Doctor ID not available. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    setIsUploadingAvatar(true)
    const formData = new FormData()
    formData.append("avatar", file)

    try {
      // Use the correct endpoint with the doctor's ID and /api/api/ prefix
      const endpoint = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/api/doctors/${doctorId}/profile/avatar/`
      console.log("Uploading avatar to:", endpoint)

      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error("Failed to upload avatar")
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)

      toast({
        title: "Success",
        description: "Avatar updated successfully",
      })
    } catch (error) {
      console.error("Error uploading avatar:", error)
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold">Doctor Profile</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal and professional information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={getMediaUrl(profile.avatar) || "/placeholder.svg"} alt={profile.first_name} />
                    <AvatarFallback>
                      {profile.first_name?.[0]}
                      {profile.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <Label
                    htmlFor="avatar"
                    className="absolute bottom-0 right-0 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Camera className="h-4 w-4" />
                  </Label>
                </div>
                <div>
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    className="hidden"
                    onChange={handleAvatarChange}
                    disabled={isUploadingAvatar}
                  />
                  <div className="text-sm font-medium">{isUploadingAvatar ? "Uploading..." : "Change avatar"}</div>
                  <p className="text-sm text-muted-foreground">JPEG, PNG or GIF. Square image recommended.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" name="first_name" defaultValue={profile.first_name} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" name="last_name" defaultValue={profile.last_name} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={profile.email} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={profile.phone} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialization">Specialization</Label>
                <Input id="specialization" name="specialization" defaultValue={profile.specialization} />
              </div>

              <div className="space-y-2">
                <Label />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualification">Qualification</Label>
                <Input id="qualification" name="qualification" defaultValue={profile.qualification} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience_years">Years of Experience</Label>
                  <Input
                    id="experience_years"
                    name="experience_years"
                    type="number"
                    defaultValue={profile.experience_years}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consultation_fee">Consultation Fee (£)</Label>
                  <Input
                    id="consultation_fee"
                    name="consultation_fee"
                    type="number"
                    step="0.01"
                    defaultValue={profile.consultation_fee}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  defaultValue={profile.bio}
                  className="min-h-[100px]"
                  placeholder="Write a brief description of your professional background and expertise..."
                />
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
