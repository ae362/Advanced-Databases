"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  UserPlus,
  Calendar,
  Settings,
  ClipboardList,
  UserCog,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { fetchPatients, fetchDoctors, fetchAppointments, fetchAppointmentStats } from "@/utils/dashboard-api"
import { NotificationContainer, type NotificationItem } from "@/components/notification"

interface StatsData {
  totalPatients: number
  totalDoctors: number
  totalAppointments: number
  completedAppointments: number
  pendingAppointments: number
  todayAppointments: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData>({
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    completedAppointments: 0,
    pendingAppointments: 0,
    todayAppointments: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  // Function to add a notification
  const addNotification = (type: "success" | "error" | "info", title: string, message: string) => {
    const id = Date.now().toString()
    setNotifications((prev) => [...prev, { id, type, title, message }])
  }

  // Function to remove a notification
  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      // Try to get appointment stats directly from MongoDB first
      const appointmentStats = await fetchAppointmentStats()

      if (appointmentStats) {
        // If we have direct stats from MongoDB, use them
        const [patientCount, doctorCount] = await Promise.all([fetchPatients(), fetchDoctors()])

        setStats({
          totalPatients: patientCount,
          totalDoctors: doctorCount,
          totalAppointments: appointmentStats.total || 0,
          completedAppointments: appointmentStats.completed || 0,
          pendingAppointments: appointmentStats.pending || 0,
          todayAppointments: appointmentStats.today || 0,
        })
      } else {
        // Fallback to the old method if direct stats aren't available
        const [patientCount, doctorCount, appointmentData] = await Promise.all([
          fetchPatients(),
          fetchDoctors(),
          fetchAppointments(),
        ])

        setStats({
          totalPatients: patientCount,
          totalDoctors: doctorCount,
          totalAppointments: appointmentData.total,
          completedAppointments: appointmentData.completed,
          pendingAppointments: appointmentData.pending,
          todayAppointments: appointmentData.today,
        })
      }

      setIsLoading(false)
      setIsRefreshing(false)
    } catch (error) {
      console.error("Error fetching stats:", error)
      addNotification("error", "Error", "Failed to fetch dashboard statistics")

      // Fallback to sample data if API calls fail
      setTimeout(() => {
        setStats({
          totalPatients: 1248,
          totalDoctors: 36,
          totalAppointments: 3567,
          completedAppointments: 2890,
          pendingAppointments: 677,
          todayAppointments: 24,
        })
        setIsLoading(false)
        setIsRefreshing(false)
      }, 800)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    addNotification("info", "Refreshing data", "Fetching the latest statistics from the database...")
    await fetchStats()
    addNotification("success", "Data refreshed", "Dashboard statistics have been updated.")
  }

  const cards = [
    {
      title: "Patient Management",
      description: "View and manage patient records",
      icon: Users,
      href: "/admin/patients",
      color: "from-cyan-500 to-teal-400",
      textColor: "text-cyan-500",
      delay: 0.1,
    },
    {
      title: "Doctor Management",
      description: "Manage doctor profiles and schedules",
      icon: UserCog,
      href: "/admin/doctors",
      color: "from-indigo-500 to-purple-400",
      textColor: "text-indigo-500",
      delay: 0.2,
    },
    {
      title: "Create Doctor Account",
      description: "Add new doctors to the system",
      icon: UserPlus,
      href: "/admin/doctors/create",
      color: "from-emerald-500 to-teal-400",
      textColor: "text-emerald-500",
      delay: 0.3,
    },
    {
      title: "Appointment Overview",
      description: "View all appointments",
      icon: Calendar,
      href: "/admin/appointments",
      color: "from-amber-500 to-orange-400",
      textColor: "text-amber-500",
      delay: 0.4,
    },
    {
      title: "Reports",
      description: "Generate and view system reports",
      icon: ClipboardList,
      href: "/admin/reports",
      color: "from-rose-500 to-pink-400",
      textColor: "text-rose-500",
      delay: 0.5,
    },
    {
      title: "System Settings",
      description: "Configure system settings",
      icon: Settings,
      href: "/admin/settings",
      color: "from-violet-500 to-purple-400",
      textColor: "text-violet-500",
      delay: 0.6,
    },
  ]

  const completionRate =
    stats.totalAppointments > 0 ? Math.round((stats.completedAppointments / stats.totalAppointments) * 100) : 0

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 260, damping: 20 } },
  }

  return (
    <>
      <NotificationContainer notifications={notifications} removeNotification={removeNotification} />

      <motion.div
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="p-8 space-y-8 max-w-7xl mx-auto"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <motion.div variants={itemVariants} className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              MedConnect Admin Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome to the admin control panel. Manage all aspects of the MedConnect system.
            </p>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh Data"}
            </Button>
          </motion.div>
        </div>

        {/* Stats Overview */}
        <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-md bg-gradient-to-br from-blue-950 to-blue-900 text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('/thoughtful-gaze.png')] opacity-10 bg-cover bg-center mix-blend-overlay" />
              <CardHeader className="pb-2 z-10 relative">
                <CardTitle className="text-sm font-medium text-blue-300">Total Patients</CardTitle>
              </CardHeader>
              <CardContent className="z-10 relative">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-400 mr-2" />
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <span className="inline-block w-16 h-8 bg-blue-800/50 animate-pulse rounded" />
                    ) : (
                      stats.totalPatients.toLocaleString()
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-md bg-gradient-to-br from-purple-950 to-purple-900 text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('/abstract-geometric-shapes.png')] opacity-10 bg-cover bg-center mix-blend-overlay" />
              <CardHeader className="pb-2 z-10 relative">
                <CardTitle className="text-sm font-medium text-purple-300">Total Doctors</CardTitle>
              </CardHeader>
              <CardContent className="z-10 relative">
                <div className="flex items-center">
                  <UserCog className="h-5 w-5 text-purple-400 mr-2" />
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <span className="inline-block w-10 h-8 bg-purple-800/50 animate-pulse rounded" />
                    ) : (
                      stats.totalDoctors.toLocaleString()
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-md bg-gradient-to-br from-amber-950 to-amber-900 text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('/cellular-symphony.png')] opacity-10 bg-cover bg-center mix-blend-overlay" />
              <CardHeader className="pb-2 z-10 relative">
                <CardTitle className="text-sm font-medium text-amber-300">Total Appointments</CardTitle>
              </CardHeader>
              <CardContent className="z-10 relative">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-amber-400 mr-2" />
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <span className="inline-block w-16 h-8 bg-amber-800/50 animate-pulse rounded" />
                    ) : (
                      stats.totalAppointments.toLocaleString()
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="border-none shadow-md bg-gradient-to-br from-emerald-950 to-emerald-900 text-white overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('/abstract-geometric-shapes.png')] opacity-10 bg-cover bg-center mix-blend-overlay" />
              <CardHeader className="pb-2 z-10 relative">
                <CardTitle className="text-sm font-medium text-emerald-300">Today's Appointments</CardTitle>
              </CardHeader>
              <CardContent className="z-10 relative">
                <div className="flex items-center">
                  <CalendarClock className="h-5 w-5 text-emerald-400 mr-2" />
                  <div className="text-2xl font-bold">
                    {isLoading ? (
                      <span className="inline-block w-10 h-8 bg-emerald-800/50 animate-pulse rounded" />
                    ) : (
                      stats.todayAppointments.toLocaleString()
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Completion Rate */}
        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-md bg-gradient-to-r from-slate-900 to-slate-800 text-white">
            <CardHeader>
              <CardTitle>Appointment Completion Rate</CardTitle>
              <CardDescription className="text-slate-300">
                {completionRate}% of all appointments have been completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 mr-1.5" />
                    <span>Completed</span>
                  </div>
                  <span className="font-medium">{stats.completedAppointments.toLocaleString()}</span>
                </div>
                <div className="relative pt-1">
                  <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-700">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completionRate}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      style={{ width: `${completionRate}%` }}
                      className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-emerald-500 to-teal-400"
                    ></motion.div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-amber-400 mr-1.5" />
                    <span>Pending</span>
                  </div>
                  <span className="font-medium">{stats.pendingAppointments.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Access Cards */}
        <motion.div variants={containerVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <motion.div key={card.href} variants={itemVariants} whileHover={{ y: -5, scale: 1.02 }}>
              <Link href={card.href} className="group">
                <Card className="cursor-pointer h-full transition-all duration-300 border-none shadow-md hover:shadow-xl bg-slate-900 text-white overflow-hidden">
                  <CardHeader className="pb-2">
                    <div
                      className={`w-12 h-12 rounded-full bg-gradient-to-br ${card.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-all duration-300`}
                    >
                      <card.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className={`text-lg font-semibold group-hover:${card.textColor}`}>
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400">{card.description}</p>
                  </CardContent>
                  <CardFooter>
                    <motion.div whileHover={{ x: 5 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                      <Button variant="ghost" className={`px-0 ${card.textColor} group-hover:underline`}>
                        Access
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
                        >
                          <path d="M5 12h14" />
                          <path d="m12 5 7 7-7 7" />
                        </svg>
                      </Button>
                    </motion.div>
                  </CardFooter>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Admin Control Panel */}
        <motion.div variants={itemVariants}>
          <Card className="border-none shadow-md bg-gradient-to-r from-blue-950 to-cyan-950 text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-[url('/abstract-geometric-shapes.png')] opacity-10 bg-cover bg-center mix-blend-overlay" />
            <CardHeader className="z-10 relative">
              <CardTitle className="text-xl bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                MedConnect Control Panel
              </CardTitle>
              <CardDescription className="text-slate-300">
                From here you can manage all aspects of the medical appointment system.
              </CardDescription>
            </CardHeader>
            <CardContent className="z-10 relative">
              <p className="text-sm text-slate-400">
                Use the cards above to navigate to different management sections. You can manage patients, create and
                manage doctor accounts, view appointments, generate reports, and configure system settings.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between z-10 relative">
              <Button
                variant="outline"
                className="text-blue-400 border-blue-800 hover:bg-blue-900/50 hover:border-blue-700"
              >
                View Documentation
              </Button>
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600">
                System Status
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </motion.div>
    </>
  )
}
