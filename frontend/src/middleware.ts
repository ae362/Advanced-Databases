import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Get the pathname
  const path = request.nextUrl.pathname

  // Allow debug paths without authentication
  if (
    path.startsWith("/debug") ||
    path.startsWith("/api-debug") ||
    path.startsWith("/system-debug") ||
    path.startsWith("/auth-debug")
  ) {
    return NextResponse.next()
  }

  // All other paths will use client-side auth

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Add paths that need middleware processing
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
