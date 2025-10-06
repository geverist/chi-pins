// src/components/LocalRecommendations.jsx
import { useState } from 'react';

export default function LocalRecommendations({ onClose }) {
  const [category, setCategory] = useState('all');

  const recommendations = {
    restaurants: [
      { name: "Chicago Mike's Beef & Dogs", type: 'American', distance: '0.3 mi', rating: 4.8 },
      { name: 'Lou Malnati\'s Pizzeria', type: 'Pizza', distance: '0.5 mi', rating: 4.7 },
      { name: 'Girl & the Goat', type: 'American', distance: '0.8 mi', rating: 4.9 },
      { name: 'RPM Italian', type: 'Italian', distance: '1.0 mi', rating: 4.6 },
    ],
    attractions: [
      { name: 'Millennium Park', type: 'Park', distance: '0.6 mi', rating: 4.8 },
      { name: 'Navy Pier', type: 'Entertainment', distance: '1.2 mi', rating: 4.5 },
      { name: 'Art Institute of Chicago', type: 'Museum', distance: '0.7 mi', rating: 4.9 },
      { name: 'Willis Tower Skydeck', type: 'Landmark', distance: '0.9 mi', rating: 4.7 },
    ],
    shopping: [
      { name: 'Magnificent Mile', type: 'Shopping District', distance: '0.8 mi', rating: 4.7 },
      { name: 'Water Tower Place', type: 'Mall', distance: '0.9 mi', rating: 4.5 },
      { name: 'State Street', type: 'Shopping', distance: '0.5 mi', rating: 4.6 },
    ],
  };

  const getFilteredRecommendations = () => {
    if (category === 'all') {
      return [
        ...recommendations.restaurants,
        ...recommendations.attractions,
        ...recommendations.shopping,
      ];
    }
    return recommendations[category] || [];
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 900,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: 30,
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: '#ef4444',
            border: 'none',
            borderRadius: 6,
            color: 'white',
            padding: '10px 16px',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          ✕ Close
        </button>

        <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 28 }}>
          🗺️ Local Recommendations
        </h2>
        <p style={{ color: '#9ca3af', marginBottom: 20 }}>
          Discover the best restaurants, attractions, and shopping nearby
        </p>

        {/* Category Filter */}
        <div style={{ marginBottom: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['all', 'restaurants', 'attractions', 'shopping'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: category === cat ? '2px solid #3b82f6' : '1px solid #2a2f37',
                background: category === cat ? '#1e3a8a' : '#16181d',
                color: category === cat ? '#60a5fa' : '#e9eef3',
                cursor: 'pointer',
                fontSize: 15,
                fontWeight: category === cat ? 600 : 400,
                textTransform: 'capitalize',
              }}
            >
              {cat === 'all' ? '🌟 All' : cat === 'restaurants' ? '🍽️ Dining' : cat === 'attractions' ? '🎭 Attractions' : '🛍️ Shopping'}
            </button>
          ))}
        </div>

        {/* Recommendations List */}
        <div style={{ display: 'grid', gap: 16 }}>
          {getFilteredRecommendations().map((item, index) => (
            <div
              key={index}
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.02))',
                border: '1px solid #2a2f37',
                borderRadius: 12,
                padding: 20,
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 16,
                alignItems: 'center',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#2a2f37';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div>
                <h3 style={{ margin: 0, marginBottom: 6, fontSize: 20, color: '#e9eef3' }}>
                  {item.name}
                </h3>
                <div style={{ display: 'flex', gap: 16, color: '#9ca3af', fontSize: 14 }}>
                  <span>📍 {item.distance}</span>
                  <span>⭐ {item.rating}</span>
                  <span style={{ color: '#60a5fa' }}>{item.type}</span>
                </div>
              </div>
              <button
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                Get Directions
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
