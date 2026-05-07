'use client'

import { useState, useEffect } from 'react'

/**
 * P1: Debounce hook to prevent excessive API calls on search inputs.
 * Delays the value update by the specified delay (default 400ms).
 */
export function useDebounce<T>(value: T, delay: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}
