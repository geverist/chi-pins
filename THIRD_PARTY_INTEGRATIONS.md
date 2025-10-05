# 🔌 Third-Party Integration Catalog

## Overview

Extend EngageOS with **100+ third-party integrations** spanning payments, CRM, marketing, operations, and industry-specific tools. Each integration is a widget that can be installed independently, with pre-built connectors and OAuth flows.

---

## 💳 Payment & POS Integrations

### Restaurant POS Systems

#### Square ($89/month)
- **What it syncs:** Menu items, modifiers, pricing, inventory, orders
- **Features:** Order placement, payment processing, receipt printing
- **Industries:** Restaurants, cafes, retail
- **API:** OAuth 2.0, webhooks for real-time updates
- **Use case:** "Add extra guac?" → Places order in Square POS

#### Toast ($89/month)
- **What it syncs:** Full menu, online ordering, loyalty programs
- **Features:** Menu modifications, 86'd items, kitchen routing
- **Industries:** Restaurants (full-service, quick-service)
- **API:** REST API with polling for menu changes
- **Use case:** Show only available items, route orders to correct kitchen station

#### Clover ($89/month)
- **What it syncs:** Inventory, orders, customers, employees
- **Features:** Payment processing, tip suggestions, receipt delivery
- **Industries:** Restaurants, retail, services
- **API:** REST API + SDK
- **Use case:** Kiosk ordering with integrated payment terminal

#### Aloha ($129/month)
- **What it syncs:** Menu, orders, table management
- **Features:** Enterprise-grade order routing, KDS integration
- **Industries:** Enterprise restaurants, casinos, stadiums
- **API:** XML-based API (legacy)
- **Use case:** High-volume ordering with complex routing

#### Lightspeed Restaurant ($89/month)
- **What it syncs:** Menu, inventory, floor plans, reservations
- **Features:** Table management, course timing, split checks
- **Industries:** Full-service restaurants, bars
- **API:** REST API
- **Use case:** Kiosk check-in with table assignment

#### Revel ($89/month)
- **What it syncs:** Menu, inventory, CRM, loyalty
- **Features:** Multi-location support, franchise management
- **Industries:** QSR chains, franchises
- **API:** REST API
- **Use case:** Consistent menu across locations, centralized analytics

---

### Retail POS Systems

#### Shopify ($89/month)
- **What it syncs:** Products, inventory, customers, orders
- **Features:** In-store checkout, BOPIS (buy online, pick up in-store)
- **Industries:** Retail, e-commerce
- **API:** GraphQL Admin API + Storefront API
- **Use case:** Kiosk as in-store product browser and checkout

#### Shopify POS ($89/month)
- **What it syncs:** Real-time inventory, staff, locations
- **Features:** Multi-location inventory, staff sales tracking
- **Industries:** Retail chains
- **API:** POS API
- **Use case:** Check product availability across stores, reserve items

#### Lightspeed Retail ($89/month)
- **What it syncs:** Products, inventory, customers, sales
- **Features:** Matrix items (size/color), advanced inventory
- **Industries:** Apparel, sporting goods, specialty retail
- **API:** REST API
- **Use case:** "Find in my size" kiosk search

#### Vend (now Lightspeed) ($89/month)
- **What it syncs:** Products, customers, sales history
- **Features:** Customer profiles, purchase history, preferences
- **Industries:** Fashion, gift shops, homewares
- **API:** REST API
- **Use case:** Personalized product recommendations

#### NCR Counterpoint ($129/month)
- **What it syncs:** Inventory, pricing, promotions
- **Features:** Enterprise inventory management
- **Industries:** Specialty retail, hardware stores
- **API:** SOAP + REST
- **Use case:** In-store inventory lookup kiosk

---

### Auto Dealership Systems

#### CDK Global ($129/month)
- **What it syncs:** Service appointments, vehicle inventory, customer records
- **Features:** Service write-ups, parts ordering, warranty claims
- **Industries:** Auto dealerships (new & used)
- **API:** SOAP API (legacy)
- **Use case:** "Check my service status" → pulls from CDK DMS

#### Reynolds & Reynolds ($129/month)
- **What it syncs:** CRM, service drive, parts, accounting
- **Features:** Customer history, service recommendations
- **Industries:** Auto dealerships
- **API:** XML/REST hybrid
- **Use case:** Personalized service upsells based on vehicle history

#### Dealertrack ($129/month)
- **What it syncs:** Inventory, leads, credit applications
- **Features:** Finance & insurance, compliance
- **Industries:** Auto dealerships
- **API:** REST API
- **Use case:** "Apply for financing" kiosk flow

#### Tekion ($99/month)
- **What it syncs:** Cloud-native DMS, real-time data
- **Features:** Modern API-first architecture
- **Industries:** Progressive auto dealerships
- **API:** GraphQL
- **Use case:** Real-time service status, instant quotes

#### AutoFi ($99/month)
- **What it syncs:** Digital retailing, F&I menus
- **Features:** Payment calculators, trade-in valuations
- **Industries:** Auto dealerships
- **API:** REST API
- **Use case:** "Build your deal" interactive kiosk

