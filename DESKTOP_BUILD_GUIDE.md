# Building the Desktop App for Download

This guide covers deploying the Electron app to Contabo with dynamic builds.

## Setup on Contabo Server

### Prerequisites
- Node.js and npm installed on the server
- SSH access to your Contabo server
- All dependencies already installed (`npm install` run in both root and `desktop` folders)

### How It Works

When a user clicks "Download for Windows":
1. The API endpoint triggers a build in the `desktop` folder
2. electron-builder compiles and generates the `.exe` installer
3. The generated file is served to the user for download
4. Takes ~2-5 minutes on first request

## Initial Contabo Setup

SSH into your Contabo server and run:

```bash
cd /path/to/postore

# Install dependencies if not already done
npm install
cd desktop && npm install && cd ..

# Test that the build works
cd desktop && npm run build
```

If the build completes successfully, you're good to go!

## Deployment

Push your code to Contabo as usual:

```bash
git push origin main
```

On the server, pull the latest:

```bash
git pull origin main
```

That's it! Users can now download the app via `/admin/download` → "Download for Windows"

## Performance Optimization (Optional)

### Add Build Caching

If you want to avoid rebuilding on every download, you can cache the latest build:

Add this to your environment on Contabo:
```bash
export CACHE_BUILDS=true
```

Or modify the API route to check if a recent build exists first.

### Limit Build Frequency

To prevent multiple simultaneous builds, you can add rate limiting or a build queue.

## Troubleshooting

### Build takes too long
- First build is slowest (5-10 min)
- Server needs enough RAM (electron-builder is memory-intensive)
- Consider building locally and uploading the `.exe` manually if server struggles

### "npm: command not found"
- SSH into server and check Node installation: `node --version`
- May need to source your shell profile: `source ~/.bashrc`

### Port/timeout issues
- Increase timeout if build takes longer: Edit the API route timeout value
- Check server CPU/memory usage during build

## Manual Fallback (If Server Build Fails)

1. Build locally: `cd desktop && npm run build`
2. Copy the `.exe` from `desktop/dist/`
3. Upload to Contabo via SFTP to: `public/desktop-installer/postore-setup.exe`
4. Update API route to serve from that pre-built location instead
