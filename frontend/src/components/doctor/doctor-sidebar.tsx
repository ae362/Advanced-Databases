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
} from "@/components/ui/sidebar"
import { LayoutDashboard, Calendar, Clock, Users, ClipboardList, Settings, UserCircle } from "lucide-react"

const navigation = [
  {
    name: "Dashboard",
    href: "/doctor-panel",
    icon: LayoutDashboard,
  },
  {
    name: "My Appointments",
    href: "/doctor-panel/appointments",
    icon: Calendar,
  },
  {
    name: "Availability",
    href: "/doctor-panel/availability",
    icon: Clock,
  },
  {
    name: "My Patients",
    href: "/doctor-panel/patients",
    icon: Users,
  },
  {
    name: "Medical Records",
    href: "/doctor-panel/records",
    icon: ClipboardList,
  },
  {
    name: "Profile",
    href: "/doctor-panel/profile",
    icon: UserCircle,
  },
  {
    name: "Settings",
    href: "/doctor-panel/settings",
    icon: Settings,
  },
]

export function DoctorSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r border-border/40">
      <SidebarHeader className="border-b border-border/40">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/doctor-panel" className="space-x-2">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <LayoutDashboard className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Doctor Panel</span>
                  <span className="text-xs text-muted-foreground">Medical System</span>
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
      <SidebarRail />
    </Sidebar>
  )
}

