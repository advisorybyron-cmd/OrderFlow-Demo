#!/usr/bin/env node

/**
 * Local Print Server for NeoStampa DTF Printer
 * Runs on the NeoStampa computer and receives print files from Vercel
 * Writes files to the PrintQueue hotfolder for NeoStampa to process
 * 
 * SETUP:
 * 1. Install Node.js on this computer (https://nodejs.org)
 * 2. Run: npm install express multer
 * 3. Update HOTFOLDER_PATH below with your actual path
 * 4. Run: node print-server.js
 * 5. Note the IP address shown in the console
 * 6. Go to Vercel project settings and add LOCAL_PRINT_SERVICE_URL env var
 *    Example: http://YOUR-IP:3001
 */

const express = require('express')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const os = require('os')

const app = express()
const PORT = 3001

// Enable CORS for browser requests from the web app
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// UPDATE THIS PATH TO YOUR ACTUAL HOTFOLDER
const HOTFOLDER_PATH = 'C:\\Users\\Myles - 6DS Inc\\Desktop\\PrintQueue'

// Create hotfolder if it doesn't exist
if (!fs.existsSync(HOTFOLDER_PATH)) {
  console.error(`❌ Hotfolder not found: ${HOTFOLDER_PATH}`)
  console.error('Please update HOTFOLDER_PATH in this script with your actual path')
  process.exit(1)
}

// Configure multer for file uploads (multiple files)
const upload = multer({ storage: multer.memoryStorage() })

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    hotfolder: HOTFOLDER_PATH,
    timestamp: new Date().toISOString(),
  })
})

// Batch endpoint - receives all files for an order as one job
app.post('/receive-print-batch', upload.any(), async (req, res) => {
  try {
    const { order_number, customer_name, file_count } = req.body
    const files = req.files || []
    
    if (files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded',
      })
    }

    // Create order folder: Order_8547_CustomerName
    const safeName = (customer_name || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_')
    const orderFolder = `Order_${order_number}_${safeName}`
    const orderPath = path.join(HOTFOLDER_PATH, orderFolder)
    
    // Create the order folder
    if (!fs.existsSync(orderPath)) {
      fs.mkdirSync(orderPath, { recursive: true })
    }

    console.log(`[PRINT SERVER] ═══════════════════════════════════════`)
    console.log(`[PRINT SERVER] New Print Job: Order ${order_number}`)
    console.log(`[PRINT SERVER] Customer: ${customer_name}`)
    console.log(`[PRINT SERVER] Files: ${files.length}`)
    console.log(`[PRINT SERVER] Folder: ${orderPath}`)

    // Save all files to the order folder
    const savedFiles = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const title = req.body[`title_${i}`] || `file_${i}`
      const safeTitle = title.replace(/[^a-zA-Z0-9]/g, '_')
      const filename = `${safeTitle}.png`
      const filePath = path.join(orderPath, filename)
      
      fs.writeFileSync(filePath, file.buffer)
      savedFiles.push(filename)
      console.log(`[PRINT SERVER]   ✓ ${filename}`)
    }

    console.log(`[PRINT SERVER] ✓ Job saved successfully`)
    console.log(`[PRINT SERVER] ═══════════════════════════════════════`)

    res.json({
      success: true,
      message: 'Print job received',
      order_number,
      folder: orderFolder,
      files: savedFiles,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[PRINT SERVER] Error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to save print job',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Legacy single file endpoint (keep for backwards compatibility)
app.post('/receive-print-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      })
    }

    const { filename, order_number, item_title } = req.body
    const safeFilename = filename || `print_${Date.now()}.png`
    const filePath = path.join(HOTFOLDER_PATH, safeFilename)

    console.log(`[PRINT SERVER] Receiving file: ${safeFilename}`)
    console.log(`[PRINT SERVER] Order: ${order_number}, Item: ${item_title}`)
    console.log(`[PRINT SERVER] Writing to: ${filePath}`)

    // Write file to hotfolder
    fs.writeFileSync(filePath, req.file.buffer)

    console.log(`[PRINT SERVER] ✓ File saved successfully`)

    res.json({
      success: true,
      message: 'File received and saved to hotfolder',
      filename: safeFilename,
      path: filePath,
      size: req.file.buffer.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[PRINT SERVER] Error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to save file',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Start server
app.listen(PORT, () => {
  const ipAddress = getLocalIpAddress()
  console.log('')
  console.log('╔═══════════════════════════════════════════════════════════╗')
  console.log('║         NeoStampa Local Print Server Started               ║')
  console.log('╚═══════════════════════════════════════════════════════════╝')
  console.log('')
  console.log(`📁 Hotfolder: ${HOTFOLDER_PATH}`)
  console.log(`🔗 Local URL:  http://localhost:${PORT}`)
  console.log(`🌐 Network URL: http://${ipAddress}:${PORT}`)
  console.log('')
  console.log('Next steps:')
  console.log(`1. Copy the Network URL above`)
  console.log(`2. Go to your Vercel project Settings → Vars`)
  console.log(`3. Add env var: LOCAL_PRINT_SERVICE_URL = http://${ipAddress}:${PORT}`)
  console.log('')
  console.log('The server is listening for print files...')
  console.log('')
})

// Helper to get local IP address
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address
      }
    }
  }
  return 'localhost'
}
