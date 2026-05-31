'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Star, User, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

// Small stacked avatars for employees who worked on an order
function EmployeeAvatarStack({ avatars, max = 4 }: { avatars: EmployeeAvatar[], max?: number }) {
  if (!avatars || avatars.length === 0) return null
  const visible = avatars.slice(0, max)
  const overflow = avatars.length - max

  return (
    <div className="flex items-center mt-1.5">
      <div className="flex -space-x-1.5">
        {visible.map((emp) => (
          <div
            key={emp.id}
            title={emp.name}
            className="relative h-5 w-5 rounded-full border border-background overflow-hidden bg-muted flex-shrink-0"
          >
            {emp.avatar_url ? (
              <Image
                src={emp.avatar_url}
                alt={emp.name}
                fill
                className="object-cover"
                sizes="20px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
                <span className="text-[8px] font-bold leading-none">
                  {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        ))}
        {overflow > 0 && (
          <div className="h-5 w-5 rounded-full border border-background bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-[8px] font-bold text-muted-foreground">+{overflow}</span>
          </div>
        )}
      </div>
    </div>
  )
}

interface EmployeeAvatar {
  id: string
  name: string
  avatar_url: string | null
  employee_code: string | null
}

interface LiveActivity {
  // Order activity fields
  order_number?: string
  location?: string
  previous_location?: string
  scanned_at: string
  activity_type: 'order' | 'employee'
  // Order employee contributors
  employee_avatars?: EmployeeAvatar[]
  // Shipper info for "Shipped" cards
  shipped_by_name?: string | null
  shipper_employee?: EmployeeAvatar | null
  // Employee activity fields
  employee_name?: string
  employee_code?: string
  employee_avatar_url?: string | null
  event_type?: 'clock_in' | 'clock_out' | 'position_switch'
  position_name?: string
  previous_position?: string
}

interface LiveActivityFeedProps {
  className?: string
  maxItems?: number
  pollInterval?: number
  variant?: 'default' | 'compact' | 'minimal' | 'ticker'
  enableInfiniteScroll?: boolean
}

// Helper to generate action-oriented messages
function getActionMessage(activity: LiveActivity): string {
  if (activity.activity_type === 'employee') {
    const name = activity.employee_name?.split(' ')[0] || 'Someone' // First name only
    if (activity.event_type === 'position_switch') {
      return `${name} just moved to ${activity.position_name}!`
    } else if (activity.event_type === 'clock_in') {
      return `${name} just clocked into ${activity.position_name}!`
    } else if (activity.event_type === 'clock_out') {
      return `${name} just clocked out!`
    }
    return `${name} is now at ${activity.position_name}!`
  } else {
    // Order activity - create action-oriented message based on location
    const location = activity.location?.toLowerCase() || ''
    if (location.includes('ship') || location === 'shipped!') {
      return `Order #${activity.order_number} just shipped!`
    } else if (location.includes('press') || location.includes('heat')) {
      return `Order #${activity.order_number} just got pressed!`
    } else if (location.includes('dtf') || location.includes('print')) {
      return `Order #${activity.order_number} just got printed!`
    } else if (location.includes('bundle') || location.includes('pack')) {
      return `Order #${activity.order_number} just got bundled!`
    } else if (location.includes('quality') || location.includes('check')) {
      return `Order #${activity.order_number} passed QC!`
    }
    return `Order #${activity.order_number} moved to ${activity.location}!`
  }
}

export function LiveActivityFeed({ 
  className, 
  maxItems = 10,
  pollInterval = 10000,
  variant = 'default',
  enableInfiniteScroll = false
}: LiveActivityFeedProps) {
  const [activities, setActivities] = useState<LiveActivity[]>([])
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set())
  const previousActivitiesRef = useRef<string[]>([])
  
  // Infinite scroll state
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Load more activities for infinite scroll
  const loadMoreActivities = useCallback(async () => {
    if (isLoadingMore || !hasMore || !enableInfiniteScroll) return
    
    setIsLoadingMore(true)
    try {
      const nextOffset = activities.length
      const res = await fetch(`/api/order-locations/recent?limit=${maxItems}&offset=${nextOffset}`)
      if (res.ok) {
        const data = await res.json()
        const moreActivities = data.locations || []
        if (moreActivities.length > 0) {
          setActivities(prev => [...prev, ...moreActivities])
          setHasMore(data.hasMore)
          setOffset(nextOffset + moreActivities.length)
        } else {
          setHasMore(false)
        }
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, enableInfiniteScroll, activities.length, maxItems])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!enableInfiniteScroll || variant !== 'default') return
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreActivities()
        }
      },
      { threshold: 0.1 }
    )
    
    const loadMoreEl = loadMoreRef.current
    if (loadMoreEl) {
      observer.observe(loadMoreEl)
    }
    
    return () => {
      if (loadMoreEl) {
        observer.unobserve(loadMoreEl)
      }
    }
  }, [enableInfiniteScroll, variant, hasMore, isLoadingMore, loadMoreActivities])

  useEffect(() => {
    // Sync WhenIWork activity periodically (every 30 seconds)
    // This captures clock-ins/outs done directly on WhenIWork website
    const syncWhenIWork = async () => {
      try {
        await fetch('/api/wheniwork/sync-activity', { method: 'POST' })
      } catch {
        // Silently fail - this is a background sync
      }
    }

    // Initial sync
    syncWhenIWork()
    // Sync every 30 seconds
    const syncInterval = setInterval(syncWhenIWork, 30000)

    const fetchActivity = async () => {
      try {
        const res = await fetch(`/api/order-locations/recent?limit=${maxItems}`)
        if (res.ok) {
          const data = await res.json()
          const newActivities = data.locations || []
          
          // Set hasMore from API response
          if (enableInfiniteScroll) {
            setHasMore(data.hasMore ?? true)
          }
          
          // Detect new items by comparing with previous fetch
          const newIds = new Set<string>()
          const getActivityId = (a: LiveActivity) => 
            a.activity_type === 'employee' 
              ? `emp-${a.employee_code}-${a.scanned_at}`
              : `order-${a.order_number}-${a.scanned_at}`
          
          newActivities.forEach((activity: LiveActivity) => {
            const activityId = getActivityId(activity)
            if (!previousActivitiesRef.current.includes(activityId)) {
              newIds.add(activityId)
            }
          })
          
          // Update previous activities reference
          previousActivitiesRef.current = newActivities.map(getActivityId)
          
          setNewActivityIds(newIds)
          setActivities(newActivities)
          
          // Clear "new" status after animation
          if (newIds.size > 0) {
            setTimeout(() => setNewActivityIds(new Set()), 3000)
          }
        }
      } catch {
        // Silently fail
      }
    }

    fetchActivity()
    const interval = setInterval(fetchActivity, pollInterval)
    return () => {
      clearInterval(interval)
      clearInterval(syncInterval)
    }
  }, [pollInterval])

  const formatTime = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'h:mm a') + ' EST'
    } catch {
      return ''
    }
  }

  // Ticker variant - full-width scrolling footer with detailed messages like the default card
  if (variant === 'ticker') {
    const hasNewActivity = newActivityIds.size > 0
    const tickerItems = activities.slice(0, maxItems).map(activity => {
      const activityId = activity.activity_type === 'employee'
        ? `emp-${activity.employee_code}-${activity.scanned_at}`
        : `order-${activity.order_number}-${activity.scanned_at}`
      return {
        id: activityId,
        activity,
        isNew: newActivityIds.has(activityId)
      }
    })

    return (
      <footer className={cn(
        "fixed bottom-0 left-0 right-0 bg-card border-t-4 overflow-hidden z-50 transition-all duration-300",
        hasNewActivity ? "border-t-green-500" : "border-t-amber-500",
        className
      )}>
        {/* Full footer green shimmer flash when new activity arrives */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/40 to-green-500/0 pointer-events-none z-20",
          hasNewActivity ? "animate-footer-flash" : "opacity-0"
        )} />
        
        {/* Pulsing glow effect on new activity */}
        <div className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-300",
          hasNewActivity ? "animate-glow-green opacity-100" : "opacity-0"
        )} />
        
        {/* Header bar */}
        <div className={cn(
          "flex items-center gap-2 px-4 py-1.5 border-b border-border transition-all duration-300 relative z-10",
          hasNewActivity ? "bg-green-500/20" : "bg-amber-500/10"
        )}>
          <ArrowRight className={cn(
            "h-4 w-4 transition-colors duration-300",
            hasNewActivity ? "text-green-500 animate-bounce" : "text-amber-500 animate-pulse"
          )} />
          <span className={cn(
            "text-sm font-semibold transition-colors duration-300",
            hasNewActivity ? "text-green-500" : "text-amber-500"
          )}>
            {hasNewActivity ? "New Activity!" : "Live Activity"}
          </span>
          {hasNewActivity && (
            <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse">
              NEW
            </span>
          )}
        </div>
        
        {/* Gradient fade on right edge only */}
        <div className="absolute right-0 top-10 bottom-0 w-24 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
        
        {/* Static content - new items push from left with dramatic animation */}
        <div className={cn(
          "flex items-center gap-3 py-3 px-4 overflow-hidden relative z-[1]",
          hasNewActivity && "animate-cards-shift"
        )}>
          {tickerItems.length === 0 ? (
            <span className="text-muted-foreground text-sm">Waiting for activity...</span>
          ) : (
            tickerItems.map((item, index) => {
              const { activity, isNew } = item
              const isNewest = index === 0
              const isEmployee = activity.activity_type === 'employee'
              
              return (
                <div
                  key={item.id}
                  className={cn(
                    "relative flex-shrink-0 px-4 py-2 rounded-lg border transition-all duration-700 ease-out",
                    isNewest && isNew
                      ? "bg-green-500/20 border-green-500 shadow-lg shadow-green-500/30 animate-new-card-enter scale-105"
                      : isNewest
                        ? "bg-amber-500/15 border-amber-500/60 shadow-md shadow-amber-500/20"
                        : "bg-card/80 border-border/50",
                    !isNewest && hasNewActivity && "animate-card-push-right"
                  )}
                  style={{
                    animationDelay: !isNewest ? `${index * 50}ms` : '0ms'
                  }}
                >
                  {/* Intense shimmer effect on newest new item */}
                  {isNewest && isNew && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/50 to-transparent animate-shimmer-fast pointer-events-none overflow-hidden rounded-lg" />
                  )}
                  
                  {/* Regular shimmer for other items */}
                  {!(isNewest && isNew) && (
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-r from-transparent to-transparent animate-shimmer-sweep pointer-events-none overflow-hidden rounded-lg",
                      isEmployee ? "via-blue-400/30" : "via-amber-400/30",
                      isNewest ? "opacity-100" : "opacity-30"
                    )} />
                  )}
                  
                  {/* Star/sparkle for newest item */}
                  {isNewest && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <Star className={cn(
                        "h-5 w-5 drop-shadow-lg",
                        isNew 
                          ? "text-green-500 fill-green-400 animate-spin-slow" 
                          : "text-amber-500 fill-amber-400 animate-twinkle"
                      )} />
                    </div>
                  )}
                  
                  {/* Sparkle burst effect for new items */}
                  {isNewest && isNew && (
                    <>
                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-green-400 rounded-full animate-sparkle-1" />
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-sparkle-2" />
                      <div className="absolute top-1/2 -left-2 w-1.5 h-1.5 bg-green-300 rounded-full animate-sparkle-3" />
                    </>
                  )}
                  
                  <div className="flex items-start gap-3 relative z-[1]">
                    <ArrowRight className={cn(
                      "h-4 w-4 flex-shrink-0 mt-0.5 transition-colors duration-300",
                      isNewest && isNew ? "text-green-500" : isNewest ? "text-amber-500" : "text-muted-foreground"
                    )} />
                    <div className="max-w-[200px]">
                      <p className="text-sm leading-tight">
                        {isEmployee ? (
                          activity.event_type === 'clock_out' ? (
                            <>
                              <span className={cn(
                                "font-semibold transition-colors duration-300",
                                isNewest && isNew ? "text-green-700 dark:text-green-300" : "text-foreground"
                              )}>{activity.employee_name}</span>
                              <span className="font-semibold text-red-600">{" clocked out"}</span>
                            </>
                          ) : activity.event_type === 'clock_in' ? (
                            <>
                              <span className={cn(
                                "font-semibold transition-colors duration-300",
                                isNewest && isNew ? "text-green-700 dark:text-green-300" : "text-foreground"
                              )}>{activity.employee_name}</span>
                              <span className="text-muted-foreground">{" clocked in at "}</span>
                              <span className="font-semibold text-green-600">{activity.position_name}</span>
                            </>
                          ) : (
                            <>
                              <span className={cn(
                                "font-semibold transition-colors duration-300",
                                isNewest && isNew ? "text-green-700 dark:text-green-300" : "text-foreground"
                              )}>{activity.employee_name}</span>
                              {activity.previous_position ? (
                                <>
                                  <span className="text-muted-foreground">{" moved from "}</span>
                                  <span className="font-semibold text-amber-600">{activity.previous_position}</span>
                                  <span className="text-muted-foreground">{" to "}</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">{" moved to "}</span>
                              )}
                              <span className="font-semibold text-green-600">{activity.position_name}</span>
                            </>
                          )
                        ) : (
                          <>
                            <span className={cn(
                              "font-semibold transition-colors duration-300",
                              isNewest && isNew ? "text-green-700 dark:text-green-300" : "text-foreground"
                            )}>Order {activity.order_number}</span>
                            <span className="text-muted-foreground">{" at "}</span>
                            <span className="font-semibold text-green-600">{activity.location}!</span>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatTime(activity.scanned_at)}</p>
                      {/* Shipper avatar for Shipped cards */}
                      {!isEmployee && activity.location === 'Shipped' && activity.shipper_employee && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <div className="relative h-5 w-5 rounded-full overflow-hidden border border-background flex-shrink-0" title={activity.shipper_employee.name}>
                            {activity.shipper_employee.avatar_url ? (
                              <Image src={activity.shipper_employee.avatar_url} alt={activity.shipper_employee.name} fill className="object-cover" sizes="20px" />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                                <span className="text-[8px] font-bold">{activity.shipper_employee.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}</span>
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{activity.shipper_employee.name.split(' ')[0]}</span>
                        </div>
                      )}
                      {/* Employee avatar stack for non-Shipped order activities */}
                      {!isEmployee && activity.location !== 'Shipped' && activity.employee_avatars && activity.employee_avatars.length > 0 && (
                        <EmployeeAvatarStack avatars={activity.employee_avatars} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </footer>
    )
  }

  // Minimal variant - single line ticker style for footers
  if (variant === 'minimal') {
    const latestActivity = activities[0]
    return (
      <div className={cn("flex items-center gap-2 text-xs", className)}>
        <ArrowRight className="h-3 w-3 text-amber-500 animate-pulse flex-shrink-0" />
        {latestActivity ? (
          <span className="text-muted-foreground truncate">
            {latestActivity.activity_type === 'employee' ? (
              <>
                <span className="font-medium text-foreground">{latestActivity.employee_name}</span>
                {' → '}
                <span className="text-green-600">{latestActivity.position_name}</span>
              </>
            ) : (
              <>
                <span className="font-medium text-foreground">#{latestActivity.order_number}</span>
                {' → '}
                <span className="text-green-600">{latestActivity.location}</span>
              </>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">No recent activity</span>
        )}
      </div>
    )
  }

  // Compact variant - horizontal scrolling for sidebars/headers
  if (variant === 'compact') {
    return (
      <div className={cn("border-l-2 border-l-amber-500 bg-card/50 rounded-r-lg p-2", className)}>
        <div className="flex items-center gap-2 mb-2">
          <ArrowRight className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
          <span className="text-xs font-semibold text-amber-500">Live Activity</span>
        </div>
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-xs text-center py-2">No recent activity</p>
          ) : (
            activities.slice(0, maxItems).map((activity, index) => {
              const activityId = activity.activity_type === 'employee'
                ? `emp-${activity.employee_code}-${activity.scanned_at}`
                : `order-${activity.order_number}-${activity.scanned_at}`
              const isNewest = index === 0
              
              return (
                <div 
                  key={activityId}
                  className={cn(
                    "text-xs py-1 px-2 rounded",
                    isNewest ? "bg-amber-500/10 border border-amber-500/30" : "bg-muted/30"
                  )}
                >
                  {activity.activity_type === 'employee' ? (
                    <span>
                      <span className="font-medium text-foreground">{activity.employee_name}</span>
                      {' → '}
                      <span className="text-green-600">{activity.position_name}</span>
                    </span>
                  ) : (
                    <span>
                      <span className="font-medium text-foreground">#{activity.order_number}</span>
                      {' → '}
                      <span className="text-green-600">{activity.location}</span>
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  // Default variant - full card with all details
  return (
    <Card className={cn("border-l-4 border-l-amber-500 bg-card", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5 text-amber-500 animate-pulse" />
          <CardTitle className="text-amber-500">Live Activity</CardTitle>
        </div>
      </CardHeader>
      <CardContent 
        ref={scrollContainerRef}
        className={cn(
          "space-y-3 overflow-y-auto",
          enableInfiniteScroll ? "max-h-[calc(100vh-300px)]" : "max-h-[600px]"
        )}
      >
        {activities.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No recent activity</p>
        ) : (
          <>
            {(enableInfiniteScroll ? activities : activities.slice(0, maxItems)).map((activity, index) => {
              const activityId = activity.activity_type === 'employee'
                ? `emp-${activity.employee_code}-${activity.scanned_at}`
                : `order-${activity.order_number}-${activity.scanned_at}`
              const isNew = newActivityIds.has(activityId)
              const isNewest = index === 0
              
              return (
                <ActivityCard
                  key={activityId}
                  activity={activity}
                  isNew={isNew}
                  isNewest={isNewest}
                  formatTime={formatTime}
                />
              )
            })}
            
            {/* Infinite scroll load more trigger */}
            {enableInfiniteScroll && (
              <div ref={loadMoreRef} className="py-4 flex justify-center">
                {isLoadingMore ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading more...</span>
                  </div>
                ) : hasMore ? (
                  <span className="text-xs text-muted-foreground">Scroll for more</span>
                ) : (
                  <span className="text-xs text-muted-foreground">No more activity</span>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

interface ActivityCardProps {
  activity: LiveActivity
  isNew: boolean
  isNewest: boolean
  formatTime: (date: string) => string
}

function ActivityCard({ activity, isNew, isNewest, formatTime }: ActivityCardProps) {
  const isEmployeeActivity = activity.activity_type === 'employee'
  const hasPreviousLocation = activity.previous_location && 
    activity.previous_location !== activity.location

  // Determine border color based on activity type - theme-aware
  const borderColor = isEmployeeActivity 
    ? isNewest ? "border-blue-500 shadow-lg shadow-blue-500/20" : "border-blue-500/30"
    : isNewest ? "border-amber-500 shadow-lg shadow-amber-500/20" : "border-amber-500/30"
  
  const shimmerColor = isEmployeeActivity 
    ? "via-blue-500/20" 
    : "via-amber-500/20"
  
  const bgColor = isEmployeeActivity ? "bg-blue-500/10" : "bg-amber-500/10"
  const starColor = isEmployeeActivity ? "text-blue-500 fill-blue-400" : "text-amber-500 fill-amber-400"
  const iconColor = isEmployeeActivity ? "text-blue-500" : "text-amber-500"

  return (
    <div
      className={cn(
        "relative rounded-lg border p-3 transition-all duration-500 overflow-hidden",
        borderColor,
        !isNewest && "bg-card",
        isNewest && "animate-glow-pulse",
        isNew && "animate-slide-in"
      )}
    >
      {/* Shimmer overlay for newest item */}
      {isNewest && (
        <div className={cn("absolute inset-0 bg-gradient-to-r from-transparent to-transparent animate-shimmer-sweep pointer-events-none", shimmerColor)} />
      )}
      
      {/* Background glow for newest */}
      {isNewest && (
        <div className={cn("absolute inset-0 pointer-events-none", bgColor)} />
      )}
      
      {/* Star icon for newest activity */}
      {isNewest && (
        <div className="absolute -top-1 -right-1 z-10">
          <Star className={cn("h-5 w-5 animate-twinkle drop-shadow-md", starColor)} />
        </div>
      )}
      
      <div className="relative flex items-start gap-2 z-[1]">
        {isEmployeeActivity ? (
          activity.employee_avatar_url ? (
            <div className="relative h-7 w-7 rounded-full overflow-hidden flex-shrink-0 mt-0.5 border border-border">
              <Image src={activity.employee_avatar_url} alt={activity.employee_name || ''} fill className="object-cover" sizes="28px" />
            </div>
          ) : (
            <User className={cn("h-4 w-4 mt-1 flex-shrink-0", iconColor)} />
          )
        ) : (
          <ArrowRight className={cn("h-4 w-4 mt-1 flex-shrink-0", iconColor)} />
        )}
        <div className="flex-1 min-w-0">
          {isEmployeeActivity ? (
            // Employee activity message
            <p className="text-sm">
              {activity.event_type === 'position_switch' && activity.previous_position ? (
                <>
                  <span className="font-bold text-foreground">{activity.employee_name}</span>
                  {' '}
                  <span className="text-muted-foreground">moved from</span>
                  {' '}
                  <span className="font-medium text-orange-600">{activity.previous_position}</span>
                  {' '}
                  <span className="text-muted-foreground">to</span>
                  {' '}
                  <span className="font-medium text-green-600">{activity.position_name}!</span>
                </>
              ) : activity.event_type === 'clock_in' ? (
                <>
                  <span className="font-bold text-foreground">{activity.employee_name}</span>
                  {' '}
                  <span className="text-muted-foreground">clocked into</span>
                  {' '}
                  <span className="font-medium text-green-600">{activity.position_name}!</span>
                </>
              ) : activity.event_type === 'clock_out' ? (
                <>
                  <span className="font-bold text-foreground">{activity.employee_name}</span>
                  {' '}
                  <span className="text-muted-foreground">clocked out!</span>
                </>
              ) : (
                <>
                  <span className="font-bold text-foreground">{activity.employee_name}</span>
                  {' '}
                  <span className="text-muted-foreground">clocked into</span>
                  {' '}
                  <span className="font-medium text-green-600">{activity.position_name}!</span>
                </>
              )}
            </p>
          ) : hasPreviousLocation ? (
            // Order movement message
            <p className="text-sm">
              <span className="font-bold text-foreground">Order {activity.order_number}</span>
              {' '}
              <span className="text-muted-foreground">just moved from</span>
              {' '}
              <span className="font-medium text-orange-600">{activity.previous_location}</span>
              {' '}
              <span className="text-muted-foreground">to</span>
              {' '}
              <span className="font-medium text-green-600">{activity.location}!</span>
            </p>
          ) : (
            // Order entry message
            <p className="text-sm">
              <span className="font-bold text-foreground">Order {activity.order_number}</span>
              {' '}
              <span className="text-muted-foreground">entered production at</span>
              {' '}
              <span className="font-medium text-green-600">{activity.location}!</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {formatTime(activity.scanned_at)}
          </p>
          {/* Shipper avatar for Shipped cards */}
          {!isEmployeeActivity && activity.location === 'Shipped' && activity.shipper_employee && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="relative h-6 w-6 rounded-full overflow-hidden border border-border flex-shrink-0" title={activity.shipper_employee.name}>
                {activity.shipper_employee.avatar_url ? (
                  <Image src={activity.shipper_employee.avatar_url} alt={activity.shipper_employee.name} fill className="object-cover" sizes="24px" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <span className="text-[9px] font-bold">{activity.shipper_employee.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}</span>
                  </div>
                )}
              </div>
              <span className="text-xs text-muted-foreground">Shipped by {activity.shipper_employee.name.split(' ')[0]}</span>
            </div>
          )}
          {/* Employee avatar stack for non-Shipped order activities */}
          {!isEmployeeActivity && activity.location !== 'Shipped' && activity.employee_avatars && activity.employee_avatars.length > 0 && (
            <EmployeeAvatarStack avatars={activity.employee_avatars} />
          )}
        </div>
      </div>
    </div>
  )
}
