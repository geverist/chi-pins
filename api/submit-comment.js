// api/submit-comment.js
// Vercel serverless function to handle customer comments/feedback

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Database not configured' });
  }

  try {
    const { name, contact, contactType, comment, rating, timestamp } = req.body;

    // Validate required fields
    if (!comment || !rating) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['comment', 'rating']
      });
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Insert comment into database
    const { data, error } = await supabase
      .from('customer_feedback')
      .insert([
        {
          name: name || 'Anonymous',
          contact: contact || null,
          contact_type: contactType || null,
          comment: comment,
          rating: rating,
          created_at: timestamp || new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw new Error(error.message || 'Failed to save comment');
    }

    // Optionally send notification to business owner
    // (You can add Twilio SMS or email notification here if needed)

    return res.status(200).json({
      success: true,
      comment: data,
    });

  } catch (error) {
    console.error('Error submitting comment:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
