export interface WhenIWorkUser {
  id: number
  first_name: string
  last_name: string
  email: string
  phone_number?: string
  employee_code?: string
  avatar?: {
    url?: string
  }
  is_active: boolean
  is_hidden: boolean
  is_deleted: boolean
  role: number
  positions?: number[]
  locations?: number[]
  created_at: string
  updated_at: string
}

export interface WhenIWorkUsersResponse {
  users: WhenIWorkUser[]
}

export interface WhenIWorkError {
  error: string
  code: number
}

export interface WhenIWorkTime {
  id: number
  user_id: number
  position_id?: number
  location_id?: number
  start_time: string
  end_time?: string
  length?: number // in seconds
  hourly_rate?: number
  is_approved?: boolean
  is_alerted?: boolean
  alert_type?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface WhenIWorkTimesResponse {
  times: WhenIWorkTime[]
}

export interface WhenIWorkPosition {
  id: number
  name: string
  color: string
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface WhenIWorkPositionsResponse {
  positions: WhenIWorkPosition[]
}
