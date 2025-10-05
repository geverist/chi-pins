// src/components/WordCloud.jsx
import { useMemo } from 'react';

export default function WordCloud({ words, maxWords = 50, minFontSize = 12, maxFontSize = 48 }) {
  const processedWords = useMemo(() => {
    if (!words || words.length === 0) return [];

    // Sort by count and take top words
    const topWords = [...words]
      .sort((a, b) => b.count - a.count)
      .slice(0, maxWords);

    // Find min and max counts for scaling
    const counts = topWords.map(w => w.count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);

    // Calculate font sizes
    return topWords.map((word, index) => {
      const scale = maxCount === minCount ? 1 :
        (word.count - minCount) / (maxCount - minCount);
      const fontSize = minFontSize + (scale * (maxFontSize - minFontSize));

      // Color based on frequency (gradient from blue to purple to pink)
      const hue = 240 - (scale * 60); // 240 (blue) to 180 (purple/pink)
      const saturation = 70 + (scale * 20);
      const lightness = 60 - (scale * 20);

      return {
        ...word,
        fontSize: Math.round(fontSize),
        color: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
        opacity: 0.7 + (scale * 0.3)
      };
    });
  }, [words, maxWords, minFontSize, maxFontSize]);

  if (processedWords.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 300,
        color: '#6b7280',
        fontSize: 14
      }}>
        No word data available
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 12,
      padding: 20,
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: 300
    }}>
      {processedWords.map((word, index) => (
        <div
          key={`${word.word}-${index}`}
          style={{
            fontSize: word.fontSize,
            fontWeight: word.fontSize > 30 ? 700 : word.fontSize > 20 ? 600 : 500,
            color: word.color,
            opacity: word.opacity,
            cursor: 'default',
            userSelect: 'none',
            transition: 'all 0.3s ease',
            padding: '4px 8px',
            borderRadius: 6,
            display: 'inline-block'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.opacity = word.opacity.toString();
          }}
          title={`${word.word}: ${word.count} occurrences`}
        >
          {word.word}
        </div>
      ))}
    </div>
  );
}
