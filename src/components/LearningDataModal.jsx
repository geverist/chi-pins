import React, { useMemo } from 'react';

/**
 * Modal displaying captured behavioral learning data
 * Shows counts and statistics for AI model training
 */
export default function LearningDataModal({ open, onClose, dataset = [] }) {
  // Calculate statistics from the dataset
  const stats = useMemo(() => {
    if (!dataset || dataset.length === 0) {
      return {
        total: 0,
        passing: 0,
        abandoned: 0,
        engaged: 0,
        avgDuration: 0,
        avgProximity: 0,
        totalFrames: 0,
      };
    }

    const passing = dataset.filter(s => s.outcome === 'passing').length;
    const abandoned = dataset.filter(s => s.outcome === 'abandoned').length;
    const engaged = dataset.filter(s => s.outcome === 'engaged').length;

    const totalFrames = dataset.reduce((sum, s) => sum + (s.frames?.length || 0), 0);
    const avgFrames = totalFrames / dataset.length;

    // Calculate average duration (in seconds)
    const durations = dataset.map(s => {
      if (!s.frames || s.frames.length < 2) return 0;
      const firstFrame = new Date(s.frames[0].timestamp);
      const lastFrame = new Date(s.frames[s.frames.length - 1].timestamp);
      return (lastFrame - firstFrame) / 1000; // convert to seconds
    });
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / dataset.length;

    // Calculate average proximity level
    const allProximityValues = dataset.flatMap(s =>
      (s.frames || []).map(f => f.proximity || 0)
    );
    const avgProximity = allProximityValues.length > 0
      ? allProximityValues.reduce((sum, p) => sum + p, 0) / allProximityValues.length
      : 0;

    return {
      total: dataset.length,
      passing,
      abandoned,
      engaged,
      avgDuration: avgDuration.toFixed(1),
      avgProximity: avgProximity.toFixed(1),
      totalFrames,
      avgFrames: avgFrames.toFixed(1),
    };
  }, [dataset]);

  // Calculate engagement rate
  const engagementRate = stats.total > 0
    ? ((stats.engaged / stats.total) * 100).toFixed(1)
    : 0;

  // Calculate conversion funnel
  const approachRate = stats.total > 0
    ? (((stats.abandoned + stats.engaged) / stats.total) * 100).toFixed(1)
    : 0;

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>🧠 Learning Data Insights</h2>
          <button onClick={onClose} style={styles.closeButton}>✕</button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Total Sessions */}
          <div style={styles.totalCard}>
            <div style={styles.totalLeft}>
              <div style={styles.totalIcon}>👥</div>
              <div>
                <div style={styles.totalNumber}>{stats.total}</div>
                <div style={styles.totalLabel}>Total Captured Moments</div>
              </div>
            </div>
            <div style={styles.totalRight}>
              <div style={styles.framesLabel}>{stats.totalFrames} frames</div>
              <div style={styles.framesSubLabel}>~{stats.avgFrames} frames/session</div>
            </div>
          </div>

          {/* Outcome Breakdown */}
          <div style={styles.outcomeGrid}>
            <div style={styles.outcomeCard}>
              <div style={styles.outcomeIcon}>🚶</div>
              <div style={styles.outcomeNumber}>{stats.passing}</div>
              <div style={styles.outcomeLabel}>Passing</div>
              <div style={styles.outcomeChip}>Brief walkby</div>
            </div>

            <div style={{...styles.outcomeCard, ...styles.abandonedCard}}>
              <div style={styles.outcomeIcon}>⚠️</div>
              <div style={styles.outcomeNumber}>{stats.abandoned}</div>
              <div style={styles.outcomeLabel}>Abandoned</div>
              <div style={styles.outcomeChip}>Approached, no touch</div>
            </div>

            <div style={{...styles.outcomeCard, ...styles.engagedCard}}>
              <div style={styles.outcomeIcon}>✨</div>
              <div style={styles.outcomeNumber}>{stats.engaged}</div>
              <div style={styles.outcomeLabel}>Engaged</div>
              <div style={styles.outcomeChip}>Touched screen</div>
            </div>
          </div>

          {/* AI Insights */}
          <div style={styles.sectionTitle}>AI Model Training Data</div>

          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Engagement Rate</div>
              <div style={styles.metricValue}>{engagementRate}%</div>
              <div style={styles.metricSub}>{stats.engaged} of {stats.total} sessions</div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>Approach Rate</div>
              <div style={styles.metricValue}>{approachRate}%</div>
              <div style={styles.metricSub}>{stats.abandoned + stats.engaged} of {stats.total} sessions</div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>⏱️ Avg Duration</div>
              <div style={styles.metricValue}>{stats.avgDuration}s</div>
            </div>

            <div style={styles.metricCard}>
              <div style={styles.metricLabel}>📍 Avg Proximity</div>
              <div style={styles.metricValue}>{stats.avgProximity}%</div>
            </div>
          </div>

          {/* Action Triggers */}
          <div style={styles.sectionTitle}>AI Action Triggers</div>

          <div style={styles.triggerCard}>
            <div style={styles.triggerLabel}>🎵 Ambient Music</div>
            <div style={styles.triggerDesc}>Triggered on any proximity detection (all sessions)</div>
          </div>

          <div style={{...styles.triggerCard, ...styles.triggerWarning}}>
            <div style={styles.triggerLabel}>🗣️ TTS Greeting</div>
            <div style={styles.triggerDesc}>Triggered when person approaches and lingers (abandoned + engaged sessions)</div>
          </div>

          <div style={{...styles.triggerCard, ...styles.triggerInfo}}>
            <div style={styles.triggerLabel}>✨ Full Engagement</div>
            <div style={styles.triggerDesc}>User touches screen and interacts with kiosk (engaged sessions only)</div>
          </div>

          {stats.total === 0 && (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📊</div>
              <div style={styles.emptyText}>
                No learning data captured yet. The system will automatically collect behavioral data as people interact with the kiosk.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  modal: {
    background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)',
    borderRadius: 16,
    width: '90%',
    maxWidth: 800,
    maxHeight: '90vh',
    overflow: 'hidden',
    border: '1px solid rgba(96, 165, 250, 0.2)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  title: {
    margin: 0,
    color: '#60a5fa',
    fontSize: 24,
    fontWeight: 600,
  },
  closeButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    borderRadius: 8,
    color: 'white',
    fontSize: 24,
    width: 40,
    height: 40,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 24,
    overflowY: 'auto',
    maxHeight: 'calc(90vh - 80px)',
  },
  totalCard: {
    background: 'rgba(96, 165, 250, 0.1)',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  totalIcon: {
    fontSize: 40,
  },
  totalNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#60a5fa',
  },
  totalLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  totalRight: {
    textAlign: 'right',
  },
  framesLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  framesSubLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  outcomeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    marginBottom: 24,
  },
  outcomeCard: {
    background: 'rgba(156, 163, 175, 0.1)',
    border: '1px solid rgba(156, 163, 175, 0.3)',
    borderRadius: 12,
    padding: 20,
    textAlign: 'center',
  },
  abandonedCard: {
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid rgba(251, 191, 36, 0.3)',
  },
  engagedCard: {
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
  },
  outcomeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  outcomeNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  outcomeLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginBottom: 8,
  },
  outcomeChip: {
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: '4px 12px',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    display: 'inline-block',
  },
  sectionTitle: {
    color: '#60a5fa',
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 16,
    marginTop: 8,
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    marginBottom: 24,
  },
  metricCard: {
    background: 'rgba(96, 165, 250, 0.05)',
    border: '1px solid rgba(96, 165, 250, 0.2)',
    borderRadius: 8,
    padding: 16,
    textAlign: 'center',
  },
  metricLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 8,
  },
  metricValue: {
    color: '#60a5fa',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricSub: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
  },
  triggerCard: {
    background: 'rgba(34, 197, 94, 0.05)',
    border: '1px solid rgba(34, 197, 94, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  triggerWarning: {
    background: 'rgba(251, 191, 36, 0.05)',
    border: '1px solid rgba(251, 191, 36, 0.2)',
  },
  triggerInfo: {
    background: 'rgba(96, 165, 250, 0.05)',
    border: '1px solid rgba(96, 165, 250, 0.2)',
  },
  triggerLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 4,
  },
  triggerDesc: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
  },
  emptyState: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 24,
    textAlign: 'center',
    marginTop: 20,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
};
