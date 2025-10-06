// Feature Gate Component - Wraps features that require subscription access
import { useState, useEffect } from 'react'
import { checkFeatureAccess, getUpgradeMessage } from '../lib/featureGate'

export default function FeatureGate({ userId, featureId, children, fallback }) {
  const [access, setAccess] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAccess()
  }, [userId, featureId])

  const checkAccess = async () => {
    setLoading(true)
    try {
      const result = await checkFeatureAccess(userId, featureId)
      setAccess(result)
    } catch (error) {
      console.error('Error checking feature access:', error)
      setAccess({ allowed: false, reason: 'Error checking access' })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        Loading...
      </div>
    )
  }

  if (!access?.allowed) {
    // If custom fallback provided, use it
    if (fallback) {
      return fallback
    }

    // Otherwise, show upgrade prompt
    const upgradeMessage = getUpgradeMessage(access, featureId)

    return (
      <div style={styles.upgradePrompt}>
        <div style={styles.lockIcon}>🔒</div>
        <h3 style={styles.upgradeTitle}>{upgradeMessage.title}</h3>
        <p style={styles.upgradeMessage}>{upgradeMessage.message}</p>
        {upgradeMessage.action && (
          <a
            href={upgradeMessage.ctaUrl}
            style={styles.upgradeButton}
          >
            {upgradeMessage.action}
          </a>
        )}
      </div>
    )
  }

  // Access granted - render children
  return <>{children}</>
}

const styles = {
  loading: {
    padding: '40px',
    textAlign: 'center',
    color: '#6b7280',
  },
  upgradePrompt: {
    background: 'linear-gradient(135deg, #f9fafb 0%, #eff6ff 100%)',
    border: '2px solid #bfdbfe',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    maxWidth: '500px',
    margin: '40px auto',
  },
  lockIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  upgradeTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '12px',
  },
  upgradeMessage: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
    lineHeight: '1.6',
  },
  upgradeButton: {
    display: 'inline-block',
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: 700,
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    textDecoration: 'none',
    cursor: 'pointer',
  },
}

// Alternative: Inline feature gate (returns boolean and message)
export function useFeatureAccess(userId, featureId) {
  const [access, setAccess] = useState({ allowed: false, loading: true })

  useEffect(() => {
    let mounted = true

    async function check() {
      try {
        const result = await checkFeatureAccess(userId, featureId)
        if (mounted) {
          setAccess({ ...result, loading: false })
        }
      } catch (error) {
        console.error('Error checking feature access:', error)
        if (mounted) {
          setAccess({ allowed: false, loading: false, reason: 'Error checking access' })
        }
      }
    }

    check()

    return () => {
      mounted = false
    }
  }, [userId, featureId])

  return access
}
