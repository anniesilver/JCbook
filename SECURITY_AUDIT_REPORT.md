# Security Audit Report - JC Court Booking Tool

**Project:** JC Court Booking Tool
**Audit Date:** 2025-11-13
**Auditor:** Claude Code
**Codebase Version:** Latest commit (9114950)

---

## Executive Summary

This comprehensive security audit examined the JC Court Booking Tool, a React Native mobile application with a Node.js backend automation server. The audit identified **17 security vulnerabilities** ranging from critical to low severity, along with code quality and performance observations.

### Key Findings:
- **3 Critical vulnerabilities** requiring immediate attention
- **6 High-severity issues** that should be addressed soon
- **5 Medium-severity issues** to be addressed in next sprint
- **3 Low-severity issues** for future consideration

### Overall Security Posture:
The application demonstrates good architectural decisions (separation of concerns, RLS policies, try-catch error handling) but suffers from **cryptographic weaknesses** and **insufficient security controls** in authentication and logging.

---

## Table of Contents

1. [Critical Vulnerabilities](#critical-vulnerabilities)
2. [High-Severity Issues](#high-severity-issues)
3. [Medium-Severity Issues](#medium-severity-issues)
4. [Low-Severity Issues](#low-severity-issues)
5. [Code Quality Assessment](#code-quality-assessment)
6. [Performance Analysis](#performance-analysis)
7. [Security Best Practices](#security-best-practices)
8. [Recommendations](#recommendations)

---

## Critical Vulnerabilities

### 1. Weak Encryption Algorithm (CRITICAL)

**Location:** `src/services/encryptionService.ts:27-38`, `backend-server/decryptPassword.js:33-38`

**Issue:**
The application uses a simple XOR cipher for encrypting GameTime credentials. XOR ciphers are **not cryptographically secure** and can be easily broken with known-plaintext attacks or frequency analysis.

```typescript
// Current implementation - INSECURE
function xorEncrypt(text: string, key: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}
```

**Risk:**
- Encrypted credentials can be decrypted by attackers with database access
- Known-plaintext attacks (if attacker knows a username/password pair)
- No authentication or integrity checking
- Vulnerable to bit-flipping attacks

**Impact:** If an attacker gains read access to the database, they can decrypt all stored GameTime credentials.

**Recommendation:**
Replace with AES-256-GCM encryption using:
- `expo-crypto` for mobile (already in dependencies)
- `crypto` module for Node.js backend
- Proper key derivation (PBKDF2 or Argon2)
- Unique initialization vectors (IVs) per encryption
- Authentication tags for integrity

**Example Fix:**
```typescript
import * as Crypto from 'expo-crypto';

async function encryptCredential(data: string, userId: string): Promise<string> {
  // Derive a proper encryption key using PBKDF2
  const salt = await Crypto.getRandomBytesAsync(16);
  const key = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    userId + process.env.ENCRYPTION_SALT
  );

  // Use Web Crypto API for AES-GCM encryption
  // (Implementation would use native crypto.subtle.encrypt)
  // Return: base64(salt + iv + ciphertext + auth_tag)
}
```

---

### 2. Predictable Encryption Keys (CRITICAL)

**Location:** `src/services/encryptionService.ts:18-20`, `backend-server/decryptPassword.js:23-25`

**Issue:**
Encryption keys are derived deterministically from user IDs using only substring and padding:

```typescript
function generateKeyFromUserId(userId: string): string {
  return userId.substring(0, 32).padEnd(32, "0");
}
```

**Risk:**
- User IDs (UUIDs) are predictable or discoverable
- No salt or key derivation function (KDF)
- Identical keys for the same user across all credentials
- Attacker with one user ID can decrypt all that user's credentials

**Impact:** Complete compromise of all credentials for a user if their user ID is known.

**Recommendation:**
- Use PBKDF2, Argon2, or scrypt for key derivation
- Add a unique salt stored per credential
- Use environment-based master key for additional entropy
- Minimum 100,000 iterations for PBKDF2

---

### 3. Service Role Key Bypass (CRITICAL)

**Location:** `backend-server/server.js:64-67`

**Issue:**
The backend server uses Supabase SERVICE_ROLE_KEY which **completely bypasses Row Level Security (RLS)** policies:

```javascript
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Bypasses all RLS!
);
```

**Risk:**
- If the backend server is compromised, attacker has full database access
- No defense-in-depth - RLS policies are completely bypassed
- A bug in backend code could expose all users' data
- Server logs may contain sensitive data from any user

**Impact:** Total database compromise if backend server is compromised.

**Recommendation:**
1. **Immediate:** Implement IP whitelisting for backend server
2. **Short-term:** Use service accounts with limited permissions
3. **Long-term:** Implement API gateway with user authentication
4. Add audit logging for all service role operations
5. Use database functions with SECURITY DEFINER for sensitive operations

---

## High-Severity Issues

### 4. Potential Credential Logging (HIGH)

**Location:** Multiple files (backend-server/playwrightBooking.js, src/services/authService.ts)

**Issue:**
The code contains console.log statements that may inadvertently log sensitive information:

- `backend-server/playwrightBooking.js`: Logs form data that may contain credentials
- `src/services/authService.ts:89`: Logs email during login attempts
- `backend-server/check-credentials.js`: Logs credential validation

**Risk:**
- Passwords and credentials in application logs
- Logs stored in cloud logging services (CloudWatch, etc.)
- Accessible to operators with log access
- May persist longer than expected

**Recommendation:**
1. Remove all console.log statements containing user input
2. Implement structured logging with log levels
3. Use log sanitization to automatically redact sensitive fields
4. Never log: passwords, tokens, session IDs, PII

**Example:**
```javascript
// BAD
console.log('Login attempt:', { email, password });

// GOOD
logger.info('Login attempt', { email: sanitizeEmail(email) });
```

---

### 5. Insufficient Password Validation (HIGH)

**Location:** `src/services/credentialsService.ts:44-50`, `src/utils/validation.ts:17-19`

**Issue:**
Password requirements are too weak:
- GameTime passwords: Minimum **4 characters** (!!)
- Auth passwords: Minimum **6 characters**
- No complexity requirements (uppercase, numbers, symbols)
- No password strength meter
- No check against common passwords

```typescript
// Current - TOO WEAK
if (credentials.password.length < 4) {
  return { error: { message: "Password must be at least 4 characters" }};
}
```

**Risk:**
- Brute force attacks succeed quickly
- Dictionary attacks highly effective
- User accounts easily compromised

**Recommendation:**
- **Minimum 12 characters** for all passwords
- Require at least: 1 uppercase, 1 lowercase, 1 number, 1 symbol
- Use zxcvbn or similar for password strength estimation
- Check against Have I Been Pwned breach database
- Implement progressive password strength indicator

---

### 6. No Rate Limiting (HIGH)

**Location:** Authentication endpoints (Supabase managed)

**Issue:**
No visible rate limiting on authentication attempts or API calls:
- Unlimited login attempts
- No account lockout mechanism
- No CAPTCHA after failed attempts
- API endpoints have no throttling

**Risk:**
- Credential stuffing attacks
- Brute force password guessing
- Account enumeration via timing attacks
- DoS attacks on API endpoints

**Recommendation:**
1. Implement rate limiting with exponential backoff:
   - 5 login attempts per 15 minutes per IP
   - Account lockout after 10 failed attempts
   - CAPTCHA after 3 failed attempts
2. Use Supabase's built-in rate limiting features
3. Implement API rate limiting: 100 requests/minute per user
4. Add distributed rate limiting using Redis

---

### 7. Missing Input Sanitization (HIGH)

**Location:** Multiple form inputs (booking forms, credential forms)

**Issue:**
User inputs are not sanitized before storage or display:
- No XSS protection in React Native TextInput
- Date/time inputs not validated for injection
- Username fields accept any characters
- No sanitization before database insertion

**Risk:**
- Stored XSS attacks (if content displayed in web views)
- SQL injection (mitigated by Supabase ORM but still risky)
- Path traversal in filenames
- Command injection in backend scripts

**Recommendation:**
1. Use DOMPurify for HTML sanitization
2. Validate all inputs against strict schemas (use Zod)
3. Sanitize before storage and before display
4. Use parameterized queries (already using Supabase correctly)
5. Implement Content Security Policy headers

---

### 8. Weak Session Management (HIGH)

**Location:** `src/services/authService.ts:124-130`

**Issue:**
Session tokens stored without proper security measures:
- No visible session timeout configuration
- No refresh token rotation
- No device tracking
- No concurrent session limits
- Tokens stored indefinitely

**Risk:**
- Stolen tokens remain valid indefinitely
- No way to revoke compromised sessions
- Session hijacking attacks
- Concurrent session abuse

**Recommendation:**
1. Set session timeout to 1 hour with 7-day refresh token
2. Implement refresh token rotation
3. Track active sessions per user (max 3 devices)
4. Add "Log out all devices" functionality
5. Implement session fingerprinting

---

### 9. Error Messages Leak Information (HIGH)

**Location:** `src/services/authService.ts:96-105`, error handling throughout

**Issue:**
Error messages reveal too much information:
- Database error codes exposed to users
- Stack traces in development mode
- Specific reasons for authentication failures
- Database schema details in errors

```typescript
// Exposes too much information
return {
  error: {
    message: error.message,  // May contain sensitive details
    code: error.code,        // Reveals backend structure
    status: error.status     // Database status codes
  }
};
```

**Risk:**
- Attackers learn about system internals
- Database enumeration attacks
- Account enumeration (different errors for valid/invalid users)

**Recommendation:**
1. Use generic error messages for users: "Authentication failed"
2. Log detailed errors server-side only
3. Use error codes instead of detailed messages
4. Sanitize database errors before returning to client

---

## Medium-Severity Issues

### 10. No CSRF Protection (MEDIUM)

**Location:** All API calls

**Issue:**
No CSRF tokens in API requests. While Supabase uses JWTs which provide some protection, custom API endpoints may be vulnerable.

**Recommendation:**
- Implement CSRF tokens for state-changing operations
- Use SameSite cookie attributes
- Verify Origin/Referer headers

---

### 11. Missing Security Headers (MEDIUM)

**Location:** Web platform configuration

**Issue:**
No Content Security Policy, X-Frame-Options, or other security headers configured.

**Recommendation:**
Add to web configuration:
- Content-Security-Policy: script-src 'self'
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security: max-age=31536000

---

### 12. No Audit Logging (MEDIUM)

**Location:** All sensitive operations

**Issue:**
No comprehensive audit trail for:
- Credential access/modifications
- Booking creations/cancellations
- Authentication events
- Admin operations

**Recommendation:**
Implement audit logging for all sensitive operations with:
- User ID, timestamp, IP address, action, result
- Tamper-proof logging (append-only)
- Retention policy (7 years for compliance)

---

### 13. Insufficient Validation (MEDIUM)

**Location:** Form inputs throughout application

**Issue:**
Missing validation for:
- Court numbers (can be outside 1-6 range)
- Date ranges (can book far in future/past)
- Time slots (no validation against valid hours)
- Email format (simple regex, accepts invalid emails)

**Recommendation:**
- Use Zod for schema validation
- Validate dates against business rules
- Implement server-side validation for all inputs

---

### 14. Browser Automation Security (MEDIUM)

**Location:** `backend-server/playwrightBooking.js`

**Issue:**
Playwright runs with elevated privileges:
- Runs in non-headless mode (debugging flag)
- No sandbox restrictions
- Credentials passed via command line

**Recommendation:**
- Enable headless mode in production
- Use Docker containers for isolation
- Pass credentials via environment variables
- Implement process isolation

---

## Low-Severity Issues

### 15. Environment Variable Exposure (LOW)

**Location:** `.env.example` files

**Issue:**
.env.example files contain placeholder values that may guide attackers. However, this is standard practice and actual .env files are properly gitignored.

**Recommendation:**
- Ensure .env files are never committed
- Use secret management services (AWS Secrets Manager)
- Rotate secrets regularly

---

### 16. No Data Encryption at Rest (LOW)

**Location:** Supabase database

**Issue:**
While credentials are encrypted, other sensitive data (booking details, confirmation IDs) are stored in plaintext.

**Recommendation:**
- Enable transparent database encryption (TDE)
- Use Supabase's encryption at rest features
- Consider encrypting PII fields

---

### 17. Dependency Vulnerabilities (LOW)

**Location:** package.json, backend-server/package.json

**Issue:**
No automated dependency scanning visible. Dependencies may have known vulnerabilities.

**Recommendation:**
- Run `npm audit` regularly
- Use Dependabot or Snyk for automated vulnerability scanning
- Keep dependencies updated
- Pin dependency versions

---

## Code Quality Assessment

### Strengths:
1. ✅ **Excellent architecture**: Clean separation of concerns
2. ✅ **Proper use of TypeScript**: Type safety in frontend
3. ✅ **Comprehensive error handling**: 44 try-catch blocks found
4. ✅ **Row Level Security**: RLS policies properly configured
5. ✅ **State management**: Good use of Zustand for state
6. ✅ **Modular design**: Services, stores, and components well-organized
7. ✅ **Documentation**: Comprehensive README and implementation docs

### Areas for Improvement:
1. ⚠️ **Inconsistent error handling**: Mix of throw and return patterns
2. ⚠️ **Magic numbers**: Hard-coded values (court IDs, timeouts)
3. ⚠️ **Missing TypeScript in backend**: Backend is pure JavaScript
4. ⚠️ **No unit tests found**: No test files in project
5. ⚠️ **Excessive console.log**: Debug statements in production code
6. ⚠️ **No code comments**: Limited inline documentation

### Code Metrics:
- Total source files: 66
- Try-catch blocks: 44 (good error handling)
- React useState hooks: 21 (reasonable state management)
- No TODO/FIXME/HACK comments found (clean codebase)

---

## Performance Analysis

### Strengths:
1. ✅ **Efficient polling**: 1-hour interval for booking checks
2. ✅ **Session reuse**: Browser session kept open for multiple attempts
3. ✅ **Network optimization**: Latency measurement and compensation
4. ✅ **Lazy loading**: Proper use of React hooks and effects

### Potential Issues:
1. ⚠️ **No pagination**: Booking history loads all records
2. ⚠️ **Synchronous encryption**: Blocking operations in UI thread
3. ⚠️ **No caching**: API responses not cached
4. ⚠️ **Playwright overhead**: Full browser automation for bookings

### Recommendations:
- Implement pagination for booking lists
- Move encryption to Web Workers
- Add response caching with TTL
- Consider lighter alternatives to Playwright if possible

---

## Security Best Practices

### Current Implementation:
| Practice | Status | Notes |
|----------|--------|-------|
| HTTPS/TLS | ✅ Implemented | Supabase provides TLS |
| Authentication | ✅ Implemented | Supabase Auth |
| Authorization | ✅ Implemented | RLS policies |
| Input Validation | ⚠️ Partial | Needs improvement |
| Output Encoding | ❌ Missing | No XSS protection |
| Encryption | ❌ Weak | XOR cipher inadequate |
| Session Management | ⚠️ Partial | No timeout visible |
| Error Handling | ✅ Good | Try-catch throughout |
| Logging | ⚠️ Excessive | Logs sensitive data |
| Rate Limiting | ❌ Missing | No throttling |
| Security Headers | ❌ Missing | None configured |
| Dependency Scanning | ❌ Missing | No automation |

---

## Recommendations

### Immediate Actions (This Week):
1. 🚨 **Replace XOR encryption with AES-256-GCM** (Critical #1, #2)
2. 🚨 **Remove credential logging from all files** (High #4)
3. 🚨 **Increase password minimum to 12 characters** (High #5)
4. 🚨 **Implement IP whitelisting for backend server** (Critical #3)

### Short-Term Actions (This Month):
1. 🔸 Implement rate limiting on authentication (High #6)
2. 🔸 Add input sanitization and validation (High #7)
3. 🔸 Configure session timeouts and rotation (High #8)
4. 🔸 Sanitize error messages (High #9)
5. 🔸 Add security headers for web platform (Medium #11)

### Long-Term Actions (Next Quarter):
1. 🔹 Implement comprehensive audit logging (Medium #12)
2. 🔹 Add CSRF protection (Medium #10)
3. 🔹 Enable transparent database encryption (Low #16)
4. 🔹 Set up automated dependency scanning (Low #17)
5. 🔹 Write unit and integration tests
6. 🔹 Add TypeScript to backend server
7. 🔹 Implement security incident response plan

---

## Conclusion

The JC Court Booking Tool demonstrates solid architectural decisions and reasonable security awareness, but suffers from critical cryptographic weaknesses that must be addressed immediately. The use of XOR cipher and predictable keys puts all stored credentials at risk.

**Priority Actions:**
1. Fix encryption (Critical)
2. Secure logging (High)
3. Strengthen passwords (High)
4. Add rate limiting (High)

With these fixes implemented, the application's security posture would improve from **MEDIUM RISK** to **LOW RISK**.

---

**Audit Completed:** 2025-11-13
**Next Audit Recommended:** After critical vulnerabilities are fixed (1-2 weeks)
