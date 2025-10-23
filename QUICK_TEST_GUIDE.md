# Date Picker - Quick Test Guide (15 Minutes)

**Purpose:** Fast validation that date picker fix is working
**Time Required:** 15 minutes
**Tester:** Anyone with browser access

---

## Prerequisites

- [ ] App running at http://localhost:8082
- [ ] Test credentials: test@example.com / TestPassword123!
- [ ] Chrome browser (or Firefox/Safari/Edge)

---

## Test Steps (Check off as you go)

### Step 1: Navigate to Booking Form (2 min)

1. [ ] Open http://localhost:8082 in browser
2. [ ] Login with credentials: test@example.com / TestPassword123!
3. [ ] Click on "Booking" tab in bottom navigation
4. [ ] Verify "Book a Court" page loads

**Expected:** Booking form displays with multiple fields

---

### Step 2: Visual Verification (2 min)

5. [ ] Locate "Booking Date" field (third field down)
6. [ ] Verify input has a **calendar icon** on the right side
7. [ ] Verify input shows **today's date** (formatted like MM/DD/YYYY or YYYY-MM-DD)
8. [ ] Verify input has white background with gray border
9. [ ] Verify input looks like a date picker, NOT a plain text box

**Expected:** Date input looks like a proper date picker with calendar icon

**Screenshot:** Take screenshot #1 - "Date input normal state"

---

### Step 3: Open Date Picker (2 min)

10. [ ] Click on the date input field
11. [ ] Verify a **calendar popup** appears
12. [ ] Verify calendar shows current month and year
13. [ ] Verify today's date is highlighted
14. [ ] Verify calendar has next/previous month arrows

**Expected:** Native browser date picker opens with calendar view

**Screenshot:** Take screenshot #2 - "Date picker opened"

---

### Step 4: Test Month Navigation (1 min)

15. [ ] Click "Next Month" arrow (right arrow)
16. [ ] Verify calendar moves to next month
17. [ ] Click "Previous Month" arrow (left arrow)
18. [ ] Return to current month

**Expected:** Month navigation works smoothly

---

### Step 5: Test Date Selection (2 min)

19. [ ] Navigate to next month in calendar
20. [ ] Click on any date 7 days from today (e.g., if today is Oct 23, click Oct 30)
21. [ ] Verify calendar closes automatically
22. [ ] Verify selected date appears in the input field
23. [ ] Scroll down to "Booking Summary" section
24. [ ] Verify "Date:" in summary shows the selected date

**Expected:** Selected date updates input and summary instantly

---

### Step 6: Test Past Date Prevention (2 min)

25. [ ] Click on the date input again to open picker
26. [ ] Try to click on yesterday's date or any past date
27. [ ] Verify past dates are **grayed out or disabled**
28. [ ] Verify you cannot select past dates

**Expected:** Past dates are unselectable (calendar UI prevents it)

---

### Step 7: Test Form Validation (2 min)

29. [ ] Select "Court 1" from the court dropdown
30. [ ] Clear the date field completely (select all text and delete)
31. [ ] Click "Schedule Booking" button at the bottom
32. [ ] Verify error message appears: "Please select a booking date"
33. [ ] Verify error box is red/pink background

**Expected:** Validation error shows for missing date

---

### Step 8: Test Invalid Date Entry (1 min)

34. [ ] Click in the date input field
35. [ ] Try to type letters: "abc123"
36. [ ] Click "Schedule Booking" button
37. [ ] Verify validation error appears

**Expected:** Invalid format is caught by validation

---

### Step 9: Test Reset Button (1 min)

38. [ ] Select a future date (any date next month)
39. [ ] Click "Reset" button at the bottom
40. [ ] Verify date input resets to **today's date**
41. [ ] Verify court dropdown resets to "Select a court..."

**Expected:** Reset button clears form and resets date to today

---

### Step 10: Test Complete Form Submission (2 min)

