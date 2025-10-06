// src/components/AdminRoute.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import AdminLogin from './AdminLogin'
import SetupWizard from './SetupWizard'

export default function AdminRoute({ children }) {
  const [user, setUser] = useState(null)
  const [businessConfig, setBusinessConfig] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadBusinessConfig(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadBusinessConfig(session.user.id)
      } else {
        setBusinessConfig(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadBusinessConfig = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('business_config')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setBusinessConfig(data || null)
    } catch (err) {
      console.error('Error loading business config:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser)
    loadBusinessConfig(loggedInUser.id)
  }

  const handleWizardComplete = (config) => {
    setBusinessConfig({
      ...config,
      setup_completed: true
    })
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setBusinessConfig(null)
  }

  // Show loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTopColor: 'white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p style={{ fontSize: '14px', opacity: 0.9 }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  // Show login if not authenticated
  if (!user) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />
  }

  // Show setup wizard if first time
  if (!businessConfig || !businessConfig.setup_completed) {
    return <SetupWizard user={user} onComplete={handleWizardComplete} />
  }

  // Show admin panel with logout button
  return (
    <div>
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#1a1f26' }}>
            {businessConfig.business_name}
          </span>
          <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '12px' }}>
            Admin Panel
          </span>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#6b7280',
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>
      {children}
    </div>
  )
}
