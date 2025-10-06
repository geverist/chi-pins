# Twilio A2P 10DLC & Toll-Free Verification Guide

Complete guide for setting up A2P 10DLC messaging compliance and toll-free verification for EngageOS™.

---

## Table of Contents

1. [Overview](#overview)
2. [A2P 10DLC Registration](#a2p-10dlc-registration)
3. [Toll-Free Verification](#toll-free-verification)
4. [Number Management](#number-management)
5. [Implementation Guide](#implementation-guide)

---

## Overview

### What is A2P 10DLC?

**A2P (Application-to-Person)** messaging is any text message sent from an application to a consumer. **10DLC (10-Digit Long Code)** refers to standard local phone numbers.

**Why it matters:**
- Required by US carriers for business SMS
- Prevents spam and ensures deliverability
- Enables higher throughput (up to 4,500 msgs/day vs 200 for unregistered)
- Protects your sender reputation

### Number Types Comparison

| Feature | A2P 10DLC | Toll-Free | Short Code |
|---------|-----------|-----------|------------|
| **Format** | (312) 555-0123 | (800) 555-0123 | 12345 |
| **Cost** | $1-2/mo | $2-3/mo | $1,000+/mo |
| **Throughput** | 60-4,500 msg/min | 3 msg/sec | 100 msg/sec |
| **Setup Time** | 1-2 weeks | 3-5 days | 8-12 weeks |
| **Best For** | Local presence | National campaigns | High-volume |
| **Registration** | Brand + Campaign | Verification only | Long approval |

---

## A2P 10DLC Registration

### Step 1: Brand Registration

Every business must register their **brand** (company identity) with The Campaign Registry (TCR).

#### Required Information

```javascript
const brandData = {
  // Business Details
  friendlyName: 'Chicago Mike\'s Hot Dogs',
  ein: '12-3456789', // Tax ID (EIN)

  // Business Type
  businessType: 'PRIVATE_PROFIT', // or 'PUBLIC_PROFIT', 'NON_PROFIT', 'GOVERNMENT'
  businessRegistrationNumber: '12-3456789',
  businessRegistrationIdentifier: 'EIN',
  businessIndustry: 'RESTAURANT',

  // Address
  street: '123 Main St',
  city: 'Chicago',
  state: 'IL',
  postalCode: '60601',
  country: 'US',

  // Contact
  email: 'hello@chicagomikes.us',
  phone: '+13125550123',
  website: 'https://chicagomikes.us',

  // Additional Info
  stockSymbol: null, // Only if public company
  vertical: 'RETAIL',
  brandRelationship: 'DIRECT_CUSTOMER', // or 'ISV' for resellers

  // Mock profile (only if no EIN)
  mockProfile: false // Set true only for testing
}
```

#### Brand Registration API

```javascript
// api/twilio-register-brand.js
import twilio from 'twilio'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const client = twilio(accountSid, authToken)

export default async function handler(req, res) {
  try {
    const brandData = req.body

    // Create Customer Profile (required first)
    const customerProfile = await client.messaging.v1.a2p
      .brandRegistrations
      .customerProfiles
      .create({
        customerType: 'BUSINESS',
        businessName: brandData.friendlyName,
        businessIndustry: brandData.businessIndustry,
        address: {
          street: brandData.street,
          city: brandData.city,
          stateProvinceRegion: brandData.state,
          postalCode: brandData.postalCode,
          country: brandData.country
        },
        email: brandData.email,
        phone: brandData.phone,
        website: brandData.website
      })

    // Register Brand
    const brand = await client.messaging.v1.a2p
      .brandRegistrations
      .create({
        customerProfileSid: customerProfile.sid,
        a2pProfileBundleSid: brandData.a2pProfileBundleSid, // From identity verification
        brandType: brandData.businessType,
        ein: brandData.ein,
        vertical: brandData.vertical,
        brandRelationship: brandData.brandRelationship,
        mock: brandData.mockProfile || false
      })

    // Store in database
    const { error } = await supabase
      .from('twilio_brands')
      .insert({
        user_id: req.user.id,
        brand_sid: brand.sid,
        customer_profile_sid: customerProfile.sid,
        brand_name: brandData.friendlyName,
        status: brand.status,
        brand_score: brand.brandScore,
        brand_data: brand
      })

    if (error) throw error

    return res.status(200).json({
      success: true,
      brandSid: brand.sid,
      status: brand.status,
      brandScore: brand.brandScore,
      message: 'Brand registered successfully. Processing takes 1-3 business days.'
    })

  } catch (error) {
    console.error('Brand registration error:', error)
    return res.status(500).json({
      error: 'Failed to register brand',
      message: error.message
    })
  }
}
```

#### Brand Status Tracking

```javascript
// Check brand status
const brand = await client.messaging.v1.a2p
  .brandRegistrations(brandSid)
  .fetch()

/*
Possible statuses:
- PENDING: Submitted, awaiting review
- APPROVED: Ready to create campaigns
- FAILED: Rejected (check failureReason)
- VERIFIED: Extra trust tier
*/

if (brand.status === 'APPROVED') {
  console.log('Brand Score:', brand.brandScore) // 0-100
  console.log('Trust Tier:', brand.trustLevel) // UNVERIFIED, VERIFIED, VETTED
}
```

---

### Step 2: Campaign Registration

After brand approval, register your **campaign** (use case for messaging).

#### Campaign Use Cases

Common use cases for EngageOS:
- `2FA` - Two-factor authentication (highest throughput)
- `CUSTOMER_CARE` - Support notifications
- `MARKETING` - Promotional messages
- `MIXED` - Multiple use cases (lowest throughput)

#### Campaign Registration

```javascript
// api/twilio-register-campaign.js
export default async function handler(req, res) {
  try {
    const {
      brandSid,
      useCase,
      description,
      messageFlow,
      optInKeywords,
      optOutKeywords,
      helpKeywords,
      sampleMessages
    } = req.body

    const campaign = await client.messaging.v1.a2p
      .brandRegistrations(brandSid)
      .a2pMessagingCampaigns
      .create({
        description: description,
        messagingServiceSid: messagingServiceSid, // Your Twilio Messaging Service
        usecaseCategories: [useCase],
        hasEmbeddedLinks: true,
        hasEmbeddedPhone: false,
        messageFlow: messageFlow,
        optInMessage: 'Reply YES to confirm subscription to EngageOS notifications.',
        optOutMessage: 'You have been unsubscribed. Reply START to resubscribe.',
        helpMessage: 'EngageOS notifications. Reply STOP to unsubscribe, HELP for info.',
        optInKeywords: optInKeywords || ['START', 'YES', 'UNSTOP'],
        optOutKeywords: optOutKeywords || ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'],
        helpKeywords: helpKeywords || ['HELP', 'INFO'],
        messageVolume: '10000', // Expected daily volume
        subscriberOptIn: true,
        ageGated: false,
        directLending: false,
        affiliateMarketing: false
      })

    // Store campaign in database
    await supabase
      .from('twilio_campaigns')
      .insert({
        user_id: req.user.id,
        brand_sid: brandSid,
        campaign_sid: campaign.sid,
        use_case: useCase,
        status: campaign.status,
        campaign_data: campaign
      })

    return res.status(200).json({
      success: true,
      campaignSid: campaign.sid,
      status: campaign.status,
      message: 'Campaign registered successfully. Approval takes 1-5 business days.'
    })

  } catch (error) {
    console.error('Campaign registration error:', error)
    return res.status(500).json({
      error: 'Failed to register campaign',
      message: error.message
    })
  }
}
```

#### Sample Message Examples

```javascript
const sampleMessages = {
  '2FA': [
    'Your EngageOS verification code is: 123456',
    'Use code 987654 to verify your account'
  ],
  'CUSTOMER_CARE': [
    'Your order #1234 is ready for pickup!',
    'You won a Free Appetizer! Show code: TRIVIA850 at checkout'
  ],
  'MARKETING': [
    'Special offer: Play trivia today and get 20% off your order!',
    'New game alert! Try Word Scramble and win prizes 🎉'
  ]
}
```

---

### Step 3: Link Campaign to Phone Numbers

```javascript
// Link 10DLC number to campaign
const phoneNumber = await client.incomingPhoneNumbers(phoneNumberSid)
  .update({
    messagingServiceSid: messagingServiceSid
  })

// Messaging Service automatically uses approved campaign
```

---

## Toll-Free Verification

Toll-free numbers (800, 888, 877, 866, 855, 844, 833) require verification but no brand/campaign registration.

### Step 1: Request Toll-Free Number

```javascript
// api/twilio-acquire-tollfree.js
export default async function handler(req, res) {
  try {
    // Search for available toll-free numbers
    const numbers = await client.availablePhoneNumbers('US')
      .tollFree
      .list({
        limit: 10
      })

    if (numbers.length === 0) {
      return res.status(404).json({ error: 'No toll-free numbers available' })
    }

    // Purchase first available
    const purchased = await client.incomingPhoneNumbers
      .create({
        phoneNumber: numbers[0].phoneNumber
      })

    return res.status(200).json({
      success: true,
      phoneNumber: purchased.phoneNumber,
      sid: purchased.sid,
      message: 'Toll-free number acquired. Now submit for verification.'
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
```

---

### Step 2: Submit Toll-Free Verification

```javascript
// api/twilio-verify-tollfree.js
export default async function handler(req, res) {
  try {
    const {
      phoneNumberSid,
      businessName,
      businessWebsite,
      businessType,
      businessAddress,
      businessContactEmail,
      businessContactPhone,
      messageVolume,
      useCase,
      useCaseDescription,
      productionMessageSample,
      optInType,
      optInImageUrls,
      additionalInformation
    } = req.body

    // Create Toll-Free Verification request
    const verification = await client.messaging.v1
      .tollFreeVerifications
      .create({
        businessName: businessName,
        businessWebsite: businessWebsite,
        notificationEmail: businessContactEmail,
        useCaseSummary: useCaseDescription,
        useCaseCategories: [useCase], // MARKETING, 2FA, etc.
        productionMessageSample: productionMessageSample,
        optInType: optInType, // VERBAL, WEB_FORM, PAPER_FORM, VIA_TEXT, MOBILE_QR_CODE
        optInImageUrls: optInImageUrls || [],
        messageVolume: messageVolume, // Expected daily volume
        tollfreePhoneNumberSid: phoneNumberSid,
        customerProfileSid: customerProfileSid,
        businessStreetAddress: businessAddress.street,
        businessStreetAddress2: businessAddress.street2,
        businessCity: businessAddress.city,
        businessStateProvinceRegion: businessAddress.state,
        businessPostalCode: businessAddress.zip,
        businessCountry: 'US',
        additionalInformation: additionalInformation
      })

    // Store in database
    await supabase
      .from('twilio_tollfree_verifications')
      .insert({
        user_id: req.user.id,
        phone_number_sid: phoneNumberSid,
        verification_sid: verification.sid,
        status: verification.status,
        phone_number: verification.tollFreePhoneNumber
      })

    return res.status(200).json({
      success: true,
      verificationSid: verification.sid,
      status: verification.status,
      message: 'Toll-free verification submitted. Approval takes 3-5 business days.'
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
```

---

### Verification Requirements

**Documentation needed:**
- Business name (must match registration)
- Business website (active and professional)
- Opt-in process (screenshots/description)
- Message samples (exactly what customers receive)
- Business contact info
- Use case description

**Opt-in proof examples:**
- Screenshot of web form where users subscribe
- Screenshot of checkbox during signup
- Photo of paper form with opt-in checkbox
- QR code that leads to opt-in page

---

## Number Management

### Acquire New Number from Twilio

```javascript
// api/twilio-search-numbers.js
export default async function handler(req, res) {
  const { areaCode, numberType, contains } = req.body

  try {
    let availableNumbers

    if (numberType === 'local' || numberType === '10dlc') {
      availableNumbers = await client.availablePhoneNumbers('US')
        .local
        .list({
          areaCode: areaCode,
          contains: contains,
          smsEnabled: true,
          voiceEnabled: true,
          limit: 20
        })
    } else if (numberType === 'tollfree') {
      availableNumbers = await client.availablePhoneNumbers('US')
        .tollFree
        .list({
          contains: contains,
          smsEnabled: true,
          limit: 20
        })
    }

    return res.status(200).json({
      numbers: availableNumbers.map(n => ({
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
        locality: n.locality,
        region: n.region,
        capabilities: {
          voice: n.capabilities.voice,
          SMS: n.capabilities.SMS,
          MMS: n.capabilities.MMS
        }
      }))
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
```

```javascript
// api/twilio-purchase-number.js
export default async function handler(req, res) {
  const { phoneNumber, friendlyName } = req.body

  try {
    const purchased = await client.incomingPhoneNumbers
      .create({
        phoneNumber: phoneNumber,
        friendlyName: friendlyName,
        smsUrl: `${process.env.BASE_URL}/api/twilio-sms-webhook`,
        smsMethod: 'POST',
        voiceUrl: `${process.env.BASE_URL}/api/twilio-voice-webhook`,
        voiceMethod: 'POST',
        statusCallback: `${process.env.BASE_URL}/api/twilio-status-callback`,
        statusCallbackMethod: 'POST'
      })

    // Store in database
    await supabase
      .from('phone_numbers')
      .insert({
        user_id: req.user.id,
        phone_number: purchased.phoneNumber,
        phone_number_sid: purchased.sid,
        friendly_name: friendlyName,
        number_type: phoneNumber.startsWith('+1800') ? 'tollfree' : '10dlc',
        status: 'active',
        capabilities: purchased.capabilities
      })

    return res.status(200).json({
      success: true,
      phoneNumber: purchased.phoneNumber,
      sid: purchased.sid
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
```

---

### Port Existing Number to Twilio

**Number porting** transfers your existing phone number from another carrier to Twilio.

#### Port-In Requirements

```javascript
const portingRequirements = {
  // Account Info
  accountNumber: 'Your account # with current carrier',
  pin: 'Account PIN/passcode',

  // Service Address (billing address with current carrier)
  addressLine1: '123 Main St',
  city: 'Chicago',
  state: 'IL',
  postalCode: '60601',

  // Authorized Contact
  contactName: 'John Doe',
  contactEmail: 'john@example.com',
  contactPhone: '+13125550123',

  // Additional Docs
  billCopy: 'recent_bill.pdf', // Most recent bill showing number
  loa: 'signed_loa.pdf' // Letter of Authorization (Twilio provides template)
}
```

#### Create Port-In Request

```javascript
// api/twilio-port-number.js
export default async function handler(req, res) {
  try {
    const {
      phoneNumbers, // Array of numbers to port
      accountInfo,
      serviceAddress,
      authorizedContact,
      targetDate
    } = req.body

    // Create port-in request
    const portIn = await client.numbers.v1
      .portingPortIns
      .create({
        phoneNumbers: phoneNumbers,
        targetAccountSid: accountSid,
        notificationEmails: [authorizedContact.email],
        desiredFocDate: targetDate || undefined // FOC = Firm Order Commitment
      })

    // Add configuration for the port
    await client.numbers.v1
      .portingPortIns(portIn.portInRequestSid)
      .portingConfigurations
      .create({
        country: 'US',
        losingCarrierDetails: {
          accountNumber: accountInfo.accountNumber,
          accountPin: accountInfo.pin,
          serviceAddress: serviceAddress
        },
        notificationEmails: [authorizedContact.email],
        notificationPhoneNumber: authorizedContact.phone
      })

    // Store in database
    await supabase
      .from('number_port_requests')
      .insert({
        user_id: req.user.id,
        port_in_sid: portIn.portInRequestSid,
        phone_numbers: phoneNumbers,
        status: portIn.status,
        target_date: targetDate,
        port_data: portIn
      })

    return res.status(200).json({
      success: true,
      portInSid: portIn.portInRequestSid,
      status: portIn.status,
      estimatedCompletion: portIn.estimatedFocDate,
      message: 'Port-in request submitted. Typical completion: 7-14 business days.'
    })

  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}
```

#### Port Status Tracking

```javascript
// Check port-in status
const portIn = await client.numbers.v1
  .portingPortIns(portInSid)
  .fetch()

/*
Statuses:
- draft: Not yet submitted
- pending_documents: Waiting for LOA/bill
- submitted: With carrier
- pending_loa: Needs signed LOA
- in_progress: Being processed
- completed: Port successful
- expired: Request expired
- canceled: Manually canceled
- port_failed: Carrier rejected
*/

if (portIn.status === 'pending_documents') {
  console.log('Missing documents:', portIn.missingDocuments)
}
```

---

### Host Existing Number (No Port)

If you want to keep your number with current carrier but use Twilio for messaging, use **Twilio Number Hosting**.

```javascript
// This keeps number with current carrier but routes SMS through Twilio
// Requires coordination with current carrier to forward SMS to Twilio endpoint

const hostedNumber = await client.incomingPhoneNumbers
  .create({
    phoneNumber: existingNumber,
    friendlyName: 'Hosted - ' + existingNumber,
    smsUrl: `${process.env.BASE_URL}/api/twilio-sms-webhook`,
    // Voice stays with current carrier
    voiceUrl: null
  })
```

---

## Implementation Guide

See the following files for complete implementation:

1. **Database Migrations**
   - `supabase/migrations/20251006_twilio_compliance.sql`

2. **API Endpoints**
   - `/api/twilio-register-brand.js`
   - `/api/twilio-register-campaign.js`
   - `/api/twilio-verify-tollfree.js`
   - `/api/twilio-search-numbers.js`
   - `/api/twilio-purchase-number.js`
   - `/api/twilio-port-number.js`

3. **UI Components**
   - `src/components/PhoneNumberSetup.jsx`
   - `src/components/A2P10DLCWizard.jsx`
   - `src/components/TollFreeVerificationForm.jsx`

4. **Webhook Handlers**
   - `/api/twilio-sms-webhook.js`
   - `/api/twilio-status-callback.js`

---

## Compliance Checklist

Before going live:

- [ ] Brand registered and approved
- [ ] Campaign registered for your use case
- [ ] Phone numbers linked to messaging service
- [ ] Opt-in/opt-out keywords configured
- [ ] Webhook endpoints configured
- [ ] Message templates comply with use case
- [ ] Monitoring and logging enabled
- [ ] Customer consent captured and stored

---

*EngageOS™ by Agentiosk*
*Last Updated: October 2025*
