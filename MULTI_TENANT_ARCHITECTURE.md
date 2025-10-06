# Multi-Tenant Architecture for EngageOS

## Overview

Every customer gets their own unique kiosk instance with:
1. **Default subdomain** - Automatically assigned (e.g., `chicago-mikes.engageos.app`)
2. **Custom domain support** - Optional (e.g., `kiosk.chicagomikes.us`)
3. **Tenant isolation** - Separate data, settings, and branding per customer

---

## URL Structure Design

### Option A: Subdomain-Based Multi-Tenancy (Recommended)

Each customer gets a unique subdomain:

```
https://{tenant-slug}.engageos.app/
```

**Examples:**
- `https://chicago-mikes.engageos.app/` - Chicago Mike's Hot Dogs
- `https://radiance-medspa.engageos.app/` - Radiance Med Spa
- `https://precision-auto.engageos.app/` - Precision Auto Service

**Tenant Slug Generation:**
```javascript
// Auto-generated from business name
"Chicago Mike's Hot Dogs" → "chicago-mikes"
"Radiance Med Spa" → "radiance-medspa"
"Joe's Pizza & Pasta" → "joes-pizza-pasta"

// If duplicate, append location or number
"Radiance Med Spa" (Chicago) → "radiance-medspa-chicago"
"Radiance Med Spa" (LA) → "radiance-medspa-la"
// Or: radiance-medspa-2, radiance-medspa-3
```

### Option B: Path-Based Multi-Tenancy

Single domain with tenant in path:

```
https://app.engageos.com/{tenant-slug}/
```

**Examples:**
- `https://app.engageos.com/chicago-mikes/`
- `https://app.engageos.com/radiance-medspa/`

**Pros:** Simpler DNS, single SSL cert
**Cons:** Longer URLs, less white-label feel

---

## Custom Domain Support

Customers can bring their own domains:

### Primary Custom Domain (Full White Label)
```
https://kiosk.chicagomikes.us/        (customer's domain)
https://engage.radiancemedspa.com/    (customer's domain)
```

### Admin Subdomain (Optional)
```
https://admin.chicagomikes.us/        (customer's admin portal)
https://manage.radiancemedspa.com/    (customer's admin portal)
```

---

## Tenant Identification Methods

### Method 1: Subdomain Detection (Primary)
```javascript
// Extract tenant from subdomain
const hostname = window.location.hostname; // "chicago-mikes.engageos.app"
const tenantSlug = hostname.split('.')[0];  // "chicago-mikes"
```

### Method 2: Custom Domain Mapping (Database Lookup)
```sql
-- custom_domains table
CREATE TABLE custom_domains (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  domain TEXT UNIQUE NOT NULL,  -- "kiosk.chicagomikes.us"
  verified BOOLEAN DEFAULT false,
  ssl_status TEXT,              -- "active", "pending", "failed"
  created_at TIMESTAMPTZ
);
```

```javascript
// When user visits custom domain
const domain = "kiosk.chicagomikes.us";
const tenant = await db.query(
  'SELECT tenant_id FROM custom_domains WHERE domain = $1 AND verified = true',
  [domain]
);
```

### Method 3: Tenant ID in Query Param (Fallback/Demo)
```
https://chi-pins.vercel.app/?tenant=chicago-mikes
```

---

## Onboarding Flow

### Step 1: Customer Signs Up
```
POST /api/onboard
{
  "businessName": "Chicago Mike's Hot Dogs",
  "contactEmail": "mike@chicagomikes.us",
  "industry": "restaurant",
  "plan": "professional"
}
```

### Step 2: Generate Tenant Slug
```javascript
function generateTenantSlug(businessName, location) {
  // Slugify business name
  let slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // Replace special chars
    .replace(/^-+|-+$/g, '');      // Trim dashes

  // Check if slug exists
  const exists = await checkSlugExists(slug);

  if (exists && location) {
    slug = `${slug}-${location.toLowerCase()}`;
  } else if (exists) {
    // Append random suffix
    const suffix = Math.random().toString(36).substring(2, 6);
    slug = `${slug}-${suffix}`;
  }

  return slug;
}
```

