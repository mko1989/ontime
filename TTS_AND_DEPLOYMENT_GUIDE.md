# Text-to-Speech (TTS) Feature & Deployment Guide

## Table of Contents
1. [TTS Feature Overview](#tts-feature-overview)
2. [Configuring TTS for Custom Fields](#configuring-tts-for-custom-fields)
3. [How TTS Works](#how-tts-works)
4. [Deployment Guide](#deployment-guide)
5. [Troubleshooting](#troubleshooting)

---

## TTS Feature Overview

The Text-to-Speech (TTS) feature allows Ontime to read aloud time values from custom fields in the cuesheet view. This is particularly useful for monitoring remaining times from external players that send time data to custom fields.

### Key Features

- **Per-Field Configuration**: TTS settings are configured individually for each custom field
- **Time Format Support**: Automatically parses time values in `hh:mm:ss` or `mm:ss` formats
- **Threshold-Based Triggering**: Only reads aloud when time falls below a configurable threshold (e.g., 10 seconds)
- **Voice Selection**: Choose from available system voices with language support
- **Cuesheet View Only**: TTS is active only when viewing the cuesheet page
- **Numerical Output**: Speaks only the numerical seconds value (e.g., "10" instead of "10 seconds")

---

## Configuring TTS for Custom Fields

### Step 1: Access Custom Field Settings

1. Open Ontime in your browser
2. Navigate to **Settings** (gear icon)
3. Go to the **Manage Panel** tab
4. Find the custom field you want to configure, or create a new one

### Step 2: Enable TTS

1. Click **Edit** on a text-type custom field (TTS is only available for text fields)
2. Scroll down to the **Text-to-Speech (TTS) Settings** section
3. Toggle **Enable TTS** to ON

### Step 3: Configure TTS Settings

Once TTS is enabled, configure the following options:

#### **Threshold (seconds)**
- The time threshold in seconds below which TTS will trigger
- Default: `10` seconds
- Example: If set to 10, TTS will read aloud when the time value is 10 seconds or less
- Range: Any positive number

#### **TTS Language**
- Language code for speech synthesis
- Default: `en-US`
- Examples: `en-US`, `en-GB`, `de-DE`, `fr-FR`, `es-ES`
- The language code determines which voices are available

#### **Voice**
- Select a specific voice from available system voices
- Voices are filtered by the selected language
- Format: `Voice Name (Language Code)`
- If no voice is selected, the system default voice for the language will be used

### Step 4: Save Settings

1. Click **Save** to apply the TTS configuration
2. The settings are saved per custom field and persist across sessions

### Example Configuration

**Scenario**: You have a custom field called "Remaining Time" that receives time data from an external player.

1. **Field Type**: Text
2. **Enable TTS**: ON
3. **Threshold**: `15` (read aloud when 15 seconds or less remain)
4. **Language**: `en-US`
5. **Voice**: `Samantha (en-US)` (or your preferred voice)

---

## How TTS Works

### Time Parsing

The TTS system automatically detects and parses time values in two formats:

- **`hh:mm:ss`** - Hours, minutes, seconds (e.g., `00:01:30` = 90 seconds)
- **`mm:ss`** - Minutes, seconds (e.g., `01:30` = 90 seconds)

### Triggering Logic

1. **View Detection**: TTS is only active when the cuesheet view is open
2. **Value Monitoring**: The system monitors custom field values for entries in the rundown
3. **Change Detection**: TTS triggers only when a field value changes (not on every render)
4. **Time Parsing**: If the value matches a time format, it's converted to seconds
5. **Threshold Check**: If the seconds value is ≤ threshold, TTS is triggered
6. **Speech Output**: The numerical seconds value is spoken (e.g., "10" for 10 seconds)

### Example Flow

```
External Player → Custom Field: "00:00:08" 
                → Parsed: 8 seconds
                → Threshold: 10 seconds
                → 8 ≤ 10? YES
                → Speak: "8"
```

### Limitations

- **Browser-Based**: Uses the Web Speech API, which requires browser support
- **Single Voice**: Only one TTS utterance can play at a time
- **Cuesheet View Only**: TTS is inactive in other views (timer, countdown, etc.)
- **Text Fields Only**: TTS is only available for text-type custom fields

---

## Deployment Guide

### Prerequisites

1. **Development Machine**:
   - Node.js and pnpm installed
   - SSH access to your Raspberry Pi
   - Project source code

2. **Raspberry Pi**:
   - Node.js installed (check with `which node`)
   - SSH server enabled
   - Network connectivity

3. **SSH Authentication** (choose one):
   - **Option A**: SSH key pair set up (recommended)
   - **Option B**: Password authentication with `sshpass` installed

### Quick Start

1. **Configure the Script** (if needed):
   ```bash
   # Edit build-and-deploy.sh and update these variables:
   PI_IP="192.168.50.220"      # Your Pi's IP address
   PI_USER="pi"                 # Your Pi username
   ```

2. **Set Password** (optional, for password automation):
   ```bash
   # macOS: Install sshpass
   brew install hudochenkov/sshpass/sshpass
   
   # Set password as environment variable
   export PI_PASSWORD='your-pi-password'
   ```

3. **Run the Deployment Script**:
   ```bash
   chmod +x build-and-deploy.sh
   ./build-and-deploy.sh
   ```

### What the Script Does

The `build-and-deploy.sh` script automates the entire deployment process:

#### Step 1: Clean Previous Builds
- Removes old build directories (`apps/client/build`, `apps/server/dist`)
- Cleans Vite cache
- Removes temporary deployment directory

#### Step 2: Build Application
- Builds with `NODE_ENV=docker` to create production bundle
- Creates `docker.cjs` entry point
- Builds React client application
- Verifies build artifacts exist

#### Step 3: Package Deployment
- Copies server build files to deployment directory
- Copies client build files to `server/client/`
- Copies external resources (`external/`, `user/`, `html/`)
- Creates deployment package structure

#### Step 4: Create Archive
- Creates compressed tarball (`ontime-server.tar.gz`)
- Displays archive size

#### Step 5: Transfer to Pi
- Transfers archive via SCP to `/tmp/` on Raspberry Pi
- Handles password prompts or uses `sshpass` if configured

#### Step 6: Deploy on Pi
- Stops existing Ontime service
- Backs up old installation (keeps last 3 backups)
- Extracts new build
- Installs files to `/opt/ontime/server/`
- Sets correct permissions
- Detects Node.js path automatically
- Creates/updates systemd service file
- Creates data directory (`/var/lib/ontime/`)
- Starts and enables service
- Displays service status and recent logs

### Post-Deployment

After successful deployment:

1. **Access the Application**:
   ```
   http://YOUR_PI_IP:4001/editor
   ```

2. **View Logs**:
   ```bash
   ssh pi@YOUR_PI_IP 'sudo journalctl -u ontime.service -f'
   ```

3. **Check Service Status**:
   ```bash
   ssh pi@YOUR_PI_IP 'sudo systemctl status ontime.service'
   ```

4. **Restart Service** (if needed):
   ```bash
   ssh pi@YOUR_PI_IP 'sudo systemctl restart ontime.service'
   ```

### Service Configuration

The script automatically creates a systemd service with:

- **Service Name**: `ontime.service`
- **Installation Path**: `/opt/ontime/server/`
- **Data Directory**: `/var/lib/ontime/`
- **User**: `pi` (or your configured user)
- **Auto-Start**: Enabled (starts on boot)
- **Restart Policy**: Always (restarts on failure)
- **Port**: `4001`

### Manual Service Management

```bash
# Start service
sudo systemctl start ontime.service

# Stop service
sudo systemctl stop ontime.service

# Restart service
sudo systemctl restart ontime.service

# Enable auto-start on boot
sudo systemctl enable ontime.service

# Disable auto-start
sudo systemctl disable ontime.service

# View logs
sudo journalctl -u ontime.service -f

# View last 50 log lines
sudo journalctl -u ontime.service -n 50
```

---

## Troubleshooting

### TTS Issues

#### TTS Not Working

**Problem**: TTS doesn't read aloud time values.

**Solutions**:
1. **Check Browser Support**: Ensure your browser supports the Web Speech API
   - Chrome/Edge: Full support
   - Firefox: Full support
   - Safari: Full support
   - Check: `'speechSynthesis' in window` in browser console

2. **Verify Configuration**:
   - TTS must be enabled for the custom field
   - Field must be of type "text"
   - You must be in the cuesheet view

3. **Check Time Format**:
   - Ensure values are in `hh:mm:ss` or `mm:ss` format
   - Example valid formats: `00:01:30`, `01:30`, `00:00:10`

4. **Verify Threshold**:
   - Time value must be ≤ threshold to trigger
   - Example: If threshold is 10, value must be 10 seconds or less

5. **Check Browser Permissions**:
   - Some browsers require user interaction before allowing TTS
   - Try clicking on the page first

#### Wrong Voice or Language

**Problem**: TTS uses wrong voice or language.

**Solutions**:
1. **Select Voice Explicitly**: Choose a specific voice in settings
2. **Check Language Code**: Ensure language code matches desired language
3. **Refresh Voices**: Reload the page to refresh available voices
4. **System Voices**: Available voices depend on your operating system

#### TTS Reading Full Time Instead of Seconds

**Problem**: TTS reads "10 seconds" instead of "10".

**Solution**: This should be fixed in the current version. If you see this, ensure you're running the latest build.

### Deployment Issues

#### Build Fails

**Problem**: `./build-and-deploy.sh` fails during build step.

**Solutions**:
1. **Check Dependencies**:
   ```bash
   pnpm install
   ```

2. **Check Node.js Version**:
   ```bash
   node --version
   # Should match project requirements
   ```

3. **Clean Everything**:
   ```bash
   rm -rf node_modules apps/*/node_modules
   rm -rf apps/*/build apps/*/dist
   pnpm install
   ```

#### Transfer Fails

**Problem**: SCP transfer to Pi fails.

**Solutions**:
1. **Check Network Connectivity**:
   ```bash
   ping YOUR_PI_IP
   ```

2. **Check SSH Access**:
   ```bash
   ssh pi@YOUR_PI_IP
   ```

3. **Verify Credentials**: Ensure username and password are correct

4. **Check Disk Space on Pi**:
   ```bash
   ssh pi@YOUR_PI_IP 'df -h /tmp'
   ```

#### Service Won't Start

**Problem**: Service fails to start after deployment.

**Solutions**:
1. **Check Logs**:
   ```bash
   ssh pi@YOUR_PI_IP 'sudo journalctl -u ontime.service -n 50'
   ```

2. **Verify Node.js Path**:
   ```bash
   ssh pi@YOUR_PI_IP 'which node'
   # Should match ExecStart in service file
   ```

3. **Check File Permissions**:
   ```bash
   ssh pi@YOUR_PI_IP 'ls -la /opt/ontime/server/docker.cjs'
   # Should be executable
   ```

4. **Verify Files Exist**:
   ```bash
   ssh pi@YOUR_PI_IP 'ls -la /opt/ontime/server/client/index.html'
   # Should exist
   ```

5. **Check Service File**:
   ```bash
   ssh pi@YOUR_PI_IP 'sudo systemctl cat ontime.service'
   # Verify ExecStart path is correct
   ```

#### 404 Errors for Web UI

**Problem**: Getting 404 errors when accessing `/editor` or other routes.

**Solutions**:
1. **Check Service Status**: Ensure service is running
2. **Verify Client Files**: Check that `index.html` exists at `/opt/ontime/server/client/`
3. **Check Logs**: Look for path resolution errors in logs
4. **Rebuild and Redeploy**: Run the deployment script again

#### Port Already in Use

**Problem**: Port 4001 is already in use.

**Solutions**:
1. **Find Process Using Port**:
   ```bash
   ssh pi@YOUR_PI_IP 'sudo lsof -i :4001'
   ```

2. **Stop Conflicting Service**:
   ```bash
   ssh pi@YOUR_PI_IP 'sudo systemctl stop conflicting-service'
   ```

3. **Change Port** (if needed): Modify port in server configuration

### Common Error Messages

#### `ENOENT: no such file or directory, stat '/opt/ontime/client/index.html'`

**Cause**: Path resolution issue - server looking in wrong location.

**Solution**: This should be fixed in the current version. If you see this:
1. Ensure you've rebuilt with the latest code
2. Run deployment script again
3. Verify files are at `/opt/ontime/server/client/`

#### `TypeError: Missing parameter name at 2`

**Cause**: Invalid route pattern in Express.

**Solution**: This should be fixed. If you see this:
1. Rebuild the application
2. Redeploy using the script

#### `Cannot find module '/opt/ontime/server/docker.cjs'`

**Cause**: Build didn't create `docker.cjs` or wrong build command used.

**Solution**:
1. Ensure you're using `NODE_ENV=docker pnpm build`
2. Verify `apps/server/dist/docker.cjs` exists after build
3. Check deployment script copied the file correctly

---

## Advanced Configuration

### Changing Installation Path

To install to a different location:

1. **Modify Deployment Script**:
   ```bash
   # In build-and-deploy.sh, change:
   INSTALL_PATH="/opt/ontime"  # Change this
   ```

2. **Update Service File Paths**: The script will automatically update paths

### Changing Port

To use a different port:

1. **Modify Server Configuration**: Update port in server config
2. **Update Firewall Rules**: Allow new port through firewall
3. **Update Service File**: Modify any port-specific configurations

### Custom Data Directory

The data directory can be changed via environment variable:

```bash
# In service file, modify:
Environment="ONTIME_DATA=/custom/path/to/data"
```

---

## Support

For additional help:

1. **Check Logs**: Always check service logs first
2. **Verify Configuration**: Ensure all settings are correct
3. **Test Locally**: Test TTS functionality in development before deploying
4. **Browser Console**: Check browser console for JavaScript errors

---

## Summary

### TTS Feature
- ✅ Per-field configuration
- ✅ Automatic time parsing (`hh:mm:ss`, `mm:ss`)
- ✅ Threshold-based triggering
- ✅ Voice and language selection
- ✅ Cuesheet view only
- ✅ Numerical output

### Deployment
- ✅ Automated build and deployment script
- ✅ Automatic service configuration
- ✅ Backup management
- ✅ Path detection
- ✅ Error handling and verification

The TTS feature and deployment script work together to provide a seamless experience for monitoring time values and deploying updates to your Raspberry Pi installation.