---

### Cannabis POS Systems

#### Dutchie ($89/month)
- **What it syncs:** Menu, inventory, orders, customers
- **Features:** Age verification, purchase limits, compliance
- **Industries:** Cannabis dispensaries
- **API:** REST API
- **Use case:** In-store menu browsing, pre-order pickup

#### Leafly ($79/month)
- **What it syncs:** Product catalog, reviews, effects
- **Features:** Strain database, terpene profiles, user reviews
- **Industries:** Cannabis retail
- **API:** REST API
- **Use case:** "Find strains for anxiety" → shows relevant products

#### Cova ($89/month)
- **What it syncs:** POS, inventory, compliance reporting
- **Features:** State-mandated seed-to-sale tracking
- **Industries:** Cannabis (US & Canada)
- **API:** REST API
- **Use case:** Compliant customer check-in and ordering

#### Greenbits ($89/month)
- **What it syncs:** POS, inventory, customer database
- **Features:** Metrc integration (state compliance)
- **Industries:** Cannabis retail
- **API:** REST API
- **Use case:** Age verification, purchase limit enforcement

#### Flowhub ($89/month)
- **What it syncs:** Inventory, orders, loyalty, compliance
- **Features:** Real-time inventory, automated compliance
- **Industries:** Cannabis dispensaries
- **API:** REST API
- **Use case:** Kiosk ordering with automatic compliance checks

---

## 📧 CRM & Marketing Integrations

### General CRM

#### Salesforce ($69/month)
- **What it syncs:** Contacts, leads, opportunities, activities
- **Features:** Lead scoring, campaign tracking, custom objects
- **Industries:** All (enterprise focus)
- **API:** REST + SOAP
- **Use case:** Kiosk interaction → creates lead in Salesforce

#### HubSpot ($69/month)
- **What it syncs:** Contacts, deals, companies, workflows
- **Features:** Marketing automation, email tracking, forms
- **Industries:** All (SMB focus)
- **API:** REST API
- **Use case:** Survey responses → trigger HubSpot workflow

#### Mailchimp ($49/month)
- **What it syncs:** Contacts, tags, campaigns, automations
- **Features:** Email marketing, audience segmentation
- **Industries:** All
- **API:** REST API
- **Use case:** Photo booth email → adds to Mailchimp audience

#### ActiveCampaign ($49/month)
- **What it syncs:** Contacts, deals, automations
- **Features:** Marketing + sales automation
- **Industries:** All
- **API:** REST API
- **Use case:** Kiosk sign-up → triggers welcome series

#### Constant Contact ($49/month)
- **What it syncs:** Email lists, campaigns
- **Features:** Email marketing, event management
- **Industries:** Small businesses, nonprofits
- **API:** REST API
- **Use case:** Event check-in → adds to post-event email list

---

### Industry-Specific CRM

#### Mindbody (Fitness) ($69/month)
- **What it syncs:** Clients, schedules, packages, visits
- **Features:** Class booking, membership management, retail
- **Industries:** Fitness studios, gyms, wellness
- **API:** REST API
- **Use case:** "Book a yoga class" → reserves spot in Mindbody

#### Zen Planner (Fitness) ($69/month)
- **What it syncs:** Members, attendance, billing
- **Features:** Gym management, class scheduling
- **Industries:** Gyms, martial arts, CrossFit
- **API:** REST API
- **Use case:** Kiosk check-in → logs attendance in Zen Planner

#### Pike13 (Fitness) ($69/month)
- **What it syncs:** Clients, schedules, staff, events
- **Features:** Multi-location management
- **Industries:** Fitness, dance, swim schools
- **API:** REST API
- **Use case:** Cross-location class booking

#### Opera PMS (Hospitality) ($69/month)
- **What it syncs:** Reservations, guest profiles, folios
- **Features:** Room assignments, billing, housekeeping
- **Industries:** Hotels, resorts
- **API:** SOAP + REST (OHIP protocol)
- **Use case:** "Early check-in" request → creates task in Opera

#### Guesty (Hospitality) ($69/month)
- **What it syncs:** Reservations, guest communications, listings
- **Features:** Vacation rental management, multi-calendar
- **Industries:** Vacation rentals, property managers
- **API:** REST API
- **Use case:** Guest check-in kiosk with digital key delivery

#### Athenahealth (Healthcare) ($129/month)
- **What it syncs:** Patients, appointments, clinical data
- **Features:** EHR, practice management, billing
- **Industries:** Medical practices
- **API:** FHIR + proprietary REST
- **Use case:** Patient check-in → updates arrival time in Athena

#### Epic (Healthcare) ($199/month - enterprise)
- **What it syncs:** Patient demographics, appointments, MyChart
- **Features:** Enterprise EHR, interoperability
- **Industries:** Hospitals, large medical groups
- **API:** FHIR (HL7 compliant)
- **Use case:** Kiosk check-in → updates Epic Rover

