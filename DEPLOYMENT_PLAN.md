# JC Court Booking Tool - Deployment Plan

## Overview
This deployment plan is optimized for **<100 users** with **iOS as primary platform**, web as secondary, and minimal cost.

---

## Client Side Deployment

### iOS App (Primary Platform)

**Build Process:**
```bash
eas build --platform ios
```

**Distribution Strategy:**
- **Method:** TestFlight (Beta Distribution)
- **Why TestFlight:**
  - Supports up to 10,000 beta testers
  - No App Store review process required
  - Free distribution (just need developer account)
  - Share invite link with users directly
- **Requirements:**
  - Apple Developer Account: **$99/year**
  - Expo Application Services (EAS) account (free tier available)

**Steps:**
1. Enroll in Apple Developer Program ($99/year)
2. Configure `eas.json` for iOS build
3. Run `eas build --platform ios`
4. Upload build to TestFlight via App Store Connect
5. Share TestFlight invite link with your <100 users

---

### Web App (Secondary Platform)

**Hosting:** Vercel (Free Tier)

**Why Vercel:**
- Unlimited bandwidth on free tier
- Automatic HTTPS
- Deploy from GitHub automatically
- Custom domain support (free)
- Perfect for <100 users
- Zero configuration needed

**Deployment URL:**
- Default: `https://jc-booking.vercel.app`
- Custom: `https://booking.yourdomain.com` (optional)

**Steps:**
1. Push code to GitHub repository
2. Connect Vercel to GitHub repo
3. Auto-deploys on every push to main branch
4. Update frontend proxy URL to production backend URL

---

### Android App (Optional - Future)

**Options:**
1. **TestFlight Equivalent:** Google Play Internal Testing (free)
2. **Direct Distribution:** Build APK and share download link (free, no Google Play needed)
3. **Google Play Store:** $25 one-time fee

**Build Command:**
```bash
eas build --platform android
```

---

## Server Side Deployment

### Recommended: Railway.app

**Cost:** $5/month (or free with monthly credits)

**Why Railway:**
- Deploy both proxy server + booking executor in single project
- $5 free credit monthly (may cover usage for <100 users)
- Auto-deploys from GitHub
- Built-in environment variables management
- Automatic HTTPS with custom domain support
- No credit card required for initial trial
- Always-on (no sleep/spin-down issues)

**Architecture:**
```
Railway Project: JC-Booking-Backend
├── Service 1: Proxy Server (gametimeProxy.js)
│   - Always running on port 3001
│   - Handles all GameTime.net API calls
│   - Public URL: https://jc-booking-api.up.railway.app
│
└── Service 2: Booking Executor (bookingExecutor.js)
    - Cron job running every 60 seconds
    - Checks for pending bookings to execute
    - Uses same Railway project, different process
```

**Environment Variables Needed:**
```
EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
PORT=3001
NODE_ENV=production
```

**Deployment Steps:**
1. Create Railway account (railway.app)
2. Create new project
3. Connect to GitHub repository
4. Add two services:
   - Service 1: Run `node backend/gametimeProxy.js`
   - Service 2: Run `node backend/bookingExecutor.js`
5. Set environment variables
6. Deploy automatically on git push

**Railway URL Pattern:**
- Auto-generated: `https://your-app.up.railway.app`
- Custom domain: `https://api.jcbooking.com` (optional)

---

### Alternative: Render.com (Free but Risky)

**Cost:** $0/month

**Limitations:**
- Server spins down after 15 minutes of inactivity
- Cold start takes 30-60 seconds
- **Major Issue:** Booking executor won't run when server is asleep
- Risk of missed booking executions

**Workaround (Not Recommended):**
- Use external cron service (cron-job.org) to ping server every 14 minutes
- Keeps server awake but not 100% reliable
- Could miss bookings if timing is off

**Only Use If:**
- You're testing/developing
- Budget is absolutely $0
- You can tolerate missed bookings occasionally

---

### Alternative: DigitalOcean Droplet

**Cost:** $6/month (basic droplet)

**Why Consider:**
- Full control over server
- No vendor lock-in
- Can run multiple projects
- 100% uptime control

