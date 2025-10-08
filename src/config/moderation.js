// src/config/moderation.js
// Content moderation for comments banner

// Default prohibited keywords (can be customized in admin panel)
export const DEFAULT_PROHIBITED_KEYWORDS = [
  // Profanity
  'fuck', 'shit', 'damn', 'hell', 'ass', 'bitch',
  // Offensive terms
  'hate', 'racist', 'nazi',
  // Spam indicators
  'click here', 'buy now', 'limited offer',
];

/**
 * Check if text contains prohibited keywords
 */
export function containsProhibitedContent(text, customKeywords = []) {
  if (!text) return false;

  const keywords = [...DEFAULT_PROHIBITED_KEYWORDS, ...customKeywords];
  const lowerText = text.toLowerCase();

  return keywords.some(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    // Match whole words or as part of words
    return lowerText.includes(lowerKeyword);
  });
}

/**
 * Filter comments to remove prohibited content
 */
export function filterComments(comments, customKeywords = []) {
  if (!comments || !Array.isArray(comments)) return [];

  return comments.filter(comment => {
    // Check note/comment field
    if (comment.note && containsProhibitedContent(comment.note, customKeywords)) {
      return false;
    }

    // Check name field
    if (comment.name && containsProhibitedContent(comment.name, customKeywords)) {
      return false;
    }

    return true;
  });
}

/**
 * Get random subset of comments
 */
export function getRandomComments(comments, count = 20) {
  if (!comments || comments.length === 0) return [];

  // Shuffle array
  const shuffled = [...comments].sort(() => Math.random() - 0.5);

  // Return requested count
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
