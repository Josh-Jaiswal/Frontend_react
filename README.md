// lib/api/client.ts

export const apiClient = async (endpoint: string, options: RequestInit = {}) => {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY || 'GoldenEY1479'

  console.log("API KEY BEING SENT:", API_KEY) // debug

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      'X-API-Key': API_KEY,
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text)
  }

  return res
}