#### Cerner (Healthcare) ($199/month - enterprise)
- **What it syncs:** Patient records, scheduling, clinical workflows
- **Features:** Hospital information system
- **Industries:** Hospitals, health systems
- **API:** FHIR + HL7 v2
- **Use case:** Patient questionnaire → writes to Cerner chart

---

## 🎟️ Event Management Integrations

#### Eventbrite ($79/month)
- **What it syncs:** Events, attendees, tickets, check-ins
- **Features:** QR code scanning, attendee lookup, capacity tracking
- **Industries:** Events, conferences, festivals
- **API:** REST API + webhooks
- **Use case:** Kiosk check-in scans Eventbrite QR codes

#### Cvent ($79/month)
- **What it syncs:** Registrations, sessions, exhibitors
- **Features:** Enterprise event management, lead retrieval
- **Industries:** Corporate events, conferences
- **API:** SOAP + REST
- **Use case:** Session check-in, booth scanning for leads

#### Bizzabo ($79/month)
- **What it syncs:** Attendees, agenda, sponsors, engagement
- **Features:** Event marketing, networking, analytics
- **Industries:** B2B events, conferences
- **API:** REST API
- **Use case:** Kiosk networking (match attendees by interests)

#### Hopin ($79/month)
- **What it syncs:** Virtual + hybrid events, attendees, sessions
- **Features:** Live streaming, networking, exhibitor booths
- **Industries:** Hybrid events, virtual conferences
- **API:** REST API
- **Use case:** In-person kiosk connects to virtual event platform

#### Whova ($69/month)
- **What it syncs:** Attendee profiles, agenda, exhibitors
- **Features:** Event app, networking, live polling
- **Industries:** Conferences, trade shows
- **API:** REST API
- **Use case:** Kiosk agenda display, session ratings

#### Splash ($69/month)
- **What it syncs:** Event registrations, guest lists
- **Features:** Event marketing, invitations, check-in
- **Industries:** Corporate events, brand activations
- **API:** REST API
- **Use case:** VIP check-in, personalized welcome screens

---

## 📱 Communication & Messaging

#### Twilio ($49/month + usage)
- **What it does:** SMS, voice, video, WhatsApp messaging
- **Features:** Two-way SMS, phone number provisioning, call routing
- **Industries:** All
- **API:** REST API
- **Use case:** Send photo booth images via SMS

#### SendGrid ($49/month + usage)
- **What it does:** Transactional email delivery
- **Features:** Email templates, analytics, deliverability optimization
- **Industries:** All
- **API:** REST + SMTP
- **Use case:** Survey results, receipts, follow-up emails

#### Mailgun ($49/month + usage)
- **What it does:** Email sending, validation, routing
- **Features:** Email validation, inbound routing
- **Industries:** All
- **API:** REST + SMTP
- **Use case:** High-volume email campaigns

#### Postmark ($49/month + usage)
- **What it does:** Transactional email (fast delivery)
- **Features:** Template management, bounce handling
- **Industries:** All
- **API:** REST + SMTP
- **Use case:** Time-sensitive emails (appointment reminders)

#### Intercom ($69/month)
- **What it syncs:** Customer conversations, support tickets
- **Features:** Live chat, help desk, product tours
- **Industries:** All (SaaS focus)
- **API:** REST API
- **Use case:** Kiosk "Help" button → creates Intercom conversation

#### Zendesk ($69/month)
- **What it syncs:** Support tickets, customer history
- **Features:** Help desk, knowledge base, chat
- **Industries:** All
- **API:** REST API
- **Use case:** Kiosk issue report → creates Zendesk ticket

---

## 📊 Analytics & Business Intelligence

#### Google Analytics ($0 - free)
- **What it tracks:** Pageviews, sessions, user flows, conversions
- **Features:** Custom events, e-commerce tracking, funnels
- **Industries:** All
- **API:** Measurement Protocol
- **Use case:** Track kiosk interactions as "pageviews"

#### Mixpanel ($99/month)
- **What it tracks:** Events, user properties, funnels, retention
- **Features:** Cohort analysis, A/B testing, predictive analytics
- **Industries:** All (product analytics focus)
- **API:** REST API
- **Use case:** Track game completions, upsell conversions

#### Amplitude ($99/month)
- **What it tracks:** Product analytics, user journeys
- **Features:** Behavioral cohorts, funnel analysis, experimentation
- **Industries:** All (SaaS, mobile apps)
- **API:** REST API
- **Use case:** Analyze kiosk engagement patterns

#### Segment ($149/month)
- **What it does:** Customer data platform (CDP)
- **Features:** Centralize data, send to 300+ tools
- **Industries:** All
- **API:** REST + client libraries
- **Use case:** Send kiosk events to multiple analytics tools

#### Tableau ($199/month)
- **What it does:** Business intelligence, data visualization
- **Features:** Dashboards, reports, predictive analytics
- **Industries:** All (enterprise)
- **API:** REST API (Tableau Cloud)
- **Use case:** Executive dashboards with kiosk data

