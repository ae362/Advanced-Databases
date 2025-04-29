/**
 * Helper function to handle API responses
 */
export async function handleApiResponse(response: Response) {
    const contentType = response.headers.get("content-type")
    const isJson = contentType && contentType.includes("application/json")
  
    // For JSON responses
    if (isJson) {
      const data = await response.json()
  
      if (!response.ok) {
        // Extract error message from response
        const errorMessage = data.error || data.message || data.detail || "An error occurred"
        throw new Error(errorMessage)
      }
  
      return data
    }
  
    // For non-JSON responses
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`)
    }
  
    return await response.text()
  }
  
  /**
   * Helper function to format API request data
   */
  export function formatRequestData(data: Record<string, any>) {
    // Remove empty string values
    const formattedData: Record<string, any> = {}
  
    for (const [key, value] of Object.entries(data)) {
      if (value !== "") {
        formattedData[key] = value
      }
    }
  
    return formattedData
  }
  
  /**
   * Helper function to fetch with authentication
   */
  export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem("token")
    if (!token) {
      throw new Error("No authentication token found")
    }
  
    const headers = new Headers(options.headers)
    headers.set("Authorization", `Token ${token}`)
    headers.set("Content-Type", "application/json")
  
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include", // Add this to include cookies
      })
  
      if (response.status === 401) {
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        window.location.href = "/login"
        throw new Error("Unauthorized")
      }
  
      return response
    } catch (error) {
      console.error("API request failed:", error)
      throw error
    }
  }
  
  /**
   * Helper function for API requests without authentication
   */
  export async function fetchApi(url: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers)
    headers.set("Content-Type", "application/json")
  
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })
  
      return response
    } catch (error) {
      console.error("API request failed:", error)
      throw error
    }
  }
  