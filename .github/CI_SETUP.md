# CI/CD Setup Instructions

## GitHub Secrets Required

Go to your repo → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `VERCEL_TOKEN` | Get from https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | `team_m1xAcqlDzGbzcszAsETXIr16` |
| `VERCEL_PROJECT_ID` | `prj_A6Cd4B4IwePzjxXQK2ENy30T0PMR` |

## Get Vercel Token

1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it "GitHub Actions"
4. Copy the token and add it as `VERCEL_TOKEN` secret

## Disable Vercel Auto-Deploy (Recommended)

Since GitHub Actions will handle deployment after tests pass:

1. Go to your Vercel project dashboard
2. Settings → Git
3. Under "Deploy Hooks", disable automatic deployments for the main branch
4. Or: Keep it enabled as a backup (deploys will just happen twice)

## How It Works

```
Push to main or PR
       ↓
┌─────────────────┐
│   Run Tests     │ ← Static tests + Playwright
└────────┬────────┘
         │ Pass?
         ↓
┌─────────────────┐
│ Deploy to Vercel│ ← Only on main branch
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Verify Live Site│ ← Run test:live against deployed site
└─────────────────┘
```

## Test Locally Before Push

```bash
cd tests
npm run test:all
```