#### Looker (Google Cloud) ($199/month)
- **What it does:** BI platform, embedded analytics
- **Features:** LookML modeling, custom reports
- **Industries:** All (enterprise)
- **API:** REST API
- **Use case:** Client-facing analytics dashboards

---

## 🎯 Advertising & Marketing

#### Meta Business Suite ($0 - free integration)
- **What it syncs:** Facebook/Instagram pages, ads, leads
- **Features:** Lead ads integration, social posting
- **Industries:** All
- **API:** Graph API
- **Use case:** Photo booth → share to Instagram with branded hashtag

#### Google My Business ($0 - free)
- **What it syncs:** Business profile, reviews, posts
- **Features:** Review prompts, Q&A, photos
- **Industries:** All (local businesses)
- **API:** My Business API
- **Use case:** Happy customers → prompted to leave Google review

#### Yelp ($59/month)
- **What it syncs:** Business info, reviews, check-ins
- **Features:** Review management, ad campaigns
- **Industries:** Restaurants, retail, services
- **API:** Fusion API
- **Use case:** Review prompts, Yelp check-in

#### TripAdvisor ($59/month)
- **What it syncs:** Business listings, reviews, photos
- **Features:** Review management, traveler engagement
- **Industries:** Hospitality, restaurants, attractions
- **API:** Content API
- **Use case:** Post-stay review prompts

#### OpenTable ($79/month)
- **What it syncs:** Reservations, waitlist, guest history
- **Features:** Reservation management, guest profiles
- **Industries:** Restaurants
- **API:** REST API
- **Use case:** "Join waitlist" kiosk → adds to OpenTable

#### Resy ($79/month)
- **What it syncs:** Reservations, guest profiles, preferences
- **Features:** High-end reservation management
- **Industries:** Premium restaurants
- **API:** REST API
- **Use case:** VIP reservation check-in

---

## 💳 Payment Gateways

#### Stripe ($69/month + processing fees)
- **What it does:** Payment processing, subscriptions, invoicing
- **Features:** Checkout, payment links, fraud detection
- **Industries:** All
- **API:** REST API
- **Use case:** Kiosk checkout, membership billing

#### PayPal ($69/month + processing fees)
- **What it does:** Payment processing, digital wallets
- **Features:** PayPal, Venmo, credit cards
- **Industries:** All
- **API:** REST API
- **Use case:** Kiosk checkout with PayPal button

#### Braintree ($69/month + processing fees)
- **What it does:** Payment processing (owned by PayPal)
- **Features:** Venmo, PayPal, cards, Apple Pay, Google Pay
- **Industries:** All
- **API:** REST + SDKs
- **Use case:** Kiosk with multiple payment options

#### Adyen ($99/month + processing fees)
- **What it does:** Global payment processing
- **Features:** 250+ payment methods, multi-currency
- **Industries:** Enterprise, international
- **API:** REST API
- **Use case:** Kiosk in international locations

---

## 🏋️ Fitness-Specific Integrations

#### Strava ($49/month)
- **What it syncs:** Athlete activities, segments, clubs
- **Features:** Workout tracking, challenges, leaderboards
- **Industries:** Fitness, gyms, running clubs
- **API:** REST API
- **Use case:** "Log your workout to Strava" kiosk challenge

#### MyFitnessPal ($49/month)
- **What it syncs:** Food diary, exercise log, weight tracking
- **Features:** Nutrition tracking, calorie goals
- **Industries:** Fitness, wellness, nutrition
- **API:** REST API
- **Use case:** Post-workout nutrition recommendations

#### Garmin Connect ($49/month)
- **What it syncs:** Workouts, health metrics, device data
- **Features:** Training plans, performance analytics
- **Industries:** Fitness, endurance sports
- **API:** REST API
- **Use case:** Sync kiosk challenge with Garmin training plan

#### Apple Health ($0 - free via HealthKit)
- **What it syncs:** Steps, workouts, heart rate, sleep
- **Features:** Comprehensive health data aggregation
- **Industries:** Fitness, healthcare, wellness
- **API:** HealthKit (iOS only)
- **Use case:** "Check in with Apple Health" → logs gym visit

#### Fitbit ($49/month)
- **What it syncs:** Activity, sleep, heart rate, weight
- **Features:** Challenges, badges, social features
- **Industries:** Fitness, corporate wellness
- **API:** Web API
- **Use case:** Gym challenges synced with Fitbit data

---

## 🛍️ E-commerce & Inventory

#### Amazon SP-API ($99/month)
- **What it syncs:** Orders, inventory, fulfillment
- **Features:** FBA integration, product catalog
- **Industries:** Retail, e-commerce
- **API:** Selling Partner API
- **Use case:** Check inventory across Amazon + retail locations

#### WooCommerce ($79/month)
- **What it syncs:** Products, orders, customers
- **Features:** WordPress e-commerce, flexible customization
- **Industries:** Retail, small businesses
- **API:** REST API
- **Use case:** In-store kiosk for online catalog browsing

