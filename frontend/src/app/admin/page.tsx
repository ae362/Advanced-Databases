"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserPlus, Calendar, Settings, ClipboardList, UserCog } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  const cards = [
    {
      title: "Patient Management",
      description: "View and manage patient records",
      icon: Users,
      href: "/admin/patients",
    },
    {
      title: "Doctor Management",
      description: "Manage doctor profiles and schedules",
      icon: UserCog,
      href: "/admin/doctors",
    },
    {
      title: "Create Doctor Account",
      description: "Add new doctors to the system",
      icon: UserPlus,
      href: "/admin/doctors/create",
    },
    {
      title: "Appointment Overview",
      description: "View all appointments",
      icon: Calendar,
      href: "/admin/appointments",
    },
    {
      title: "Reports",
      description: "Generate and view system reports",
      icon: ClipboardList,
      href: "/admin/reports",
    },
    {
      title: "System Settings",
      description: "Configure system settings",
      icon: Settings,
      href: "/admin/settings",
    },
  ]

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors border-border/40 h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle>Admin Control Panel</CardTitle>
          <CardDescription>
            Welcome to the admin control panel. From here you can manage all aspects of the medical appointment system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Use the cards above to navigate to different management sections. You can manage patients, create and manage
            doctor accounts, view appointments, generate reports, and configure system settings.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