**Why NOT Recommended for This Project:**
- Requires manual server setup and maintenance
- Need to configure PM2 for process management
- Manual SSL certificate setup (Let's Encrypt)
- More DevOps work vs Railway's simplicity

---

## Database: Supabase (Already Set Up)

**Cost:** FREE (up to 500MB storage, 50,000 monthly active users)

**Current Setup:**
- Auth: User authentication
- Database: Stores credentials, bookings, user data
- Storage: Encrypted credentials

**Production Checklist:**
- [ ] Update CORS settings to allow production web domain
- [ ] Update CORS to allow Railway backend URL
- [ ] Verify Row Level Security (RLS) policies are enabled
- [ ] Backup credentials encryption key securely

---

## Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT DEVICES                        │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   iOS App    │  │   Web App    │  │ Android App  │  │
│  │ (TestFlight) │  │  (Vercel)    │  │  (Future)    │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
          ┌──────────────────▼─────────────────┐
          │      SUPABASE (Hosted Cloud)       │
          │  - User Authentication             │
          │  - PostgreSQL Database             │
          │  - Encrypted Credentials Storage   │
          │  - Bookings Table                  │
          │                                    │
          │  Cost: FREE (up to 500MB)          │
          └──────────────────┬─────────────────┘
                             │
          ┌──────────────────▼─────────────────┐
          │     RAILWAY.APP (Backend Server)   │
          │                                    │
          │  ┌──────────────────────────────┐  │
          │  │  Service 1: Proxy Server     │  │
          │  │  - Port 3001                 │  │
          │  │  - Handles CORS bypass       │  │
          │  │  - Session management        │  │
          │  │  - Always running            │  │
          │  └──────────────────────────────┘  │
          │                                    │
          │  ┌──────────────────────────────┐  │
          │  │  Service 2: Booking Executor │  │
          │  │  - Cron every 60 seconds     │  │
          │  │  - Executes pending bookings │  │
          │  │  - Updates booking status    │  │
          │  └──────────────────────────────┘  │
          │                                    │
          │  Cost: $5/month (or free credits)  │
          └──────────────────┬─────────────────┘
                             │
          ┌──────────────────▼─────────────────┐
          │       GAMETIME.NET API             │
          │  - Court availability data         │
          │  - Booking submission              │
          │  - User authentication             │
          └────────────────────────────────────┘
```

---

## Cost Breakdown

| Component | Service | Cost | Notes |
|-----------|---------|------|-------|
| **iOS Distribution** | Apple Developer Account | $99/year ($8.25/mo) | Required for TestFlight |
| **Web Hosting** | Vercel Free Tier | **$0/month** | Perfect for <100 users |
| **Backend Server** | Railway.app | $5/month | May be free with credits |
| **Database** | Supabase Free Tier | **$0/month** | Up to 500MB storage |
| **Android** | N/A (Future) | $0 or $25 one-time | Optional |
| | | | |
| **TOTAL (Monthly)** | | **$5 - $13/month** | $5 if Railway credits cover, $13 worst case |
| **TOTAL (Yearly)** | | **$159/year** | Assuming $5/mo Railway + $99 Apple |

---

## Deployment Workflow

### Initial Setup (One-Time)

1. **Backend Deployment:**
   ```bash
   # Push backend code to GitHub
   git add backend/
   git commit -m "Prepare backend for deployment"
   git push origin main

   # On Railway:
   # - Create new project
   # - Connect GitHub repo
   # - Add two services (proxy + executor)
   # - Set environment variables
   # - Deploy
   ```

2. **Update Frontend Configuration:**
   ```typescript
   // Before (Development):
   const proxyUrl = 'http://localhost:3001';

   // After (Production):
   const proxyUrl = process.env.EXPO_PUBLIC_PROXY_URL || 'https://jc-booking.up.railway.app';
   ```

3. **Web Deployment:**
   ```bash
   # On Vercel:
   # - Connect GitHub repo
   # - Select root directory
   # - Framework preset: Expo
   # - Deploy
   ```

4. **iOS Build:**
   ```bash
   # Configure EAS
   eas build:configure

   # Build for iOS
   eas build --platform ios

   # Submit to TestFlight
   eas submit --platform ios
   ```

### Continuous Deployment (Ongoing)

**Automatic Process:**
1. Push code to GitHub `main` branch
2. Vercel auto-deploys web app (< 2 minutes)
3. Railway auto-deploys backend (< 3 minutes)
4. iOS requires manual rebuild via `eas build` when needed

---

## Pre-Deployment Checklist

### Code Changes Needed

- [ ] Update all `http://localhost:3001` references to production Railway URL
- [ ] Update Supabase CORS settings for production domains
- [ ] Add environment variable support for proxy URL
- [ ] Test all API endpoints work with production URLs
- [ ] Ensure proxy credentials auto-login logic works (pending feature)
- [ ] Verify booking executor can access Supabase from Railway

### Railway Configuration

- [ ] Create Railway account
- [ ] Create new project
- [ ] Add Service 1: Proxy Server
  - [ ] Start command: `node backend/gametimeProxy.js`
  - [ ] Port: 3001
- [ ] Add Service 2: Booking Executor
  - [ ] Start command: `node backend/bookingExecutor.js`
- [ ] Set environment variables:
  - [ ] `EXPO_PUBLIC_SUPABASE_URL`
  - [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `NODE_ENV=production`
- [ ] Test both services running
- [ ] Verify public URL works

### Vercel Configuration

- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Configure build settings:
  - [ ] Framework: Expo
  - [ ] Build command: `npx expo export:web`
  - [ ] Output directory: `dist`
- [ ] Add environment variables:
  - [ ] `EXPO_PUBLIC_SUPABASE_URL`
  - [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - [ ] `EXPO_PUBLIC_PROXY_URL` (Railway URL)
- [ ] Deploy and test

### Apple Developer Setup

- [ ] Enroll in Apple Developer Program ($99/year)
- [ ] Create App ID in Apple Developer Portal
- [ ] Configure app signing certificates
- [ ] Set up TestFlight access
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Login: `eas login`
- [ ] Configure: `eas build:configure`

### Supabase Production Setup

- [ ] Review Row Level Security (RLS) policies
- [ ] Add production web domain to allowed origins
- [ ] Add Railway backend URL to allowed origins
- [ ] Backup encryption keys securely
- [ ] Set up database backups (Supabase Pro if needed)
- [ ] Monitor usage to stay within free tier limits

---

## Testing Before Going Live

### Backend Testing
```bash
# Test Railway proxy endpoint
curl https://your-app.up.railway.app/health

# Test login
curl -X POST https://your-app.up.railway.app/api/gametime/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Test availability
curl https://your-app.up.railway.app/api/gametime/availability/2025-10-29
```

### Web App Testing
- [ ] Visit Vercel URL
- [ ] Test login/logout
- [ ] Test viewing credentials
- [ ] Test creating booking
- [ ] Test deleting booking
- [ ] Verify executor picks up booking

### iOS TestFlight Testing
- [ ] Install TestFlight app on iPhone
- [ ] Accept invite link
- [ ] Download beta app
- [ ] Test all features
- [ ] Verify push to production backend

---

## Post-Deployment Monitoring

### Railway Monitoring
- Check logs for proxy server errors
- Check logs for executor cron runs
- Monitor monthly usage to stay within budget
- Set up Railway alerts for downtime

### Supabase Monitoring
- Monitor database size (500MB limit on free tier)
- Check API request count
- Review user authentication logs
- Monitor for failed queries

### User Feedback
- Collect TestFlight beta feedback
- Monitor for missed bookings
- Track common errors/bugs
- Plan updates based on usage patterns

---

## Scaling Considerations (Future)

**If User Base Grows Beyond 100:**

1. **Backend:** Upgrade Railway plan ($20/mo for more resources)
2. **Database:** Upgrade Supabase to Pro ($25/mo for 8GB storage)
3. **iOS:** Move from TestFlight to App Store (requires review process)
4. **Monitoring:** Add error tracking (Sentry free tier)
5. **Analytics:** Add usage analytics (PostHog, Mixpanel free tier)

**If Booking Volume Increases:**
- Optimize executor cron frequency (maybe 30s instead of 60s)
- Add booking queue system
- Implement retry logic with exponential backoff
- Add booking execution history/audit log

---

## Rollback Plan

**If Something Breaks in Production:**

1. **Web:** Vercel allows instant rollback to previous deployment
2. **Backend:** Railway allows rollback to previous build
3. **iOS:** Cannot rollback TestFlight, but can push new build quickly
4. **Database:** Supabase has point-in-time recovery (Pro plan)

**Emergency Contacts:**
- Railway Support: support@railway.app
- Vercel Support: support@vercel.com
- Supabase Support: support@supabase.com

---

## Security Checklist

- [ ] All API keys stored in environment variables (never in code)
- [ ] Supabase RLS policies enabled on all tables
- [ ] HTTPS enforced on all endpoints
- [ ] GameTime credentials encrypted at rest
- [ ] No sensitive data in frontend code
- [ ] CORS properly configured (not `*` wildcard)
- [ ] Rate limiting on proxy endpoints (consider adding)
- [ ] User sessions expire after inactivity
- [ ] No debug logs in production builds

---

## Support & Maintenance

**Regular Tasks:**
- Weekly: Check Railway/Vercel logs for errors
- Monthly: Review Supabase storage usage
- Quarterly: Update dependencies (`npm update`)
- Yearly: Renew Apple Developer account

**Documentation Updates:**
- Keep this deployment plan updated as architecture changes
- Document any manual configuration steps
- Maintain list of environment variables
- Keep track of third-party service credentials

---

## Future Enhancements (Post-MVP)

1. **Push Notifications:** Notify users when booking is confirmed
2. **Booking History:** Archive old bookings for analytics
3. **Admin Dashboard:** View all users' bookings, system health
4. **Multi-Court Support:** Book multiple courts in one request
5. **Recurring Bookings:** Auto-book every Friday at 6 PM
6. **Waiting List:** Auto-book when preferred slot becomes available
7. **Email Confirmations:** Send email when booking succeeds/fails

---

**Document Version:** 1.0
**Last Updated:** 2025-10-25
**Author:** Claude Code Agent
**Project:** JC Court Booking Tool
