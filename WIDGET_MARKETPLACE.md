# 🧩 EngageOS Widget Marketplace

## Overview

Transform EngageOS from a monolithic platform into a **modular, composable widget system** where every feature is an add-on that can be enabled, configured, and priced independently. This creates:

- **Flexible pricing** - Pay only for what you use
- **Easy upselling** - Add features as needs grow
- **Industry customization** - Pre-configured bundles per vertical
- **Marketplace revenue** - 3rd party developers can build widgets
- **Lower entry barriers** - Start with $199/month base, add widgets as needed

---

## 🏗️ Architecture

### Base Platform ($199/month)
**What's Included:**
- Kiosk hardware (leased)
- Basic admin dashboard
- Customer database
- Analytics (pageviews, sessions, basic metrics)
- 1 user account
- Email support

**What's NOT Included:**
- Any content (games, surveys, videos, etc.)
- Integrations (POS, CRM, etc.)
- Advanced features (AI, ads, loyalty, etc.)
- Premium support

### Widget Categories

```
┌─────────────────────────────────────────────────────────────┐
│                    ENGAGEOS BASE PLATFORM                    │
│                        ($199/month)                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Content    │  │ Integrations │  │  Analytics   │     │
│  │   Widgets    │  │   Widgets    │  │   Widgets    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Marketing  │  │   Revenue    │  │  Operations  │     │
│  │   Widgets    │  │   Widgets    │  │   Widgets    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │      AI      │  │   Customer   │  │  Compliance  │     │
│  │   Widgets    │  │   Widgets    │  │   Widgets    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Widget Catalog

### 1. Content Widgets

#### 🎮 Gaming Widget
**Price:** $49/month
**What it does:**
- Pre-built games (trivia, memory match, spin-to-win, etc.)
- Leaderboards
- Prize redemption system
- Game analytics

**Industry Variants:**
- **Restaurants:** Food trivia, menu memory match
- **Auto:** Car brand trivia, service estimate game
- **Healthcare:** Health quiz, symptom checker game
- **Retail:** Product match, brand trivia
- **Fitness:** Workout challenge, nutrition quiz
- **Hospitality:** Local attractions quiz, room upgrade wheel
- **Cannabis:** Strain match, effects quiz
- **Events:** Attendee bingo, session scheduler game

**Configuration Options:**
- Choose 3-10 games from library
- Custom branding (colors, logo)
- Prize pool setup
- Difficulty levels

---

#### 📺 Video Widget
**Price:** $29/month
**What it does:**
- Video playlist management
- YouTube/Vimeo integration
- Custom video uploads (up to 10GB storage)
- Watch time analytics

**Industry Variants:**
- **Restaurants:** Chef specials, cooking demos, origin stories
- **Auto:** Vehicle walkarounds, service explainers, testimonials
- **Healthcare:** Treatment explainers, doctor intros, wellness tips
- **Retail:** Product demos, style guides, brand stories
- **Fitness:** Class previews, trainer intros, form tutorials
- **Hospitality:** Property tours, amenity showcases, local guides
- **Cannabis:** Product education, growing process, consumption methods
- **Events:** Sponsor videos, speaker intros, event highlights

---

#### 📝 Survey Widget
**Price:** $39/month
**What it does:**
- Unlimited surveys
- 20+ question types (multiple choice, rating, open-ended, NPS)
- Conditional logic (skip patterns)
- Response export (CSV, Excel)
- Sentiment analysis

**Industry Variants:**
- **Restaurants:** Food quality, service speed, ambiance, menu feedback
- **Auto:** Service satisfaction, purchase intent, referral likelihood
- **Healthcare:** Patient satisfaction (CAHPS), wait time, staff courtesy
- **Retail:** Shopping experience, product quality, checkout ease
- **Fitness:** Class satisfaction, trainer performance, facility cleanliness
- **Hospitality:** Stay satisfaction, amenities rating, likelihood to return
- **Cannabis:** Product satisfaction, budtender helpfulness, store atmosphere
- **Events:** Session ratings, speaker feedback, logistics satisfaction

---

#### 🎵 Jukebox Widget
**Price:** $99/month (includes ASCAP/BMI/SESAC licensing)
**What it does:**
- Curated playlists by mood/genre
- Customer song requests
- Now playing display
- Music licensing compliance
- Spotify/Apple Music integration

**Industry Variants:**
- **Restaurants:** Dining ambiance, happy hour vibes, brunch playlists
- **Auto:** Calm waiting music, upbeat showroom tracks
- **Retail:** Shopping energy, seasonal themes, brand-aligned genres
- **Fitness:** Workout intensity tracks, yoga/meditation, recovery music
- **Hospitality:** Lobby elegance, pool party, spa relaxation
- **Cannabis:** Chill vibes, upbeat creativity, relaxation modes
- **Events:** Networking energy, award ceremony, cocktail hour

---

#### 🖼️ Photo Booth Widget
**Price:** $59/month
**What it does:**
- Selfie capture with filters
- Branded photo frames
- Instant SMS/email delivery
- Social media sharing
- Photo gallery display

**Industry Variants:**
- **Restaurants:** Food + customer photos, "Chef's Table" frame
- **Auto:** "My New Ride" frame, service completion selfie
- **Healthcare:** "Healthy Me" milestone photos (weight loss, recovery)
- **Retail:** "Try Before You Buy" outfit photos, shopping bag selfies
- **Fitness:** Progress photos, class completion selfies
- **Hospitality:** Vacation memories, "Stayed Here" postcards
- **Cannabis:** "First Purchase" milestone, product with customer
- **Events:** Conference headshots, speaker meet-and-greets, booth selfies

---

#### 🎨 Then & Now Widget
**Price:** $79/month
**What it does:**
- Historical photo comparisons
- Slider interface for before/after
- Location-based photo archives
- Community submissions

**Industry Variants:**
- **Restaurants:** Neighborhood then/now, restaurant renovations
- **Auto:** Classic cars vs modern, dealership history
- **Healthcare:** Medical technology evolution, facility transformations
- **Retail:** Store renovations, neighborhood changes, product evolution
- **Fitness:** Member transformations (with permission), facility upgrades
- **Hospitality:** Property history, local area development
- **Cannabis:** Prohibition to legalization, cultivation methods evolution
- **Events:** Venue transformations, annual event comparisons

---

### 2. Integration Widgets

#### 💳 POS Integration Widget
**Price:** $89/month per integration
**What it does:**
- Real-time menu/inventory sync
- Order placement from kiosk
- Payment processing
- Transaction history

**Supported Systems:**
- Square ($89/month)
- Toast ($89/month)
- Clover ($89/month)
- Shopify ($89/month)
- Lightspeed ($89/month)
- Aloha ($129/month - enterprise)

**Industry Variants:**
- **Restaurants:** Menu ordering, tab payment, delivery orders
- **Auto:** Service scheduling, parts ordering, payment
- **Retail:** Product purchases, gift card sales, returns
- **Cannabis:** Product ordering, age verification, inventory lookup
- **Events:** Ticket upgrades, merchandise, food/beverage orders

---

#### 📧 Email/SMS Widget
**Price:** $49/month (includes 1,000 messages)
**What it does:**
- Automated campaigns (welcome, follow-up, winback)
- SMS delivery (photo booth, receipts, offers)
- Email capture and nurture
- Deliverability monitoring

**Industry Variants:**
- **Restaurants:** Reservation confirmations, special offers, loyalty updates
- **Auto:** Service reminders, appointment confirmations, recalls
- **Healthcare:** Appointment reminders, test results, wellness tips
- **Retail:** Purchase receipts, restock alerts, VIP sales
- **Fitness:** Class reminders, membership renewals, personal records
- **Hospitality:** Booking confirmations, check-in reminders, post-stay surveys
- **Cannabis:** Restock alerts, new product launches, education content
- **Events:** Registration confirmations, session reminders, post-event surveys

**Overage Pricing:**
- +$0.01 per email sent over 1,000
- +$0.05 per SMS sent over 1,000

---

#### 🔗 CRM Integration Widget
**Price:** $69/month per integration
**What it does:**
- Bi-directional contact sync
- Activity logging
- Lead scoring
- Custom field mapping

**Supported Systems:**
- Salesforce ($69/month)
- HubSpot ($69/month)
- Mailchimp ($49/month)
- ActiveCampaign ($49/month)

**Industry Variants:**
- **Auto:** CDK DMS, Reynolds & Reynolds, Dealertrack integration
- **Healthcare:** Epic, Cerner, Athenahealth patient data sync
- **Retail:** Shopify, WooCommerce customer sync
- **Fitness:** Mindbody, Zen Planner member sync
- **Hospitality:** Opera PMS, Guesty guest data sync

---

#### 🎟️ Event Management Widget
**Price:** $79/month
**What it does:**
- Attendee import (Eventbrite, Cvent, etc.)
- QR code check-in
- Badge printing
- Session scheduling
- Lead retrieval

**Supported Systems:**
- Eventbrite ($79/month)
- Cvent ($79/month)
- Bizzabo ($79/month)
- Hopin ($79/month)

**Industry-Specific Use:**
- **Events:** Conference check-in, expo booth scanning, networking
- **Hospitality:** Group events, wedding check-ins, VIP access
- **Fitness:** Class check-in, event registration, challenge tracking
- **Cannabis:** Educational events, product launches, community gatherings

---

### 3. Analytics Widgets

#### 📊 Insights Dashboard Widget
**Price:** $99/month
**What it does:**
- Advanced analytics (cohorts, funnels, retention)
- Custom reports
- Data export (CSV, API)
- Scheduled email reports

**Metrics by Category:**
- **Engagement:** Session duration, bounce rate, game completion, video watch time
- **Revenue:** Upsell conversion, average order value, lifetime value
- **Customer:** Demographics, repeat visit rate, satisfaction scores
- **Operations:** Wait time analysis, peak usage hours, kiosk uptime

**Industry Variants:**
- **Restaurants:** Table turn time, menu item popularity, upsell effectiveness
- **Auto:** Service conversion rate, wait time satisfaction, quote acceptance
- **Healthcare:** Patient wait times, survey completion, treatment acceptance
- **Retail:** Browse-to-buy ratio, product interest, checkout abandonment
- **Fitness:** Class attendance trends, membership conversion, challenge participation
- **Hospitality:** Booking conversion, amenity usage, upgrade acceptance
- **Cannabis:** Product category interest, budtender effectiveness, education engagement
- **Events:** Session attendance, booth traffic, lead quality scores

---

#### 🎯 Attribution Widget
**Price:** $79/month
**What it does:**
- Track marketing source (QR code, referral, walk-in)
- Campaign ROI measurement
- Multi-touch attribution
- Channel performance

**Industry Variants:**
- **Restaurants:** Reservation source, promotion redemption, social media impact
- **Auto:** Lead source tracking, ad campaign effectiveness, referral tracking
- **Retail:** Online-to-offline attribution, influencer impact, ad performance
- **Fitness:** Membership source, class discovery, referral programs
- **Events:** Registration source, sponsorship ROI, speaker influence

---

#### 🔔 Alert Widget
**Price:** $59/month
**What it does:**
- Real-time notifications (Slack, SMS, email)
- Custom triggers (negative feedback, high-value customer, system errors)
- Escalation rules
- Alert history

**Trigger Examples:**
- **Restaurants:** NPS < 7, wait time > 45 mins, negative review submitted
- **Auto:** Service decline, high-value quote requested, manager request
- **Healthcare:** Patient complaint, long wait time, urgent question
- **Retail:** Cart abandonment, high-value browser, inventory question
- **Fitness:** Membership cancellation intent, injury report, class full
- **Hospitality:** Complaint submitted, VIP arrival, service request
- **Cannabis:** Product out of stock, ID verification failure, budtender request
- **Events:** Session full, speaker Q&A, booth lead captured

---

### 4. Marketing Widgets

#### 🎁 Loyalty Widget
**Price:** $89/month
**What it does:**
- Points accumulation
- Tier management (Bronze, Silver, Gold)
- Reward redemption
- Birthday/anniversary bonuses
- Referral tracking

**Industry Variants:**
- **Restaurants:** Visit-based points, meal upgrades, VIP reservations
- **Auto:** Service points, free oil changes, priority scheduling
- **Healthcare:** Wellness points, appointment priority, concierge access
- **Retail:** Purchase points, early sale access, free shipping
- **Fitness:** Class packs, personal training credits, guest passes
- **Hospitality:** Stay points, room upgrades, late checkout
- **Cannabis:** Purchase points, product discounts, exclusive strains
- **Events:** Attendance credits, VIP access, speaker meet-and-greets

**Pricing Model:**
- Base: $89/month (up to 1,000 active members)
- Growth: $149/month (up to 5,000 active members)
- Enterprise: $299/month (unlimited members)

---

#### 📢 Ad Network Widget
**Price:** FREE (EngageOS takes 30% of ad revenue)
**What it does:**
- Display local business ads on kiosk idle screens
- CPM and CPC pricing models
- Ad approval workflow
- Revenue sharing (70% to venue, 30% to EngageOS)

**Ad Types:**
- **Display ads:** Static images, animated GIFs
- **Video ads:** 15-30 second spots
- **Sponsored content:** Branded games, trivia questions
- **Coupons:** Scannable QR codes, SMS delivery

**Industry Variants:**
- **Restaurants:** Local breweries, food suppliers, delivery services
- **Auto:** Insurance companies, auto parts, car washes
- **Healthcare:** Pharmacies, wellness brands, health insurance
- **Retail:** Complementary brands, local services, credit cards
- **Fitness:** Nutrition brands, sportswear, recovery services
- **Hospitality:** Local attractions, restaurants, tour operators
- **Cannabis:** Accessory brands, wellness products, delivery services
- **Events:** Sponsors, exhibitors, local businesses

**Revenue Potential:**
- Avg CPM: $5-15 (varies by location/industry)
- Avg impressions: 10,000/month per kiosk
- Monthly revenue: $50-150 per kiosk (venue keeps $35-105)

---

#### 🎟️ Coupon Widget
**Price:** $39/month
**What it does:**
- Digital coupon creation
- QR code redemption tracking
- Expiration management
- Usage limits

**Industry Variants:**
- **Restaurants:** Appetizer discount, BOGO drinks, dessert upgrade
- **Auto:** Service discount, free car wash, oil change coupon
- **Healthcare:** New patient discount, wellness package, referral credit
- **Retail:** Percentage off, BOGO, free shipping
- **Fitness:** Guest pass, class pack discount, personal training session
- **Hospitality:** Room upgrade, amenity credit, extended stay discount
- **Cannabis:** First-time buyer, bulk discount, accessory bundle
- **Events:** Early bird pricing, group discount, VIP upgrade

---

#### 🤖 AI Voice Agent Widget
**Price:** $149/month
**What it does:**
- Natural language conversation
- Order taking / appointment booking
- FAQ answering
- Sentiment detection
- Voice analytics

**Industry Variants:**
- **Restaurants:** "I'd like the salmon with no sauce" → places order
- **Auto:** "When is my car ready?" → checks service status
- **Healthcare:** "What does my insurance cover?" → provides benefits info
- **Retail:** "Do you have this in blue?" → checks inventory
- **Fitness:** "Can I join the 6pm yoga class?" → books class
- **Hospitality:** "Can I get a late checkout?" → requests amenity
- **Cannabis:** "What's good for anxiety?" → recommends products
- **Events:** "Where is the keynote?" → provides directions

**Technology:**
- Powered by OpenAI Whisper (speech-to-text)
- GPT-4 for conversation (fine-tuned per industry)
- ElevenLabs for text-to-speech (natural voice)

---

### 5. Revenue Widgets

#### 💰 Upsell Engine Widget
**Price:** $69/month
**What it does:**
- AI-powered product recommendations
- Dynamic pricing/discounting
- A/B testing
- Conversion tracking

**Industry Variants:**
- **Restaurants:** "Add guacamole for $2?" "Upgrade to premium margarita?"
- **Auto:** "Add tire rotation for $20?" "Upgrade to synthetic oil?"
- **Healthcare:** "Add flu shot for $25?" "Book preventive screening?"
- **Retail:** "Complete the look with..." "Frequently bought together..."
- **Fitness:** "Add protein shake for $5?" "Book personal training session?"
- **Hospitality:** "Upgrade to ocean view for $50?" "Add spa package?"
- **Cannabis:** "Add grinder for $15?" "Try our new edibles?"
- **Events:** "Upgrade to VIP pass?" "Add networking reception?"

**Performance:**
- Avg conversion rate: 12-18% (industry dependent)
- Avg upsell amount: $8-35
- Monthly revenue increase: $500-2,500 per location

---

#### 🎰 Spin-to-Win Widget
**Price:** $79/month
**What it does:**
- Prize wheel interface
- Win probability control
- Prize inventory management
- Winner notifications

**Industry Variants:**
- **Restaurants:** Free appetizer, 10% off, free dessert, drink upgrade
- **Auto:** Free car wash, oil change discount, service credit, key chain
- **Healthcare:** Wellness consultation, vitamin sample, parking validation
- **Retail:** Discount percentage, free gift, store credit, VIP access
- **Fitness:** Guest pass, class pack discount, water bottle, protein bar
- **Hospitality:** Room upgrade, spa credit, late checkout, welcome drink
- **Cannabis:** Product discount, free pre-roll, accessory, loyalty points
- **Events:** Exhibitor swag, session upgrade, networking pass, raffle entry

---

#### 📦 Digital Product Widget
**Price:** $49/month
**What it does:**
- Sell downloadable content (ebooks, guides, videos, courses)
- Instant delivery via email
- Payment processing
- Purchase analytics

**Industry Variants:**
- **Restaurants:** Recipe book, cooking class video, meal prep guide
- **Auto:** DIY maintenance guide, vehicle care tips, warranty info
- **Healthcare:** Wellness plan, nutrition guide, exercise videos
- **Retail:** Style guide, product care instructions, DIY tutorials
- **Fitness:** Workout programs, meal plans, form guides
- **Hospitality:** Local guide, activity recommendations, travel tips
- **Cannabis:** Dosing guide, strain encyclopedia, growing tips
- **Events:** Session recordings, speaker slides, networking contact list

---

### 6. Operations Widgets

#### 🧹 Queue Management Widget
**Price:** $99/month
**What it does:**
- Virtual queue system
- Wait time estimates
- SMS notifications
- Queue analytics

**Industry Variants:**
- **Restaurants:** Waitlist management, table ready notifications
- **Auto:** Service bay queue, appointment check-in
- **Healthcare:** Patient check-in, exam room queue
- **Retail:** Fitting room queue, checkout line management
- **Fitness:** Class waitlist, equipment reservations
- **Hospitality:** Check-in queue, spa appointment management
- **Cannabis:** Service counter queue, consultation booking
- **Events:** Session queues, booth visit reservations

---

#### 🔐 Access Control Widget
**Price:** $79/month
**What it does:**
- Badge-based access (RFID, QR code)
- Access level management (VIP, staff, member, guest)
- Entry/exit logging
- Restricted area control

**Industry Variants:**
- **Fitness:** Member check-in, guest pass validation, locker access
- **Hospitality:** Hotel room access, amenity authorization, parking validation
- **Events:** Session access, VIP lounge, exhibitor areas
- **Healthcare:** Patient areas, staff zones, restricted lab access
- **Cannabis:** Age verification, purchase limits, restricted products

---

#### 🆔 ID Verification Widget
**Price:** $129/month (includes 500 verifications)
**What it does:**
- Government ID scanning (driver's license, passport)
- Age verification
- Identity authentication
- Fraud detection

**Powered by:** Jumio, Onfido, or Stripe Identity
**Overage:** $0.50 per verification over 500

**Industry Variants:**
- **Cannabis:** Age verification (21+), purchase limits
- **Hospitality:** Guest check-in, age verification (alcohol/gambling)
- **Events:** Attendee check-in, VIP verification, badge issuance
- **Healthcare:** Patient identity confirmation, insurance verification
- **Fitness:** Membership verification, guest pass validation

---

#### 🖨️ Badge Printing Widget
**Price:** $89/month (requires Zebra printer - $399 hardware cost)
**What it does:**
- Custom badge templates
- QR code generation
- Photo capture and print
- Access level encoding

**Industry Variants:**
- **Events:** Conference badges, exhibitor credentials, VIP passes
- **Hospitality:** Guest badges, staff credentials, vendor passes
- **Fitness:** Member cards, guest passes, achievement badges
- **Healthcare:** Patient wristbands, visitor badges, staff credentials
- **Cannabis:** Membership cards, patient credentials, staff badges

---

### 7. Customer Widgets

#### 💬 Feedback Widget
**Price:** $49/month
**What it does:**
- Open-ended feedback capture
- Sentiment analysis
- Keyword extraction
- Manager alerts

**Industry Variants:**
- **Restaurants:** Food quality, service issues, menu suggestions
- **Auto:** Service experience, facility cleanliness, staff courtesy
- **Healthcare:** Care quality, wait time concerns, staff interactions
- **Retail:** Product quality, checkout experience, staff helpfulness
- **Fitness:** Class feedback, trainer performance, facility suggestions
- **Hospitality:** Stay experience, amenity issues, staff service
- **Cannabis:** Product quality, budtender knowledge, store atmosphere
- **Events:** Session quality, logistics issues, speaker feedback

---

#### ⭐ Review Widget
**Price:** $59/month
**What it does:**
- In-kiosk review prompts (Google, Yelp, Facebook)
- Review funneling (happy customers → public, unhappy → internal)
- Response templates
- Review analytics

**Flow:**
1. "How would you rate your experience?" (1-5 stars)
2. If 4-5 stars → "Share on Google/Yelp?"
3. If 1-3 stars → "Tell us what went wrong?" (internal only)

**Industry Variants:**
- **Restaurants:** Google, Yelp, TripAdvisor, OpenTable
- **Auto:** Google, Yelp, DealerRater, Cars.com
- **Healthcare:** Google, Healthgrades, Vitals, RateMDs
- **Retail:** Google, Yelp, Facebook, product review sites
- **Fitness:** Google, Yelp, ClassPass, Mindbody
- **Hospitality:** Google, TripAdvisor, Booking.com, Expedia
- **Cannabis:** Google, Leafly, Weedmaps, Yelp
- **Events:** Google, event platform reviews, social media

---

#### 🎂 Birthday Club Widget
**Price:** $39/month
**What it does:**
- Automatic birthday collection
- Scheduled birthday campaigns
- Special offers/gifts
- Birthday analytics

**Industry Variants:**
- **Restaurants:** Free dessert, 20% off, birthday drinks
- **Auto:** Service discount, free car wash, birthday greeting
- **Healthcare:** Wellness checkup reminder, preventive screening offer
- **Retail:** Birthday discount, double points day, gift with purchase
- **Fitness:** Free class, guest passes, protein shake
- **Hospitality:** Room upgrade, spa credit, welcome amenity
- **Cannabis:** Product discount, free pre-roll, loyalty bonus
- **Events:** Early access, VIP upgrade, speaker meet-and-greet

---

### 8. Compliance Widgets

#### 🔒 SOC 2 Compliance Widget
**Price:** $299/month
**What it does:**
- Audit logging (all user actions)
- Access control monitoring
- Data encryption management
- Compliance reporting

**Required for:**
- Healthcare (HIPAA)
- Finance (PCI-DSS)
- Enterprise customers
- Government contracts

---

#### ♿ Accessibility Widget
**Price:** $79/month
**What it does:**
- Screen reader support (JAWS, NVDA)
- Voice navigation
- High contrast mode
- Text size adjustment
- ADA compliance

**Required for:**
- Government contracts
- Healthcare facilities
- Educational institutions
- Public venues

---

#### 🌍 Translation Widget
**Price:** $59/month per language pack
**What it does:**
- Multi-language interface
- Real-time translation
- Cultural customization
- Language analytics

**Language Packs:**
- Spanish ($59/month)
- Chinese ($59/month)
- French ($59/month)
- German ($59/month)
- Custom ($99/month - any language)

**Bundle Pricing:**
- 3 languages: $149/month (save $28/month)
- 5 languages: $229/month (save $66/month)

---

## 🎁 Pre-Configured Bundles

### Restaurant Bundle
**Price:** $399/month (save $154/month vs. à la carte)
**Includes:**
- Gaming Widget ($49)
- Video Widget ($29)
- Survey Widget ($39)
- Jukebox Widget ($99)
- Photo Booth Widget ($59)
- POS Integration - Square ($89)
- Email/SMS Widget ($49)
- Loyalty Widget ($89)
- Review Widget ($59)
- Birthday Club Widget ($39)

**Total à la carte:** $600/month
**Bundle discount:** 34% savings

---

### Auto Dealership Bundle
**Price:** $449/month (save $176/month vs. à la carte)
**Includes:**
- Gaming Widget ($49)
- Video Widget ($29)
- Survey Widget ($39)
- POS Integration - CDK/Reynolds ($129)
- Email/SMS Widget ($49)
- Insights Dashboard Widget ($99)
- Upsell Engine Widget ($69)
- Queue Management Widget ($99)
- Review Widget ($59)
- CRM Integration ($69)

**Total à la carte:** $690/month
**Bundle discount:** 35% savings

---

### Healthcare Bundle
**Price:** $549/month (save $226/month vs. à la carte)
**Includes:**
- Survey Widget ($39)
- Video Widget ($29)
- Email/SMS Widget ($49)
- Queue Management Widget ($99)
- Feedback Widget ($49)
- Alert Widget ($59)
- SOC 2 Compliance Widget ($299)
- Accessibility Widget ($79)
- Review Widget ($59)

**Total à la carte:** $761/month
**Bundle discount:** 28% savings

---

### Retail Bundle
**Price:** $379/month (save $143/month vs. à la carte)
**Includes:**
- Gaming Widget ($49)
- Photo Booth Widget ($59)
- Survey Widget ($39)
- POS Integration - Shopify ($89)
- Loyalty Widget ($89)
- Review Widget ($59)
- Upsell Engine Widget ($69)
- Birthday Club Widget ($39)
- Ad Network Widget (FREE)

**Total à la carte:** $492/month
**Bundle discount:** 23% savings

---

### Fitness Bundle
**Price:** $429/month (save $157/month vs. à la carte)
**Includes:**
- Gaming Widget ($49)
- Video Widget ($29)
- Survey Widget ($39)
- CRM Integration - Mindbody ($69)
- Loyalty Widget ($89)
- Queue Management Widget ($99)
- Review Widget ($59)
- Birthday Club Widget ($39)
- Access Control Widget ($79)

**Total à la carte:** $551/month
**Bundle discount:** 22% savings

---

### Hospitality Bundle
**Price:** $459/month (save $168/month vs. à la carte)
**Includes:**
- Then & Now Widget ($79)
- Video Widget ($29)
- Survey Widget ($39)
- Photo Booth Widget ($59)
- CRM Integration - Opera PMS ($69)
- Loyalty Widget ($89)
- Review Widget ($59)
- Translation Widget - 3 languages ($149)

**Total à la carte:** $572/month
**Bundle discount:** 20% savings

---

### Cannabis Bundle
**Price:** $419/month (save $196/month vs. à la carte)
**Includes:**
- Gaming Widget ($49)
- Video Widget ($29)
- Survey Widget ($39)
- POS Integration ($89)
- Loyalty Widget ($89)
- Review Widget ($59)
- ID Verification Widget ($129)
- Birthday Club Widget ($39)

**Total à la carte:** $522/month
**Bundle discount:** 20% savings

---

### Events & Weddings Bundle
**Price:** $529/month (save $204/month vs. à la carte)
**Includes:**
- Photo Booth Widget ($59)
- Survey Widget ($39)
- Event Management Widget ($79)
- ID Verification Widget ($129)
- Badge Printing Widget ($89)
- Email/SMS Widget ($49)
- Access Control Widget ($79)
- Queue Management Widget ($99)
- Feedback Widget ($49)

**Total à la carte:** $671/month
**Bundle discount:** 21% savings

---

## 🏪 Widget Marketplace Admin UI

### Discovery & Installation

```
┌─────────────────────────────────────────────────────────────┐
│  🧩 Widget Marketplace                          🔍 [Search]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Your Industry: [Restaurant ▼]                              │
│                                                              │
│  📦 Recommended for Restaurants                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   🎮 Gaming  │  │ 📝 Survey    │  │  💳 Square   │     │
│  │              │  │              │  │  Integration │     │
│  │   $49/mo     │  │   $39/mo     │  │              │     │
│  │              │  │              │  │   $89/mo     │     │
│  │ [+ Install]  │  │ [+ Install]  │  │ [+ Install]  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  💰 Revenue Widgets                                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ 💰 Upsell    │  │ 🎁 Loyalty   │  │ 📢 Ad        │     │
│  │ Engine       │  │              │  │ Network      │     │
│  │   $69/mo     │  │   $89/mo     │  │   FREE       │     │
│  │ [+ Install]  │  │ [+ Install]  │  │ [+ Install]  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  🎁 Pre-Configured Bundles                                  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐│
│  │ 🍽️ Restaurant Bundle           $399/mo  (Save $154)   ││
│  │                                                        ││
│  │ ✓ Gaming • Survey • Jukebox • Photo Booth • Loyalty  ││
│  │ ✓ Square POS • Email/SMS • Reviews • Birthday Club   ││
│  │                                                        ││
│  │                         [Install Bundle] [View Details]││
│  └────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Widget Configuration Screen

