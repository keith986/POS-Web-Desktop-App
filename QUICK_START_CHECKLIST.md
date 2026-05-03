# POStore Desktop App - Quick Start Checklist

Use this checklist to get the POStore Desktop app up and running.

## Pre-Setup

- [ ] Windows 7 or later installed
- [ ] Node.js 16+ installed
- [ ] Git installed (for cloning if needed)

## Backend Setup

- [ ] Navigate to main POStore directory: `cd postore`
- [ ] Install dependencies: `npm install`
- [ ] Create `.env` file with database credentials
- [ ] Run backend: `npm run dev`
- [ ] Verify backend running on `http://localhost:3000`
- [ ] Check database is accessible and initialized

## Desktop App Setup

### Install & Start

- [ ] Navigate to desktop directory: `cd desktop`
- [ ] Install dependencies: `npm install`
- [ ] Create `.env.local` file (or use default)
- [ ] Start app: `npm run dev`
- [ ] Verify Electron window opens
- [ ] Verify React dev server starts on port 3000

### First Admin Setup

- [ ] Log into POStore web dashboard with admin account
- [ ] Navigate to admin dashboard
- [ ] Find and click "Download for Windows" button
- [ ] Copy the generated 16-character token
- [ ] Open POStore Desktop app
- [ ] Paste token into setup screen
- [ ] Wait for validation and sync
- [ ] See "All Set!" message when complete

### Verify Admin Functions

- [ ] Can view admin dashboard
- [ ] Can access Staff Management page
- [ ] Can see Products list
- [ ] Can see Sales history
- [ ] Sidebar navigation works

## Staff Operations

### Add Test Staff Member

- [ ] Admin: Navigate to Staff page
- [ ] Click "Add New Staff" button
- [ ] Fill in: Name, Email, Password, Role
- [ ] Click "Add Staff" button
- [ ] See success message
- [ ] Staff appears in staff list

### Test Staff Login

- [ ] Logout from admin (if logged in)
- [ ] On login page, enter staff email
- [ ] Enter staff password
- [ ] Click "Login" button
- [ ] See staff dashboard with products

### Test Sales

- [ ] Select product category (or "All")
- [ ] Click a product to add to cart
- [ ] See product added with qty 1
- [ ] Adjust quantity with +/- buttons
- [ ] See total update in real-time
- [ ] See tax calculated correctly (16%)
- [ ] Click "Complete Sale"
- [ ] See confirmation message
- [ ] Cart clears

## Offline Testing

- [ ] Disconnect from internet
- [ ] Try to complete another sale
- [ ] Sale should work offline
- [ ] See sale in local database
- [ ] Reconnect to internet
- [ ] Wait 5 minutes or restart app
- [ ] Verify sync occurs
- [ ] Check web dashboard for synced sales

## Build & Distribution

- [ ] Run build: `npm run build`
- [ ] Check `dist/` folder for installers
- [ ] Find `.exe` and `.msi` files
- [ ] Test installer on another machine
- [ ] Verify app works after install

## Documentation

- [ ] Read `DESKTOP_IMPLEMENTATION_SUMMARY.md`
- [ ] Review `DESKTOP_SETUP_GUIDE.md`
- [ ] Review `desktop/README.md`
- [ ] Bookmark troubleshooting section

## Advanced (Optional)

- [ ] Customize style: Edit `src/styles/index.css`
- [ ] Change sync interval: Edit `desktop/.env.local`
- [ ] Modify tax rate: Edit `StaffDashboard.jsx`
- [ ] Enable debug logs: Uncomment devTools in `main.js`

## Deployment Checklist

Before releasing to users:

- [ ] Test on Windows 7, 10, 11
- [ ] Test with slow internet connection
- [ ] Test offline completely (no internet)
- [ ] Test re-sync after going offline/online
- [ ] Test with large product catalog (1000+ items)
- [ ] Test with many staff members
- [ ] Verify database backup works
- [ ] Document installation steps for users

## Troubleshooting Quick Ref

| Problem | Quick Fix |
|---------|-----------|
| Backend won't start | Check port 3000, run `npm install` |
| Token validation fails | Generate new token, check backend URL |
| Can't add staff | Check password is 6+ chars, email format |
| Sales won't save | Check localStorage is enabled |
| Sync not working | Check internet, backend URL, session token |
| App crashes | Check Node version, reinstall `npm install` |

## Support Resources

- **Main Setup Guide**: `DESKTOP_SETUP_GUIDE.md`
- **Implementation Details**: `DESKTOP_IMPLEMENTATION_SUMMARY.md`
- **Desktop App README**: `desktop/README.md`
- **Backend README**: `README.md`

---

**Estimated Setup Time:** 15-30 minutes
**Estimated Testing Time:** 15-20 minutes

When complete, your offline desktop POS is ready to use! 🎉
