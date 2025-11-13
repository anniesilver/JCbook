# Dev Agent Workflow Guide

## Branch Strategy

We maintain 3 branches:
- **main** - Production code (always stable)
- **dev/backend-server** - Backend server development
- **dev/booking-form** - Mobile app development

## Workflow for Dev Agents

### Before Starting Work

**For Backend Work (jc-dev-agent):**
1. Checkout `dev/backend-server` branch
2. Merge latest from `main`
3. Do the work and commit
4. Merge back to `main`
5. Push both branches

**For Mobile App Work (jc-dev-agent):**
1. Checkout `dev/booking-form` branch
2. Merge latest from `main`
3. Do the work and commit
4. Merge back to `main`
5. Push both branches

### Commands to Use

#### For Backend Server Features
```bash
# Start work
git checkout dev/backend-server
git merge main --no-edit

# After agent completes work and commits
git checkout main
git merge dev/backend-server --no-edit
git push origin main
git push origin dev/backend-server
```

#### For Mobile App Features
```bash
# Start work
git checkout dev/booking-form
git merge main --no-edit

# After agent completes work and commits
git checkout main
git merge dev/booking-form --no-edit
git push origin main
git push origin dev/booking-form
```

## How to Invoke Dev Agent

### Backend Server Work
```
I need the dev agent to work on dev/backend-server branch to [describe task].

Before starting:
1. Checkout dev/backend-server
2. Merge latest from main
3. Then implement [feature]
4. Commit with clear message
```

### Mobile App Work
```
I need the dev agent to work on dev/booking-form branch to [describe task].

Before starting:
1. Checkout dev/booking-form
2. Merge latest from main
3. Then implement [feature]
4. Commit with clear message
```

## After Agent Completes

**You need to manually:**
1. Review the changes
2. Merge the dev branch to main
3. Push both branches to remote

**Commands:**
```bash
# For backend work
git checkout main
git merge dev/backend-server --no-edit
git push origin main
git push origin dev/backend-server

# For mobile app work
git checkout main
git merge dev/booking-form --no-edit
git push origin main
git push origin dev/booking-form
```

## Important Rules

1. ❌ **NEVER** work directly on `main`
2. ❌ **NEVER** involve `develop` or other branches
3. ✅ **ALWAYS** start from latest `main`
4. ✅ **ALWAYS** merge back to `main` after work
5. ✅ **ALWAYS** push both branches

## Example Session

**User:** "I need to fix the precision booking timeout issue in the backend"

**Correct Workflow:**
```
1. git checkout dev/backend-server
2. git merge main --no-edit
3. [Dev agent implements fix and commits]
4. git checkout main
5. git merge dev/backend-server --no-edit
6. git push origin main
7. git push origin dev/backend-server
```

**User:** "I need to update the booking form UI"

**Correct Workflow:**
```
1. git checkout dev/booking-form
2. git merge main --no-edit
3. [Dev agent implements fix and commits]
4. git checkout main
5. git merge dev/booking-form --no-edit
6. git push origin main
7. git push origin dev/booking-form
```

---

**Last Updated:** 2025-11-13
**Status:** Active workflow for all development
