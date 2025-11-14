# JC Court Booking Project Structure

**Last Updated:** 2025-11-14

## Directory Structure

```
C:\ANNIE-PROJECT\JC\
├── jc-app/                     # Mobile App (React Native / Expo)
│   ├── app/                    # Expo Router screens
│   ├── src/                    # App source code
│   ├── components/             # Reusable UI components
│   ├── assets/                 # Images, fonts, etc.
│   ├── package.json            # App dependencies
│   └── ...
│
├── jc-backend-server/          # Backend Server (Node.js / Playwright)
│   ├── server.js               # Main server loop
│   ├── playwrightBooking.js    # Booking automation
│   ├── tests/                  # Unit tests
│   ├── package.json            # Server dependencies
│   └── ...
│
└── PROJECT-STRUCTURE.md        # This file
```

## Running the Projects

### Mobile App

```bash
cd C:\ANNIE-PROJECT\JC\jc-app
npm start
```

This will start the Expo development server. You can run the app on:
- iOS Simulator
- Android Emulator
- Physical device via Expo Go app

### Backend Server

```bash
cd C:\ANNIE-PROJECT\JC\jc-backend-server
node server.js <gametime_username>
```

Example:
```bash
node server.js annieyang
```

This will start the 24/7 booking automation server for the specified user.

## Benefits of This Structure

✅ **Complete Separation**
- Mobile app and backend server are completely independent
- No git branch confusion
- No Metro bundler conflicts

✅ **Run Anytime**
- Run mobile app from `jc-app/` anytime, on any branch
- Run backend server from `jc-backend-server/` anytime, on any branch
- No need to switch branches to test different components

✅ **Clean Dependencies**
- Each project has its own `package.json`
- No cross-contamination of dependencies
- Faster npm installs for each project

✅ **Better Organization**
- Clear separation of concerns
- Easier to understand for new developers
- Industry-standard monorepo alternative

## Git Workflow

Both projects can share the same git repository:

```bash
# Work on mobile app
cd jc-app/
# Make changes, commit, etc.

# Work on backend
cd ../jc-backend-server/
# Make changes, commit, etc.
```

Or they can be separate repositories if preferred.

## Migration Notes

**Old Structure (deprecated):**
```
C:\ANNIE-PROJECT\jc\
├── app/
├── src/
├── backend-server/     # ❌ Caused Metro bundler issues
└── package.json
```

**New Structure (current):**
```
C:\ANNIE-PROJECT\JC\
├── jc-app/             # ✅ Mobile app isolated
└── jc-backend-server/  # ✅ Backend isolated
```

The old files in the root directory (`C:\ANNIE-PROJECT\jc\`) can be deleted once you confirm everything works.

## Testing

### Mobile App Tests
```bash
cd jc-app/
npm test
```

### Backend Server Tests
```bash
cd jc-backend-server/
npm test
```

## Deployment

### Mobile App (TestFlight / App Store)
See `jc-app/TESTFLIGHT_DEPLOYMENT_PLAN.md`

### Backend Server (Windows PC)
See `jc-backend-server/README.md`

---

**Questions?** Refer to the README.md in each project directory for detailed documentation.
