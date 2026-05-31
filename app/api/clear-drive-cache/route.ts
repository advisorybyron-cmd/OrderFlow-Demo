import { NextResponse } from 'next/server'
import { clearDriveCache } from '@/lib/google-drive'

export async function POST() {
  clearDriveCache()
  return NextResponse.json({ success: true, message: 'Drive cache cleared' })
}

export async function GET() {
  clearDriveCache()
  return NextResponse.json({ success: true, message: 'Drive cache cleared' })
}