#### BigCommerce ($79/month)
- **What it syncs:** Products, orders, inventory
- **Features:** Multi-channel selling, headless commerce
- **Industries:** Retail, B2B
- **API:** REST API
- **Use case:** Unified inventory across online + kiosk

#### Magento (Adobe Commerce) ($129/month)
- **What it syncs:** Products, customers, orders
- **Features:** Enterprise e-commerce, B2B features
- **Industries:** Large retailers, B2B
- **API:** REST + GraphQL
- **Use case:** Enterprise-grade omnichannel commerce

#### ShipStation ($59/month)
- **What it syncs:** Orders, shipments, tracking
- **Features:** Multi-carrier shipping, label printing
- **Industries:** E-commerce, retail fulfillment
- **API:** REST API
- **Use case:** "Order for pickup" → creates shipment in ShipStation

---

## 🎵 Music & Entertainment

#### Spotify for Business ($99/month - includes licensing)
- **What it does:** Commercial music streaming
- **Features:** Curated playlists, mood-based selection
- **Industries:** All (restaurants, retail, hospitality)
- **API:** Web API (limited commercial use)
- **Use case:** Jukebox widget with Spotify integration

#### Soundtrack Your Brand ($99/month)
- **What it does:** Commercial music streaming (Spotify-backed)
- **Features:** Licensed for business use, scheduling
- **Industries:** Retail, hospitality, fitness
- **API:** Partner API
- **Use case:** Automated playlist scheduling by time of day

#### Rockbot ($79/month)
- **What it does:** Social jukebox (customer requests)
- **Features:** Customer song requests, playlists, analytics
- **Industries:** Bars, restaurants, retail
- **API:** REST API
- **Use case:** Kiosk jukebox integration

#### TouchTunes ($79/month)
- **What it does:** Digital jukebox network
- **Features:** Customer-controlled music, ads, promotions
- **Industries:** Bars, restaurants
- **API:** Partner API
- **Use case:** Kiosk controls TouchTunes jukebox

---

## 🚗 Auto Industry Integrations

#### Carfax ($99/month)
- **What it syncs:** Vehicle history reports
- **Features:** Accident history, service records, ownership
- **Industries:** Auto dealerships, service centers
- **API:** REST API
- **Use case:** "Get your vehicle history" kiosk

#### Kelley Blue Book (KBB) ($99/month)
- **What it syncs:** Vehicle valuations, pricing
- **Features:** Trade-in values, market prices
- **Industries:** Auto dealerships
- **API:** Partner API
- **Use case:** "What's my car worth?" trade-in estimator

#### AutoCheck ($99/month)
- **What it syncs:** Vehicle history (Experian)
- **Features:** Title checks, accident reports
- **Industries:** Auto dealerships
- **API:** REST API
- **Use case:** Alternative to Carfax for history reports

#### vAuto ($99/month)
- **What it syncs:** Used car inventory, pricing, appraisals
- **Features:** Market-based pricing, turn time
- **Industries:** Auto dealerships (used cars)
- **API:** REST API
- **Use case:** Dynamic trade-in offers on kiosk

---

## 🏥 Healthcare Integrations

#### Stripe Identity ($129/month + $1.50/verification)
- **What it does:** Identity verification, age checks
- **Features:** ID scanning, biometric matching, fraud detection
- **Industries:** Healthcare, cannabis, events, hospitality
- **API:** REST API
- **Use case:** Patient check-in with ID verification

#### Jumio ($129/month + $1.00/verification)
- **What it does:** ID verification, KYC, AML
- **Features:** Government ID scanning, liveness detection
- **Industries:** Healthcare, cannabis, finance
- **API:** REST API
- **Use case:** Cannabis age verification

#### Onfido ($129/month + $1.25/verification)
- **What it does:** Identity verification, document checks
- **Features:** Global ID coverage, biometric matching
- **Industries:** Healthcare, finance, cannabis
- **API:** REST API
- **Use case:** Telemedicine patient verification

#### Veriff ($129/month + $1.50/verification)
- **What it does:** Identity verification (video-based)
- **Features:** Live video verification, fraud prevention
- **Industries:** Healthcare, finance, cannabis
- **API:** REST API
- **Use case:** High-security patient check-in

#### LabCorp ($149/month)
- **What it syncs:** Lab orders, test results
- **Features:** Test catalog, result delivery
- **Industries:** Healthcare
- **API:** HL7 interface
- **Use case:** "Schedule your lab test" kiosk

#### Quest Diagnostics ($149/month)
- **What it syncs:** Lab tests, patient results
- **Features:** Appointment scheduling, result access
- **Industries:** Healthcare
- **API:** HL7 + proprietary
- **Use case:** Lab test check-in kiosk

---

## 🌿 Cannabis Industry Tools

#### Metrc ($99/month)
- **What it syncs:** Seed-to-sale tracking (state-mandated)
- **Features:** Compliance reporting, inventory tracking
- **Industries:** Cannabis (state-specific)
- **API:** REST API
- **Use case:** Automatic compliance when orders placed via kiosk

