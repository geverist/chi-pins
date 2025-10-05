// src/components/AnalyticsDashboard.jsx
import { useState } from 'react';
import { useAnalyticsData } from '../hooks/useAnalyticsData';
import WordCloud from './WordCloud';

export default function AnalyticsDashboard({ locationId = null }) {
  const [dateRange, setDateRange] = useState(30);
  const { loading, error, metrics, wordCloud, popularItems, dailyStats } = useAnalyticsData(locationId, dateRange);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 20px',
        color: '#9ca3af'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: 16 }}>Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: 20,
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 8,
        color: '#fca5a5'
      }}>
        Error loading analytics: {error}
      </div>
    );
  }

  const MetricCard = ({ title, value, subtitle, icon, color = '#3b82f6' }) => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: `${color}20`,
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 12,
            color: '#9ca3af',
            fontWeight: 600,
            marginBottom: 4
          }}>
            {title}
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            color: '#f3f4f6'
          }}>
            {value}
          </div>
          {subtitle && (
            <div style={{
              fontSize: 12,
              color: '#6b7280',
              marginTop: 4
            }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const Card = ({ title, children, action }) => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: 12,
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 600,
          color: '#f3f4f6'
        }}>
          {title}
        </h3>
        {action}
      </div>
      <div style={{ padding: 20 }}>
        {children}
      </div>
    </div>
  );

  const gamesByType = popularItems.filter(item => item.item_type === 'game');
  const songsByPopularity = popularItems.filter(item => item.item_type === 'song');

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Header with Date Range Selector */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: '#f3f4f6'
          }}>
            📊 Analytics Dashboard
          </h2>
          <p style={{
            margin: '4px 0 0',
            fontSize: 14,
            color: '#9ca3af'
          }}>
            Insights and metrics for your kiosk
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[7, 30, 90].map(days => (
            <button
              key={days}
              onClick={() => setDateRange(days)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: dateRange === days ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                background: dateRange === days ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                color: dateRange === days ? '#93c5fd' : '#9ca3af',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {days} days
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16
      }}>
        <MetricCard
          title="Total Interactions"
          value={metrics?.totalEvents || 0}
          subtitle={`${metrics?.avgEventsPerSession || 0} per session`}
          icon="🎯"
          color="#3b82f6"
        />
        <MetricCard
          title="Unique Users"
          value={metrics?.uniqueUsers || 0}
          subtitle="sessions tracked"
          icon="👥"
          color="#8b5cf6"
        />
        <MetricCard
          title="Pins Created"
          value={metrics?.pinsCreated || 0}
          subtitle="community contributions"
          icon="📍"
          color="#ef4444"
        />
        <MetricCard
          title="Games Played"
          value={metrics?.gamesPlayed || 0}
          subtitle="total game sessions"
          icon="🎮"
          color="#f59e0b"
        />
        <MetricCard
          title="Photos Taken"
          value={metrics?.photosToken || 0}
          subtitle="photo booth usage"
          icon="📸"
          color="#10b981"
        />
        <MetricCard
          title="Jukebox Plays"
          value={metrics?.jukeboxPlays || 0}
          subtitle="songs played"
          icon="🎵"
          color="#ec4899"
        />
      </div>

      {/* Word Cloud */}
      <Card title="📝 Popular Words & Phrases">
        <WordCloud words={wordCloud} maxWords={40} minFontSize={14} maxFontSize={48} />
        {wordCloud.length > 0 && (
          <div style={{
            marginTop: 16,
            padding: 12,
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 8,
            fontSize: 12,
            color: '#93c5fd'
          }}>
            💡 Words extracted from pin messages and comments. Size indicates frequency.
          </div>
        )}
      </Card>

      {/* Popular Games & Songs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 16
      }}>
        {/* Popular Games */}
        <Card title="🎮 Most Played Games">
          {gamesByType.length === 0 ? (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>
              No game data yet
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {gamesByType.map((game, index) => (
                <div
                  key={game.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: 8
                  }}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: `hsl(${220 - index * 30}, 70%, 50%)`,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#f3f4f6'
                    }}>
                      {game.item_name}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#3b82f6'
                  }}>
                    {game.interaction_count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Popular Songs */}
        <Card title="🎵 Top Jukebox Tracks">
          {songsByPopularity.length === 0 ? (
            <div style={{ color: '#6b7280', textAlign: 'center', padding: '20px 0' }}>
              No song data yet
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {songsByPopularity.map((song, index) => (
                <div
                  key={song.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: 8
                  }}
                >
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: `hsl(${300 - index * 30}, 70%, 50%)`,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: '#f3f4f6'
                    }}>
                      {song.item_name}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#ec4899'
                  }}>
                    {song.interaction_count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Daily Activity Chart (Simple Bar Chart) */}
      {dailyStats.length > 0 && (
        <Card title="📈 Daily Activity">
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 4,
            height: 200,
            padding: '0 8px'
          }}>
            {dailyStats.map((day, index) => {
              const maxValue = Math.max(...dailyStats.map(d => d.total_sessions || 0));
              const height = maxValue > 0 ? (day.total_sessions / maxValue) * 100 : 0;

              return (
                <div
                  key={day.date}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${height}%`,
                      minHeight: height > 0 ? 4 : 0,
                      background: `linear-gradient(180deg, #3b82f6, #2563eb)`,
                      borderRadius: '4px 4px 0 0',
                      transition: 'all 0.3s',
                      cursor: 'pointer'
                    }}
                    title={`${day.date}: ${day.total_sessions} sessions`}
                  />
                  <div style={{
                    fontSize: 10,
                    color: '#6b7280',
                    transform: 'rotate(-45deg)',
                    transformOrigin: 'center',
                    whiteSpace: 'nowrap',
                    marginTop: 20
                  }}>
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
