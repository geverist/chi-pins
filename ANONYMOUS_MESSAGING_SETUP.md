# Anonymous Messaging Setup Instructions

## Problem
The anonymous messaging button is not showing up on pins even when users opt in to receive messages.

## Root Cause
The database columns `allow_anonymous_messages` and `loyalty_email` may not exist in your Supabase database yet.

## Solution

### Step 1: Run the SQL Migration

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `setup-anonymous-messaging.sql`
4. Click **Run** to execute the script

This will:
- Add `allow_anonymous_messages` column to the `pins` table
- Add `loyalty_email` column to the `pins` table
- Create the `anonymous_messages` table for rate limiting
- Set up proper Row Level Security (RLS) policies

### Step 2: Test the Feature

1. After running the SQL script, create a new pin
2. In the confirmation modal, check the box "Allow visitors to message me anonymously"
3. Select either Email or Phone as your contact method
4. Submit the pin
5. Click "Explore" mode
6. Click on your pin - you should now see a purple "💬 Message Anonymously" button

### Step 3: Verify Existing Pins

Existing pins created before the migration will have `allow_anonymous_messages = false` by default. To enable anonymous messaging on an existing pin, you would need to update it manually in the database:

```sql
UPDATE pins
SET allow_anonymous_messages = true,
    loyalty_email = 'your-email@example.com'  -- or use loyalty_phone
WHERE slug = 'your-pin-slug';
```

## Debug Information

When in development mode with "Explore" enabled, pins will show debug information:
```
[Debug] allow_msg: true/false, phone: yes/no, email: yes/no
```

This helps verify that the data is being stored correctly.

## Admin Settings

The admin panel has a setting called "Anonymous Message Rate Limit" which controls how many anonymous messages a single pin can receive per day (default: 5). This prevents spam and protects pin owners from being overwhelmed with messages.

## How It Works

1. When a user creates a pin, they can opt-in to receive anonymous messages in the confirmation modal
2. They choose either Email or Phone as their contact method
3. The pin is saved with `allow_anonymous_messages = true`
4. When other users view that pin in Explore mode, they see the "Message Anonymously" button
5. Clicking the button opens a modal where they can send a message
6. The message is rate-limited (default 5 per day per pin) to prevent spam
7. The message is sent via SMS (Twilio) or Email (to be implemented) to the pin owner
