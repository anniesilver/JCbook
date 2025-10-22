# JC Court Booking Tool - Comprehensive Test Plan

## Test Environment
- **Application URL:** http://localhost:8084
- **Branch:** dev/auth
- **Testing Tool:** chrome-devtools MCP server
- **Test Date:** 2025-10-22

---

## Authentication Feature - Test Suite

### 1. Login Screen - UI & Basic Interactions (9 tests)

#### Test 1.1: Initial Screen Load
**Steps:**
1. Navigate to http://localhost:8084
2. Observe the initial screen that loads

**Expected:**
- Login screen displays as the first screen
- Title shows "JC Court Booking"
- Subtitle shows "Sign In to Your Account"

**Pass Criteria:** Login screen is the landing page with correct branding

---

#### Test 1.2: Email Input Field Exists
**Steps:**
1. Locate the email input field
2. Verify label text

**Expected:**
- Email input field is present
- Label reads "Email Address"
- Placeholder text is "your@email.com"

**Pass Criteria:** Email field is visible and properly labeled

---

#### Test 1.3: Email Input Accepts Text
**Steps:**
1. Click on email input field
2. Type: "test@example.com"
3. Observe the input

**Expected:**
- Text appears in the field
- Characters are visible (not masked)

**Pass Criteria:** Email input accepts and displays text

---

#### Test 1.4: Password Input Field Exists
**Steps:**
1. Locate the password input field
2. Verify label text

**Expected:**
- Password input field is present
- Label reads "Password"
- Placeholder shows masked characters: "••••••••"

**Pass Criteria:** Password field is visible and properly labeled

---

#### Test 1.5: Password Input Masks Characters
**Steps:**
1. Click on password input field
2. Type: "testpassword123"
3. Observe the input display

**Expected:**
- Characters are masked (show as dots or asterisks)
- Actual text is hidden from view

**Pass Criteria:** Password input masks characters by default

---

#### Test 1.6: Show/Hide Password Toggle Works
**Steps:**
1. Type "testpass123" in password field
2. Click the "Show" button
3. Observe password display
4. Click the "Hide" button
5. Observe password display

**Expected:**
- Button initially shows "Show"
- Clicking "Show" reveals password as plaintext
- Button changes to "Hide"
- Clicking "Hide" masks password again
- Button changes back to "Show"

**Pass Criteria:** Toggle switches between masked and plaintext display

---

#### Test 1.7: Login Button Exists and State
**Steps:**
1. Observe login button without entering any data
2. Enter valid email and password
3. Observe button state change

**Expected:**
- Button displays "Sign In"
- Button is disabled (grayed out) when form is empty
- Button becomes enabled (blue) when valid data is entered

**Pass Criteria:** Button is visible and properly enables/disables

---

#### Test 1.8: Register Link Exists
**Steps:**
1. Scroll to bottom of form
2. Locate the registration link

**Expected:**
- Text reads: "Don't have an account? Sign Up"
- "Sign Up" is styled as a clickable link (blue color)

**Pass Criteria:** Register link is present and visually distinct

---

#### Test 1.9: Register Link Navigation
**Steps:**
1. Click on "Sign Up" link
2. Observe screen transition

**Expected:**
- Screen navigates to Register page
- Register screen loads without errors

**Pass Criteria:** Navigation to register screen succeeds

---

### 2. Login Screen - Validation & Error Handling (8 tests)

#### Test 2.1: Empty Email Validation
**Steps:**
1. Leave email field empty
2. Click into email field, then click out
3. Observe error message

**Expected:**
- Red error text appears below email field
- Error message: "Email is required"
- Email field border turns red

**Pass Criteria:** Empty email shows appropriate validation error

---

#### Test 2.2: Invalid Email Format Validation
**Steps:**
1. Type "notanemail" in email field
2. Tab to next field
3. Observe error message

