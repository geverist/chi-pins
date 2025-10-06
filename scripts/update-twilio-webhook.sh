#!/bin/bash

curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/$TWILIO_PHONE_NUMBER_SID.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
  -d "VoiceUrl=$SUPABASE_FUNCTION_URL/inbound-voice-handler-simple" \
  -d "VoiceMethod=POST"
