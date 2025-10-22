# Bug #1 Fix Guide: Path Alias Resolution

## Problem Summary

The application **cannot build** because Metro bundler (React Native's JavaScript bundler) does not recognize the `@/` path alias configured in tsconfig.json.

**Error:**
```
Metro error: Unable to resolve module @/screens/auth/RegisterScreen
from C:\ANNIE-PROJECT\JC\app\(auth)\register.tsx
```

## Why This Happens

1. **TypeScript vs Metro:**
   - TypeScript compiler reads `tsconfig.json` and understands path aliases
   - Metro bundler does NOT read `tsconfig.json`
   - Metro needs separate configuration via Babel

2. **Current State:**
   - ✓ tsconfig.json has `"@/*": ["./*"]` configured
   - ✗ babel.config.js is **completely missing** from project
   - ✗ babel-plugin-module-resolver is not installed

## Impact

**Files Affected:** 14 files across the project use `@/` imports:

### Critical (Blocking Auth Testing):
- `app/(auth)/register.tsx` - Cannot import RegisterScreen
- `app/(auth)/login.tsx` - Cannot import LoginScreen
- `app/(auth)/_layout.tsx` - Cannot import auth hooks/components
- `app/_layout.tsx` - Cannot import auth store

### Also Affected:
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/explore.tsx`
- `app/(tabs)/index.tsx`
- `app/modal.tsx`
- `components/parallax-scroll-view.tsx`
- `components/themed-text.tsx`
- `components/themed-view.tsx`
- `components/ui/collapsible.tsx`
- `hooks/use-theme-color.ts`

**Test Impact:** 38 test cases blocked (100% of planned tests)

## The Fix (5 Steps)

### Step 1: Install babel-plugin-module-resolver

```bash
npm install --save-dev babel-plugin-module-resolver
```

### Step 2: Create babel.config.js in project root

Create file: `/c/ANNIE-PROJECT/jc/babel.config.js`

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './src'
          },
          extensions: [
            '.ios.js',
            '.android.js',
            '.js',
            '.jsx',
            '.json',
            '.tsx',
            '.ts',
          ]
        }
      ],
      'react-native-reanimated/plugin'
    ]
  };
};
```

**Important Notes:**
- The `root: ['.']` sets the base directory
- The `alias: { '@': './src' }` maps `@/` to `/src/` directory
- Extensions array ensures TypeScript files are resolved
- `react-native-reanimated/plugin` should be LAST plugin (if using reanimated)

### Step 3: Clear Metro bundler cache

```bash
npx expo start --clear
```

Or manually:
```bash
rm -rf node_modules/.cache
rm -rf .expo
```

### Step 4: Restart dev server

```bash
npx expo start --web
```

### Step 5: Verify build succeeds

You should see:
```
Web Bundled successfully
```

And in browser, the login screen should appear (or app UI if authenticated).

## Verification Checklist

After applying the fix:

- [ ] `npx expo start --web` completes without Metro errors
- [ ] Browser shows login screen (not error overlay)
- [ ] No "Unable to resolve module" errors in terminal
- [ ] TypeScript compilation still works (no new TS errors)
- [ ] Can navigate to register screen
- [ ] Hot reload works when editing files

## Alternative Fix (Not Recommended)

If you don't want to use babel-plugin-module-resolver, you can replace all `@/` imports with relative paths:

**Before:**
```typescript
import { LoginScreen } from '@/screens/auth/LoginScreen';
```

**After:**
```typescript
import { LoginScreen } from '../../src/screens/auth/LoginScreen';
```

**Why not recommended:**
- Tedious to change 14+ files
- Harder to maintain (relative paths break when moving files)
- Less readable code
- Path aliases are industry best practice

## Testing After Fix

Once the build succeeds, the tester will execute:

1. **Smoke Test:** Verify login screen renders
2. **Auth Tests:** 27 test cases for login, register, session
3. **Credential Tests:** 11 test cases for credential storage
4. **Full Report:** Update PROGRESS.md with results

## Common Issues

### Issue: "Cannot find module 'babel-plugin-module-resolver'"
**Solution:** Make sure you ran `npm install --save-dev babel-plugin-module-resolver`

### Issue: Still getting Metro errors after adding babel.config.js
**Solution:**
1. Stop the dev server (Ctrl+C)
2. Clear cache: `npx expo start --clear`
3. Restart server

### Issue: TypeScript errors after adding babel config
**Solution:** Babel config should not affect TypeScript. Make sure tsconfig.json is unchanged.

### Issue: Imports work but hot reload broken
**Solution:** Make sure `react-native-reanimated/plugin` is the LAST plugin in babel.config.js

## Resources

- [Babel Module Resolver Documentation](https://github.com/tleunen/babel-plugin-module-resolver)
- [Expo Babel Configuration](https://docs.expo.dev/guides/customizing-metro/)
- [Metro Bundler Docs](https://metrobundler.dev/)

## Estimated Time to Fix

**5-10 minutes** (including install, config, and verification)

## Priority

**CRITICAL (P0)** - Blocks all development and testing work

## After Fix is Complete

1. Commit changes:
   ```bash
   git add babel.config.js package.json package-lock.json
   git commit -m "fix: add babel config to resolve path aliases for Metro bundler

   - Install babel-plugin-module-resolver
   - Create babel.config.js with module resolver plugin
   - Configure @ alias to map to ./src directory
   - Fixes Metro bundler 'Unable to resolve module' errors

   Bug: Metro bundler does not read tsconfig.json paths
   Solution: Use babel-plugin-module-resolver for Metro compatibility

   Tested: npx expo start --web builds successfully
   Verified: Login screen renders without errors"
   ```

2. Notify tester that fix is ready
3. Tester will verify build and begin full test execution

---

**Generated by:** Claude Code Testing Agent
**Date:** 2025-10-22 13:10 UTC
**For:** JC Court Booking Tool - dev/auth branch
