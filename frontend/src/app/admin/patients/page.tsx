"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { useToast } from "@/hooks/use-toast"
import { ENDPOINTS } from "@/config/api"
import { fetchWithAuth } from "@/utils/api"
import { MoreHorizontal, Loader2, Search, UserPlus, RefreshCw } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Patient {
  id: number
  email: string
  first_name: string
  last_name: string
  phone: string
  birthday: string
  medical_history: string
  status: "active" | "inactive"
  gender?: string
  address?: string
  chronic_diseases?: string
  recent_doctor?: number
  recent_doctor_name?: string
  past_examinations?: string
}

export default function AdminPatientsPage() {
  const { toast } = useToast()
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedPatient, setEditedPatient] = useState<Partial<Patient>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([])
  const [showAddPatientDialog, setShowAddPatientDialog] = useState(false)
  const [newPatient, setNewPatient] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    gender: "",
    address: "",
    birthday: "",
    medical_history: "",
    chronic_diseases: "",
  })

  useEffect(() => {
    fetchPatients()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = patients.filter(
        (patient) =>
          patient.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.email?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredPatients(filtered)
    } else {
      setFilteredPatients(patients)
    }
  }, [searchTerm, patients])

  async function fetchPatients() {
    try {
      const response = await fetchWithAuth(ENDPOINTS.users())
      if (!response.ok) throw new Error("Failed to fetch patients")
      const data = await response.json()
      const patientUsers = data.filter((user: any) => user.role === "patient")
      setPatients(patientUsers)
      setFilteredPatients(patientUsers)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load patients",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStatusChange = async (patientId: number, newStatus: "active" | "inactive") => {
    try {
      const response = await fetchWithAuth(`${ENDPOINTS.users(patientId)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error("Failed to update status")

      setPatients(patients.map((patient) => (patient.id === patientId ? { ...patient, status: newStatus } : patient)))

      toast({
        title: "Success",
        description: "Patient status updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update patient status",
        variant: "destructive",
      })
    }
  }

  const handleEdit = async () => {
    if (!selectedPatient) return

    setIsSubmitting(true)
    try {
      const response = await fetchWithAuth(`${ENDPOINTS.users(selectedPatient.id)}`, {
        method: "PATCH",
        body: JSON.stringify(editedPatient),
      })

      if (!response.ok) throw new Error("Failed to update patient")

      const updatedPatient = await response.json()
      setPatients(
        patients.map((patient) => (patient.id === selectedPatient.id ? { ...patient, ...updatedPatient } : patient)),
      )

      setIsEditing(false)
      setSelectedPatient(null)
      setEditedPatient({})

      toast({
        title: "Success",
        description: "Patient information updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update patient information",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (patientId: number) => {
    try {
      const response = await fetchWithAuth(`${ENDPOINTS.users(patientId)}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete patient")

      setPatients(patients.filter((patient) => patient.id !== patientId))
      toast({
        title: "Success",
        description: "Patient deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete patient",
        variant: "destructive",
      })
    }
  }

  const handleAddPatient = async () => {
    setIsSubmitting(true)
    try {
      // Validate required fields
      if (!newPatient.first_name || !newPatient.last_name || !newPatient.email) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      // Create a password for the new patient (in a real app, you might want to send an email with a reset link)
      const tempPassword = Math.random().toString(36).slice(-8) + "A1!"

      const patientData = {
        ...newPatient,
        password: tempPassword,
        role: "patient",
        status: "active",
      }

      const response = await fetchWithAuth(`${ENDPOINTS.patientRegister}`, {
        method: "POST",
        body: JSON.stringify(patientData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create patient")
      }

      const data = await response.json()

      // Add the new patient to the list
      setPatients([...patients, data])
      setFilteredPatients([...filteredPatients, data])

      setShowAddPatientDialog(false)
      setNewPatient({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        gender: "",
        address: "",
        birthday: "",
        medical_history: "",
        chronic_diseases: "",
      })

      toast({
        title: "Success",
        description: "Patient added successfully",
      })
    } catch (error) {
      console.error("Error adding patient:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add patient",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Patient Management</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchPatients} className="h-9">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" className="h-9" onClick={() => setShowAddPatientDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patients by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 max-w-md"
        />
      </div>

      <Card className="border-border/40 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle>All Patients</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-240px)]">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead className="hidden lg:table-cell">Birthday</TableHead>
                    <TableHead className="hidden lg:table-cell">Gender</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No patients found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPatients.map((patient) => (
                      <TableRow key={patient.id} className="hover:bg-muted/40">
                        <TableCell className="font-medium">{patient.id}</TableCell>
                        <TableCell>{`${patient.first_name} ${patient.last_name}`}</TableCell>
                        <TableCell className="hidden md:table-cell">{patient.email}</TableCell>
                        <TableCell className="hidden md:table-cell">{patient.phone || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{patient.birthday || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell">{patient.gender || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={patient.status === "active" ? "default" : "secondary"} className="capitalize">
                            {patient.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedPatient(patient)
                                  setIsEditing(false)
                                }}
                              >
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedPatient(patient)
                                  setEditedPatient({ ...patient })
                                  setIsEditing(true)
                                }}
                              >
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(patient.id, patient.status === "active" ? "inactive" : "active")
                                }
                              >
                                {patient.status === "active" ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the patient&apos;s
                                      account and remove their data from the system.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(patient.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={selectedPatient !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPatient(null)
            setIsEditing(false)
            setEditedPatient({})
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Patient Information" : "Patient Details"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Update the patient's information using the form below."
                : "View detailed information about the patient."}
            </DialogDescription>
          </DialogHeader>

          {selectedPatient && (
            <ScrollArea className="h-[calc(90vh-200px)] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={isEditing ? editedPatient.first_name : selectedPatient.first_name}
                      onChange={(e) => setEditedPatient({ ...editedPatient, first_name: e.target.value })}
                      readOnly={!isEditing}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={isEditing ? editedPatient.last_name : selectedPatient.last_name}
                      onChange={(e) => setEditedPatient({ ...editedPatient, last_name: e.target.value })}
                      readOnly={!isEditing}
                      className="bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={isEditing ? editedPatient.email : selectedPatient.email}
                    onChange={(e) => setEditedPatient({ ...editedPatient, email: e.target.value })}
                    readOnly={!isEditing}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={isEditing ? editedPatient.phone : selectedPatient.phone}
                    onChange={(e) => setEditedPatient({ ...editedPatient, phone: e.target.value })}
                    readOnly={!isEditing}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input
                    id="birthday"
                    type="date"
                    value={isEditing ? editedPatient.birthday : selectedPatient.birthday}
                    onChange={(e) => setEditedPatient({ ...editedPatient, birthday: e.target.value })}
                    readOnly={!isEditing}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  {isEditing ? (
                    <Select
                      value={editedPatient.gender}
                      onValueChange={(value) => setEditedPatient({ ...editedPatient, gender: value })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="gender"
                      value={selectedPatient.gender || "Not specified"}
                      readOnly
                      className="bg-background"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={isEditing ? editedPatient.address : selectedPatient.address}
                    onChange={(e) => setEditedPatient({ ...editedPatient, address: e.target.value })}
                    readOnly={!isEditing}
                    className="bg-background min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chronic_diseases">Chronic Diseases</Label>
                  <Textarea
                    id="chronic_diseases"
                    value={isEditing ? editedPatient.chronic_diseases : selectedPatient.chronic_diseases}
                    onChange={(e) => setEditedPatient({ ...editedPatient, chronic_diseases: e.target.value })}
                    readOnly={!isEditing}
                    className="bg-background min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recent_doctor">Recent Doctor</Label>
                  <Input
                    id="recent_doctor"
                    value={selectedPatient.recent_doctor_name || "None"}
                    readOnly
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="past_examinations">Past Medical Examinations</Label>
                  <Textarea
                    id="past_examinations"
                    value={isEditing ? editedPatient.past_examinations : selectedPatient.past_examinations}
                    onChange={(e) => setEditedPatient({ ...editedPatient, past_examinations: e.target.value })}
                    readOnly={!isEditing}
                    className="bg-background min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="medical_history">Medical History</Label>
                  <Textarea
                    id="medical_history"
                    value={isEditing ? editedPatient.medical_history : selectedPatient.medical_history}
                    onChange={(e) => setEditedPatient({ ...editedPatient, medical_history: e.target.value })}
                    readOnly={!isEditing}
                    className="bg-background min-h-[100px]"
                  />
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false)
                    setEditedPatient({})
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleEdit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPatient(null)
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsEditing(true)
                    setEditedPatient({ ...selectedPatient })
                  }}
                >
                  Edit
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showAddPatientDialog} onOpenChange={setShowAddPatientDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Add New Patient</DialogTitle>
            <DialogDescription>Create a new patient account. A temporary password will be generated.</DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[calc(90vh-200px)] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new_first_name" className="required">
                    First Name
                  </Label>
                  <Input
                    id="new_first_name"
                    value={newPatient.first_name}
                    onChange={(e) => setNewPatient({ ...newPatient, first_name: e.target.value })}
                    className="bg-background"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new_last_name" className="required">
                    Last Name
                  </Label>
                  <Input
                    id="new_last_name"
                    value={newPatient.last_name}
                    onChange={(e) => setNewPatient({ ...newPatient, last_name: e.target.value })}
                    className="bg-background"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_email" className="required">
                  Email
                </Label>
                <Input
                  id="new_email"
                  type="email"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                  className="bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_phone">Phone</Label>
                <Input
                  id="new_phone"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_birthday">Birthday</Label>
                <Input
                  id="new_birthday"
                  type="date"
                  value={newPatient.birthday}
                  onChange={(e) => setNewPatient({ ...newPatient, birthday: e.target.value })}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_gender">Gender</Label>
                <Select
                  value={newPatient.gender}
                  onValueChange={(value) => setNewPatient({ ...newPatient, gender: value })}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select gender" />
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
                <Label htmlFor="new_address">Address</Label>
                <Textarea
                  id="new_address"
                  value={newPatient.address}
                  onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                  className="bg-background min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_chronic_diseases">Chronic Diseases</Label>
                <Textarea
                  id="new_chronic_diseases"
                  value={newPatient.chronic_diseases}
                  onChange={(e) => setNewPatient({ ...newPatient, chronic_diseases: e.target.value })}
                  className="bg-background min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_medical_history">Medical History</Label>
                <Textarea
                  id="new_medical_history"
                  value={newPatient.medical_history}
                  onChange={(e) => setNewPatient({ ...newPatient, medical_history: e.target.value })}
                  className="bg-background min-h-[100px]"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPatientDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPatient} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Patient"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