42. [ ] Fill out the complete form:
    - Court: Court 1
    - Date: Select 7 days from today
    - Time: 10:00
    - Booking Type: Singles
    - Duration: 1 hour
    - Recurrence: Once
43. [ ] Verify Booking Summary shows all your selections
44. [ ] Click "Schedule Booking" button
45. [ ] Verify loading spinner appears
46. [ ] Check if success or error message appears

**Expected:** Form submits without errors (may show database error if tables not set up - that's OK)

**Screenshot:** Take screenshot #3 - "Completed form"

---

## Quick Results

### PASS Criteria:
- ✅ Date input has calendar icon
- ✅ Clicking opens native date picker popup
- ✅ Past dates are disabled/grayed out
- ✅ Can select future dates
- ✅ Selected date updates input and summary
- ✅ Validation catches missing date
- ✅ Reset button works

### FAIL Criteria:
- ❌ Date picker doesn't open (shows as plain text input)
- ❌ Calendar icon missing
- ❌ Past dates can be selected
- ❌ Selected date doesn't update input
- ❌ No validation for missing date
- ❌ JavaScript errors in console

---

## Check Console for Errors

47. [ ] Open browser DevTools (F12 key)
48. [ ] Go to "Console" tab
49. [ ] Look for any red error messages
50. [ ] If errors exist, copy and document them

**Expected:** No errors in console (warnings are OK)

---

## Test Results Summary

**Date:** _______________
**Tester:** _______________
**Browser:** _______________ (Chrome / Firefox / Safari / Edge)
**App Version:** Commit a0cc779

**Overall Result:** [ ] PASS / [ ] FAIL

**Tests Passed:** _____ / 10

**Issues Found:**
1. ________________________________________
2. ________________________________________
3. ________________________________________

**Screenshots Attached:**
- [ ] Screenshot 1: Date input normal state
- [ ] Screenshot 2: Date picker opened
- [ ] Screenshot 3: Completed form

---

## If All Tests Pass:

✅ **Date picker fix is WORKING!**

Update PROGRESS.md:
```
Status: ✅ TESTED & APPROVED
Test Date: 2025-10-23
Tester: [Your Name]
Result: All 10 quick tests passed
Browser: Chrome [version]
Issues: None
Recommendation: APPROVED for production
```

---

## If Any Tests Fail:

❌ **Date picker fix has ISSUES**

Document failures in PROGRESS.md:
```
Status: ⚠️ TESTING FAILED - Bugs Found
Test Date: 2025-10-23
Tester: [Your Name]
Failed Tests: [list which steps failed]
Issues: [describe what went wrong]
Screenshots: [attach screenshots of failures]
Recommendation: REJECTED - Developer must fix issues
```

---

## Next Steps After Testing

### If PASS:
1. Update PROGRESS.md with test results
2. Notify dev team: "Date picker tested and approved"
3. Provide go/no-go: **GO for production**
4. Attach 3 screenshots as proof

### If FAIL:
1. Document all failures in detail
2. Attach screenshots showing issues
3. Update PROGRESS.md with bug report
4. Notify dev team: "Date picker testing failed - issues found"
5. Provide go/no-go: **NO-GO - fixes required**

---

## Additional Testing (Optional)

If you have extra time, test in other browsers:

- [ ] **Firefox:** Repeat steps 1-10
- [ ] **Safari:** Repeat steps 1-10 (Mac only)
- [ ] **Edge:** Repeat steps 1-10

**Expected:** Works identically in all modern browsers

---

## Questions?

- Full test plan: See `DATE_PICKER_TEST_REPORT.md`
- Detailed analysis: See `PROGRESS.md` - "DATE PICKER FIX" section
- Summary: See `TESTER_SUMMARY.md`

---

**Time to Complete:** 15 minutes
**Difficulty:** Easy (no technical knowledge required)
**Result:** Clear PASS/FAIL decision

Good luck with testing! 🎯
