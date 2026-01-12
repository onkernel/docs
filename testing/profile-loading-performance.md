# Profile Loading Performance Testing Guide

## Overview

This guide documents the process for testing profile loading performance with Google login across SaaS sites. The goal is to understand if large profiles cause slow browser startup times and whether origin filtering could improve performance.

## Background

Some customers use Kernel to manage multiple SaaS accounts by:
1. Creating a synthetic Google account
2. Logging into Google once in a browser
3. Using "Login with Google" across many SaaS products
4. Saving all state in a single mega-profile
5. Reusing this profile across sessions

This can result in large profiles with many origins and cookies. This test measures the performance impact.

## Test Setup

### Prerequisites

1. **Kernel API Key**: Set `KERNEL_API_KEY` environment variable
2. **Google Account**: A test Google account for logging in
3. **Node.js/Bun**: To run the test script

### Running the Test

```bash
cd kernel/packages/synthetic-tests
export KERNEL_API_KEY="your-api-key"
npx tsx src/profile-load-test.ts
```

## Test Workflow

The test performs these steps:

1. **Create Test Profile** - Creates a new profile with unique name
2. **Create Browser** - Launches browser with `save_changes: true`
3. **Manual Login** - User logs into Google and Notion via live view
4. **Save Profile** - Deletes browser to persist profile data
5. **Download Profile** - Downloads profile via API
6. **Analyze Profile** - Measures size, cookies, origins
7. **Measure Startup** - Creates browsers with profile, measures timing
8. **Origin Analysis** - Calculates filtering potential

### Manual Steps During Test

When the test pauses, you need to:

1. Open the Live View URL displayed in the terminal
2. Navigate to `https://accounts.google.com`
3. Log in to your test Google account
4. Navigate to `https://www.notion.so`
5. Click "Continue with Google" or "Login with Google"
6. Complete the login flow
7. Wait for Notion to load completely
8. Press Enter in the terminal to continue

## Metrics Collected

### Profile Analysis

- **Total Size**: Profile JSON size in KB and bytes
- **Cookie Count**: Total cookies across all domains
- **Origin Count**: Unique origins with stored data
- **Top Origins**: Origins with most cookies/localStorage
- **Domain Breakdown**: Cookies, localStorage, IndexedDB per domain

### Timing Measurements

- **Browser Creation Time**: Time from API call to browser ready
- **Navigation Time**: Time to navigate to Notion
- **Total Time**: Combined time for full browser startup
- **Statistics**: Average, median, min, max across 3 iterations

### Origin Filtering Analysis

- **Google-related origins/cookies**: Count and percentage
- **Notion-related origins/cookies**: Count and percentage
- **Minimal profile size**: Size if only Google + Notion origins were loaded
- **Size reduction**: Percentage reduction from filtering

## Interpreting Results

### Profile Size

- **< 100 KB**: Small profile, unlikely performance issues
- **100 KB - 1 MB**: Medium profile, minor impact possible
- **1 MB - 10 MB**: Large profile, likely performance impact
- **> 10 MB**: Mega-profile, significant impact expected

### Browser Startup Time

- **< 5 seconds**: Fast startup, no optimization needed
- **5-10 seconds**: Moderate startup, optimization may help
- **10-30 seconds**: Slow startup, optimization recommended
- **> 30 seconds**: Very slow, optimization critical

### Origin Filtering Potential

- **> 50% reduction**: Strong candidate for origin filtering
- **25-50% reduction**: Moderate benefit from filtering
- **< 25% reduction**: Limited benefit

## Origin Filtering Implementation

If testing confirms filtering would help, the recommended approach:

### 1. API Parameter

Add optional `origins` parameter to browser creation:

```typescript
await kernel.browsers.create({
  profile: {
    name: 'my-profile',
    origins: ['google.com', 'notion.so'],
  },
});
```

### 2. Backend Implementation

In `kernel/packages/api/lib/profiles/service_cdp.go`, modify `LoadProfileIntoSession`:

```go
// Filter cookies by allowed origins
if len(allowedOrigins) > 0 {
    filteredCookies := filterCookiesByOrigins(state.Cookies, allowedOrigins)
    filteredOrigins := filterOriginsByList(state.Origins, allowedOrigins)
}
```

### 3. Domain Matching

Support flexible domain matching:
- `google.com` matches `.google.com`, `accounts.google.com`, etc.
- `notion.so` matches `.notion.so`, `www.notion.so`, etc.

## Troubleshooting

### Profile Not Saving

- Ensure `save_changes: true` is set
- Wait at least 5 seconds after deleting browser
- Verify you created session state during login

### Browser Startup Timeout

- Profile may be too large
- Check network connection
- Increase timeout if necessary

### Download Fails

- Profile may not have saved data
- Browser must be deleted (not just closed)
- Wait longer for profile persistence

## Test Results

### Test Run: [Date]

**Profile Details**:
- Size: X KB
- Cookies: X
- Origins: X

**Timing Results**:
- Average startup: X ms
- Median startup: X ms
- Range: X ms

**Origin Filtering Analysis**:
- Potential size reduction: X%
- Google origins: X
- Notion origins: X

**Recommendation**:
[Based on results]

## References

- [Kernel Profiles Documentation](/browsers/profiles)
- [Profile API Reference](/api-reference/profiles/list-profiles)
- [Browser Creation API](/api-reference/browsers/create-a-browser)
