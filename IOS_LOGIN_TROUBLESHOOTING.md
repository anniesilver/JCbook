# iOS Login Troubleshooting Guide

## Issue
When clicking "Sign In" on iOS, the app redirects back to the login screen without showing any error message.

## Root Causes to Check

### 1. **Network Connectivity**
- iOS may be on a different network than your dev machine
- Firewall or proxy may be blocking requests to Supabase
- **Solution**:
  - Make sure iOS device is on the SAME Wi-Fi network as dev machine
  - Check if you can reach `https://zsgmjpzopirshfjstoen.supabase.co` from iOS Safari
  - Test with `curl https://zsgmjpzopirshfjstoen.supabase.co/auth/v1/health` in terminal

### 2. **Supabase Authentication Issue**
- User account doesn't exist in Supabase
- Password is incorrect
- Email format issue (case sensitivity, spaces, etc.)
- **Solution**:
  - Verify the credentials work on the web browser first
  - Check Supabase dashboard: https://app.supabase.com/
  - Look in "Authentication > Users" to see if the account exists
  - Try creating a new test account via the Register screen

### 3. **Session Storage on iOS**
- `expo-secure-store` may not be working properly on iOS
- Session not being persisted between app restarts
- **Solution**:
  - Try logging in again immediately (don't force quit the app)
  - Check iOS app logs in Xcode console for SecureStore errors
  - Look for warnings like "SecureStore not available on this platform"

### 4. **Error Handling Not Showing**
- Error message is being set in state but UI doesn't show it
- Alert.alert() may not work properly in Expo Go
- **Solution**:
  - Add console.log statements to see what's happening
  - Watch Xcode console or `expo start` output for error logs
  - Look for messages like: `"Login failed"`, `"No session or user data returned"`

## Step-by-Step Debugging

### Step 1: Verify Network Access
```bash
# On iOS device, open Safari and test:
https://zsgmjpzopirshfjstoen.supabase.co/auth/v1/health
# Should return: {"status":"ok"}
```

### Step 2: Test Credentials on Web First
1. Open `http://localhost:8081` in web browser
2. Try logging in with the same credentials
3. **If it works on web but not iOS** → Network or platform issue
4. **If it fails on both** → Invalid credentials issue

### Step 3: Check Supabase Users
1. Go to: https://app.supabase.com/
2. Log in with your Supabase account
3. Select your project
4. Go to **Authentication > Users**
5. Look for the email you're trying to log in with
6. If not there → Account needs to be created first

### Step 4: Enable Console Logging
Add this to the top of `src/services/authService.ts` to see detailed logs:

```typescript
const DEBUG_AUTH = true;

// In the login() function, add after signInWithPassword:
if (DEBUG_AUTH) {
  console.log(`[AUTH DEBUG] Login attempt with email: ${credentials.email}`);
  console.log(`[AUTH DEBUG] Response error:`, error);
  console.log(`[AUTH DEBUG] Response data:`, { session: data.session?.access_token, user: data.user?.email });
}
```

### Step 5: Check Expo Go Console
While logged into Expo Go on iOS:
1. Shake the device
2. Select "View logs" or use `expo start` terminal output
3. Look for any error messages related to authentication
4. Look for network errors

## Common Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "No session or user data returned" | Supabase returned empty response | Check if account exists in Supabase |
| "Invalid API key" | Environment variables not loaded | Restart Expo Go app, try fresh build |
| Network timeout | iOS can't reach Supabase | Check Wi-Fi connection, firewall |
| "Invalid grant" | Wrong password or account disabled | Verify password, check Supabase dashboard |
| Silent redirect loop | Session not persisting | Try again immediately, check SecureStore |

## Testing Checklist

- [ ] Credentials work on web browser at `http://localhost:8081`
- [ ] Account exists in Supabase dashboard (Authentication > Users)
- [ ] iOS device is on SAME Wi-Fi as dev machine
- [ ] iOS can reach `https://zsgmjpzopirshfjstoen.supabase.co` via Safari
- [ ] No error messages in `expo start` terminal output
- [ ] No error messages in Xcode console (if using Xcode)
- [ ] Tried logging in immediately (not after app restart)
- [ ] Password doesn't contain special characters that need escaping
- [ ] Email is lowercase and has no leading/trailing spaces

## If Still Stuck

1. **Create a test account first**:
   - Use the Register screen in the app
   - Create account on iOS with simple credentials (e.g., `test@example.com` / `password123`)
   - Then try logging in immediately

2. **Check environment variables on iOS**:
   - Make sure Expo is loading `.env.local`
   - Try restarting `expo start` and reconnecting iOS

3. **Enable Supabase debug mode**:
   - Check Supabase real-time logs at: https://app.supabase.com/project/{your-project}/sql-editor
   - Run: `SELECT * FROM auth.users;` to see all accounts

4. **Try from a different network**:
   - Test on cellular data (if available) to rule out Wi-Fi issues
   - Or test from a different Wi-Fi network

## Notes for Next Time

- iOS mobile testing is more strict about environment setup
- Network connectivity is the #1 cause of silent login failures
- Error messages from Supabase may not display in Expo Go alert dialogs
- Always test credentials on web first before debugging iOS
