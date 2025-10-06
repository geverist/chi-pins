# Make Repository Private - Security Guide

⚠️ **CRITICAL: This repository should be private immediately**

## Why This Is Important

Your repository currently contains:
- Business logic and proprietary algorithms
- Database schemas and migrations
- API endpoint structures
- Customer configuration examples
- Twilio/Supabase integration details
- Deployment configurations

**Risk:** Competitors can copy your entire platform

---

## How to Make Repository Private

### Option 1: GitHub Web Interface (Recommended)

1. **Go to your repository:**
   - Visit: https://github.com/geverist/chi-pins

2. **Open Settings:**
   - Click "Settings" tab (top right)

3. **Scroll to Danger Zone:**
   - Find "Danger Zone" section at bottom

4. **Change Visibility:**
   - Click "Change visibility"
   - Select "Make private"
   - Type repository name to confirm: `geverist/chi-pins`
   - Click "I understand, make this repository private"

✅ **Done!** Repository is now private

---

### Option 2: GitHub CLI

```bash
# Install GitHub CLI if needed
brew install gh

# Authenticate
gh auth login

# Make repository private
gh repo edit geverist/chi-pins --visibility private

# Verify
gh repo view geverist/chi-pins --json visibility
```

---

## After Making Private

### 1. Update Documentation Links

Several docs link to GitHub. Update these for private access:

**Files to update:**
- `CUSTOM_DOMAIN_SETUP.md` (line 820)
- `marketing-site/index.html` (line 820)
- `README.md` (if it has GitHub links)

**Change from:**
```
https://github.com/geverist/chi-pins/blob/main/CUSTOM_DOMAIN_SETUP.md
```

**To:**
```
Contact support for setup guide: hello@agentiosk.com
```

**Or host docs publicly:**
- Create separate public docs repo
- Use https://docs.agentiosk.com
- Or use GitBook/ReadTheDocs

---

### 2. Review Git History for Secrets

Check if any secrets were committed:

```bash
# Search for potential secrets
git log --all --pretty=format: --name-only --diff-filter=A | \
  grep -E '\.(env|key|pem|p12)$'

# Search for API keys in history
git log -p --all -S 'api_key' | less

# Search for passwords
git log -p --all -S 'password' | less

# Search for Twilio credentials
git log -p --all -S 'AC49d742' | less
```

**If secrets found, rotate them immediately:**

---

### 3. Rotate Potentially Exposed Secrets

Even though you removed secrets from code, rotate these:

**Supabase:**
```bash
# Go to Supabase dashboard
# Project Settings → API
# Regenerate anon key (service key should never be in code)
```

**Twilio:**
```bash
# Go to Twilio console
# Account → API keys
# Create new key, delete old one
```

**Vercel:**
```bash
# Vercel dashboard
# Project Settings → Environment Variables
# Regenerate any tokens
```

**Update `.env` files:**
```bash
# Update all environment variables
VITE_SUPABASE_ANON_KEY=new_key_here
TWILIO_AUTH_TOKEN=new_token_here
```

---

### 4. Clean Git History (If Needed)

If secrets were in old commits, consider using BFG Repo-Cleaner:

```bash
# Install BFG
brew install bfg

# Clone a fresh copy
git clone --mirror https://github.com/geverist/chi-pins.git

# Remove secrets file from history
bfg --delete-files .env chi-pins.git

# Clean up
cd chi-pins.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (⚠️ DANGEROUS - coordinate with team)
git push --force
```

⚠️ **Warning:** This rewrites history. Coordinate with team first!

---

### 5. Add Team Members (Private Repo)

**Who needs access:**
- Developers
- DevOps
- Technical support

**How to add:**
1. Go to repository Settings → Collaborators
2. Click "Add people"
3. Enter GitHub username or email
4. Choose permission level:
   - **Admin:** Full access (use sparingly)
   - **Write:** Push code (developers)
   - **Read:** View only (contractors, auditors)

**For contractors:**
- Use "Read" permission only
- Time-limited access
- Separate branch for their work

---

### 6. Configure Branch Protection

**Protect main branch from accidents:**

1. **Settings → Branches → Add rule**
2. **Branch name pattern:** `main`
3. **Enable:**
   - ✅ Require pull request before merging
   - ✅ Require approvals (at least 1)
   - ✅ Dismiss stale reviews
   - ✅ Require status checks to pass
   - ✅ Require conversation resolution
   - ✅ Include administrators (optional)

**Benefits:**
- Prevents accidental force pushes
- Requires code review
- Maintains quality standards

---

### 7. Set Up Deploy Keys (For CI/CD)