### Step 3: Create Tenant Record
```sql
INSERT INTO tenants (
  id,
  slug,
  business_name,
  industry,
  plan,
  subdomain,
  status
) VALUES (
  gen_random_uuid(),
  'chicago-mikes',
  'Chicago Mike''s Hot Dogs',
  'restaurant',
  'professional',
  'chicago-mikes.engageos.app',
  'active'
);
```

### Step 4: Provision Subdomain
```javascript
// Automatically create Vercel alias
await vercel.createAlias({
  deployment: 'chi-pins-prod',
  alias: `${tenantSlug}.engageos.app`
});

// Vercel auto-generates SSL certificate
```

### Step 5: Send Welcome Email
```
Subject: Welcome to EngageOS - Your Kiosk is Ready!

Your kiosk is live at:
🔗 https://chicago-mikes.engageos.app/

Admin Panel:
🔑 https://chicago-mikes.engageos.app/?admin=true
PIN: [sent separately for security]

Want to use your own domain? Add a CNAME record:
kiosk.chicagomikes.us → cname.vercel-dns.com
```

---

## Custom Domain Setup (Customer-Initiated)

### Step 1: Customer Requests Custom Domain
```
Customer goes to: https://chicago-mikes.engageos.app/?admin=true
Admin Panel → Settings → Custom Domain
Enters: kiosk.chicagomikes.us
```

### Step 2: Generate DNS Instructions
```javascript
// Backend generates CNAME record instructions
const domain = "kiosk.chicagomikes.us";
const cnameValue = "cname.vercel-dns.com";

// Save to database (unverified)
await db.query(`
  INSERT INTO custom_domains (tenant_id, domain, verified)
  VALUES ($1, $2, false)
`, [tenantId, domain]);

// Show instructions to customer
return {
  instructions: `
    1. Log in to your DNS provider (GoDaddy, Cloudflare, etc.)
    2. Add a CNAME record:
       Name: kiosk
       Value: cname.vercel-dns.com
    3. Click "Verify" button below once DNS is added
  `,
  domain,
  cnameValue
};
```

### Step 3: Customer Adds DNS Record
Customer adds CNAME in their DNS provider (GoDaddy, Cloudflare, etc.)

### Step 4: Verification
```javascript
// Customer clicks "Verify" in admin panel
async function verifyCustomDomain(tenantId, domain) {
  // Check DNS propagation
  const dns = await checkDNS(domain);

  if (dns.cname !== 'cname.vercel-dns.com') {
    return { error: 'DNS not propagated yet. Wait 5-30 minutes.' };
  }

  // Create Vercel alias
  await vercel.createAlias({
    deployment: 'chi-pins-prod',
    alias: domain
  });

  // Mark as verified
  await db.query(`
    UPDATE custom_domains
    SET verified = true, ssl_status = 'active'
    WHERE tenant_id = $1 AND domain = $2
  `, [tenantId, domain]);

  return { success: true, domain };
}
```

---

## Tenant Data Isolation

### Database Schema

