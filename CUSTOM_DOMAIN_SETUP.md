# Custom Domain Setup Guide

This guide explains how to configure your own custom domain for your EngageOS kiosk (e.g., `kiosk.yourrestaurant.com` or `yourrestaurant.us`).

## Overview

EngageOS is hosted on Vercel, which allows you to connect any custom domain to your kiosk instance. Your kiosk will be accessible at your branded URL instead of the default `app.agentiosk.com` URL.

### Example Custom Domains
- `chicagomikes.us` → Chicago Mike's Hot Dogs kiosk
- `kiosk.yourrestaurant.com` → Your restaurant's kiosk
- `engage.yourbrand.com` → Your branded engagement platform

---

## Prerequisites

Before you begin, you'll need:

1. **A domain name** you own (purchased from GoDaddy, Namecheap, Google Domains, etc.)
2. **Access to your domain's DNS settings** (through your domain registrar)
3. **Your EngageOS deployment URL** (provided by our team)

---

## Step 1: Request Custom Domain Setup

**Contact the EngageOS team** with the following information:

📧 **Email**: hello@agentiosk.com
📞 **Phone**: (720) 702-2122

**Provide**:
- Your desired custom domain (e.g., `kiosk.yourrestaurant.com`)
- Your EngageOS account email
- Your location/tenant ID (if you have multiple locations)

**We will**:
- Add your custom domain to your Vercel deployment
- Provide you with DNS configuration details
- Generate SSL certificate for HTTPS

---

## Step 2: Configure DNS Records

Once we've added your domain to the deployment, you'll need to configure DNS records with your domain registrar.

### Option A: Root Domain (e.g., `yourrestaurant.com`)

Add an **A Record**:

```
Type:  A
Host:  @ (or leave blank for root domain)
Value: 76.76.21.21
TTL:   3600 (or automatic)
```

### Option B: Subdomain (e.g., `kiosk.yourrestaurant.com`)

Add an **A Record**:

```
Type:  A
Host:  kiosk (or your chosen subdomain)
Value: 76.76.21.21
TTL:   3600 (or automatic)
```

### Option C: CNAME Record (Alternative for subdomains)

Some registrars prefer CNAME records:

```
Type:  CNAME
Host:  kiosk (your subdomain)
Value: cname.vercel-dns.com
TTL:   3600 (or automatic)
```

---

## Step 3: Domain Registrar-Specific Instructions

### GoDaddy