#### Leafly Business ($79/month)
- **What it syncs:** Menu, strains, reviews, analytics
- **Features:** Online ordering, product education
- **Industries:** Cannabis dispensaries
- **API:** REST API
- **Use case:** Strain finder on kiosk with Leafly data

#### Weedmaps Business ($79/month)
- **What it syncs:** Dispensary listings, menus, reviews
- **Features:** Online ordering, delivery management
- **Industries:** Cannabis
- **API:** REST API
- **Use case:** Kiosk menu synced with Weedmaps

#### Alpine IQ ($89/month)
- **What it syncs:** Customer data, loyalty, marketing
- **Features:** Cannabis-specific CRM, compliance
- **Industries:** Cannabis dispensaries
- **API:** REST API
- **Use case:** Loyalty program integrated with kiosk

---

## 🎨 Design & Creative Tools

#### Canva ($49/month)
- **What it does:** Graphic design, templates
- **Features:** Branded templates, auto-generation
- **Industries:** All
- **API:** REST API (limited)
- **Use case:** Auto-generate social posts from photo booth images

#### Figma ($0 - free read-only)
- **What it does:** Design file access
- **Features:** Design system sync, asset export
- **Industries:** All (internal use)
- **API:** REST API
- **Use case:** Pull latest UI designs for kiosk screens

#### Unsplash ($49/month)
- **What it does:** Stock photography
- **Features:** High-quality images, search, collections
- **Industries:** All
- **API:** REST API
- **Use case:** Background images for kiosk screens

#### Pexels ($0 - free)
- **What it does:** Stock photos and videos
- **Features:** Free commercial use
- **Industries:** All
- **API:** REST API
- **Use case:** Rotating background videos on idle screens

---

## 📦 Shipping & Logistics

#### UPS ($59/month)
- **What it syncs:** Tracking, shipping rates, label printing
- **Features:** Real-time tracking, address validation
- **Industries:** Retail, e-commerce
- **API:** REST API
- **Use case:** "Track my order" kiosk

#### FedEx ($59/month)
- **What it syncs:** Shipments, rates, tracking
- **Features:** Multi-carrier support
- **Industries:** Retail, e-commerce
- **API:** REST API
- **Use case:** Print shipping labels at kiosk

#### USPS ($49/month)
- **What it syncs:** Tracking, postage rates
- **Features:** Address verification, package tracking
- **Industries:** Retail, small business
- **API:** Web Tools API
- **Use case:** Check package delivery status

---

## 🏢 Enterprise & Productivity

#### Slack ($49/month)
- **What it does:** Team messaging, notifications
- **Features:** Channel posting, direct messages, bot interactions
- **Industries:** All
- **API:** REST + WebSockets
- **Use case:** Negative feedback → alert sent to Slack channel

#### Microsoft Teams ($49/month)
- **What it does:** Team collaboration, chat, video
- **Features:** Channel notifications, adaptive cards
- **Industries:** Enterprise
- **API:** Graph API
- **Use case:** Kiosk alerts posted to Teams channels

#### Zapier ($0 - customer brings own account)
- **What it does:** No-code automation between apps
- **Features:** 5,000+ app integrations
- **Industries:** All
- **API:** REST API
- **Use case:** "When survey submitted, create row in Google Sheets"

#### Make (Integromat) ($0 - customer brings own account)
- **What it does:** Advanced automation workflows
- **Features:** Complex logic, data transformation
- **Industries:** All
- **API:** REST API
- **Use case:** Multi-step workflows triggered by kiosk events

#### Airtable ($59/month)
- **What it syncs:** Database tables, views, records
- **Features:** Flexible database, automations
- **Industries:** All
- **API:** REST API
- **Use case:** Survey responses → stored in Airtable

#### Google Sheets ($0 - free via Google Workspace)
- **What it syncs:** Spreadsheet data, rows, columns
- **Features:** Real-time collaboration, formulas
- **Industries:** All
- **API:** Sheets API
- **Use case:** Export analytics data to Google Sheets

---

## 🔐 Security & Compliance

#### Auth0 ($99/month)
- **What it does:** Authentication, single sign-on (SSO)
- **Features:** OAuth, SAML, MFA, user management
- **Industries:** Enterprise
- **API:** Authentication API
- **Use case:** Admin dashboard SSO with company credentials

#### Okta ($129/month)
- **What it does:** Enterprise identity management
- **Features:** SSO, MFA, provisioning, directory integration
- **Industries:** Enterprise
- **API:** REST API
- **Use case:** Kiosk admin access via Okta

#### OneTrust ($199/month)
- **What it does:** Privacy compliance, consent management
- **Features:** GDPR, CCPA, cookie consent
- **Industries:** All (regulatory focus)
- **API:** REST API
- **Use case:** Kiosk cookie consent, data privacy controls

---

## 📍 Location & Mapping

#### Google Maps Platform ($49/month + usage)
- **What it does:** Maps, geocoding, directions, places
- **Features:** Store locator, directions, nearby search
- **Industries:** All
- **API:** Maps JavaScript API, Places API
- **Use case:** "Find nearest location" kiosk feature

