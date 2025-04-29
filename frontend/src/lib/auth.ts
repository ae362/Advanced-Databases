// This file provides a consistent way to make authenticated requests

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem("token")
  
    // Create headers object
    const headers = new Headers(options.headers)
  
    // Add authorization header if token exists
    if (token) {
      // Use Token format as specified in the backend
      headers.set("Authorization", `Token ${token}`)
  
      // Log the token being used (first 10 chars for security)
      console.log(`Using token for authentication: ${token.substring(0, 10)}...`)
    } else {
      console.warn("No authentication token found when making request to:", url)
    }
  
    // Only set Content-Type if not FormData
    const isFormData = options.body instanceof FormData
    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }
  
    try {
      // Make the request with the headers
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include", // Include cookies for cross-origin requests
      })
  
      // Log response for debugging
      console.log(`API response from ${url}: ${response.status}`)
  
      // Handle 401 Unauthorized errors
      if (response.status === 401) {
        console.error("Unauthorized request detected:", url)
  
        // Get response text for debugging
        try {
          const responseText = await response.clone().text()
          console.error("Response text:", responseText)
        } catch (e) {
          console.error("Could not read response text")
        }
      }
  
      return response
    } catch (error) {
      console.error("API request failed:", error)
      throw error
    }
  }
  
  // Special function for login that doesn't require authentication
  export async function fetchForLogin(url: string, options: RequestInit = {}) {
    // Create headers object
    const headers = new Headers(options.headers)
  
    // Only set Content-Type if not FormData
    const isFormData = options.body instanceof FormData
    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json")
    }
  
    try {
      // Make the request with the headers
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include", // Include cookies for cross-origin requests
      })
  
      // Log response for debugging
      console.log(`Login API response from ${url}: ${response.status}`)
  
      return response
    } catch (error) {
      console.error("Login API request failed:", error)
      throw error
    }
  }
  