# EngageOS™ Marketing Website

Marketing website for EngageOS - the interactive kiosk platform that turns wait times into revenue.

## Features

- **Landing page** with hero, problem/solution, verticals showcase
- **ROI Calculator** - Interactive calculator for 9 industries
- **Lead capture** - Supabase integration for demo requests
- **Mobile responsive** - Works on all devices
- **Fast & modern** - Static HTML/CSS/JS

## Quick Start

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your Supabase credentials.

3. **Run locally**:
   ```bash
   npm run dev
   ```
   or just open `index.html` in your browser.

### Supabase Setup

1. **Create a Supabase project** at https://supabase.com

2. **Run the schema**:
   - Go to SQL Editor in Supabase dashboard
   - Copy contents of `supabase-schema.sql`
   - Run the SQL to create `demo_leads` table

3. **Get your credentials**:
   - Project URL: `https://your-project.supabase.co`
   - Service Role Key: Settings → API → `service_role` key (keep secret!)

4. **Add to environment**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-role-key-here
   ```

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```

4. **Add environment variables** in Vercel dashboard:
   - Go to your project → Settings → Environment Variables
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `SUPABASE_SERVICE_KEY` (mark as "Secret")

### Option 2: Deploy via GitHub

1. **Push to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - EngageOS marketing site"
   git remote add origin https://github.com/your-username/engageos-marketing.git
   git push -u origin main
   ```

2. **Connect to Vercel**:
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel will auto-detect the project

3. **Add environment variables**:
   - During import, add environment variables
   - Or add later in project settings

4. **Deploy**:
   - Click "Deploy"
   - Your site will be live at `https://your-project.vercel.app`

### Custom Domain

1. **In Vercel dashboard**:
   - Go to your project → Settings → Domains
   - Add your custom domain (e.g., `engageos.io`)

2. **Update DNS** at your registrar:
   - Add CNAME record: `www` → `cname.vercel-dns.com`
   - Add A record: `@` → `76.76.21.21`

3. **Wait for DNS propagation** (up to 48 hours)

## Project Structure

```
marketing-site/
├── index.html              # Main landing page
├── roi-calculator.html     # ROI calculator
├── styles.css              # All styles
├── script.js               # Client-side JS
├── api/
│   └── submit-demo.js      # Serverless function for form submission
├── supabase-schema.sql     # Database schema
├── .env.example            # Environment variables template
├── vercel.json             # Vercel deployment config
└── README.md               # This file
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (SECRET!) | `eyJhbGciOiJIUzI1NiIs...` |

## Analytics & Tracking

### Google Analytics (Optional)

Add to `<head>` in `index.html`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Hotjar (Optional)

Add to `<head>` in `index.html`:
```html
<!-- Hotjar Tracking Code -->
<script>
    (function(h,o,t,j,a,r){
        h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
        h._hjSettings={hjid:YOUR_HOTJAR_ID,hjsv:6};
        a=o.getElementsByTagName('head')[0];
        r=o.createElement('script');r.async=1;
        r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
        a.appendChild(r);
    })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
</script>
```

## Lead Management

Demo requests are stored in Supabase `demo_leads` table.

### Viewing Leads

**Option 1: Supabase Dashboard**
- Go to https://supabase.com
- Select your project
- Navigate to Table Editor → `demo_leads`

**Option 2: Export to CSV**
```sql
SELECT * FROM demo_leads ORDER BY created_at DESC;
```
Click "Download CSV" in Supabase SQL Editor.

**Option 3: Build Admin Dashboard** (future enhancement)
- Create `admin.html` page
- Query Supabase with authenticated user
- Display leads in table with status filter

### Lead Statuses

Update `status` field to track progress:
- `new` - Just submitted
- `contacted` - Sales team reached out
- `qualified` - Good fit, moving forward
- `demo_scheduled` - Demo booked
- `closed_won` - Customer signed up!
- `closed_lost` - Not a fit / declined

## Performance Optimization

Current site is static HTML/CSS/JS (fast!), but you can optimize further:

1. **Minify CSS/JS**:
   ```bash
   npm install -g uglifycss uglify-js
   uglifycss styles.css > styles.min.css
   uglifyjs script.js -o script.min.js
   ```

2. **Compress images**: Use TinyPNG or ImageOptim

3. **Enable Vercel caching**: Already configured in `vercel.json`

4. **Add meta tags** for social sharing (already included in HTML)

## SEO Checklist

- ✅ Meta title and description
- ✅ Semantic HTML (`<header>`, `<section>`, `<footer>`)
- ✅ Alt text on images (add when you replace placeholders)
- ✅ Mobile responsive
- ✅ Fast load time (<2s)
- ⬜ Submit sitemap to Google Search Console
- ⬜ Create `robots.txt` file
- ⬜ Add structured data (JSON-LD for local business)

## Troubleshooting

### Form submission fails

**Issue**: "Failed to save lead" error

**Solution**:
1. Check Supabase credentials in environment variables
2. Verify `demo_leads` table exists (run `supabase-schema.sql`)
3. Check browser console for detailed error
4. Verify Row Level Security (RLS) policies allow service role access

### API route not found

**Issue**: 404 error on `/api/submit-demo`

**Solution**:
1. Ensure `api/submit-demo.js` exists
2. Redeploy to Vercel (API routes are serverless functions)
3. Check `vercel.json` routes configuration

### ROI calculator not updating

**Issue**: Calculator shows $0 even after inputting values

**Solution**:
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify `calculate()` function is being called
4. Test in different browser (clear cache)

## Future Enhancements

### Phase 2 Features
- [ ] Thank you page after demo submission
- [ ] Email automation (SendGrid/Resend integration)
- [ ] CRM integration (HubSpot/Salesforce)
- [ ] A/B testing (Optimizely or Vercel Edge Middleware)
- [ ] Blog section (Markdown CMS)

### Phase 3 Features
- [ ] Customer portal (login, view usage stats)
- [ ] Live chat (Intercom/Drift)
- [ ] Video testimonials page
- [ ] Case studies section
- [ ] Partner/affiliate program page

## Support

**Questions?**
- Email: investors@engageos.io
- Phone: (312) 555-8200

**Report bugs**: Open an issue in this repository

---

© 2025 EngageOS™. All rights reserved.
