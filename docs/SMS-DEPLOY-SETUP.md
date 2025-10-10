# 🚀 SMS-Triggered Deployment Setup

Deploy to your kiosk with a simple text message!

## What This Does

Text **"deploy-kiosk"** to your kiosk number and it will:
1. Trigger a GitHub Actions workflow
2. Build the latest code
3. Create Android APK
4. Connect to kiosk via ADB
5. Install and launch the app
6. Send you an SMS when complete

All automatically, in 2-3 minutes!

## Setup Instructions

### 1. Create GitHub Personal Access Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)](https://github.com/settings/tokens)
2. Click **Generate new token** → **Generate new token (classic)**
3. Name it: "Chi-Pins Kiosk Deployment"
4. Set expiration: **No expiration** (or 1 year)
5. Select scopes:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
6. Click **Generate token**
7. **Copy the token** (you won't see it again!)

### 2. Add Token to Vercel Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **chi-pins** project
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `GITHUB_TOKEN`
   - **Value**: Your GitHub token from step 1
   - **Environments**: Production, Preview, Development
5. Click **Save**

### 3. Add Secrets to GitHub Repository

The GitHub Actions workflow needs Twilio credentials to send SMS notifications.

1. Go to your [chi-pins GitHub repository](https://github.com/geverist/chi-pins)
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add these four secrets:

| Secret Name | Value | Where to Find |
|-------------|-------|---------------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID | [Twilio Console](https://console.twilio.com/) |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token | [Twilio Console](https://console.twilio.com/) |
| `TWILIO_PHONE` | Your Twilio phone number | +17207022122 |
| `ALERT_PHONE` | Your phone number | +17204507540 |

### 4. Deploy Updated Code

The changes are already committed. Just make sure they're deployed:

```bash
# Already pushed to GitHub - Vercel will auto-deploy
# Wait 1-2 minutes for deployment to complete
```

Check deployment status: https://vercel.com/dashboard

### 5. Test It!

Once everything is set up, test the deployment:

**Text your kiosk number:** `deploy-kiosk`

**You'll receive:**
```
🚀 Deployment started!

Device: 192.168.2.112:38081
Status: Building...

You'll receive an SMS when deployment completes (2-3 minutes).

View progress:
github.com/geverist/chi-pins/actions
```

**2-3 minutes later:**
```
✅ Kiosk deployed successfully!

Device: 192.168.2.112:38081
Commit: a1b2c3d
Time: 14:35:42
```

## Usage

### Basic Deployment
```
deploy-kiosk
```
Deploys to default device (192.168.2.112:38081)

### Deploy to Specific Device
```
deploy-kiosk 192.168.1.100:5555
```
Deploys to a different kiosk device

### View Deployment History
Go to: https://github.com/geverist/chi-pins/actions

## How It Works

```
You text "deploy-kiosk"
    ↓
SMS Webhook receives command
    ↓
Triggers GitHub repository_dispatch event
    ↓
GitHub Actions workflow starts
    ↓
1. Checkout code
2. Build web assets
3. Build Android APK
4. Connect to kiosk via ADB
5. Install APK
6. Launch app
7. Send SMS notification
```

## Advanced Features

### Manual Trigger from GitHub

You can also trigger deployments directly from GitHub Actions:

1. Go to https://github.com/geverist/chi-pins/actions
2. Click **Deploy to Kiosk** workflow
3. Click **Run workflow**
4. Enter device IP (optional)
5. Check "Fresh install" if needed
6. Click **Run workflow**

### Fresh Install (Clear Data)

Currently only available via GitHub UI. This will:
- Clear all app data and cache
- Reset to factory defaults
- Useful for testing clean installs

## Troubleshooting

### "Deployment not configured" Error

**Problem:** Missing `GITHUB_TOKEN` in Vercel

**Solution:**
1. Verify token is in Vercel environment variables
2. Redeploy Vercel project after adding token
3. Wait 1-2 minutes for deployment

### Deployment Fails

**Check GitHub Actions logs:**
1. Go to https://github.com/geverist/chi-pins/actions
2. Click the failed workflow run
3. Check which step failed

**Common issues:**
- **ADB connection failed**: Kiosk might be offline or IP changed
- **Build failed**: Check for code errors
- **SMS notification failed**: Check Twilio secrets in GitHub

### No SMS After Deployment

**Check:**
1. Verify `TWILIO_*` and `ALERT_PHONE` secrets in GitHub
2. Check GitHub Actions logs for SMS send step
3. Verify Twilio account has credit

### Device IP Changed

If the kiosk IP address changes:

**Text:** `deploy-kiosk [new-ip]:[port]`

Example: `deploy-kiosk 192.168.1.50:5555`

## Security Notes

- GitHub token has full repo access - keep it secret
- Only authorized phone number can trigger deployments
- Workflow runs on GitHub's secure runners
- ADB connection is over local network only
- All credentials stored in GitHub Secrets (encrypted)

## Cost

**GitHub Actions**: Free tier includes 2,000 minutes/month
- Each deployment: ~3 minutes
- ~666 free deployments per month

**Twilio SMS**: $0.0075 per SMS
- 2 SMS per deployment (trigger + notification)
- ~$0.015 per deployment

## Monitoring

**View deployment history:**
- GitHub: https://github.com/geverist/chi-pins/actions
- Filter by: "Deploy to Kiosk" workflow

**Check deployment status via SMS:**
```
status
health
```

## Future Enhancements

- [ ] Rollback to previous version
- [ ] A/B testing (deploy to test device first)
- [ ] Scheduled deployments
- [ ] Deploy from specific branch/commit
- [ ] Multiple kiosk devices
- [ ] Slack/Discord notifications
- [ ] Deployment approval workflow

---

**You can now deploy to production with a text message!** 🎉

No more manual builds, no computer needed. Just text "deploy-kiosk" and it's done.
