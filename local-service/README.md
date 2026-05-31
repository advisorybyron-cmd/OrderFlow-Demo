# DTF Print Server Setup Guide

This server runs on each DTF printer computer and receives print files from the web app, writing them directly to NeoStampa's hot folder.

**You have 3 DTF stations - repeat this setup on each computer.**

---

## Quick Setup Summary

1. Install Node.js
2. Copy this `local-service` folder to the computer
3. Update the hot folder path in `print-server.js`
4. Run `npm install express multer`
5. Run `node print-server.js`
6. Note the IP address shown
7. Give me the 3 IP addresses to update the database

---

## Detailed Setup Instructions

### Step 1: Install Node.js

1. Go to https://nodejs.org
2. Download the **LTS** version (recommended)
3. Run the installer, accept all defaults
4. **Restart your computer** after installation

### Step 2: Copy the Print Server Files

1. Create a folder on the computer: `C:\DTFPrintServer`
2. Copy these files from this `local-service` folder:
   - `print-server.js`
   - `README.md` (this file, for reference)

### Step 3: Update the Hot Folder Path

1. Open `print-server.js` in Notepad
2. Find this line near the top (around line 25):
   ```javascript
   const HOTFOLDER_PATH = 'C:\\Users\\Myles - 6DS Inc\\Desktop\\PrintQueue'
   ```
3. Change it to YOUR NeoStampa hot folder path. Examples:
   ```javascript
   const HOTFOLDER_PATH = 'C:\\NeoStampa\\HotFolder'
   ```
   or
   ```javascript
   const HOTFOLDER_PATH = 'D:\\PrintQueue'
   ```
   
   **Important:** Use double backslashes `\\` in the path!

4. Save the file

### Step 4: Install Dependencies

1. Open **Command Prompt** (search "cmd" in Start menu)
2. Navigate to your folder:
   ```
   cd C:\DTFPrintServer
   ```
3. Initialize and install:
   ```
   npm init -y
   npm install express multer
   ```

### Step 5: Run the Server

1. In Command Prompt, run:
   ```
   node print-server.js
   ```
2. You should see:
   ```
   ╔═══════════════════════════════════════════════════════════╗
   ║         NeoStampa Local Print Server Started               ║
   ╚═══════════════════════════════════════════════════════════╝

   📁 Hotfolder: C:\NeoStampa\HotFolder
   🔗 Local URL:  http://localhost:3001
   🌐 Network URL: http://192.168.1.101:3001
   ```

3. **Write down the Network URL** - you'll need to give me the IP address

### Step 6: Configure Windows Firewall

Allow incoming connections on port 3001:

1. Open **Windows Defender Firewall** (search in Start menu)
2. Click "Advanced settings" on the left
3. Click "Inbound Rules" → "New Rule..." (on the right)
4. Select **Port** → Next
5. Select **TCP**, enter port: `3001` → Next
6. Select **Allow the connection** → Next
7. Check all profiles (Domain, Private, Public) → Next
8. Name it: `DTF Print Server` → Finish

---

## After Setting Up All 3 Computers

Give me the IP addresses for each station:

| Station   | IP Address        |
|-----------|-------------------|
| Station 1 | 192.168.1.___     |
| Station 2 | 192.168.1.___     |
| Station 3 | 192.168.1.___     |

I'll update the database so the station selector in the web app sends to the correct computer.

---

## Testing

### Test locally (on the same computer):
Open a browser and go to: `http://localhost:3001/health`

### Test from another computer:
Open a browser and go to: `http://192.168.1.101:3001/health` (use actual IP)

You should see:
```json
{"status":"ok","hotfolder":"C:\\NeoStampa\\HotFolder","timestamp":"..."}
```

---

## Auto-Start on Boot (Recommended)

So you don't have to manually start the server every day:

### Option A: Startup Folder (Simple)

1. Press `Win + R`, type `shell:startup`, press Enter
2. Right-click → New → Shortcut
3. Enter: `cmd /k "cd C:\DTFPrintServer && node print-server.js"`
4. Name it: `DTF Print Server`

### Option B: Batch File

1. Create `C:\DTFPrintServer\start-server.bat` with:
   ```batch
   @echo off
   cd C:\DTFPrintServer
   node print-server.js
   ```
2. Put a shortcut to this batch file in your Startup folder

---

## Troubleshooting

### "node is not recognized as an internal or external command"
- Node.js wasn't installed correctly
- Reinstall Node.js and **restart your computer**

### "Hotfolder not found" error
- The path in `print-server.js` is wrong
- Check that the folder actually exists
- Make sure you used double backslashes `\\`

### Can't connect from the web app
- Check Windows Firewall (Step 6)
- Make sure the server is running (you should see the console window)
- Verify the IP address is correct
- Make sure computers are on the same network

### Files appear but NeoStampa doesn't print
- Check NeoStampa is running
- Check NeoStampa's hot folder settings match your `HOTFOLDER_PATH`
- Make sure NeoStampa is set to monitor that folder

### "EADDRINUSE" error (port already in use)
- Another program is using port 3001
- Either close that program, or change `const PORT = 3001` to a different number (like 3002)

---

## How It Works

1. Employee scans order in DTF room on web app
2. Employee selects which printer station (1, 2, or 3)
3. Clicks "Send to NeoStampa"
4. Web app sends print files to that station's IP address
5. This print server receives the files
6. Saves them to the hot folder
7. NeoStampa detects new files and prints them

---

## Files in This Folder

- `print-server.js` - The actual server code (copy to each computer)
- `README.md` - This setup guide
