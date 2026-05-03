# POStore Desktop App - Complete Setup Guide

This guide will help you set up and run the POStore Desktop application.

## System Requirements

- Windows 7 or later (Windows 10+ recommended)
- Node.js 16+ (for development)
- 200MB free disk space
- Internet connection (for initial setup and sync)

## Backend Setup

First, ensure your POStore backend is set up and running:

1. Navigate to the main POStore project directory
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your database configuration:
   ```
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=pos_db
   ```

4. Start the backend:
   ```bash
   npm run dev
   ```

The backend should be running on `http://localhost:3000`

## Desktop App Development Setup

### 1. Install Dependencies

Navigate to the `desktop` directory:

```bash
cd desktop
npm install
```

### 2. Environment Configuration

Create or update `.env.local` file:

```env
REACT_APP_BACKEND_URL=http://localhost:3000
REACT_APP_SYNC_INTERVAL=300000
```

### 3. Start Development

Run the app in development mode:

```bash
npm run dev
```

This will:
- Start the React dev server on port 3000
- Launch the Electron app
- Open DevTools for debugging

## Building for Distribution

### Development Build

```bash
npm run build
```

### Installer Creation

The build process will create:
- `POStore-1.0.0.msi` - Windows MSI installer
- `POStore Setup 1.0.0.exe` - Windows executable installer

Both are located in `dist/` directory after building.

## Running the App

### Admin Setup (First Time)

1. **Admin Dashboard**: Log in with your POStore credentials
2. **Generate Token**: Click "Download for Windows"
3. **Copy Token**: A unique 16-character token will be generated (valid for 15 minutes)
4. **Paste in App**: Open POStore Desktop and paste the token
5. **Validation**: App validates token and syncs initial data

### Admin Functions

- **Manage Staff**: Add, edit, delete staff members
- **View Products**: See all products from your store
- **View Sales**: Check sales history and revenue
- **Auto Sync**: Changes sync every 5 minutes when online

### Staff Operations

1. **Login**: Staff members login with their email and password
2. **Sales**: Click products to add to cart
3. **Checkout**: Review items and complete sale
4. **Offline**: Works completely offline, syncs when online

## API Endpoints

The desktop app communicates with the backend via these endpoints:

### 1. Generate Token
```
POST /api/desktop/token
Headers: x-admin-id: <admin_id>
Response: { token, expiresIn }
```

### 2. Validate Token
```
POST /api/desktop/validate
Body: { token }
Response: { 
  sessionToken, 
  config: { adminId, adminName, adminEmail, storeName, domain },
  initialData: { staff, products, sales, saleItems }
}
```

### 3. Staff/Admin Login
```
POST /api/desktop/login
Body: { email, password, adminId? }
Response: { user: { id, name, email, role, adminId?, shiftRole? } }
```

### 4. Sync Data
```
POST /api/desktop/sync
Body: { sessionToken, lastSyncTime? }
Response: { 
  data: { products, staff, sales, saleItems, services, customers },
  syncTime
}
```

## Database Schema

The desktop SQLite database includes:

- **products** - Store product catalog
- **staff** - Staff member information
- **sales** - Sales transactions
- **sale_items** - Individual items in sales
- **services** - Services offered
- **customers** - Customer information
- **sync_log** - Sync history

## File Structure

```
postore/
├── app/                      # Next.js backend
│   ├── api/
│   │   └── desktop/         # Desktop API endpoints
│   │       ├── validate/
│   │       ├── token/
│   │       ├── login/
│   │       └── sync/
│   └── _lib/
│       └── db.ts            # Database setup
└── desktop/                 # Electron + React app
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── pages/           # React pages
    │   ├── components/      # React components
    │   ├── db/              # Database management
    │   ├── utils/           # Utility functions
    │   └── styles/          # CSS
    ├── main.js              # Electron main process
    ├── preload.js           # IPC bridge
    ├── package.json         # Dependencies
    └── README.md
```

## Configuration

### Backend Configuration

Edit backend database settings in `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=pos_db
NEXT_PUBLIC_BASE_DOMAIN=upendoapps.com
NEXT_PUBLIC_MAIN_APP=pos.upendoapps.com
```

### Desktop Configuration

Edit desktop app settings in `desktop/.env.local`:

```env
REACT_APP_BACKEND_URL=http://localhost:3000
REACT_APP_SYNC_INTERVAL=300000
```

## Troubleshooting

### Issue: "Backend not responding"

**Solution:**
- Verify backend is running: `npm run dev` in main directory
- Check backend URL in `.env.local`
- Ensure no firewall blocking port 3000

### Issue: "Token validation failed"

**Solution:**
- Generate a new token (previous one may have expired)
- Ensure token is copied completely without extra spaces
- Check admin is logged into POStore

### Issue: "Database locked"

**Solution:**
- Close other instances of the app
- Wait a few seconds and try again
- On Windows: Restart the application

### Issue: "Staff can't login"

**Solution:**
- Verify staff account exists and is active in admin panel
- Check admin has synced staff to desktop app
- Confirm staff password is correct

## Development Tips

### Enable Debug Logging

In `main.js`, uncomment `mainWindow.webContents.openDevTools()` for dev tools.

### Clear Local Data

To reset the app to initial setup state:

1. Delete the database file located at:
   - Windows: `%APPDATA%/POStore Desktop/postore.db`
2. Restart the app

### Network Debugging

Check sync status:
1. Open DevTools
2. Go to Console tab
3. Check for sync messages

## Deployment

### Manual Distribution

1. Build the app: `npm run build`
2. Find installers in `desktop/dist/`
3. Share `.msi` or `.exe` with users
4. Users run installer and complete setup

### Auto-Update (Future)

The app is configured for electron-updater. Future versions can enable auto-updates by:
1. Hosting release files on GitHub/server
2. Configuring update endpoint in `package.json`

## Support & Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| App won't start | Run `npm install` and check Node.js version |
| Can't sync | Check internet, backend URL, and session token |
| Password hashing fails | Ensure bcryptjs is installed: `npm install bcryptjs` |
| Database locked | Restart app, clear stale locks |

### Getting Help

1. Check the main README.md
2. Review error messages in DevTools Console
3. Check backend logs for API errors
4. Verify database connection

## Next Steps

After setup:

1. **Test Admin Flow**: Generate token and setup app
2. **Add Staff**: Create test staff members in admin
3. **Test Staff Login**: Login as staff and complete sale
4. **Test Sync**: Disconnect from internet and verify offline functionality
5. **Test Sync Again**: Reconnect and verify sync works

---

**POStore Desktop App v1.0** | © 2024
