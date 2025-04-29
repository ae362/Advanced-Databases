"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar"
import {
  Users,
  UserPlus,
  LayoutDashboard,
  Calendar,
  Settings,
  ClipboardList,
  UserCog,
  LogOut,
  Moon,
  Sun,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect } from "react"

const navigation = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Patient Management",
    href: "/admin/patients",
    icon: Users,
  },
  {
    name: "Doctor Management",
    href: "/admin/doctors",
    icon: UserCog,
  },
  {
    name: "Create Doctor",
    href: "/admin/doctors/create",
    icon: UserPlus,
  },
  {
    name: "Appointments",
    href: "/admin/appointments",
    icon: Calendar,
  },
  {
    name: "Reports",
    href: "/admin/reports",
    icon: ClipboardList,
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [adminName, setAdminName] = useState("Admin User")

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
    // You could fetch the admin name from localStorage or an API here
    const storedName = localStorage.getItem("userName") || "Admin User"
    setAdminName(storedName)
  }, [])

  const handleLogout = () => {
    // Clear auth tokens
    localStorage.removeItem("token")
    localStorage.removeItem("userName")
    localStorage.removeItem("userRole")

    // Redirect to login page
    window.location.href = "/login"
  }

  return (
    <Sidebar className="border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarHeader className="border-b border-border/40 py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin" className="space-x-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <LayoutDashboard className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Medical System</span>
                  <span className="text-xs text-muted-foreground">Admin Panel</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navigation.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.name}>
                <Link href={item.href} className="space-x-2">
                  <item.icon className="size-4" />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/40 py-2">
        <div className="px-2 mb-2">
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-full justify-start px-2"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4 mr-2" />
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4 mr-2" />
                  <span>Dark Mode</span>
                </>
              )}
            </Button>
          )}
        </div>
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src="/placeholder.svg?height=32&width=32" alt={adminName} />
              <AvatarFallback>{adminName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{adminName}</span>
              <span className="text-xs text-muted-foreground">Administrator</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

