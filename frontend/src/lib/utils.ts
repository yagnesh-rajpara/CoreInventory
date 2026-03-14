import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(error: any, defaultMessage: string = 'Operation failed'): string {
  if (!error) return defaultMessage
  
  // Handle Axios/Fetch error objects
  const detail = error.response?.data?.detail || error.detail
  
  if (!detail) return error.message || defaultMessage
  
  // If detail is a string, return it
  if (typeof detail === 'string') return detail
  
  // If detail is an array (FastAPI validation error), format it
  if (Array.isArray(detail)) {
    return detail.map(d => {
      const field = d.loc ? d.loc[d.loc.length - 1] : ''
      return field ? `${field}: ${d.msg}` : d.msg
    }).join(', ')
  }
  
  // Fallback to stringifying
  try {
    return typeof detail === 'object' ? JSON.stringify(detail) : String(detail)
  } catch {
    return defaultMessage
  }
}
