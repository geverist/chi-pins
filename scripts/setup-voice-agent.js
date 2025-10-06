import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4d3FtYWtjcmNoZ2VmZ3pydWxmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk5MTIwOSwiZXhwIjoyMDc0NTY3MjA5fQ.wqX0mzF091JUkWh8Yh9rJOBQWMpXXsfS-FeIFxUrolQ';
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n🎙️  Setting up Voice AI Agent for Chicago Mike\'s...\n');

async function setupVoiceAgent() {
  // Get existing Twilio number from settings
  const { data: settings } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'app')
    .single();

  const twilioNumber = settings?.value?.twilioPhoneNumber;

  if (!twilioNumber) {
    console.error('❌ No Twilio number found in settings!');
    console.log('   Please configure Twilio in your settings first.');
    return;
  }

  console.log(`📞 Found Twilio number: ${twilioNumber}`);

  // Insert or update phone number for chicago-mikes
  const { data: phoneNumber, error: phoneError } = await supabase
    .from('phone_numbers')
    .upsert([{
      tenant_id: 'chicago-mikes',
      phone_number: twilioNumber,
      provider: 'twilio',
      status: 'active',
      greeting_message: 'Thanks for calling Chicago Mike\'s Beef and Dogs! Our AI assistant is here to help with orders, hours, and menu questions. How can I assist you today?',
      voice_type: 'nova',
      language: 'en-US',
      fallback_number: null, // Add human fallback number if desired
      business_hours: {
        monday: { open: '09:00', close: '21:00', enabled: true },
        tuesday: { open: '09:00', close: '21:00', enabled: true },
        wednesday: { open: '09:00', close: '21:00', enabled: true },
        thursday: { open: '09:00', close: '21:00', enabled: true },
        friday: { open: '09:00', close: '22:00', enabled: true },
        saturday: { open: '09:00', close: '22:00', enabled: true },
        sunday: { open: '10:00', close: '20:00', enabled: true }
      }
    }], {
      onConflict: 'phone_number',
      returning: 'minimal'
    });

  if (phoneError) {
    console.error('❌ Error setting up phone number:', phoneError);
    return;
  }

  console.log('✅ Phone number configured for voice agent');

  // Insert knowledge base entries
  const knowledgeEntries = [
    {
      tenant_id: 'chicago-mikes',
      question: 'What are your hours?',
      answer: 'We are open Monday through Thursday 9 AM to 9 PM, Friday and Saturday 9 AM to 10 PM, and Sunday 10 AM to 8 PM.',
      category: 'hours',
      keywords: ['hours', 'open', 'close', 'time', 'when'],
      priority: 10
    },
    {
      tenant_id: 'chicago-mikes',
      question: 'Where are you located?',
      answer: 'We are located in Chicago, Illinois. Would you like our exact address or directions?',
      category: 'location',
      keywords: ['location', 'address', 'directions', 'where', 'find'],
      priority: 10
    },
    {
      tenant_id: 'chicago-mikes',
      question: 'What is on the menu?',
      answer: 'We specialize in authentic Chicago-style Italian beef sandwiches and hot dogs. Our menu includes Italian beef, hot dogs, Polish sausage, burgers, and sides like fries and onion rings. What would you like to order?',
      category: 'menu',
      keywords: ['menu', 'food', 'items', 'what do you have'],
      priority: 10
    },
    {
      tenant_id: 'chicago-mikes',
      question: 'Do you have gluten-free options?',
      answer: 'Yes! We offer gluten-free buns for all our sandwiches. Just let us know when ordering and we will make sure to use a gluten-free bun.',
      category: 'menu',
      keywords: ['gluten-free', 'gluten', 'dietary', 'allergies', 'celiac'],
      priority: 8
    },
    {
      tenant_id: 'chicago-mikes',
      question: 'Can I place an order for pickup?',
      answer: 'Absolutely! I can take your order right now over the phone. What would you like to order?',
      category: 'order',
      keywords: ['order', 'pickup', 'takeout', 'to-go', 'call in'],
      priority: 10
    },
    {
      tenant_id: 'chicago-mikes',
      question: 'Do you deliver?',
      answer: 'We offer delivery through DoorDash, Uber Eats, and Grubhub. You can order through their apps or websites for delivery.',
      category: 'services',
      keywords: ['delivery', 'deliver', 'doordash', 'ubereats', 'grubhub'],
      priority: 7
    },
    {
      tenant_id: 'chicago-mikes',
      question: 'How long will my order take?',
      answer: 'Most orders are ready in about 15 to 20 minutes. If it is busy, it may take up to 30 minutes. I will give you an estimated time when you place your order.',
      category: 'order',
      keywords: ['how long', 'wait time', 'ready', 'pickup time'],
      priority: 8
    },
    {
      tenant_id: 'chicago-mikes',
      question: 'Do you have vegetarian options?',
      answer: 'Yes, we have veggie burgers and you can order any of our sides like fries, onion rings, or mozzarella sticks.',
      category: 'menu',
      keywords: ['vegetarian', 'veggie', 'vegan', 'no meat'],
      priority: 7
    },
    {
      tenant_id: 'chicago-mikes',
      question: 'Can I make a reservation?',
      answer: 'We operate on a first-come, first-served basis and do not take reservations. However, you can call ahead to place a pickup order to skip the wait!',
      category: 'services',
      keywords: ['reservation', 'reserve', 'book', 'table'],
      priority: 6
    },
    {
      tenant_id: 'chicago-mikes',
      question: 'What payment methods do you accept?',
      answer: 'We accept cash, credit cards, debit cards, Apple Pay, and Google Pay.',
      category: 'policies',
      keywords: ['payment', 'pay', 'credit card', 'cash', 'apple pay'],
      priority: 6
    }
  ];

  const { error: knowledgeError } = await supabase
    .from('voice_agent_knowledge')
    .upsert(knowledgeEntries, {
      onConflict: 'id'
    });

  if (knowledgeError) {
    console.error('❌ Error inserting knowledge base:', knowledgeError);
  } else {
    console.log(`✅ Inserted ${knowledgeEntries.length} knowledge base entries`);
  }

  // Update tenant config to enable voice agent
  const { error: configError } = await supabase
    .from('tenant_config')
    .update({
      features: {
        voice_assistant: false,
        photo_booth: true,
        analytics: true,
        multi_location: false,
        custom_branding: true,
        ai_recommendations: true,
        loyalty_program: true,
        voice_agent_enabled: true // ⭐ Enable voice agent
      }
    })
    .eq('tenant_id', 'chicago-mikes');

  if (configError) {
    console.error('❌ Error updating tenant config:', configError);
  } else {
    console.log('✅ Enabled voice agent in tenant config');
  }

  console.log('\n🎉 Voice AI Agent setup complete!\n');
  console.log('Next steps:');
  console.log('1. Deploy the Supabase Edge Function:');
  console.log('   supabase functions deploy inbound-voice-handler');
  console.log('');
  console.log('2. Configure Twilio webhook (in Twilio console):');
  console.log('   Phone Number: +1 (720) 702-2122');
  console.log('   Webhook URL: https://xxwqmakcrchgefgzrulf.supabase.co/functions/v1/inbound-voice-handler');
  console.log('   Method: POST');
  console.log('');
  console.log('3. Test by calling: +1 (720) 702-2122');
  console.log('');
}

setupVoiceAgent().catch(console.error);