**Instead of personal access tokens:**

```bash
# Generate deploy key (read-only)
ssh-keygen -t ed25519 -C "vercel-deploy" -f ~/.ssh/chi-pins-deploy

# Add public key to GitHub
# Settings → Deploy keys → Add deploy key
# Paste: cat ~/.ssh/chi-pins-deploy.pub

# In Vercel:
# Project Settings → Git
# Add SSH key: cat ~/.ssh/chi-pins-deploy
```

**Benefits:**
- Key is read-only
- Specific to this repo
- Easy to rotate

---

## Best Practices Going Forward

### 1. Never Commit Secrets

**Use environment variables:**
```javascript
// ❌ Bad
const apiKey = 'sk_live_abc123'

// ✅ Good
const apiKey = process.env.VITE_API_KEY
```

**Add to `.gitignore`:**
```
.env
.env.local
.env.*.local
*.key
*.pem
credentials.json
```

---

### 2. Use Secret Scanning

**Enable on GitHub:**
1. Settings → Code security and analysis
2. Enable "Secret scanning"
3. Enable "Push protection"

**GitHub will:**
- Alert you if secrets are pushed
- Block pushes with secrets
- Suggest rotating compromised secrets

---

### 3. Regular Security Audits

**Monthly checklist:**
- [ ] Review who has repo access
- [ ] Check for unused deploy keys
- [ ] Rotate API keys quarterly
- [ ] Review .gitignore coverage
- [ ] Audit environment variables
- [ ] Check for exposed endpoints

---

### 4. Documentation Strategy

**For private repos, choose:**

**Option A: Public Docs Repo**
```bash
# Create separate repo for docs only
gh repo create chi-pins-docs --public

# Move user-facing docs
mv CUSTOM_DOMAIN_SETUP.md ../chi-pins-docs/
mv ADMIN_LOGIN_GUIDE.md ../chi-pins-docs/

# Link in README
echo "[Documentation](https://github.com/geverist/chi-pins-docs)" >> README.md
```

**Option B: Host Separately**
- GitBook (free for open source)
- ReadTheDocs (free hosting)
- Notion (easy to maintain)
- Your website (/docs)

**Option C: Private by Default**
- Share docs via email
- Customer portal on website
- PDF downloads for customers

---

## Compliance Checklist

If you have enterprise customers:

- [ ] Repository is private
- [ ] 2FA required for all contributors
- [ ] Branch protection enabled
- [ ] No secrets in code
- [ ] API keys rotated
- [ ] Access audit log reviewed
- [ ] Backup strategy in place
- [ ] Disaster recovery tested

---

## Who to Notify

**After making repo private, tell:**

1. **Your team**
   - New collaborator invites
   - How to access repo
   - Branch protection rules

2. **CI/CD systems**
   - Update deploy keys
   - Rotate access tokens
   - Test deployments

3. **Documentation users**
   - Where to find docs now
   - How to access if needed
   - Support contact info

---

## Emergency Contact

**If you suspect a security breach:**

1. **Immediately:**
   - Rotate all API keys
   - Revoke exposed tokens
   - Make repo private

2. **Within 1 hour:**
   - Review access logs
   - Identify what was exposed
   - List affected customers

3. **Within 24 hours:**
   - Notify affected parties
   - Implement fixes
   - Document incident

**Support:**
- GitHub Security: security@github.com
- Supabase Security: security@supabase.io
- Twilio Security: security@twilio.com

---

## Verification

**Confirm repository is private:**

```bash
# Check visibility
gh repo view geverist/chi-pins --json visibility

# Should output:
{
  "visibility": "private"
}

# Try accessing in incognito browser
# Should show 404 or require login
```

**Check who has access:**
```bash
gh api repos/geverist/chi-pins/collaborators --jq '.[].login'
```

**Review settings:**
1. Visible only to collaborators: ✅
2. Secret scanning enabled: ✅
3. Push protection enabled: ✅
4. Branch protection on main: ✅

---

## Next Steps

1. ✅ Make repository private (now)
2. ✅ Rotate any exposed secrets (today)
3. ✅ Add team members with appropriate permissions (this week)
4. ✅ Set up branch protection (this week)
5. ✅ Enable secret scanning (this week)
6. ✅ Create public docs strategy (this month)
7. ✅ Schedule quarterly security audits (ongoing)

---

**Questions?**
- Security concerns: security@agentiosk.com
- Access issues: hello@agentiosk.com
- GitHub help: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility

---

*Last updated: October 2025*
*EngageOS™ by Agentiosk - Internal Use Only*
