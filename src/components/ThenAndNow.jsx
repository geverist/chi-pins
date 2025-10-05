// src/components/ThenAndNow.jsx
import { useState } from 'react';
import { useThenAndNow } from '../state/useThenAndNow';

export default function ThenAndNow({ onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  // Load comparisons from database
  const { comparisons: dbComparisons, loading, error } = useThenAndNow();

  // Transform database format to component format
  const comparisons = dbComparisons.map(item => ({
    id: item.id,
    location: item.location,
    then: {
      year: item.then_year,
      description: item.then_description,
      url: item.then_image_url,
    },
    now: {
      year: item.now_year,
      description: item.now_description,
      url: item.now_image_url,
    },
  }));

  // Fallback data if database is empty or loading
  const fallbackComparisons = [
    {
      id: 1,
      location: 'State Street',
      then: {
        year: '1907',
        description: 'State Street looking north from Adams',
        // Placeholder - in production, use actual historical photos
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&auto=format&fit=crop',
      },
      now: {
        year: '2024',
        description: 'Modern State Street with theaters and shops',
        url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&auto=format&fit=crop',
      },
    },
    {
      id: 2,
      location: 'Michigan Avenue Bridge',
      then: {
        year: '1920',
        description: 'Michigan Avenue Bridge under construction',
        url: 'https://images.unsplash.com/photo-1518481852452-9415b262eba4?w=800&auto=format&fit=crop',
      },
      now: {
        year: '2024',
        description: 'Magnificent Mile with modern skyline',
        url: 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=800&auto=format&fit=crop',
      },
    },
    {
      id: 3,
      location: 'Union Station',
      then: {
        year: '1925',
        description: 'Union Station Great Hall opening',
        url: 'https://images.unsplash.com/photo-1570284613060-766c33850e00?w=800&auto=format&fit=crop',
      },
      now: {
        year: '2024',
        description: 'Restored Great Hall serves modern commuters',
        url: 'https://images.unsplash.com/photo-1567942712661-23920c27df3f?w=800&auto=format&fit=crop',
      },
    },
    {
      id: 4,
      location: 'Wrigley Field',
      then: {
        year: '1914',
        description: 'Weeghman Park (original name)',
        url: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&auto=format&fit=crop',
      },
      now: {
        year: '2024',
        description: 'Historic Wrigley Field, home of the Cubs',
        url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop',
      },
    },
    {
      id: 5,
      location: 'Navy Pier',
      then: {
        year: '1916',
        description: 'Municipal Pier opens to public',
        url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&auto=format&fit=crop',
      },
      now: {
        year: '2024',
        description: 'Navy Pier entertainment destination',
        url: 'https://images.unsplash.com/photo-1518737648736-c7ced79fa7d8?w=800&auto=format&fit=crop',
      },
    },
  ];

  // Use database comparisons if available, otherwise use fallback
  const displayComparisons = comparisons.length > 0 ? comparisons : fallbackComparisons;
  const current = displayComparisons[currentIndex];

  // Show loading state
  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(0,0,0,0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#fff', fontSize: 18 }}>Loading historical photos...</div>
      </div>
    );
  }

  const handleSliderChange = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX || e.touches?.[0]?.clientX;
    if (x) {
      const position = ((x - rect.left) / rect.width) * 100;
      setSliderPosition(Math.max(0, Math.min(100, position)));
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      handleSliderChange(e);
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging) {
      e.preventDefault(); // Prevent scrolling and default touch behavior
      handleSliderChange(e);
    }
  };

  const nextComparison = () => {
    setCurrentIndex((prev) => (prev + 1) % displayComparisons.length);
    setSliderPosition(50);
  };

  const prevComparison = () => {
    setCurrentIndex((prev) => (prev - 1 + displayComparisons.length) % displayComparisons.length);
    setSliderPosition(50);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      onMouseUp={() => setIsDragging(false)}
      onTouchEnd={() => setIsDragging(false)}
    >
      {/* Header */}
      <div
        style={{
          position: 'absolute',
          top: 20,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 20px',
          zIndex: 10,
        }}
      >
        <h2 style={{ color: '#f4f6f8', fontSize: 28, margin: 0 }}>
          🏛️ Chicago: Then & Now
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(239,68,68,0.2)',
            border: '1px solid rgba(239,68,68,0.5)',
            borderRadius: 12,
            padding: '12px 24px',
            color: '#fff',
            fontSize: 18,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ✕ Close
        </button>
      </div>

      {/* Main Content */}
      <div
        style={{
          marginTop: 80,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          maxWidth: 1200,
          width: '100%',
        }}
      >
        {/* Location Title */}
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ color: '#f4f6f8', fontSize: 32, margin: '0 0 8px 0' }}>
            {current.location}
          </h3>
          <div style={{ color: '#a7b0b8', fontSize: 16 }}>
            {currentIndex + 1} of {displayComparisons.length}
          </div>
        </div>

        {/* Image Comparison Slider */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 900,
            aspectRatio: '16/10',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            cursor: 'ew-resize',
            userSelect: 'none',
          }}
          onMouseDown={(e) => {
            setIsDragging(true);
            handleSliderChange(e);
          }}
          onTouchStart={(e) => {
            e.preventDefault(); // Prevent default touch behavior
            setIsDragging(true);
            handleSliderChange(e);
          }}
        >
          {/* NOW Image (bottom layer) */}
          <img
            src={current.now.url}
            alt={`${current.location} - ${current.now.year}`}
            draggable={false}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              pointerEvents: 'none',
              userSelect: 'none',
              WebkitUserDrag: 'none',
            }}
          />

          {/* THEN Image (top layer with clip) */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
              transition: isDragging ? 'none' : 'clip-path 0.1s ease',
              pointerEvents: 'none',
            }}
          >
            <img
              src={current.then.url}
              alt={`${current.location} - ${current.then.year}`}
              draggable={false}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                pointerEvents: 'none',
                userSelect: 'none',
                WebkitUserDrag: 'none',
              }}
            />
          </div>

          {/* Slider Handle */}
          <div
            style={{
              position: 'absolute',
              left: `${sliderPosition}%`,
              top: 0,
              bottom: 0,
              width: 4,
              background: '#fff',
              transform: 'translateX(-50%)',
              boxShadow: '0 0 16px rgba(0,0,0,0.5)',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: '#fff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
              }}
            >
              ⇔
            </div>
          </div>

          {/* Labels */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              left: 20,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              padding: '8px 16px',
              borderRadius: 8,
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {current.then.year}
          </div>
          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(4px)',
              padding: '8px 16px',
              borderRadius: 8,
              color: '#fff',
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {current.now.year}
          </div>
        </div>

        {/* Descriptions */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
            width: '100%',
            maxWidth: 900,
          }}
        >
          <div
            style={{
              background: 'rgba(139,92,246,0.2)',
              border: '1px solid rgba(139,92,246,0.4)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ color: '#c4b5fd', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              THEN
            </div>
            <div style={{ color: '#f4f6f8', fontSize: 14 }}>{current.then.description}</div>
          </div>
          <div
            style={{
              background: 'rgba(59,130,246,0.2)',
              border: '1px solid rgba(59,130,246,0.4)',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <div style={{ color: '#93c5fd', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              NOW
            </div>
            <div style={{ color: '#f4f6f8', fontSize: 14 }}>{current.now.description}</div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            onClick={prevComparison}
            style={{
              padding: '16px 32px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 12,
              color: '#fff',
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ← Previous
          </button>
          <button
            onClick={nextComparison}
            style={{
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: 12,
              color: '#fff',
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Next →
          </button>
        </div>

        {/* Instruction */}
        <div
          style={{
            color: '#a7b0b8',
            fontSize: 14,
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          💡 Click and drag the slider to compare then and now
        </div>
      </div>
    </div>
  );
}