#### Mapbox ($49/month + usage)
- **What it does:** Custom maps, geocoding, navigation
- **Features:** Customizable maps, turn-by-turn directions
- **Industries:** All
- **API:** REST API + SDKs
- **Use case:** Branded maps for multi-location businesses

---

## 🎓 Education & Training

#### Articulate 360 ($59/month)
- **What it does:** E-learning content creation
- **Features:** Interactive courses, quizzes, SCORM
- **Industries:** Training, education, corporate
- **API:** Limited (SCORM export)
- **Use case:** Training modules on kiosk for employees

#### LinkedIn Learning ($99/month)
- **What it does:** Video courses, skill development
- **Features:** Course library, progress tracking
- **Industries:** Corporate training
- **API:** REST API (limited)
- **Use case:** "Continue your training" employee kiosk

---

## 🎯 Loyalty & Rewards

#### LoyaltyLion ($79/month)
- **What it does:** E-commerce loyalty programs
- **Features:** Points, tiers, referrals, rewards
- **Industries:** Retail, e-commerce
- **API:** REST API
- **Use case:** Kiosk purchase earns loyalty points

#### Smile.io ($79/month)
- **What it does:** Shopify loyalty programs
- **Features:** Points, VIP tiers, referrals
- **Industries:** E-commerce (Shopify)
- **API:** REST API
- **Use case:** "Check your points" kiosk lookup

#### Yotpo Loyalty ($99/month)
- **What it does:** Loyalty + reviews + referrals
- **Features:** Omnichannel loyalty, UGC
- **Industries:** E-commerce, retail
- **API:** REST API
- **Use case:** Unified loyalty across online + kiosk

---

## 🚀 Growth & Referral

#### ReferralCandy ($59/month)
- **What it does:** Referral program management
- **Features:** Unique referral links, reward tracking
- **Industries:** E-commerce, retail
- **API:** REST API
- **Use case:** "Refer a friend" kiosk flow

#### Viral Loops ($69/month)
- **What it does:** Viral referral campaigns
- **Features:** Waitlists, giveaways, referrals
- **Industries:** All (growth focus)
- **API:** REST API
- **Use case:** Kiosk-driven viral waitlist campaign

---

## 📊 Complete Integration Pricing Summary

| Category | # of Integrations | Avg Price | Total Available |
|----------|-------------------|-----------|-----------------|
| Payment & POS | 20 | $95/mo | $1,900/mo |
| CRM & Marketing | 15 | $62/mo | $930/mo |
| Event Management | 6 | $75/mo | $450/mo |
| Communication | 10 | $53/mo | $530/mo |
| Analytics & BI | 6 | $124/mo | $744/mo |
| Advertising | 6 | $40/mo | $240/mo |
| Payment Gateways | 4 | $76/mo | $304/mo |
| Fitness-Specific | 5 | $38/mo | $190/mo |
| E-commerce | 5 | $87/mo | $435/mo |
| Music & Entertainment | 4 | $89/mo | $356/mo |
| Auto Industry | 4 | $99/mo | $396/mo |
| Healthcare | 6 | $137/mo | $822/mo |
| Cannabis | 4 | $86/mo | $344/mo |
| Design & Creative | 4 | $25/mo | $100/mo |
| Shipping & Logistics | 3 | $56/mo | $168/mo |
| Enterprise & Productivity | 6 | $35/mo | $210/mo |
| Security & Compliance | 3 | $142/mo | $426/mo |
| Location & Mapping | 2 | $49/mo | $98/mo |
| Education & Training | 2 | $79/mo | $158/mo |
| Loyalty & Rewards | 3 | $85/mo | $255/mo |
| Growth & Referral | 2 | $65/mo | $130/mo |

**Total: 120 integrations**
**Total possible spend: $9,186/month**

---

## 🎁 Industry-Specific Integration Bundles

### 🍽️ Restaurant Super Bundle
**Price:** $599/month (save $287/month)
**Integrations:**
- Square POS ($89)
- OpenTable ($79)
- Yelp ($59)
- Google My Business (free)
- Mailchimp ($49)
- Twilio ($49 + usage)
- Spotify for Business ($99)
- TripAdvisor ($59)

**Total à la carte:** $483/month (before usage)
**Bundle value with premium support:** $599/month

---

### 🚗 Auto Dealership Super Bundle
**Price:** $699/month (save $351/month)
**Integrations:**
- CDK Global ($129)
- Salesforce ($69)
- Carfax ($99)
- Kelley Blue Book ($99)
- Google My Business (free)
- Mailchimp ($49)
- Twilio ($49)
- Google Analytics (free)
- DealerRater integration ($59)

**Total à la carte:** $553/month
**Bundle value with white-glove setup:** $699/month

---

### 🏥 Healthcare Super Bundle
**Price:** $899/month (save $427/month)
**Integrations:**
- Epic / Athenahealth ($129-199)
- Stripe Identity ($129)
- Zendesk ($69)
- Twilio ($49)
- SendGrid ($49)
- OneTrust ($199)
- Google Analytics (free)

