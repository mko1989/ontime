# Quick Deploy Guide

## One-Command Deploy

Simply run:

```bash
./build-and-deploy.sh
```

This script will:
1. Clean previous builds
2. Build the application with correct settings
3. Package everything needed
4. Transfer to your Raspberry Pi
5. Install and configure the service
6. Start the service

## Prerequisites

1. **SSH access to Pi**: The script will prompt for your Pi password
   - **Optional**: Set up SSH keys to avoid password prompts:
     ```bash
     ssh-copy-id pi@192.168.50.220
     ```
   - **Or**: Use password automation with sshpass:
     ```bash
     # macOS: brew install hudochenkov/sshpass/sshpass
     # Linux: sudo apt-get install sshpass
     export PI_PASSWORD='your-pi-password'
     ./build-and-deploy.sh
     ```

2. **Node.js and pnpm** installed on your dev machine

3. **Dependencies installed**:
   ```bash
   pnpm install
   ```

## Configuration

Edit `build-and-deploy.sh` if your Pi details are different:
- `PI_IP`: Your Pi's IP address (default: 192.168.50.220)
- `PI_USER`: Your Pi username (default: pi)

## Troubleshooting

If the script fails:

1. **SSH connection issues**:
   ```bash
   ssh pi@192.168.50.220
   # Make sure this works without password
   ```

2. **Build fails**: Check that all dependencies are installed
   ```bash
   pnpm install
   ```

3. **Service won't start**: SSH into Pi and check logs
   ```bash
   ssh pi@192.168.50.220
   sudo journalctl -u ontime.service -n 50
   ```

4. **Web UI doesn't work**: Check if service is running
   ```bash
   ssh pi@192.168.50.220
   sudo systemctl status ontime
   curl http://localhost:4001/health
   ```

## Manual Steps (if script fails)

See `CLEAN_BUILD_AND_DEPLOY.md` for manual deployment steps.