```
┌─────────────────────────────────────────────────────────────┐
│  🎮 Gaming Widget Configuration                    [× Close] │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Status: ✅ Active                                          │
│  Billing: $49/month                                         │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│  Game Selection (Choose 3-10)                               │
│                                                              │
│  ☑ Food Trivia                                              │
│  ☑ Menu Memory Match                                        │
│  ☑ Spin the Wheel                                           │
│  ☐ Chef's Challenge                                         │
│  ☐ Ingredient Guess                                         │
│  ☐ Recipe Scramble                                          │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│  Branding                                                    │
│                                                              │
│  Primary Color:    [#FF5733]  🎨                            │
│  Secondary Color:  [#33A1FF]  🎨                            │
│  Logo:             logo.svg    📁 [Change]                  │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│  Prize Pool                                                  │
│                                                              │
│  🏆 High Score Prize:   [Free Appetizer       ▼]           │
│  🎁 Participation:      [10% Off Next Visit   ▼]           │
│  🎰 Spin-to-Win Odds:   [15% win rate         ▼]           │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│  Difficulty                                                  │
│                                                              │
│  ◯ Easy    ◉ Medium    ◯ Hard                              │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│                    [Save Changes]  [Uninstall Widget]       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Installed Widgets Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  My Widgets                                      Monthly: $397│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Widget                Status    Usage         Cost         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  🎮 Gaming             ✅ Active  1,247 plays   $49/mo  ⚙️  │
│  📝 Survey             ✅ Active    342 resp.   $39/mo  ⚙️  │
│  💳 Square POS         ✅ Active     89 orders  $89/mo  ⚙️  │
│  📧 Email/SMS          ✅ Active    876 sent    $49/mo  ⚙️  │
│  🎁 Loyalty            ✅ Active    234 members $89/mo  ⚙️  │
│  ⭐ Review             ✅ Active     67 reviews $59/mo  ⚙️  │
│  🎂 Birthday Club      ⚠️ Setup      0 members  $39/mo  ⚙️  │
│                                                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│  💡 Recommended Add-Ons                                     │
│                                                              │
│  📺 Video Widget - Showcase your chef specials ($29/mo)     │
│     [+ Add Widget]                                          │
│                                                              │
│  💰 Upsell Engine - Increase AOV by 23% ($69/mo)            │
│     [+ Add Widget]                                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Technical Implementation

### Widget Architecture

Each widget is a **self-contained module** with:

1. **Frontend Component** (React)
   - Lives in `/src/widgets/{widget-name}/`
   - Lazy-loaded only when installed
   - Follows design system (Tailwind CSS)

2. **Backend API** (Node.js)
   - Routes: `/api/widgets/{widget-name}/`
   - Database tables: `widget_{widget_name}_*`
   - Middleware for access control

3. **Database Schema**
   - `widgets` table (installed widgets per location)
   - Widget-specific tables (config, data, analytics)

4. **Billing Integration**
   - Stripe subscriptions
   - Usage-based metering (for overage)
   - Automatic prorating on install/uninstall

---

### Widget Manifest Example

```json
{
  "id": "gaming",
  "name": "Gaming Widget",
  "version": "1.2.3",
  "description": "Pre-built games with leaderboards and prizes",
  "category": "content",
  "pricing": {
    "base": 49,
    "currency": "USD",
    "billing": "monthly"
  },
  "compatibility": {
    "minPlatformVersion": "2.0.0",
    "requiredWidgets": [],
    "conflicts": []
  },
  "configuration": {
    "games": {
      "type": "multi-select",
      "options": ["trivia", "memory", "spin-to-win", "puzzle"],
      "min": 3,
      "max": 10,
      "default": ["trivia", "memory", "spin-to-win"]
    },
    "branding": {
      "primaryColor": { "type": "color", "default": "#667eea" },
      "secondaryColor": { "type": "color", "default": "#764ba2" },
      "logo": { "type": "file", "accept": "image/*" }
    },
    "prizes": {
      "highScore": { "type": "text", "default": "Free Appetizer" },
      "participation": { "type": "text", "default": "10% Off" },
      "spinOdds": { "type": "number", "min": 1, "max": 50, "default": 15 }
    }
  },
  "permissions": [
    "customer.read",
    "customer.write",
    "analytics.read"
  ],
  "webhooks": {
    "game.completed": "/api/widgets/gaming/webhooks/game-completed"
  }
}
```

---

### Installation Flow

```javascript
// When admin clicks "Install Widget"