**Expected:**
- Red error text appears: "Please enter a valid email address"
- Email field border turns red
- Field background turns light red (#fee)

**Pass Criteria:** Invalid email format triggers validation error

---

#### Test 2.3: Empty Password Validation
**Steps:**
1. Enter valid email: "test@example.com"
2. Leave password field empty
3. Tab out of password field
4. Observe error message

**Expected:**
- Red error text appears: "Password is required"
- Password field border turns red

**Pass Criteria:** Empty password shows validation error

---

#### Test 2.4: Short Password Validation
**Steps:**
1. Enter valid email
2. Type "12345" (5 characters) in password field
3. Tab out
4. Observe error message

**Expected:**
- Red error text: "Password must be at least 6 characters long"
- Password field border turns red

**Pass Criteria:** Password less than 6 characters triggers error

---

#### Test 2.5: Login Button Disabled for Invalid Form
**Steps:**
1. Enter invalid email: "notanemail"
2. Enter valid password: "testpass123"
3. Observe login button state

**Expected:**
- Login button remains disabled (grayed out, opacity 0.6)
- Button is not clickable

**Pass Criteria:** Button stays disabled with invalid data

---

#### Test 2.6: Real-time Validation Updates
**Steps:**
1. Type "test" in email field (invalid)
2. Observe error appears
3. Continue typing to complete "test@example.com"
4. Observe error disappears

**Expected:**
- Error appears while email is invalid
- Error disappears when email becomes valid
- Border color changes from red to normal

**Pass Criteria:** Validation updates in real-time as user types

---

#### Test 2.7: Error Clears When Typing
**Steps:**
1. Submit login with invalid credentials (triggers server error)
2. Observe error message in red box
3. Start typing in email or password field
4. Observe error message

**Expected:**
- Server error is displayed in red container at bottom of form
- Error disappears as soon as user starts typing in any field

**Pass Criteria:** Server errors clear when user modifies input

---

#### Test 2.8: Loading State During Login
**Steps:**
1. Enter valid email and password
2. Click "Sign In" button
3. Observe button during processing
4. Wait for response

**Expected:**
- Button shows spinning ActivityIndicator
- Button text "Sign In" is replaced by spinner
- Button remains disabled during loading
- Form inputs are disabled

**Pass Criteria:** Loading spinner displays during authentication

---

### 3. Login Screen - Authentication Tests (5 tests)

**Note:** These tests require valid Supabase configuration and test credentials

#### Test 3.1: Valid Login Success
**Steps:**
1. Enter test credentials:
   - Email: [TEST_EMAIL_PROVIDED_BY_DEVELOPER]
   - Password: [TEST_PASSWORD_PROVIDED_BY_DEVELOPER]
2. Click "Sign In"
3. Wait for response
4. Observe result

**Expected:**
- Loading spinner displays briefly
- No error message appears
- Screen redirects to app home/dashboard (tabs screen)
- User is authenticated

**Pass Criteria:** Valid credentials log user in and navigate to app

---

#### Test 3.2: Invalid Email Error
**Steps:**
1. Enter email: "nonexistent@example.com"
2. Enter password: "testpassword123"
3. Click "Sign In"
4. Wait for response

**Expected:**
- Error message displays in red box
- Error text from Supabase (likely "Invalid login credentials" or similar)
- User remains on login screen

**Pass Criteria:** Invalid email shows server error message

---

#### Test 3.3: Wrong Password Error
**Steps:**
1. Enter valid test email
2. Enter wrong password: "wrongpassword123"
3. Click "Sign In"
4. Wait for response

**Expected:**
- Error message displays: "Invalid login credentials" (or Supabase equivalent)
- User remains on login screen
- Fields remain editable

**Pass Criteria:** Wrong password shows authentication error

---

#### Test 3.4: Network Error Handling
**Steps:**
1. Disconnect network or simulate timeout
2. Enter valid credentials
3. Click "Sign In"
4. Wait for timeout

**Expected:**
- Error message displays indicating network issue
- Error text describes the problem (e.g., "Network request failed")
- User can retry

**Pass Criteria:** Network errors are caught and displayed gracefully

---

#### Test 3.5: Session Token Persistence
**Steps:**
1. Successfully log in with valid credentials
2. Verify navigation to app screens
3. Check browser developer tools > Application > Storage

**Expected:**
- SecureStore (or equivalent) contains "auth_token" entry
- Token is stored for session persistence

**Pass Criteria:** Auth token is saved to secure storage

---

### 4. Register Screen - UI & Navigation (7 tests)

#### Test 4.1: Register Screen Displays
**Steps:**
1. Navigate to register screen (click Sign Up from login)
2. Observe screen content

**Expected:**
- Title shows "JC Court Booking"
- Subtitle shows "Create Your Account"
- Form is displayed with all fields

**Pass Criteria:** Register screen loads with correct branding

---

#### Test 4.2: Email Field Exists
**Steps:**
1. Locate email input field
2. Verify label and placeholder

**Expected:**
- Label: "Email Address"
- Placeholder: "your@email.com"
- Field accepts input

**Pass Criteria:** Email field is present and functional

---

#### Test 4.3: Password Field Exists
**Steps:**
1. Locate password input field
2. Verify label, placeholder, and hint

**Expected:**
- Label: "Password"
- Placeholder: "••••••••"
- Hint below field: "Minimum 6 characters"
- Show/Hide toggle button present

**Pass Criteria:** Password field is present with hint

---

#### Test 4.4: Confirm Password Field Exists
**Steps:**
1. Locate confirm password field
2. Verify label and placeholder

**Expected:**
- Label: "Confirm Password"
- Placeholder: "••••••••"
- Show/Hide toggle button present

**Pass Criteria:** Confirm password field is present

---

#### Test 4.5: Terms Checkbox Exists
**Steps:**
1. Locate terms agreement checkbox
2. Read the terms text

**Expected:**
- Checkbox is present (unchecked by default)
- Text: "I agree to the Terms of Service and Privacy Policy"

**Pass Criteria:** Terms checkbox is visible with text

---

#### Test 4.6: Register Button Exists
**Steps:**
1. Observe register button
2. Check initial state

**Expected:**
- Button displays "Create Account"
- Button is disabled initially (grayed out)

**Pass Criteria:** Register button is present and initially disabled

---

#### Test 4.7: Login Link Returns to Login
**Steps:**
1. Locate "Already have an account? Sign In" text
2. Click "Sign In" link
3. Observe navigation

**Expected:**
- Link is styled in blue
- Clicking navigates back to login screen
- No errors occur

**Pass Criteria:** Navigation back to login succeeds

---

### 5. Register Screen - Validation (8 tests)

#### Test 5.1: Email Validation
**Steps:**
1. Enter invalid email: "bademail"
2. Tab out of field
3. Observe error

**Expected:**
- Error message: "Please enter a valid email address"
- Field border turns red

**Pass Criteria:** Email validation matches login screen

---

#### Test 5.2: Password Too Short Error
**Steps:**
1. Enter password: "12345" (5 chars)
2. Tab out
3. Observe error

**Expected:**
- Error: "Password must be at least 6 characters long"
- Field border turns red

**Pass Criteria:** Short password triggers validation error

---

#### Test 5.3: Password Confirmation Mismatch
**Steps:**
1. Enter password: "testpass123"
2. Enter confirm password: "testpass456"
3. Tab out of confirm field
4. Observe error

**Expected:**
- Error below confirm field: "Passwords do not match"
- Confirm field border turns red

**Pass Criteria:** Mismatched passwords show error

---

#### Test 5.4: Password Confirmation Match Clears Error
**Steps:**
1. Enter password: "testpass123"
2. Enter confirm: "testpass456" (shows error)
3. Clear confirm field
4. Re-type: "testpass123" (matching)
5. Observe error state

**Expected:**
- Error disappears
- Field border returns to normal
- Fields are valid

**Pass Criteria:** Matching passwords clears validation error

---

#### Test 5.5: Password Change Updates Confirm Validation
**Steps:**
1. Enter password: "testpass123"
2. Enter confirm: "testpass123" (matching)
3. Change password to: "newpass456"
4. Observe confirm field

**Expected:**
- Confirm field now shows mismatch error
- Error: "Passwords do not match"

**Pass Criteria:** Changing password re-validates confirm field

---

#### Test 5.6: Terms Checkbox Required
**Steps:**
1. Enter all valid data (email, matching passwords)
2. Leave terms checkbox unchecked
3. Observe register button

**Expected:**
- Register button remains disabled
- Button is grayed out and not clickable

**Pass Criteria:** Unchecked terms prevents registration

---

#### Test 5.7: Form Valid When All Fields Complete
**Steps:**
1. Enter valid email: "newuser@example.com"
2. Enter password: "testpass123"
3. Enter confirm password: "testpass123"
4. Check terms checkbox
5. Observe register button

**Expected:**
- All validation errors clear
- Register button becomes enabled (blue)
- Button is clickable

**Pass Criteria:** Complete valid form enables button

---

#### Test 5.8: Show/Hide Password Toggles Work
**Steps:**
1. Enter password: "testpass123"
2. Enter confirm password: "testpass123"
3. Click "Show" on password field
4. Click "Show" on confirm password field
5. Observe both fields

**Expected:**
- Both fields can toggle independently
- Both show plaintext when "Show" is clicked
- Both can be hidden again

**Pass Criteria:** Both password toggles function independently

---

### 6. Register Screen - Registration Tests (4 tests)

#### Test 6.1: Valid Registration Success
**Steps:**
1. Enter new unique email: "newtest[TIMESTAMP]@example.com"
2. Enter password: "testpass123"
3. Confirm password: "testpass123"
4. Check terms checkbox
5. Click "Create Account"
6. Wait for response

**Expected:**
- Loading spinner displays
- No error appears
- Account is created
- User is automatically logged in
- Redirects to app home/dashboard

**Pass Criteria:** New account creation succeeds and logs user in

---

#### Test 6.2: Duplicate Email Error
**Steps:**
1. Enter email that already exists in system
2. Enter valid password and confirm
3. Check terms
4. Click "Create Account"
5. Wait for response

**Expected:**
- Error message displays
- Error text indicates email already registered (Supabase error)
- User remains on register screen

**Pass Criteria:** Duplicate email shows appropriate error

---

#### Test 6.3: Loading State During Registration
**Steps:**
1. Enter all valid data
2. Click "Create Account"
3. Observe button immediately

**Expected:**
- Button shows spinning ActivityIndicator
- "Create Account" text is replaced
- All form fields become disabled
- Cannot click button again

**Pass Criteria:** Loading state prevents double submission

---

#### Test 6.4: Registration Error Clears on Edit
**Steps:**
1. Trigger registration error (duplicate email)
2. Observe error message displayed
3. Start typing in any field
4. Observe error state

**Expected:**
- Error clears as soon as user edits any field
- Red error box disappears

**Pass Criteria:** Errors clear on user input

---

### 7. Session & Navigation Tests (5 tests)

#### Test 7.1: Logout Functionality
**Steps:**
1. Successfully log in
2. Navigate to app home/dashboard
3. Locate and click logout button
4. Observe result

**Expected:**
- User is logged out
- Redirected to login screen
- Auth token is cleared from storage
- Cannot navigate back to protected screens

**Pass Criteria:** Logout clears session and returns to login

---

#### Test 7.2: Session Persistence - Reload
**Steps:**
1. Log in successfully
2. Verify you're on app home/dashboard
3. Refresh the browser page (F5 or reload button)
4. Wait for page to load

**Expected:**
- User remains logged in
- Returns to the same screen (dashboard)
- No redirect to login screen

**Pass Criteria:** User session persists across page reloads

---

#### Test 7.3: Session Persistence - Close and Reopen
**Steps:**
1. Log in successfully
2. Close the browser tab
3. Open a new tab and navigate to http://localhost:8084
4. Observe initial screen

**Expected:**
- User remains logged in
- Loads directly to app home/dashboard
- Does not show login screen

**Pass Criteria:** Session persists after closing and reopening

---

#### Test 7.4: Protected Route Access - Unauthenticated
**Steps:**
1. Ensure you are logged out (clear cookies/storage if needed)
2. Manually navigate to protected route: http://localhost:8084/(tabs)
3. Observe result

**Expected:**
- Access is denied
- User is redirected to login screen
- URL changes to login route

**Pass Criteria:** Unauthenticated users cannot access protected routes

---

#### Test 7.5: Navigation Flow - No Flicker
**Steps:**
1. Log out (start fresh)
2. Log in with valid credentials
3. Observe screen transitions carefully

**Expected:**
- No flash of login screen after authentication
- Smooth transition from login to dashboard
- No layout shift or flicker during auth check
- Loading indicator if any transition delay

**Pass Criteria:** Navigation is smooth without visual glitches

---

## Credential Storage Feature - Test Suite

### 8. Credential Storage Screen - Access & UI (6 tests)

#### Test 8.1: Accessing Credential Screen
**Steps:**
1. Log in to application
2. Navigate to settings/profile (or wherever credential screen is located)
3. Locate credential storage option
4. Navigate to credential storage screen

**Expected:**
- Credential screen is accessible from authenticated app
- Screen loads without errors

**Pass Criteria:** Can access credential storage screen

---

#### Test 8.2: Screen Title and Layout
**Steps:**
1. On credential storage screen, observe layout
2. Read title and subtitle

**Expected:**
- Title: "Gametime.net Credentials"
- Subtitle: "Securely store your gametime.net login information"

**Pass Criteria:** Screen displays correct branding and purpose

---

#### Test 8.3: Form Fields Present
**Steps:**
1. Locate all input fields
2. Verify labels

**Expected:**
- Username field with label "Username"
- Password field with label "Password"
- Confirm Password field with label "Confirm Password"
- All fields are empty initially (if no credentials saved)

**Pass Criteria:** All three input fields are present

---

#### Test 8.4: Password Masking
**Steps:**
1. Type "testgametimepass" in password field
2. Observe display

**Expected:**
- Password is masked (shows ••••••••)
- Actual text is hidden

**Pass Criteria:** Password field masks input by default

---

#### Test 8.5: Show/Hide Password Toggle
**Steps:**
1. Type password in password field
2. Type password in confirm password field
3. Click "Show" on password field
4. Click "Show" on confirm password field

**Expected:**
- Both toggles work independently
- Clicking "Show" reveals plaintext
- Clicking "Hide" masks again

**Pass Criteria:** Both password toggles function correctly

---

#### Test 8.6: Save Button Present
**Steps:**
1. Observe action buttons
2. Verify button text

**Expected:**
- Button displays "Save"
- Button is initially disabled if fields are empty

**Pass Criteria:** Save button exists with correct text

---

### 9. Credential Storage - Save & Validation (5 tests)

#### Test 9.1: Empty Username Validation
**Steps:**
1. Leave username empty
2. Enter password and confirm password
3. Click Save

**Expected:**
- Error message appears: "Username is required"
- Username field border turns red
- Credentials are not saved

**Pass Criteria:** Empty username prevents save

---

#### Test 9.2: Short Username Validation
**Steps:**
1. Enter username: "ab" (2 characters)
2. Enter valid password and confirm
3. Click Save

**Expected:**
- Error: "Username must be at least 3 characters"
- Field border turns red

**Pass Criteria:** Username less than 3 characters triggers error

---

#### Test 9.3: Empty Password Validation
**Steps:**
1. Enter valid username: "testuser"
2. Leave password empty
3. Click Save

**Expected:**
- Error: "Password is required"
- Password field border turns red

**Pass Criteria:** Empty password prevents save

---

#### Test 9.4: Short Password Validation
**Steps:**
1. Enter valid username
2. Enter password: "123" (3 characters)
3. Enter confirm: "123"
4. Click Save

**Expected:**
- Error: "Password must be at least 4 characters"
- Field border turns red

**Pass Criteria:** Password less than 4 characters triggers error

---

#### Test 9.5: Password Mismatch Validation
**Steps:**
1. Enter valid username: "testuser"
2. Enter password: "testpass123"
3. Enter confirm: "wrongpass123"
4. Click Save

**Expected:**
- Error below confirm field: "Passwords do not match"
- Confirm field border turns red
- Credentials are not saved

**Pass Criteria:** Mismatched passwords prevent save

---

### 10. Credential Storage - CRUD Operations (6 tests)

#### Test 10.1: Save New Credentials
**Steps:**
1. Enter username: "testgametimeuser"
2. Enter password: "gametimepass123"
3. Enter confirm: "gametimepass123"
4. Click "Save"
5. Wait for response

**Expected:**
- Loading spinner appears on button
- Success alert: "Credentials saved successfully!"
- Form fields clear
- Saved credentials display section appears

**Pass Criteria:** Credentials save successfully

---

#### Test 10.2: Credentials Display Masked
**Steps:**
1. After saving credentials (from 10.1)
2. Observe the "Saved Credentials" section

**Expected:**
- Section displays with title "Saved Credentials"
- Username is shown in plaintext: "testgametimeuser"
- Password is masked: "••••••••"
- Security note: "Your password is encrypted and stored securely."

**Pass Criteria:** Saved password displays as masked, never plaintext

---

#### Test 10.3: Edit Button Appears
**Steps:**
1. With credentials saved
2. Observe action buttons

**Expected:**
- "Edit" button is visible
- "Delete Credentials" button is visible
- Buttons are blue/styled appropriately

**Pass Criteria:** Edit and Delete buttons appear after save

---

#### Test 10.4: Edit Credentials
**Steps:**
1. Click "Edit" button
2. Observe form behavior
3. Change username to: "updatedgametimeuser"
4. Change password to: "newpass456"
5. Confirm password: "newpass456"
6. Click "Update"

**Expected:**
- Form is now in edit mode
- Existing username and password load into fields
- Button text changes to "Update"
- "Cancel" button appears
- After clicking Update: Success alert "Credentials updated successfully!"

**Pass Criteria:** Credentials update successfully

---

#### Test 10.5: Cancel Edit
**Steps:**
1. Click "Edit"
2. Modify fields
3. Click "Cancel"

**Expected:**
- Form clears
- Returns to non-editing mode
- No changes are saved
- Saved credentials display returns

**Pass Criteria:** Cancel discards changes

---

#### Test 10.6: Delete Credentials with Confirmation
**Steps:**
1. With credentials saved
2. Click "Delete Credentials"
3. Observe confirmation dialog
4. Click "Cancel" first
5. Click "Delete Credentials" again
6. Click "Delete" in dialog

**Expected:**
- Confirmation dialog appears: "Are you sure you want to delete your stored credentials?"
- Two buttons: "Cancel" and "Delete"
- Clicking Cancel closes dialog, no deletion
- Clicking Delete removes credentials
- Success alert: "Credentials deleted successfully!"
- Saved credentials section disappears
- Delete button disappears

**Pass Criteria:** Delete requires confirmation and succeeds

---

### 11. Credential Storage - Security & Encryption (2 tests)

#### Test 11.1: Password Never Visible in UI After Save
**Steps:**
1. Save credentials with password "secretpass123"
2. Inspect all parts of the UI
3. Check developer console / network tab

**Expected:**
- Password only visible while typing in form
- After save, password always shows as ••••••••
- Plaintext password never appears in UI

**Pass Criteria:** Saved passwords are never exposed in plaintext

---

#### Test 11.2: Password Encrypted in Storage
**Steps:**
1. Save credentials
2. Open browser developer tools > Application > Storage
3. Inspect stored data (if visible)
4. Check network requests in Network tab

**Expected:**
- Password is encrypted before being sent to Supabase
- Stored password is not plaintext in database
- Network request shows encrypted password, not plaintext

**Pass Criteria:** Passwords are encrypted during storage

---

## Test Execution Checklist

### Pre-Testing Setup
- [ ] Verify application running at http://localhost:8084
- [ ] Confirm chrome-devtools MCP server is available
- [ ] Obtain test credentials for authentication
- [ ] Clear browser cache and storage
- [ ] Open browser developer console for debugging

### Test Execution Order
1. [ ] Login Screen UI (Tests 1.1 - 1.9)
2. [ ] Login Validation (Tests 2.1 - 2.8)
3. [ ] Login Authentication (Tests 3.1 - 3.5)
4. [ ] Register Screen UI (Tests 4.1 - 4.7)
5. [ ] Register Validation (Tests 5.1 - 5.8)
6. [ ] Registration Tests (Tests 6.1 - 6.4)
7. [ ] Session & Navigation (Tests 7.1 - 7.5)
8. [ ] Credential Screen Access (Tests 8.1 - 8.6)
9. [ ] Credential Validation (Tests 9.1 - 9.5)
10. [ ] Credential CRUD (Tests 10.1 - 10.6)
11. [ ] Credential Security (Tests 11.1 - 11.2)

### Post-Testing
- [ ] Document all bugs found in PROGRESS.md
- [ ] Update test case results (✓ or ✗)
- [ ] Take screenshots of any failures
- [ ] Set feature status in PROGRESS.md
- [ ] Notify developer of results

---

## Bug Reporting Template

When a test fails, document using this format:

```
Bug: [Brief descriptive title]
- Test Case: [Test number and name]
- Steps to reproduce: [Exact steps that trigger the bug]
- Expected behavior: [What should happen]
- Actual behavior: [What actually happened]
- Severity: [Critical/High/Medium/Low]
- Screenshot: [Path to screenshot if applicable]
- Status: Awaiting developer fix
```

---

## Test Statistics

- **Total Test Cases:** 56
- **Login Screen Tests:** 22
- **Register Screen Tests:** 19
- **Session/Navigation Tests:** 5
- **Credential Storage Tests:** 19

---

## Expected Validation Error Messages Reference

### Login/Register Screen Errors:
- Empty email: "Email is required"
- Invalid email: "Please enter a valid email address"
- Empty password: "Password is required"
- Short password: "Password must be at least 6 characters long"
- Empty confirm: "Please confirm your password"
- Mismatch passwords: "Passwords do not match"

### Credential Storage Errors:
- Empty username: "Username is required"
- Empty username (whitespace): "Username cannot be empty"
- Short username: "Username must be at least 3 characters"
- Empty password: "Password is required"
- Short password: "Password must be at least 4 characters"
- Empty confirm: "Please confirm your password"
- Mismatch passwords: "Passwords do not match"

### Supabase Auth Errors (expected):
- Invalid credentials: "Invalid login credentials" (or Supabase equivalent)
- User not found: "Invalid login credentials"
- Email already exists: Supabase error message about duplicate email
- Network error: "Network request failed" or timeout message

---

End of Test Plan
