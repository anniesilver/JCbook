# TestFlight Deployment Plan for JC Court Booking App

**Status:** Waiting for Apple Developer Program approval (48 hours)

**Phase 2 Completed:** ✅ Project is configured and ready for build

---

## Phase 1: Apple Developer Account Setup ⚠️ YOU MUST DO THIS

**Current Status:** In progress - waiting for approval

### Steps You Need to Complete:

1. **Enroll in Apple Developer Program**
   - URL: https://developer.apple.com/programs/
   - Sign up with your Apple ID
   - Pay $99/year enrollment fee
   - ⏳ Wait for approval (1-2 days usually)

2. **Create App ID in Apple Developer Console** (After approval)
   - Log in to https://developer.apple.com/account
   - Go to "Certificates, Identifiers & Profiles"
   - Click "Identifiers" → "+" button
   - Select "App IDs" → "App"
   - Choose a Bundle ID (recommend: `com.yourname.jc` or `com.yourcompany.jc`)
   - Enable capabilities you need (likely just basic ones)
   - **⚠️ IMPORTANT:** Remember this Bundle ID - you'll need to update `app.json`

3. **Create App in App Store Connect** (After approval)
   - Go to https://appstoreconnect.apple.com
   - Click "My Apps" → "+" → "New App"
   - Fill in:
     - Platform: iOS
     - Name: "JC Court Booking" (or your preferred name)
     - Primary Language: English
     - Bundle ID: (select the one you created above)
     - SKU: `jc-court-booking-001` (any unique identifier)
     - User Access: Full Access

---

## Phase 2: Project Configuration ✅ COMPLETED

**All configuration files have been created and are ready.**

### What Was Configured:

