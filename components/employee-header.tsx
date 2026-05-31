'use client'

import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LogOut, Home } from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'

interface EmployeeHeaderProps {
  name: string
  employeeCode: string
  avatarUrl?: string | null
  roomLabel: string
  onLogOut: () => void
  onClockOut?: () => void
  isClockedIn?: boolean
  onClockIn?: () => void
  rightSlot?: React.ReactNode
}

export function EmployeeHeader({
  name,
  employeeCode,
  avatarUrl,
  roomLabel,
  onLogOut,
  onClockOut,
  isClockedIn = false,
  onClockIn,
  rightSlot,
}: EmployeeHeaderProps) {
  const router = useRouter()

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="bg-background border-b px-4 py-3 shrink-0">
      <div className="flex items-center justify-between gap-6">
        {/* Left: avatar + info + clock buttons */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarUrl || undefined} alt={name} />
            <AvatarFallback className="bg-foreground text-background font-bold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div>
            <p className="font-bold leading-tight">{name}</p>
            <p className="text-sm text-muted-foreground font-mono leading-tight">{employeeCode}</p>
            <p className="text-xs text-muted-foreground leading-tight">{roomLabel}</p>
          </div>

          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onLogOut}
              className="h-7 text-xs px-2"
            >
              <LogOut className="h-3 w-3 mr-1" />
              Log Out
            </Button>
            {isClockedIn ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={onClockOut}
                className="h-7 text-xs px-2 bg-red-600 hover:bg-red-700"
              >
                <span className="inline-block animate-wave origin-bottom-right mr-1 text-xs">🔥</span>
                Clock Out
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={onClockIn}
                className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <span className="inline-block mr-1 text-xs">✓</span>
                Clock In
              </Button>
            )}
          </div>
        </div>

        {/* Center: Large Switch Room button */}
        <Button
          onClick={() => router.push('/select-room')}
          className="h-12 px-6 text-base font-bold gap-2 flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Home className="h-5 w-5" />
          Switch Room
        </Button>

        {/* Right: theme toggle + extra actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {rightSlot}
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
