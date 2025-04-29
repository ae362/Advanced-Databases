"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getMediaUrl } from "@/config/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Settings, User } from "lucide-react"
import { useAuth } from "@/hooks/useAuth"

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    roles: ["admin", "doctor"],
  },
  {
    name: "Appointments",
    href: "/appointments",
    roles: ["admin", "doctor", "patient"],
  },
  {
    name: "Doctors",
    href: "/doctors",
    roles: ["admin"],
  },
]

interface UserData {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  avatar?: string
  role?: string
}

export function MainNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, isLoading, user, logout } = useAuth()
  const [userData, setUserData] = useState<UserData | null>(null)

  // Update the useEffect to be more robust in checking auth status
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const storedUser = localStorage.getItem("user")
        const token = localStorage.getItem("token")

        console.log("MainNav checking auth status:", {
          hasStoredUser: !!storedUser,
          hasToken: !!token,
        })

        if (storedUser && token) {
          const parsedUser = JSON.parse(storedUser)
          // Ensure role is set
          if (!parsedUser.role) {
            parsedUser.role = "patient"
            localStorage.setItem("user", JSON.stringify(parsedUser))
          }
          setUserData(parsedUser)
        } else {
          console.log("No valid auth data found in localStorage")
          setUserData(null)
        }
      } catch (error) {
        console.error("Error checking auth status:", error)
        // Clear invalid data
        localStorage.removeItem("user")
        localStorage.removeItem("token")
        setUserData(null)
      }
    }

    checkAuthStatus()

    // Listen for storage changes
    window.addEventListener("storage", checkAuthStatus)
    return () => window.removeEventListener("storage", checkAuthStatus)
  }, [])

  // Update userData when auth state changes
  useEffect(() => {
    if (user) {
      setUserData(user)
    } else if (!isLoading && !isAuthenticated) {
      setUserData(null)
    }
  }, [user, isLoading, isAuthenticated])

  const getInitials = (user: UserData) => {
    return (
      `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() ||
      user.username?.[0]?.toUpperCase() ||
      "U"
    )
  }

  // Filter navigation items based on user role
  const authorizedNavItems = navigation.filter((item) => {
    if (!isAuthenticated || !userData?.role) return false
    return item.roles.includes(userData.role)
  })

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link
              href={isAuthenticated ? (userData?.role === "patient" ? "/appointments" : "/") : "/"}
              className="text-xl font-bold"
            >
              Medical App
            </Link>
            {isAuthenticated && !isLoading && (
              <div className="ml-10 flex items-center space-x-4">
                {authorizedNavItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && userData ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getMediaUrl(userData?.avatar) || "/placeholder.svg"} alt={userData?.username} />
                      <AvatarFallback>{getInitials(userData)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {`${userData.first_name} ${userData.last_name}`}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">{userData.email}</p>
                      <p className="text-xs leading-none text-muted-foreground capitalize">
                        Role: {userData.role || "patient"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              !isLoading && (
                <>
                  <Link href="/login" passHref>
                    <Button variant="ghost" className="mr-2">
                      Login
                    </Button>
                  </Link>
                  <Link href="/register" passHref>
                    <Button>Register</Button>
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
