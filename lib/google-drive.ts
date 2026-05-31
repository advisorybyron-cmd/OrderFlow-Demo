import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

// Cache for file list to avoid repeated API calls
let fileCache: { files: DriveFile[], timestamp: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface DriveFile {
  id: string
  name: string
  mimeType: string
  webContentLink?: string
  thumbnailLink?: string
}

/**
 * Get authenticated Google Drive client
 * Supports both GOOGLE_SERVICE_ACCOUNT_KEY (full JSON) and
 * separate GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY vars
 */
function getDriveClient() {
  let email: string
  let privateKey: string

  console.log('[v0] Checking Google Drive credentials...')
  console.log('[v0] GOOGLE_SERVICE_ACCOUNT_KEY:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY ? 'set' : 'not set')
  console.log('[v0] GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? 'set' : 'not set')

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    // Parse the full JSON service account key
    try {
      const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
      email = serviceAccount.client_email
      privateKey = serviceAccount.private_key
      console.log('[v0] Using GOOGLE_SERVICE_ACCOUNT_KEY for auth')
    } catch (e) {
      console.error('[v0] Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', e)
      throw new Error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY JSON')
    }
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n')
    console.log('[v0] Using separate email + key env vars for auth')
  } else {
    throw new Error('Google Drive credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: SCOPES,
  })

  return google.drive({ version: 'v3', auth })
}

/**
 * List all files in the DTF Files Quick Load folder
 * Uses pagination to get ALL files (not just 1000)
 */
async function listDriveFiles(): Promise<DriveFile[]> {
  // Return cached files if still valid
  if (fileCache && Date.now() - fileCache.timestamp < CACHE_TTL) {
    console.log(`[v0] Returning ${fileCache.files.length} cached Drive files`)
    return fileCache.files
  }

  // DTF Files Quick Load folder ID
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '1S2DKu2nDX5hoK4w6g6xctcEblwojoCN_'
  console.log(`[v0] Listing files from folder: ${folderId}`)

  const drive = getDriveClient()
  const allFiles: DriveFile[] = []
  let pageToken: string | undefined

  try {
    // Paginate through ALL files
    do {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType)',
        pageSize: 1000,
        pageToken,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      })

      if (response.data.files) {
        allFiles.push(...response.data.files as DriveFile[])
      }
      pageToken = response.data.nextPageToken ?? undefined
      console.log(`[v0] Fetched page, total files so far: ${allFiles.length}`)
    } while (pageToken)

    console.log(`[v0] Found ${allFiles.length} total files in folder`)
    
    // Check if specific file exists for debugging
    const goAheadFile = allFiles.find(f => f.name.toLowerCase().includes('goahead'))
    console.log(`[v0] GoAhead file found: ${goAheadFile ? goAheadFile.name : 'NOT FOUND'}`)

    // Update cache
    fileCache = { files: allFiles, timestamp: Date.now() }
    
    return allFiles
  } catch (error: any) {
    console.error('[v0] Failed to list Drive files:', error?.message || error)
    return []
  }
}

/**
 * Normalize a string for fuzzy matching
 * - Lowercase
 * - Remove file extensions
 * - Split CamelCase into words (for files like "RanchOnEverythingFightMeTShirt.png")
 * - Remove "designs_XXXX_XXXX_" prefix pattern
 * - Replace hyphens/underscores with spaces
 * - Remove special characters
 */
function normalize(str: string): string {
  return str
    // Remove file extension
    .replace(/\.(png|jpg|jpeg|gif|webp|svg)$/i, '')
    // Remove designs_XXXX_XXXX_ prefix
    .replace(/^designs_\d+_\d+_/i, '')
    // Remove number prefix like "2082_"
    .replace(/^\d+_/, '')
    // Split CamelCase into words (insert space before capitals)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Also split before sequences like "TShirt" -> "T Shirt"
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    // Lowercase
    .toLowerCase()
    // Replace hyphens and underscores with spaces
    .replace(/[-_]/g, ' ')
    // Remove special characters except spaces
    .replace(/[^a-z0-9\s]/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Get significant words (skip common filler words)
 */
function getSignificantWords(str: string): string[] {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
    'it', 'its', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
    'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his',
    'our', 'their', 'mens', 'womens', 'shirt', 'tshirt', 't', 'design'
  ])
  
  return str.split(' ')
    .filter(w => w.length > 1 && !stopWords.has(w))
}

/**
 * Calculate similarity score between two strings
 * Uses multiple matching strategies for robustness
 */
