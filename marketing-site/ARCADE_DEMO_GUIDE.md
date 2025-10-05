# Create Auto-Demo Video with Arcade.software

## Setup (5 minutes)

### 1. Sign Up
- Go to: https://arcade.software
- Click "Get Started Free"
- Sign up with email
- Choose **Free plan** (5 demos/month)

### 2. Install Extension
- Click "Install Chrome Extension"
- Or go to: https://chrome.google.com/webstore (search "Arcade")
- Click "Add to Chrome"
- Pin the extension to toolbar

---

## Recording the Demo (10 minutes)

### 3. Start Recording
1. Open https://chi-pins.vercel.app in a new tab
2. Click **Arcade extension icon** (top right)
3. Click **"Start Recording"**
4. Select **"Current Tab"**
5. Click **"Share"** to start capture

### 4. Navigate Through Features
Follow this sequence (Arcade captures every click):

**Intro** (5 seconds):
- Show welcome screen
- Hover over logo

**Main Menu** (10 seconds):
- Click "Tap to Start"
- Show all 6 game tiles
- Hover over each tile briefly

**Chicago Dog Game** (20 seconds):
- Click "Chicago Dog Assembly"
- Read instructions (pause 2 seconds)
- Click "Start Game"
- Drag 4 toppings onto hot dog:
  1. Mustard
  2. Relish
  3. Onions
  4. Peppers
- Click "Submit" or let timer run out
- Show score screen

**Upsell** (10 seconds):
- Show upsell prompt: "Add Chicago Dog? $5"
- Hover over "Yes, Add It!" button
- Click "Yes, Add It!"
- Show confirmation

**Photo Booth** (15 seconds):
- Return to main menu (click back arrow)
- Click "Photo Booth"
- Click "Take Photo" button
- Show branded overlay on photo
- Click "Share to Instagram"

**Pin Map** (15 seconds):
- Return to main menu
- Click "Pin Your Visit"
- Show world map
- Click "Drop Pin Here"
- See pin animation
- Zoom out to show other pins

**Closing** (5 seconds):
- Return to main menu
- Show all features one more time
- End on logo

### 5. Stop Recording
- Click **Arcade extension** icon
- Click **"Stop Recording"**
- Arcade auto-uploads and processes

---

## Editing the Demo (15 minutes)

### 6. AI Auto-Processing
Arcade automatically:
- ✅ Stitches screenshots together
- ✅ Creates smooth transitions
- ✅ Adds zoom/pan effects
- ✅ Generates step descriptions (AI-written)

### 7. Customize (Optional)
In Arcade editor:

**Add Text Overlays**:
- Click on any step
- Add description: "Customers play games while waiting"
- AI suggests text automatically

**Add Voiceover** (Optional):
- Click "Add Audio"
- Upload MP3 of your voice reading script
- Or use **text-to-speech** (AI voice)

**Add Music**:
- Click "Background Music"
- Choose from library (upbeat, corporate, etc.)
- Adjust volume (keep it subtle: 20-30%)

**Customize Animations**:
- Adjust zoom level (how close it zooms on clicks)
- Change transition speed (fast/medium/slow)
- Add blur effects (focus on specific areas)

**Add Branding**:
- Upload Agentiosk logo (appears in corner)
- Add end card: "Visit agentiosk.com"

### 8. Preview
- Click **"Preview"** button
- Watch full demo (should be 1:30 - 2:00)
- Check for:
  - Smooth transitions
  - Readable text
  - Good pacing
  - Clear audio (if added)

---

## Exporting & Using (10 minutes)

### 9. Export Options

**Option A: MP4 Video** (Recommended)
- Click **"Export"** → **"Download Video"**
- Select resolution: **1920x1080 (1080p)**
- Select format: **MP4**
- Download to computer
- Upload to marketing site

**Option B: Embed Code** (Interactive)
- Click **"Share"** → **"Get Embed Code"**
- Copy `<iframe>` code
- Paste into website HTML
- Visitors can click through demo themselves!

**Option C: Shareable Link**
- Click **"Share"** → **"Get Link"**
- Copy URL (e.g., `arcade.software/demo/abc123`)
- Share via email, social media, Slack

### 10. Upload to Marketing Site

**To Website**:
```html
<!-- Replace video placeholder in index.html -->
<video controls autoplay muted loop>
  <source src="agentiosk-demo.mp4" type="video/mp4">
  Your browser does not support video.
</video>
```

