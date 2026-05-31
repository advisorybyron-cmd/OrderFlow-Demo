// Demo mode utilities - centralized exports
export { isDemoMode, DEMO_PASSWORD } from './config'
export { DEMO_EMPLOYEES, getDemoEmployeeByCode, getDemoEmployeeById, type DemoEmployee } from './employees'
export { getDemoOrders, getDemoOrderByNumber, generateDemoOrder, type ShipStationOrder } from './orders'
export { 
  getDemoActivities, 
  addDemoActivity, 
  getDemoShipments, 
  getDemoMetrics,
  generateDemoReportData,
  type DemoActivity,
  type DemoShipment,
  type DemoMetrics,
  type DemoReportData,
} from './activity'

// Demo session storage (in-memory for demo mode)
interface DemoSession {
  id: string
  employee_id: string
  employee_code: string
  room: string
  started_at: string
}

const demoSessions = new Map<string, DemoSession>()

export function createDemoSession(employeeCode: string, room: string): DemoSession {
  const session: DemoSession = {
    id: `demo-session-${Date.now()}`,
    employee_id: `demo-emp-${employeeCode}`,
    employee_code: employeeCode,
    room,
    started_at: new Date().toISOString(),
  }
  demoSessions.set(session.id, session)
  return session
}

export function getDemoSession(sessionId: string): DemoSession | undefined {
  return demoSessions.get(sessionId)
}

export function endDemoSession(sessionId: string): boolean {
  return demoSessions.delete(sessionId)
}

// Demo clock status tracking
const demoClockStatus = new Map<string, { position: string; clockedInAt: string }>()

export function getDemoClockStatus(employeeCode: string): { position: string; clockedInAt: string } | null {
  return demoClockStatus.get(employeeCode) || null
}

export function setDemoClockIn(employeeCode: string, position: string): void {
  demoClockStatus.set(employeeCode, {
    position,
    clockedInAt: new Date().toISOString(),
  })
}

export function setDemoClockOut(employeeCode: string): void {
  demoClockStatus.delete(employeeCode)
}