function similarityScore(fileName: string, productName: string): number {
  const normalizedFile = normalize(fileName)
  const normalizedProduct = normalize(productName)
  
  // Exact match after normalization
  if (normalizedFile === normalizedProduct) return 1.0
  
  // Check if one contains the other (without spaces)
  const fileNoSpaces = normalizedFile.replace(/\s/g, '')
  const productNoSpaces = normalizedProduct.replace(/\s/g, '')
  if (fileNoSpaces === productNoSpaces) return 0.95
  if (fileNoSpaces.includes(productNoSpaces) || productNoSpaces.includes(fileNoSpaces)) return 0.9
  
  // Get significant words from each
  const fileWords = getSignificantWords(normalizedFile)
  const productWords = getSignificantWords(normalizedProduct)
  
  if (fileWords.length === 0 || productWords.length === 0) return 0
  
  // Count exact word matches
  let exactMatches = 0
  for (const productWord of productWords) {
    if (fileWords.includes(productWord)) {
      exactMatches++
    }
  }
  
  // Score based on proportion of words matched
  const matchRatio = exactMatches / productWords.length
  const reverseRatio = fileWords.length > 0 ? exactMatches / fileWords.length : 0
  
  // Combined score - weighted toward product word coverage
  const score = (matchRatio * 0.7) + (reverseRatio * 0.3)
  
  return score
}

/**
 * Find the best matching Drive file for a product name
 */
export async function findDesignImage(productName: string): Promise<string | null> {
  try {
    const files = await listDriveFiles()
    
    if (files.length === 0) {
      console.log('[v0] No files found in Google Drive folder')
      return null
    }

    // Find best match
    let bestMatch: DriveFile | null = null
    let bestScore = 0
    const MINIMUM_SCORE = 0.4 // Minimum threshold for a match

    for (const file of files) {
      const score = similarityScore(file.name, productName)
      if (score > bestScore && score >= MINIMUM_SCORE) {
        bestScore = score
        bestMatch = file
      }
    }

    if (bestMatch) {
      console.log(`[v0] Matched "${productName}" to "${bestMatch.name}" (score: ${bestScore.toFixed(2)})`)
      // Return via our proxy route to avoid CORS/auth issues
      return `/api/drive-image?id=${bestMatch.id}`
    }

    console.log(`[v0] No match found for "${productName}" (best score: ${bestScore.toFixed(2)})`)
    return null
  } catch (error) {
    console.error('[v0] Error finding design image:', error)
    return null
  }
}

/**
 * Get design images for multiple products
 * Returns a map of product name -> image URL
 */
export async function findDesignImages(productNames: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>()
  
  try {
    console.log('[v0] findDesignImages called with products:', productNames)
    const files = await listDriveFiles()
    console.log('[v0] Got', files.length, 'files from Drive')
    
    // Log all file names for debugging
    if (files.length > 0 && files.length <= 50) {
      console.log('[v0] All files:', files.map(f => f.name).join(', '))
    }
    
    for (const productName of productNames) {
      let bestMatch: DriveFile | null = null
      let bestScore = 0
      const MINIMUM_SCORE = 0.4 // Require at least 40% match

      console.log(`[v0] Searching for match for product: "${productName}"`)
      console.log(`[v0] Normalized product: "${normalize(productName)}"`)
      console.log(`[v0] Product words: ${getSignificantWords(normalize(productName)).join(', ')}`)

      for (const file of files) {
        const score = similarityScore(file.name, productName)
        if (score > 0.2) {
          console.log(`[v0]   File "${normalize(file.name)}" score: ${score.toFixed(2)}`)
        }
        if (score > bestScore && score >= MINIMUM_SCORE) {
          bestScore = score
          bestMatch = file
        }
      }

      if (bestMatch) {
        console.log(`[v0] MATCHED "${productName}" -> "${bestMatch.name}" (score: ${bestScore.toFixed(2)})`)
        results.set(productName, `/api/drive-image?id=${bestMatch.id}`)
      } else {
        console.log(`[v0] NO MATCH for "${productName}" (best score: ${bestScore.toFixed(2)})`)
      }
    }
  } catch (error) {
    console.error('[v0] Error finding design images:', error)
    if (error instanceof Error) {
      console.error('[v0] Error message:', error.message)
      console.error('[v0] Error stack:', error.stack)
    }
  }

  return results
}

/**
 * Clear the file cache (useful after uploads)
 */
export function clearDriveCache() {
  fileCache = null
}
