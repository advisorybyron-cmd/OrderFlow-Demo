import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

function getDriveClient() {
  let email: string
  let privateKey: string

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
      email = serviceAccount.client_email
      privateKey = serviceAccount.private_key
    } catch (e) {
      throw new Error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON')
    }
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n')
  } else {
    throw new Error('Google Drive credentials not configured')
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })

  return google.drive({ version: 'v3', auth })
}

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get('id')

  if (!fileId) {
    return NextResponse.json({ error: 'Missing file id' }, { status: 400 })
  }

  try {
    const drive = getDriveClient()

    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    )

    const buffer = Buffer.from(response.data as ArrayBuffer)
    const contentType = (response.headers as any)['content-type'] || 'image/png'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    })
  } catch (error) {
    console.error('[v0] Drive image proxy error:', error)
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
  }
}
