// src/components/NewsTicker.jsx
import { useState, useEffect } from 'react';

export default function NewsTicker({ enabled = false, feedUrl = '' }) {
  const [newsItems, setNewsItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !feedUrl) {
      setLoading(false);
      return;
    }

    fetchNews();
    const interval = setInterval(fetchNews, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [enabled, feedUrl]);

  const fetchNews = async () => {
    if (!feedUrl) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/rss-feed?url=${encodeURIComponent(feedUrl)}`);
      if (!response.ok) throw new Error('Failed to fetch news');

      const data = await response.json();
      setNewsItems(data.items || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch news:', err);
      setError(err.message);
      setNewsItems([]);
    } finally {
      setLoading(false);
    }
  };

  if (!enabled || !feedUrl) return null;
  if (loading && newsItems.length === 0) return null;
  if (error || newsItems.length === 0) return null;

  return (
    <div
      style={{
        position: 'relative',
        left: 0,
        right: 0,
        height: 40,
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)',
        borderBottom: '2px solid #3b82f6',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          animation: 'scroll-left 60s linear infinite',
          whiteSpace: 'nowrap',
        }}
      >
        {/* Duplicate items to create seamless loop */}
        {[...newsItems, ...newsItems].map((item, index) => (
          <div
            key={`${item.title}-${index}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0 40px',
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#3b82f6',
                marginRight: 12,
                flexShrink: 0,
              }}
            />
            <span style={{ fontWeight: 600, marginRight: 8 }}>📰</span>
            {item.title}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
