// Database types
export interface Employee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  name: string // computed field: first_name + last_name
  avatar_url: string | null
  wiw_user_id?: string | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface WorkSession {
  id: string
  employee_id: string
  started_at: string
  ended_at: string | null
  total_items: number
  created_at: string
}

export interface ItemScan {
  id: string
  work_session_id: string
  employee_id: string
  order_number: string
  item_index: number
  item_name: string | null
  item_sku: string | null
  quantity: number
  scanned_at: string
}

// Session state for workstation
export interface SessionState {
  employee: Employee
  session: WorkSession
  itemsCompleted: number
  sessionStartTime: Date
}

// Report types
export interface DailyStats {
  date: string
  totalItems: number
  hoursWorked: number
  shirtsPerMinute: number
}

export interface EmployeeReport {
  employee: Employee
  weekStart: string
  weekEnd: string
  dailyStats: DailyStats[]
  totalItems: number
  totalHours: number
  averageShirtsPerMinute: number
  previousWeekItems: number
}
