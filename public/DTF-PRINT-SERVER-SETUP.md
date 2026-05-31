# DTF Print Server Setup Guide

This guide explains how to set up the local print server on each of your 3 DTF printer computers.

## Overview

Each DTF station needs:
1. Node.js installed
2. The print server script running
3. A hot folder that NeoStampa watches

## Prerequisites

- Windows 10/11
- Administrator access
- NeoStampa already installed and configured

---

## Step 1: Install Node.js

1. Download Node.js from: https://nodejs.org/
2. Choose the **LTS version** (recommended)
3. Run the installer with default settings
4. Restart your computer after installation

**Verify installation:** Open Command Prompt and run:
```
node --version
```
You should see something like `v20.x.x`

---

## Step 2: Create the Print Server Folder

1. Create a folder at `C:\DTF-Print-Server`
2. Inside that folder, create a subfolder called `hot-folder`
   - Full path: `C:\DTF-Print-Server\hot-folder`

---

## Step 3: Create the Print Server Script

1. Open Notepad
2. Copy and paste the following code:

```javascript
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Configuration
const PORT = 3001;
const HOT_FOLDER = 'C:\\DTF-Print-Server\\hot-folder';

// Ensure hot folder exists
if (!fs.existsSync(HOT_FOLDER)) {
  fs.mkdirSync(HOT_FOLDER, { recursive: true });
  console.log(`Created hot folder: ${HOT_FOLDER}`);
}

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', hotFolder: HOT_FOLDER }));
    return;
  }

  // Print file endpoint
  if (req.method === 'POST' && req.url === '/print') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { file_url, file_name } = JSON.parse(body);
        
        if (!file_url) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'file_url is required' }));
          return;
        }

        console.log(`Downloading: ${file_name || 'file'} from ${file_url}`);

        // Generate filename
        const timestamp = Date.now();
        const safeName = (file_name || 'print').replace(/[^a-zA-Z0-9-_]/g, '_');
        const fileName = `${timestamp}_${safeName}.png`;
        const filePath = path.join(HOT_FOLDER, fileName);

        // Download the file
        await downloadFile(file_url, filePath);

        console.log(`Saved to: ${filePath}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'File downloaded to hot folder',
          file: fileName 
        }));

      } catch (error) {
        console.error('Error:', error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    request.on('error', reject);
    request.setTimeout(60000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('DTF Print Server Running');
  console.log('='.repeat(50));
  console.log(`Port: ${PORT}`);
  console.log(`Hot Folder: ${HOT_FOLDER}`);
  console.log('');
  console.log('Waiting for print jobs...');
  console.log('');
});
```

3. Save the file as `server.js` in `C:\DTF-Print-Server\`
   - Make sure to select "All Files" in the Save dialog
   - Full path: `C:\DTF-Print-Server\server.js`

---

## Step 4: Configure NeoStampa Hot Folder

1. Open NeoStampa
2. Go to Settings > Hot Folder (or similar)
3. Set the hot folder path to: `C:\DTF-Print-Server\hot-folder`
4. Configure it to automatically process PNG files

---

## Step 5: Run the Print Server

1. Open Command Prompt as Administrator
2. Navigate to the folder:
   ```
   cd C:\DTF-Print-Server
   ```
3. Start the server:
   ```
   node server.js
   ```

You should see:
```
==================================================
DTF Print Server Running
==================================================
Port: 3001
Hot Folder: C:\DTF-Print-Server\hot-folder

Waiting for print jobs...
```

**Keep this window open!** The server stops if you close it.

---

## Step 6: Find Your Computer's IP Address

1. Open Command Prompt
2. Type: `ipconfig`
3. Look for "IPv4 Address" under your network adapter
   - Example: `192.168.1.101`

**Write down each computer's IP address:**
- Station 1: _______________
- Station 2: _______________
- Station 3: _______________

---

## Step 7: Test the Server

From another computer on your network, open a browser and go to:
```
http://[IP-ADDRESS]:3001/health
```

Example: `http://192.168.1.101:3001/health`

You should see: `{"status":"ok","hotFolder":"C:\\DTF-Print-Server\\hot-folder"}`

---

## Step 8: Update Station URLs in the System

Once you have all 3 IP addresses, provide them to update the database:
- Station 1: `http://192.168.1.XXX:3001`
- Station 2: `http://192.168.1.XXX:3001`
- Station 3: `http://192.168.1.XXX:3001`

---

## Auto-Start on Boot (Optional)

To make the print server start automatically when Windows boots:

### Option A: Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Name: "DTF Print Server"
4. Trigger: "When the computer starts"
5. Action: "Start a program"
6. Program: `node`
7. Arguments: `C:\DTF-Print-Server\server.js`
8. Start in: `C:\DTF-Print-Server`

### Option B: Create a Batch File

1. Create `start-server.bat` in `C:\DTF-Print-Server\`:
   ```batch
   @echo off
   cd C:\DTF-Print-Server
   node server.js
   ```

2. Create a shortcut to this batch file
3. Press `Win + R`, type `shell:startup`, press Enter
4. Move the shortcut to this folder

---

## Troubleshooting

### "node is not recognized"
- Restart your computer after installing Node.js
- Reinstall Node.js and check "Add to PATH" option

### Server won't start
- Make sure port 3001 is not in use
- Run Command Prompt as Administrator

### Can't connect from other computers
- Check Windows Firewall - allow Node.js through
- Make sure all computers are on the same network
- Try temporarily disabling firewall to test

### Files not appearing in NeoStampa
- Verify the hot folder path matches in both places
- Check NeoStampa hot folder settings
- Make sure NeoStampa is configured to process PNG files

---

## Firewall Configuration

To allow connections through Windows Firewall:

1. Open Windows Firewall
2. Click "Allow an app through firewall"
3. Click "Change settings"
4. Click "Allow another app"
5. Browse to `C:\Program Files\nodejs\node.exe`
6. Check both "Private" and "Public" (or just Private if on a private network)
7. Click OK

Or run this in Command Prompt (Admin):
```
netsh advfirewall firewall add rule name="DTF Print Server" dir=in action=allow protocol=TCP localport=3001
```

---

## Summary

Repeat these steps on all 3 DTF computers:
1. Install Node.js
2. Create `C:\DTF-Print-Server\` folder structure
3. Save `server.js` script
4. Configure NeoStampa hot folder
5. Run the server
6. Note the IP address
7. Test the connection

Then provide the 3 IP addresses to update the system configuration.
