// src/components/AdminLogin.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mode, setMode] = useState('login') // 'login' or 'signup'

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      onLoginSuccess(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'business_owner'
          }
        }
      })

      if (error) throw error

      if (data.user && !data.session) {
        setError('Please check your email to confirm your account.')
      } else {
        onLoginSuccess(data.user)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`
        }
      })

      if (error) throw error

      setError('Check your email for a login link!')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <div style={styles.header}>
          <h1 style={styles.title}>EngageOS™ Admin</h1>
          <p style={styles.subtitle}>
            {mode === 'login' ? 'Sign in to manage your kiosk' : 'Create your business account'}
          </p>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleSignup} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              required
              minLength={6}
            />
            {mode === 'signup' && (
              <small style={styles.hint}>Minimum 6 characters</small>
            )}
          </div>

          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Please wait...' : mode === 'login' ? '🔓 Sign In' : '🚀 Create Account'}
          </button>

          <div style={styles.divider}>
            <span style={styles.dividerText}>or</span>
          </div>

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={loading || !email}
            style={styles.magicLinkButton}
          >
            📧 Email me a login link
          </button>

          <div style={styles.divider}>
            <span style={styles.dividerText}>or</span>
          </div>

          <button
            type="button"
            onClick={() => window.location.href = '/?demo=true'}
            style={styles.demoButton}
          >
            🎮 Try Demo First (No Signup Required)
          </button>

          <div style={styles.footer}>
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  style={styles.link}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  style={styles.link}
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>

        <div style={styles.help}>
          <p style={styles.helpText}>
            Need help? Contact support at{' '}
            <a href="mailto:hello@agentiosk.com" style={styles.helpLink}>
              hello@agentiosk.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  loginBox: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '440px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    padding: '12px 16px',
    fontSize: '14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  hint: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '-4px',
  },
  button: {
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  magicLinkButton: {
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#667eea',
    background: 'white',
    border: '2px solid #667eea',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  divider: {
    position: 'relative',
    textAlign: 'center',
    margin: '8px 0',
  },
  dividerText: {
    background: 'white',
    padding: '0 12px',
    color: '#9ca3af',
    fontSize: '12px',
    position: 'relative',
    zIndex: 1,
  },
  error: {
    padding: '12px 16px',
    background: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    border: '1px solid #fecaca',
  },
  footer: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '8px',
  },
  link: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  help: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
    textAlign: 'center',
  },
  helpText: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
  },
  helpLink: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: 600,
  },
  demoButton: {
    padding: '14px',
    fontSize: '14px',
    fontWeight: 700,
    color: '#10b981',
    background: 'white',
    border: '2px solid #10b981',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
}
