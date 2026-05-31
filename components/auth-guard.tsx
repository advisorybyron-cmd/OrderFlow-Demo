'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    const auth = localStorage.getItem('torpid_auth')
    if (auth === 'verified') {
      setIsAuthed(true)
    } else {
      setIsAuthed(false)
      router.replace('/password')
    }
  }, [router, pathname])

  if (isAuthed === null) {
    return null // Loading state
  }

  if (!isAuthed) {
    return null // Redirecting
  }

  return <>{children}</>
}