1. Log in to [GoDaddy Domain Manager](https://dcc.godaddy.com/domains)
2. Click on your domain name
3. Click **DNS** → **Manage Zones**
4. Click **Add** under Records
5. Select **A** record type
6. Enter the Host and Value from Step 2
7. Click **Save**

### Namecheap

1. Log in to [Namecheap Dashboard](https://www.namecheap.com/)
2. Go to **Domain List** → Click **Manage** on your domain
3. Click **Advanced DNS** tab
4. Click **Add New Record**
5. Select **A Record**, enter Host and IP Address
6. Click the checkmark to save

### Google Domains

1. Log in to [Google Domains](https://domains.google.com/)
2. Select your domain
3. Click **DNS** in the left menu
4. Scroll to **Custom resource records**
5. Add A record with Name and IPv4 address
6. Click **Add**

### Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your domain
3. Click **DNS** tab
4. Click **Add Record**
5. Type: **A**, Name: **@** or subdomain, IPv4 address: **76.76.21.21**
6. **Disable** the proxy (click orange cloud to turn gray) for initial setup
7. Click **Save**

### Other Registrars

The process is similar for all registrars:
1. Find "DNS Management" or "DNS Settings"
2. Add an A record
3. Point to **76.76.21.21**

---

## Step 4: Verify DNS Propagation

After configuring DNS, it can take **5 minutes to 48 hours** for changes to propagate globally (typically 15-30 minutes).

### Check DNS Propagation:

**Option 1: Command Line**
```bash
dig +short yourdomain.com
# Should return: 76.76.21.21
```

**Option 2: Online Tools**
- https://dnschecker.org
- https://www.whatsmydns.net

**Option 3: Ping Test**
```bash
ping yourdomain.com
# Should show IP: 76.76.21.21
```

---

## Step 5: SSL Certificate

Vercel automatically generates a free SSL certificate for your domain once DNS is configured.

**Timeline**:
- SSL certificate generation: 5-15 minutes after DNS propagation
- You'll receive HTTPS automatically (https://yourdomain.com)

**Verify SSL**:
```bash
curl -I https://yourdomain.com
# Should return: HTTP/2 200
```

---

## Step 6: Testing Your Custom Domain

Once DNS propagates and SSL is active:

1. **Visit your custom domain**: https://yourdomain.com
2. **Verify kiosk loads**: You should see your branded EngageOS kiosk
3. **Test features**: Games, voice ordering, photo booth, etc.
4. **Check mobile**: Test on mobile devices and tablets

---

## Troubleshooting

### "This site can't be reached" or DNS errors

**Cause**: DNS hasn't propagated yet
**Solution**: Wait 15-30 minutes, then try again

**Verify DNS**:
```bash
dig +short yourdomain.com
```
If it doesn't return `76.76.21.21`, DNS hasn't propagated yet.

---

### "Your connection is not private" or SSL errors

**Cause**: SSL certificate is still being generated
**Solution**: Wait 5-15 minutes after DNS propagates

**Check certificate status**: Contact EngageOS support for status update

---

### Domain shows Vercel 404 page

**Cause**: Domain not added to your deployment
**Solution**: Contact EngageOS support to add domain to your account

---

### Mixed content warnings (HTTP/HTTPS)

**Cause**: Some resources loading over HTTP instead of HTTPS
**Solution**: Ensure all resources use HTTPS or relative URLs

---

### Domain works but shows wrong content

**Cause**: DNS pointing to wrong server or caching issue
**Solution**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Verify DNS points to 76.76.21.21
3. Try incognito/private browsing

---

## Advanced: Nameserver Configuration (Optional)

For more advanced control, you can change your domain's nameservers to Vercel's DNS:

**Vercel Nameservers**:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

⚠️ **Warning**: This gives Vercel full DNS control. Only use if you want Vercel to manage all DNS for this domain.

**To configure**:
1. Go to your domain registrar
2. Find "Nameservers" or "DNS Servers" settings
3. Change to custom nameservers
4. Add: `ns1.vercel-dns.com` and `ns2.vercel-dns.com`
5. Save changes

---

## Support

### Common Questions

**Q: Can I use www.mydomain.com?**
A: Yes! Add both root (@) and www A records pointing to 76.76.21.21

**Q: How much does this cost?**
A: Custom domains are included in all EngageOS plans. You only pay for your domain registration.

**Q: Can I use an existing domain?**
A: Yes, as long as you have DNS access. You can use a subdomain (kiosk.yourdomain.com) without affecting your main website.

**Q: What if I change registrars?**
A: Just configure the same DNS records with your new registrar.

**Q: Can I use Cloudflare?**
A: Yes! Disable the proxy (orange cloud) for the A record, or use Cloudflare's "DNS only" mode.

---

### Contact Support

**EngageOS Support Team**

📧 **Email**: hello@agentiosk.com
📞 **Phone**: (720) 702-2122
💬 **Live Chat**: https://agentiosk.com

**Response Times**:
- Email: Within 4 business hours
- Phone: Mon-Fri 9am-6pm MT
- Critical issues: Within 1 hour

---

## Quick Reference Card

Print or save this reference:

### DNS Configuration
```
Record Type:  A
Host:         @ (root) or subdomain
Value:        76.76.21.21
TTL:          3600 or Auto
```

### Verification Commands
```bash
# Check DNS
dig +short yourdomain.com

# Test SSL
curl -I https://yourdomain.com

# Check propagation
nslookup yourdomain.com
```

### Need Help?
📧 hello@agentiosk.com
📞 (720) 702-2122

---

## Example: Chicago Mike's Setup

Here's how Chicago Mike's Hot Dogs configured their custom domain:

**Domain**: chicagomikes.us
**Registrar**: GoDaddy

**Steps taken**:
1. ✅ Contacted EngageOS team to add chicagomikes.us
2. ✅ Logged into GoDaddy DNS Manager
3. ✅ Added A record: @ → 76.76.21.21
4. ✅ Waited 20 minutes for DNS propagation
5. ✅ SSL certificate auto-generated
6. ✅ Kiosk live at https://chicagomikes.us

**Result**: Custom branded kiosk accessible at their own domain!

---

*Last updated: October 2025*
*EngageOS™ by Agentiosk*
