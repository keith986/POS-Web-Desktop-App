# POStore Commands Reference

Quick reference for all available npm commands in the POStore project.

## Backend Commands (Main Directory)

### Development & Testing

```bash
# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Lint code
npm run lint
```

### What These Do:

- **`npm run dev`** - Starts Next.js dev server on `http://localhost:3000` with hot reload. Opens browser automatically.
- **`npm run build`** - Compiles Next.js app for production. Creates `.next` folder.
- **`npm start`** - Runs production-built app. Must run `npm run build` first.
- **`npm run lint`** - Checks code for style issues with ESLint.

## Desktop App Commands (`/desktop` directory)

### Development

```bash
# Start both React dev server + Electron app
npm run dev

# Start only React dev server (port 3000)
npm run react-dev

# Run with DevTools enabled (if already compiled)
npm start
```

### Building

```bash
# Build everything (React + Electron)
npm run build

# Build React app only
npm run build-react

# Build Electron installers only (requires built React app)
npm run build-electron
```

### What These Do:

- **`npm run dev`** - Concurrent:
  - React dev server on `http://localhost:3000`
  - Electron app (waits for React to start)
  - Opens Electron window with DevTools
  - Hot reload for changes

- **`npm run react-dev`** - React development server only (for debugging)

- **`npm start`** - Runs built Electron app (requires build first)

- **`npm run build`** - Creates:
  - React optimized build in `build/` folder
  - Electron installers in `dist/` folder:
    - `POStore Setup 1.0.0.exe`
    - `POStore-1.0.0.msi`

- **`npm run build-react`** - Optimizes React code (creates `build/`)

- **`npm run build-electron`** - Packages Electron app + creates installers

- **`npm run eject`** - Ejects Create React App (one-way, don't do this!)

## Complete Workflow

### Development Workflow:

```bash
# Terminal 1: Start Backend
cd postore
npm install  # Install dependencies first time
npm run dev
# Backend running at http://localhost:3000

# Terminal 2: Start Desktop App
cd postore/desktop
npm install  # Install dependencies first time
npm run dev
# React server on :3000, Electron app opens with DevTools
```

Navigate Electron window to test features.

### Building for Release:

```bash
# In /desktop directory
npm run build
# Wait for build to complete...
# Check dist/ folder for installers
# Share .exe or .msi files
```

### Testing Built App:

```bash
# In /desktop directory
npm start  # Runs from build/ folder
```

## Environment Setup

### Backend (.env):

```bash
# Database connection
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=pos_db

# Domain configuration (optional)
NEXT_PUBLIC_BASE_DOMAIN=upendoapps.com
NEXT_PUBLIC_MAIN_APP=pos.upendoapps.com
```

### Desktop (desktop/.env.local):

```bash
# Backend URL
REACT_APP_BACKEND_URL=http://localhost:3000

# Sync interval in milliseconds (5 minutes)
REACT_APP_SYNC_INTERVAL=300000
```

## Dependency Management

### Add Backend Dependency:

```bash
cd postore
npm install package-name
```

### Add Desktop Dependency:

```bash
cd postore/desktop
npm install package-name
```

### Remove Dependency:

```bash
npm uninstall package-name
```

### Update Dependencies:

```bash
# Check outdated packages
npm outdated

# Update all
npm update

# Update specific package
npm update package-name
```

## Troubleshooting Commands

### Clear Cache & Reinstall:

```bash
# Backend
cd postore
rm -r node_modules package-lock.json  # Windows: rmdir /s /q node_modules, del package-lock.json
npm install

# Desktop
cd desktop
rm -r node_modules package-lock.json  # Windows: rmdir /s /q node_modules, del package-lock.json
npm install
```

### Check Node Version:

```bash
node --version  # Should be v16 or higher
npm --version
```

### Empty Build Cache:

```bash
# Backend
cd postore
rm -r .next
npm run build

# Desktop  
cd desktop
rm -r build dist
npm run build
```

## Port Binding Issues

If ports are already in use:

```bash
# Check what's using port 3000
# Windows:
netstat -ano | findstr :3000

# Kill process
taskkill /PID [process_id] /F

# Or use different port
PORT=3001 npm run dev
```

## Git Commands (Helpful)

```bash
# Check status
git status

# Add changes
git add .

# Commit
git commit -m "message"

# Push to remote
git push

# Pull latest
git pull
```

## Useful Shortcuts in Dev

### React Dev Server:
- Press `r` - Reload
- Press `q` - Quit

### Electron DevTools:
- `Ctrl+Shift+I` - Open DevTools
- `Ctrl+Shift+Delete` - Clear storage
- `F5` - Reload
- `Ctrl+R` - Hard reload

### Terminal:
- `Ctrl+C` - Stop server
- `Clear` or `cls` - Clear screen
- `Up Arrow` - Previous command

## Common Sequences

### Start from Scratch:

```bash
# Install everything
npm install
cd desktop && npm install && cd ..

# Terminal 1: Backend
npm run dev

# Terminal 2: Desktop
cd desktop && npm run dev
```

### Build for Release:

```bash
cd desktop
npm run build
# Installers in desktop/dist/
```

### Test on Different Machine:

```bash
# Copy desktop/dist/POStore*.exe or .msi
# Run installer
# Follow setup wizard
# Paste installation token from web dashboard
```

### Add New Dependency to Both:

```bash
# Backend dependency
npm install package-name

# Desktop dependency
cd desktop && npm install package-name && cd ..
```

## Performance Tips

### Speed up npm install:
```bash
# Use npm ci for faster, reliable installs
npm ci
```

### Clear npm cache if issues:
```bash
npm cache clean --force
```

## Logging & Debugging

### Backend Logs:
```bash
# Logs appear in console where npm run dev was run
# Check terminal output for errors
```

### Desktop Logs:
```bash
# Open DevTools in Electron app
# Check Console tab for messages
# Check logs at: C:\Users\[YOU]\AppData\Roaming\POStore Desktop\logs\main.log
```

## Build System Info

### Backend Stack:
- Next.js 16
- TypeScript
- MySQL
- Node.js

### Desktop Stack:
- Electron 27
- React 18
- SQLite
- Node.js

---

**Pro Tip**: Use multiple terminal windows/tabs for better workflow!

For detailed setup: See `DESKTOP_SETUP_GUIDE.md`