**Total à la carte:** $624-694/month
**Bundle value with HIPAA compliance:** $899/month

---

### 🛍️ Retail Super Bundle
**Price:** $549/month (save $248/month)
**Integrations:**
- Shopify POS ($89)
- Klaviyo (email) ($49)
- LoyaltyLion ($79)
- Google My Business (free)
- Facebook Business (free)
- Yotpo Reviews ($99)
- Stripe ($69)
- Google Analytics (free)

**Total à la carte:** $385/month
**Bundle value with setup + training:** $549/month

---

### 🏋️ Fitness Super Bundle
**Price:** $499/month (save $223/month)
**Integrations:**
- Mindbody ($69)
- Strava ($49)
- MyFitnessPal ($49)
- Mailchimp ($49)
- Google My Business (free)
- Stripe ($69)
- Twilio ($49)

**Total à la carte:** $334/month
**Bundle value with member app:** $499/month

---

### 🏨 Hospitality Super Bundle
**Price:** $649/month (save $298/month)
**Integrations:**
- Opera PMS ($69)
- TripAdvisor ($59)
- Google My Business (free)
- Mailchimp ($49)
- Twilio ($49)
- Stripe ($69)
- Google Analytics (free)

**Total à la carte:** $295/month
**Bundle value with guest app:** $649/month

---

### 🌿 Cannabis Super Bundle
**Price:** $599/month (save $286/month)
**Integrations:**
- Dutchie POS ($89)
- Metrc compliance ($99)
- Jumio ID verification ($129)
- Leafly Business ($79)
- Alpine IQ CRM ($89)
- Mailchimp ($49)
- Google Analytics (free)

**Total à la carte:** $534/month
**Bundle value with compliance guarantee:** $599/month

---

### 🎉 Events & Weddings Super Bundle
**Price:** $699/month (save $314/month)
**Integrations:**
- Eventbrite ($79)
- Cvent ($79)
- Stripe Identity ($129)
- Twilio ($49)
- SendGrid ($49)
- Mailchimp ($49)
- Google Analytics (free)

**Total à la carte:** $434/month
**Bundle value with event support:** $699/month

---

## 🔧 Integration Development Kit (IDK)

For custom integrations not listed above:

### Custom Integration Tiers

#### Basic Integration ($2,500 one-time + $99/month)
- **Scope:** Simple REST API, webhook support
- **Timeline:** 2-4 weeks
- **Examples:** Regional POS, niche CRM, local service
- **Includes:** OAuth setup, basic CRUD operations, error handling

#### Advanced Integration ($7,500 one-time + $149/month)
- **Scope:** Complex API, real-time sync, custom logic
- **Timeline:** 4-8 weeks
- **Examples:** Legacy enterprise systems, complex workflows
- **Includes:** Custom middleware, data transformation, webhooks

#### Enterprise Integration ($25,000+ one-time + $299/month)
- **Scope:** Mission-critical systems, custom protocols, high-volume
- **Timeline:** 3-6 months
- **Examples:** Proprietary DMS, hospital systems, government
- **Includes:** Dedicated engineering, SLA guarantees, 24/7 support

---

## 📈 Integration ROI Examples

### Restaurant: Square POS + Upsell Engine
**Investment:** $89 (Square) + $69 (Upsell) = $158/month
**Results:**
- 18% upsell conversion rate
- Avg upsell: $8
- 500 transactions/month
- **Revenue increase:** $720/month
- **ROI:** 356% monthly return

---

### Auto: CDK + Carfax + Upsell Engine
**Investment:** $129 + $99 + $69 = $297/month
**Results:**
- Service conversion: +12%
- Avg service ticket: $350
- 200 service visits/month
- **Revenue increase:** $8,400/month
- **ROI:** 2,728% monthly return

---

### Fitness: Mindbody + Loyalty + Email
**Investment:** $69 + $89 + $49 = $207/month
**Results:**
- Member retention: +15%
- Avg member value: $120/month
- 300 members
- **Revenue increase:** $5,400/month
- **ROI:** 2,509% monthly return

---

## 🚀 Next Steps

1. **Widget Marketplace UI:** Add "Integrations" tab to marketplace
2. **OAuth Management:** Centralized connection management for admins
3. **Integration Health Dashboard:** Monitor sync status, errors, latency
4. **Pre-Built Workflows:** "When X happens in POS, do Y in kiosk"
5. **Developer Portal:** Public API docs for 3rd party integrations
6. **Certification Program:** Verify integration partners for quality

---

**Questions:**
1. Should integrations be priced individually or bundled into industry packages?
2. Should we offer "integration credits" (e.g., $200/month, use on any integrations)?
3. Should usage-based integrations (Twilio, SendGrid) be marked up or pass-through pricing?
4. Should we build a Zapier-style visual workflow builder for integrations?
5. Should custom integrations be a separate service or part of Enterprise plan?