async function installWidget(locationId, widgetId, config) {
  // 1. Check compatibility
  const platform = await getPlatformVersion(locationId);
  const widget = await getWidgetManifest(widgetId);

  if (platform < widget.compatibility.minPlatformVersion) {
    throw new Error('Platform version too old');
  }

  // 2. Check for conflicts
  const installed = await getInstalledWidgets(locationId);
  const conflicts = installed.filter(w =>
    widget.compatibility.conflicts.includes(w.id)
  );

  if (conflicts.length > 0) {
    throw new Error(`Conflicts with: ${conflicts.map(w => w.name).join(', ')}`);
  }

  // 3. Create Stripe subscription
  const subscription = await stripe.subscriptions.create({
    customer: location.stripeCustomerId,
    items: [{ price: widget.stripePriceId }],
    prorate: true
  });

  // 4. Install widget
  await db.widgets.create({
    location_id: locationId,
    widget_id: widgetId,
    config: config || widget.configuration.defaults,
    stripe_subscription_id: subscription.id,
    status: 'active',
    installed_at: new Date()
  });

  // 5. Run widget setup hooks
  await widget.hooks.onInstall(locationId, config);

  // 6. Notify kiosk to reload
  await notifyKiosk(locationId, { type: 'WIDGET_INSTALLED', widgetId });

  return { success: true, subscription };
}
```

---

### Usage-Based Billing Example (Email/SMS Widget)

```javascript
// Track usage
async function sendEmail(locationId, to, subject, body) {
  const widget = await getInstalledWidget(locationId, 'email-sms');

  if (!widget) {
    throw new Error('Email/SMS widget not installed');
  }

  // Send email via SendGrid
  await sendgrid.send({ to, subject, html: body });

  // Track usage
  await db.usage.create({
    location_id: locationId,
    widget_id: 'email-sms',
    metric: 'emails_sent',
    quantity: 1,
    timestamp: new Date()
  });

  // Check if over limit
  const usage = await db.usage.sum({
    location_id: locationId,
    widget_id: 'email-sms',
    metric: 'emails_sent',
    period: 'current_month'
  });

  const limit = widget.config.emailLimit || 1000;

  if (usage > limit) {
    // Create overage charge
    const overage = usage - limit;
    const overageCharge = overage * 0.01; // $0.01 per email

    await stripe.invoiceItems.create({
      customer: location.stripeCustomerId,
      amount: Math.round(overageCharge * 100), // cents
      currency: 'usd',
      description: `Email/SMS overage: ${overage} emails @ $0.01 each`
    });
  }
}
```

---

## 📊 Financial Model

### Revenue Impact

**Current Model (Monolithic):**
- Base: $199/month
- Professional: $499/month
- Enterprise: $899/month
- Avg revenue per customer: ~$400/month

**New Model (Widget-Based):**
- Base: $199/month
- Avg widgets installed: 6-8
- Avg widget cost: $65/month
- **New avg revenue per customer: $589/month** (+47% increase)

**Why this works:**
1. **Lower friction** - Customers start with $199 base, add widgets as needed
2. **Higher perceived value** - Pay for exactly what you need
3. **Upsell opportunities** - Recommend widgets based on usage
4. **Bundle discounts** - Encourage larger purchases with 20-35% savings
5. **Usage-based revenue** - Overage charges from high-usage customers

---

### Pricing Psychology

**Widget Pricing Strategy:**

1. **Anchoring** - Base platform at $199 seems reasonable
2. **Loss aversion** - Bundles show "save $XXX/month" to encourage buying
3. **Scarcity** - "Recommended for your industry" creates FOMO
4. **Social proof** - "87% of restaurants also use Gaming Widget"
5. **Decoy pricing** - Individual widgets seem expensive vs. bundles

**Example:**
- Gaming: $49
- Survey: $39
- Jukebox: $99
- Photo Booth: $59
- POS: $89
- Loyalty: $89
- Reviews: $59
- Birthday: $39

**Total:** $522/month

**Restaurant Bundle:** $399/month (saves $123/month, 23% discount)

Customer sees "$399 vs $522" and perceives massive value.

---

### TAM Expansion

**Original Model:**
- $9.86B TAM
- Avg $400/month ARPU
- Target 2% market share = $197M ARR

**Widget Model:**
- $9.86B TAM (same market)
- Avg $589/month ARPU (+47%)
- Target 2% market share = **$289M ARR** (+47% revenue)

**Plus:**
- **Ad Network revenue sharing** (30% of ~$50-150/kiosk/month) = +$15-45/kiosk/month
- **Marketplace fees** (30% from 3rd party widgets) = +$20-60/kiosk/month (projected)
- **Overage charges** (usage-based billing) = +$10-30/kiosk/month

**New effective ARPU: $634-724/month**
**New TAM capture: $311-355M ARR** (+58-80% vs original)

---

## 🎯 Go-to-Market Strategy

### Phase 1: Launch (Month 1-3)
- Release 15 core widgets
- 8 pre-configured industry bundles
- Migration tool for existing customers (free upgrade)
- Marketing: "Build Your Perfect Kiosk"

### Phase 2: Optimization (Month 4-6)
- A/B test widget pricing
- Release 5 new widgets based on demand
- Launch widget recommendation engine (AI-powered)
- Case studies showing ROI per widget

### Phase 3: Marketplace (Month 7-12)
- Open 3rd party developer API
- Widget certification program
- Revenue sharing (70/30 split)
- Annual widget developer conference

---

## 🚀 Next Steps

1. **Technical:** Build widget architecture and marketplace UI
2. **Content:** Create industry-specific widget demos
3. **Pricing:** Finalize widget pricing and bundles
4. **Legal:** Widget developer terms of service
5. **Marketing:** Website redesign showcasing widgets
6. **Sales:** Train team on consultative selling (recommend widgets)

---

**Questions for review:**
1. Are widget prices too high/low?
2. Should bundles be deeper discounted?
3. Which widgets should launch first?
4. Should there be a "Pro" tier base platform with more features?
5. Should ad network be paid ($49/month) instead of free with revenue share?