1. ✅ **EAS CLI installed** globally
2. ✅ **`eas.json` created** with build profiles:
   - `development`: For local testing
   - `preview`: For TestFlight (YOU'LL USE THIS)
   - `production`: For App Store
3. ✅ **`app.json` updated** with:
   - App name: "JC Court Booking"
   - Bundle identifier placeholder: `com.yourname.jc`
   - iOS build number: "1"
   - Privacy permissions configured
4. ✅ **App icon verified**: 1024x1024 PNG (meets Apple requirements)
5. ✅ **`.gitignore` updated** to ignore build artifacts

### ⚠️ ACTION REQUIRED AFTER PHASE 1:

**You MUST update `app.json` line 13:**
```json
"bundleIdentifier": "com.yourname.jc"
```
Change this to match the Bundle ID you created in Apple Developer Console.

Examples:
- `com.johnsmith.jc`
- `com.mycompany.jcbooking`
- `com.annie.jccourtbooking`

---

## Phase 3: Supabase Configuration ⚠️ YOU NEED TO VERIFY

**Checklist before building:**

- [ ] Supabase project is production-ready
- [ ] Database tables have proper indexes
- [ ] Row Level Security (RLS) policies are configured
- [ ] API keys are secure (using anon key, not service key in app)
- [ ] Backend server URL is accessible (or plan for this)

---

## Phase 4: Build & Submit 🤖 READY TO EXECUTE

**After Phase 1 is complete and bundle ID is updated:**

### Step 1: Login to EAS
```bash
eas login
```
Enter your Expo account credentials (create account at https://expo.dev if needed)

### Step 2: Build for iOS (TestFlight)
```bash
eas build --platform ios --profile preview
```
- This will take **15-30 minutes** in the cloud
- You'll see the build progress in the terminal
- A link to monitor the build will be provided

### Step 3: Submit to TestFlight
After build completes successfully:
```bash
eas submit --platform ios
```

Or you can combine build + submit:
```bash
eas build --platform ios --profile preview --auto-submit
```

### Step 4: Update eas.json with Apple Details (Optional)
Before submitting, you can update `eas.json` lines 23-27:
```json
"appleId": "your-apple-id@email.com",
"ascAppId": "1234567890",  // From App Store Connect
"appleTeamId": "ABC123XYZ"  // From Apple Developer
```

---

## Phase 5: TestFlight Setup ⚠️ YOU MUST DO THIS

**After build is submitted and processed (~30-60 mins):**

### In App Store Connect (https://appstoreconnect.apple.com):

1. **Add Test Information:**
   - Go to your app → TestFlight tab
   - Fill in "Test Information" section:
     - Beta App Description
     - Feedback Email
     - Marketing URL (optional)
   - Add "What to Test" notes for testers

2. **Export Compliance:**
   - Answer encryption questions (usually "No" for most apps)
   - If your app uses HTTPS only, select "No" for encryption

3. **Add Testers:**
   - **Internal Testing**: Add up to 100 Apple Developer team members
   - **External Testing**: Add up to 10,000 external testers via email
   - Create groups to organize testers

4. **Distribute Build:**
   - Once build is processed, enable it for testing
   - Send invites to testers
   - Testers will receive email with TestFlight link

---

## Summary of Responsibilities

### ✅ TASKS YOU MUST DO (Cannot be automated):

- [x] Enroll in Apple Developer Program ($99/year) - **IN PROGRESS**
- [ ] Wait for Apple approval (~48 hours)
- [ ] Create Bundle ID in Apple Developer Console
- [ ] Create App in App Store Connect
- [ ] Update `app.json` with correct Bundle ID
- [ ] Verify Supabase is production-ready
- [ ] Run `eas login` with your Expo account
- [ ] Run `eas build --platform ios --profile preview`
- [ ] Run `eas submit --platform ios` (after build completes)
- [ ] Set up TestFlight testing groups in App Store Connect
- [ ] Add test information and export compliance
- [ ] Invite testers in App Store Connect

### ✅ TASKS COMPLETED BY DEV TEAM:

- [x] Install EAS CLI
- [x] Create and configure `eas.json`
- [x] Update `app.json` with proper iOS settings
- [x] Verify/optimize app assets (icons, splash screens)
- [x] Add privacy permissions
- [x] Update `.gitignore` for build artifacts

---

## Estimated Timeline

- **Apple Developer enrollment:** 1-2 days ⏳ **CURRENT STAGE**
- **Update Bundle ID in project:** 5 minutes
- **First build (EAS):** 30-60 minutes
- **TestFlight processing:** 30-60 minutes
- **Total:** 2-4 days (mostly waiting for Apple approval)

---

## Important Notes

### You DO NOT need a Mac!
- EAS Build uses cloud Mac servers
- Everything can be done from your Windows PC
- You only need a physical iPhone/iPad to test via TestFlight

### EAS Build Pricing:
- Free tier: Limited builds per month
- Paid plans: Start at $29/month for more builds
- First few builds are free to try

### Files Modified:
- `app.json` - iOS configuration
- `eas.json` - Build configuration
- `.gitignore` - Ignore build artifacts

### Key Commands Reference:
```bash
# Login to EAS
eas login

# Check EAS config
eas config

# Build for iOS preview (TestFlight)
eas build --platform ios --profile preview

# Build and auto-submit
eas build --platform ios --profile preview --auto-submit

# Submit existing build
eas submit --platform ios

# Check build status
eas build:list
```

---

## Next Steps (After Apple Approval)

1. ✅ Complete Phase 1 (create Bundle ID & App in App Store Connect)
2. ✅ Update `app.json` with correct Bundle ID
3. ✅ Run `eas login`
4. ✅ Run `eas build --platform ios --profile preview`
5. ✅ Wait for build to complete
6. ✅ Run `eas submit --platform ios`
7. ✅ Configure TestFlight in App Store Connect
8. ✅ Invite testers and start testing!

---

## Support Resources

- EAS Build Documentation: https://docs.expo.dev/build/introduction/
- TestFlight Guide: https://developer.apple.com/testflight/
- App Store Connect: https://appstoreconnect.apple.com
- Expo Forums: https://forums.expo.dev/

---

**📅 Created:** 2025-11-12
**📋 Status:** Ready for build after Apple approval
**⏳ Next Action:** Wait for Apple Developer Program approval, then update Bundle ID