```sql
-- Core tenant table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  plan TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  admin_pin TEXT,  -- Hashed 4-digit PIN

  -- Branding
  logo_url TEXT,
  brand_color TEXT,
  custom_css TEXT,

  -- Features
  enabled_features JSONB DEFAULT '{
    "games": true,
    "photoBooth": true,
    "jukebox": true,
    "aiVoice": false
  }'::jsonb,

  -- Status
  status TEXT DEFAULT 'active', -- active, paused, canceled

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom domains
CREATE TABLE custom_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  domain TEXT UNIQUE NOT NULL,
  verified BOOLEAN DEFAULT false,
  ssl_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant-specific data (example: pins)
CREATE TABLE pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_name TEXT,
  location GEOGRAPHY(POINT, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant-specific analytics
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT,  -- "game_played", "upsell_accepted", etc.
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row-Level Security (RLS)

```sql
-- Enable RLS on all tenant tables
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their tenant's data
CREATE POLICY "Tenant isolation for pins"
  ON pins
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Set tenant context in app
-- In middleware:
await db.query("SET app.current_tenant_id = $1", [tenantId]);
```

---

## Tenant Resolution Logic

### App Middleware (src/middleware/tenantResolver.js)

```javascript
export async function resolveTenant(req) {
  const hostname = req.hostname;

  // Method 1: Subdomain detection
  if (hostname.endsWith('.engageos.app')) {
    const slug = hostname.split('.')[0];
    return await getTenantBySlug(slug);
  }

  // Method 2: Custom domain lookup
  const tenant = await getTenantByDomain(hostname);
  if (tenant) return tenant;

  // Method 3: Query param (demo/fallback)
  const tenantParam = req.query.tenant;
  if (tenantParam) {
    return await getTenantBySlug(tenantParam);
  }

  // Method 4: Industry demo mode (no tenant)
  const industry = req.query.industry;
  if (industry) {
    return {
      id: 'demo',
      slug: 'demo',
      industry,
      isDemoMode: true
    };
  }

  // Default: Return demo tenant or error
  return null;
}
```

---

## URL Examples Summary

### Default Subdomains (Auto-Assigned)
```
https://chicago-mikes.engageos.app/
https://chicago-mikes.engageos.app/?admin=true
```

### Custom Domains (Customer-Configured)
```
https://kiosk.chicagomikes.us/
https://kiosk.chicagomikes.us/?admin=true
```

### Demo/Preview URLs (No Tenant)
```
https://chi-pins.vercel.app/?industry=restaurant
https://chi-pins.vercel.app/?tenant=chicago-mikes
```

---

## Migration Path

### Phase 1: Single Tenant (Current State)
- Everything uses `chi-pins.vercel.app`
- Demo modes via `?industry=` param
- Works for initial customers

### Phase 2: Multi-Tenant Subdomains
- Create `engageos.app` domain
- Implement tenant resolver middleware
- Migrate existing customers to subdomains
- Support both old and new URLs during transition

### Phase 3: Custom Domains
- Add custom domain UI in admin panel
- Implement DNS verification flow
- Auto-provision Vercel aliases
- Full white-label support

---

## Tenant Slug Best Practices

### Good Slug Examples:
✅ `chicago-mikes` - Simple, readable
✅ `radiance-medspa-chicago` - Location-based differentiation
✅ `joes-pizza-downtown` - Clear identifier

### Avoid:
❌ `cm123` - Not readable
❌ `chicago-mikes-hot-dogs-inc-llc` - Too long
❌ `test` - Not descriptive

### Slug Rules:
- Lowercase only
- Alphanumeric + hyphens
- 3-50 characters
- No leading/trailing hyphens
- Unique across system
- Human-readable

---

## Security Considerations

### Tenant Isolation
- ✅ All queries include tenant_id
- ✅ RLS policies enforce data isolation
- ✅ Admin PINs are tenant-specific
- ✅ Separate Stripe customer IDs per tenant

### Custom Domain Verification
- ✅ Verify DNS ownership before provisioning
- ✅ Auto-generate SSL certificates
- ✅ Prevent subdomain takeover
- ✅ Rate limit verification attempts

### Admin Access
- ✅ PIN protected (4-digit per tenant)
- ✅ Session tied to tenant
- ✅ Can't access other tenant's data
- ✅ Audit log per tenant

---

## Pricing & Limits

### By Plan:

**Starter ($199/mo):**
- 1 default subdomain
- No custom domain
- 1 location

**Professional ($349-799/mo):**
- 1 default subdomain
- 1 custom domain
- Up to 2 locations

**Enterprise (Custom):**
- Multiple subdomains
- Multiple custom domains
- Unlimited locations
- White-label everything

---

*Last updated: October 2025*
