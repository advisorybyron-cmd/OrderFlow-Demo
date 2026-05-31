// Demo employees with realistic fake data
export interface DemoEmployee {
  id: string
  employee_code: string
  first_name: string
  last_name: string
  name: string
  avatar_url: string | null
  wheniwork_id: number
  is_active: boolean
  room_access: string[]
}

export const DEMO_EMPLOYEES: DemoEmployee[] = [
  {
    id: 'demo-emp-001',
    employee_code: 'JD001',
    first_name: 'John',
    last_name: 'Demo',
    name: 'John Demo',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John',
    wheniwork_id: 10001,
    is_active: true,
    room_access: ['bundle_room', 'heat_press', 'dtf_room', 'shipping', 'inventory', 'management'],
  },
  {
    id: 'demo-emp-002',
    employee_code: 'SS002',
    first_name: 'Sarah',
    last_name: 'Smith',
    name: 'Sarah Smith',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    wheniwork_id: 10002,
    is_active: true,
    room_access: ['bundle_room', 'heat_press', 'shipping'],
  },
  {
    id: 'demo-emp-003',
    employee_code: 'MJ003',
    first_name: 'Mike',
    last_name: 'Johnson',
    name: 'Mike Johnson',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    wheniwork_id: 10003,
    is_active: true,
    room_access: ['dtf_room', 'heat_press'],
  },
  {
    id: 'demo-emp-004',
    employee_code: 'EW004',
    first_name: 'Emily',
    last_name: 'Wilson',
    name: 'Emily Wilson',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    wheniwork_id: 10004,
    is_active: true,
    room_access: ['bundle_room', 'shipping', 'inventory'],
  },
  {
    id: 'demo-emp-005',
    employee_code: 'TB005',
    first_name: 'Tom',
    last_name: 'Brown',
    name: 'Tom Brown',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tom',
    wheniwork_id: 10005,
    is_active: true,
    room_access: ['customer_service', 'management'],
  },
  {
    id: 'demo-emp-006',
    employee_code: 'LD006',
    first_name: 'Lisa',
    last_name: 'Davis',
    name: 'Lisa Davis',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
    wheniwork_id: 10006,
    is_active: true,
    room_access: ['bundle_room', 'heat_press', 'dtf_room'],
  },
  {
    id: 'demo-emp-007',
    employee_code: 'AM007',
    first_name: 'Alex',
    last_name: 'Martinez',
    name: 'Alex Martinez',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    wheniwork_id: 10007,
    is_active: true,
    room_access: ['shipping', 'inventory', 'janitorial'],
  },
  {
    id: 'demo-emp-008',
    employee_code: 'RG008',
    first_name: 'Rachel',
    last_name: 'Garcia',
    name: 'Rachel Garcia',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rachel',
    wheniwork_id: 10008,
    is_active: true,
    room_access: ['bundle_room', 'heat_press', 'customer_service'],
  },
]

export function getDemoEmployeeByCode(code: string): DemoEmployee | undefined {
  return DEMO_EMPLOYEES.find(e => e.employee_code.toLowerCase() === code.toLowerCase())
}

export function getDemoEmployeeById(id: string): DemoEmployee | undefined {
  return DEMO_EMPLOYEES.find(e => e.id === id)
}
