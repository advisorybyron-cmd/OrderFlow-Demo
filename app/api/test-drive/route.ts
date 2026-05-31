import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  
  const result: any = {
    step1_hasKey: !!key,
    step1_keyLength: key?.length,
  }

  if (!key) {
    return NextResponse.json(result)
  }

  // Step 2: Try to parse the JSON
  try {
    const serviceAccount = JSON.parse(key)
    result.step2_parsed = true
    result.step2_email = serviceAccount.client_email
    result.step2_hasPrivateKey = !!serviceAccount.private_key
  } catch (e: any) {
    result.step2_parsed = false
    result.step2_error = e.message
    return NextResponse.json(result)
  }

  // Step 3: Try to create auth
  try {
    const serviceAccount = JSON.parse(key)
    const auth = new google.auth.JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    result.step3_authCreated = true
  } catch (e: any) {
    result.step3_authCreated = false
    result.step3_error = e.message
    return NextResponse.json(result)
  }

  // Step 4: Try to list ALL files from the DTF Files Quick Load folder
  try {
    const serviceAccount = JSON.parse(key)
    const auth = new google.auth.JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const drive = google.drive({ version: 'v3', auth })
    
    // List ALL files from the specific folder (not just 10)
    const folderId = '1S2DKu2nDX5hoK4w6g6xctcEblwojoCN_'
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })
    
    const files = response.data.files || []
    result.step4_success = true
    result.step4_folderId = folderId
    result.step4_fileCount = files.length
    result.step4_allFiles = files.map(f => f.name)
    
    // Check if GoAheadCallTheCops.png exists
    const goAheadFile = files.find(f => f.name?.toLowerCase().includes('goahead'))
    result.step4_goAheadFound = !!goAheadFile
    result.step4_goAheadFileName = goAheadFile?.name
    
    // Test the normalize function inline
    const testNormalize = (str: string) => {
      return str
        .replace(/\.(png|jpg|jpeg|gif|webp|svg)$/i, '')
        .replace(/^designs_\d+_\d+_/i, '')
        .replace(/^\d+_/, '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .toLowerCase()
        .replace(/[-_]/g, ' ')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    }
    
    result.step5_normalizeTest = {
      'GoAheadCallTheCops.png': testNormalize('GoAheadCallTheCops.png'),
      'Go Ahead Call The Cops': testNormalize('Go Ahead Call The Cops'),
      'SoMuchWorse.png': testNormalize('SoMuchWorse.png'),
      'So Much Worse': testNormalize('So Much Worse'),
    }
  } catch (e: any) {
    result.step4_success = false
    result.step4_error = e.message
    result.step4_code = e.code
    result.step4_status = e.status
  }

  return NextResponse.json(result)
}