**To YouTube** (Recommended):
1. Upload MP4 to YouTube
2. Set to "Unlisted" or "Public"
3. Copy embed code
4. Paste into website:
```html
<iframe width="560" height="315"
  src="https://www.youtube.com/embed/VIDEO_ID"
  frameborder="0" allowfullscreen>
</iframe>
```

**To Vimeo** (Professional):
- Upload to Vimeo.com
- Better player, no ads
- Customizable player colors (match brand)
- $9/month for Vimeo Plus

---

## Advanced Tips

### Make it Interactive (Arcade's Superpower)
Instead of exporting as video, use **interactive embed**:

**Benefits**:
- Visitors control the speed (pause/play)
- Click hotspots to jump to specific features
- Analytics: See which features people explore
- Faster loading than video files

**How to Enable**:
- In Arcade editor, turn on **"Interactive Mode"**
- Add **clickable hotspots**: "Click to see Photo Booth"
- Create **branching paths**: "Try Game" vs "See Map"
- Export as embed code (not video)

### Add Lead Capture
- In Arcade editor, enable **"Lead Form"**
- Visitor must enter email to view demo
- Captures leads automatically
- Integrates with HubSpot/Salesforce

### Create Multiple Versions
**Short Version** (30 seconds):
- Quick overview for social media
- Just show main menu + one game
- Export as vertical video (9:16) for Instagram/TikTok

**Feature-Specific Demos**:
- "Photo Booth Feature" (30 sec)
- "Upsell System" (45 sec)
- "Games Library" (1 min)
- Use in sales emails for specific features

---

## Troubleshooting

### Issue: Recording is laggy
**Fix**: Close all other tabs/apps before recording

### Issue: App is too small in video
**Fix**:
- Zoom browser to 125% (Cmd/Ctrl + Plus)
- Re-record
- Arcade captures zoomed view

### Issue: Text is blurry
**Fix**: Export at higher resolution (4K instead of 1080p)

### Issue: Audio/video out of sync
**Fix**:
- Record voiceover separately
- Add in post-production (Arcade editor)

### Issue: Demo is too long (>2 min)
**Fix**:
- Trim steps in Arcade editor
- Speed up transitions (2x speed)
- Cut unnecessary screens

---

## Cost Comparison

| Plan | Price | Demos/Month | Features |
|------|-------|-------------|----------|
| **Free** | $0 | 5 | Basic editing, MP4 export |
| **Starter** | $38/mo | Unlimited | Advanced editing, analytics |
| **Business** | $99/mo | Unlimited | Team access, custom branding |

**Recommendation**: Start with **Free** (5 demos = 5 re-takes). Upgrade if you need more.

---

## Alternative: Combine Tools

### Best Results Workflow:
1. **Arcade** - Auto-capture screens (free)
2. **Descript** - Add professional voiceover ($12/mo)
3. **YouTube** - Host video (free, good SEO)
4. **Website** - Embed YouTube video (free)

**Total Cost**: $12/month (Descript only)
**Quality**: 🔥 Professional
**Time**: 1 hour total

---

## What You'll Get

### Final Deliverables:
- ✅ **MP4 video** (1920x1080, 2 minutes)
- ✅ **Interactive demo** (embeddable on website)
- ✅ **Shareable link** (for emails/social)
- ✅ **GIF version** (auto-generated by Arcade, for email signatures)
- ✅ **Thumbnail image** (auto-generated, for video player)

### Where to Use:
1. **Marketing site hero section** (auto-play, muted, loop)
2. **Case studies page** (Chicago Mikes story)
3. **Social media** (LinkedIn, Twitter, Instagram)
4. **Email campaigns** (embed Arcade link)
5. **Investor deck** (slide 5: Product Demo)
6. **Sales calls** (share screen, play video)

---

## Next Steps

### Today (30 minutes):
1. Sign up for Arcade: https://arcade.software
2. Install extension
3. Record quick walkthrough (don't worry about perfection)
4. Export as MP4
5. Upload to marketing site

### This Week (2 hours):
1. Re-record with better pacing
2. Add voiceover (your voice or AI)
3. Add background music
4. Create 30-second version for social
5. Upload to YouTube + embed on website

### After Launch (ongoing):
- Update demo when adding new features
- Create feature-specific demos for sales
- A/B test video placement on website
- Track analytics (Arcade shows view rates)

---

**Ready to start?**

Sign up here: https://arcade.software

Then follow this guide step-by-step. The whole process takes about 40 minutes for your first demo!
