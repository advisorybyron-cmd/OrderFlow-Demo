import { NextResponse } from 'next/server'
import { getActiveUsers, getPositions } from '@/lib/wheniwork'
import { isDemoMode, getDemoEmployeeByCode } from '@/lib/demo'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeCode = searchParams.get('employeeCode')

    if (!employeeCode) {
      return NextResponse.json({ error: 'Employee code required' }, { status: 400 })
    }

    // Demo mode: check if employee has management access based on demo data
    if (isDemoMode) {
      const demoEmployee = getDemoEmployeeByCode(employeeCode)
      // AM007 (Alex Martinez) is the management demo employee
      const hasManagementAccess = demoEmployee?.employee_code === 'AM007'
      return NextResponse.json({ hasManagementAccess })
    }

    // Get all positions to find the Management position ID
    const positions = await getPositions()
    const managementPosition = positions.find(p => 
      p.name.toLowerCase() === 'management' || 
      p.name.toLowerCase().includes('management')
    )

    if (!managementPosition) {
      // No management position exists, so no one has access
      return NextResponse.json({ hasManagementAccess: false })
    }

    // Get the user by employee code
    const users = await getActiveUsers()
    const user = users.find(u => u.employee_code === employeeCode)

    if (!user) {
      return NextResponse.json({ hasManagementAccess: false })
    }

    // Check if user has the Management position assigned
    const hasManagementAccess = user.positions?.includes(managementPosition.id) || false

    return NextResponse.json({ 
      hasManagementAccess,
      managementPositionId: managementPosition.id,
      userPositions: user.positions || []
    })
  } catch (error) {
    console.error('Error checking management access:', error)
    return NextResponse.json(
      { error: 'Failed to check management access' },
      { status: 500 }
    )
  }
}
