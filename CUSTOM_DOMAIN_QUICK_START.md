# Custom Domain Quick Start Card

**EngageOS™ Custom Domain Setup**

---

## 📋 What You Need

- ✅ Your own domain (e.g., `yourrestaurant.com`)
- ✅ Access to DNS settings at your registrar
- ✅ 5 minutes of your time

---

## 🚀 3-Step Setup

### Step 1: Contact Us
📧 **hello@agentiosk.com** or 📞 **(720) 702-2122**

Tell us your desired domain:
- `kiosk.yourrestaurant.com` (subdomain - recommended)
- `yourrestaurant.com` (root domain)

We'll add it to your account (takes 5 min).

---

### Step 2: Add DNS Record

Log into your domain registrar and add:

```
Type:  A
Host:  kiosk (or @ for root)
Value: 76.76.21.21
TTL:   3600
```

**Quick Links:**
- [GoDaddy DNS](https://dcc.godaddy.com/domains)
- [Namecheap DNS](https://www.namecheap.com/)
- [Google Domains](https://domains.google.com/)
- [Cloudflare](https://dash.cloudflare.com/)

---

### Step 3: Wait & Verify

⏱️ **Wait**: 15-30 minutes for DNS to propagate

✅ **Test**: Visit `https://yourdomain.com`

🔒 **SSL**: Auto-generated (5-15 min after DNS)

---

## 🆘 Troubleshooting

**Site not loading?**
→ Wait 30 minutes for DNS propagation

**SSL/HTTPS error?**
→ Wait 15 minutes after DNS propagates

**Still not working?**
→ Contact support: hello@agentiosk.com

---

## 💡 Pro Tips

✨ **Use a subdomain** (`kiosk.yourrestaurant.com`) to keep your main site unchanged

✨ **Test DNS**: Run `dig +short yourdomain.com` - should return `76.76.21.21`

✨ **Multiple locations?** Each can have its own domain!

---

## 📚 Full Documentation

**Detailed guide with screenshots:**
https://github.com/geverist/chi-pins/blob/main/CUSTOM_DOMAIN_SETUP.md

---

## 📞 Support

**EngageOS Team**
- 📧 hello@agentiosk.com
- 📞 (720) 702-2122
- 💬 https://agentiosk.com

*Response within 4 hours*

---

**Example: Chicago Mike's Hot Dogs**
Domain: `chicagomikes.us`
Setup time: 20 minutes
Result: ✅ Custom branded kiosk!

---

*EngageOS™ by Agentiosk*
*Custom domains included with all plans*
