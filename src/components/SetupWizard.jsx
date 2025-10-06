// src/components/SetupWizard.jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function SetupWizard({ user, onComplete }) {
  const [step, setStep] = useState(1)
  const [businessInfo, setBusinessInfo] = useState({
    businessName: '',
    industry: 'restaurant',
    primaryColor: '#667eea',
    locations: 1,
    phoneNumber: '',
  })
  const [loading, setLoading] = useState(false)

  const industries = [
    { id: 'restaurant', name: '🍔 Restaurant & QSR', color: '#ef4444' },
    { id: 'medspa', name: '💆 Med Spa & Wellness', color: '#ec4899' },
    { id: 'auto', name: '🚗 Auto Dealership', color: '#f97316' },
    { id: 'healthcare', name: '💊 Healthcare & Dental', color: '#3b82f6' },
    { id: 'fitness', name: '💪 Fitness Center', color: '#10b981' },
    { id: 'retail', name: '🛍️ Retail Store', color: '#8b5cf6' },
    { id: 'banking', name: '🏦 Bank / Credit Union', color: '#06b6d4' },
    { id: 'hospitality', name: '🏨 Hotel / Airbnb', color: '#0ea5e9' },
    { id: 'events', name: '🎉 Events & Weddings', color: '#8b5cf6' },
  ]

  const handleIndustrySelect = (industry) => {
    const selected = industries.find(i => i.id === industry.id)
    setBusinessInfo({
      ...businessInfo,
      industry: industry.id,
      primaryColor: selected.color
    })
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      // Save business configuration to Supabase
      const { error } = await supabase
        .from('business_config')
        .upsert({
          user_id: user.id,
          business_name: businessInfo.businessName,
          industry: businessInfo.industry,
          primary_color: businessInfo.primaryColor,
          locations: businessInfo.locations,
          phone_number: businessInfo.phoneNumber,
          setup_completed: true,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      onComplete(businessInfo)
    } catch (err) {
      alert('Error saving configuration: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <h2 style={styles.stepTitle}>👋 Welcome to EngageOS!</h2>
              <p style={styles.stepDescription}>
                Let's get your kiosk set up in just a few minutes. We'll walk you through everything step by step.
              </p>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>What's your business name?</label>
              <input
                type="text"
                value={businessInfo.businessName}
                onChange={(e) => setBusinessInfo({ ...businessInfo, businessName: e.target.value })}
                placeholder="Chicago Mike's Hot Dogs"
                style={styles.input}
                autoFocus
              />
              <small style={styles.hint}>This will appear on your kiosk welcome screen</small>
            </div>

            <div style={styles.navigation}>
              <button
                onClick={() => setStep(2)}
                disabled={!businessInfo.businessName}
                style={{
                  ...styles.nextButton,
                  opacity: !businessInfo.businessName ? 0.5 : 1
                }}
              >
                Next: Choose Your Industry →
              </button>
            </div>
          </div>
        )

      case 2:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <h2 style={styles.stepTitle}>🏪 What industry are you in?</h2>
              <p style={styles.stepDescription}>
                We'll customize your kiosk with features perfect for your industry
              </p>
            </div>

            <div style={styles.industryGrid}>
              {industries.map((industry) => (
                <button
                  key={industry.id}
                  onClick={() => handleIndustrySelect(industry)}
                  style={{
                    ...styles.industryCard,
                    background: businessInfo.industry === industry.id
                      ? `linear-gradient(135deg, ${industry.color}20 0%, ${industry.color}10 100%)`
                      : 'white',
                    border: businessInfo.industry === industry.id
                      ? `3px solid ${industry.color}`
                      : '2px solid #e5e7eb',
                  }}
                >
                  <span style={{ fontSize: '24px', marginBottom: '8px' }}>
                    {industry.name.split(' ')[0]}
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>
                    {industry.name.substring(industry.name.indexOf(' ') + 1)}
                  </span>
                </button>
              ))}
            </div>

            <div style={styles.navigation}>
              <button onClick={() => setStep(1)} style={styles.backButton}>
                ← Back
              </button>
              <button onClick={() => setStep(3)} style={styles.nextButton}>
                Next: Brand Colors →
              </button>
            </div>
          </div>
        )

      case 3:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <h2 style={styles.stepTitle}>🎨 Choose Your Brand Color</h2>
              <p style={styles.stepDescription}>
                This color will be used throughout your kiosk to match your brand
              </p>
            </div>

            <div style={styles.colorPreview}>
              <div style={{
                ...styles.previewBox,
                background: `linear-gradient(135deg, ${businessInfo.primaryColor} 0%, ${businessInfo.primaryColor}dd 100%)`
              }}>
                <h3 style={{ color: 'white', fontSize: '24px', marginBottom: '8px' }}>
                  {businessInfo.businessName}
                </h3>
                <p style={{ color: 'white', opacity: 0.9, fontSize: '14px' }}>
                  Preview of your kiosk header
                </p>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Brand Color</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={businessInfo.primaryColor}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, primaryColor: e.target.value })}
                  style={styles.colorPicker}
                />
                <input
                  type="text"
                  value={businessInfo.primaryColor}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, primaryColor: e.target.value })}
                  placeholder="#667eea"
                  style={{ ...styles.input, flex: 1 }}
                />
              </div>
              <small style={styles.hint}>
                We pre-selected a color based on your industry, but you can change it to match your brand
              </small>
            </div>

            <div style={styles.navigation}>
              <button onClick={() => setStep(2)} style={styles.backButton}>
                ← Back
              </button>
              <button onClick={() => setStep(4)} style={styles.nextButton}>
                Next: Location Details →
              </button>
            </div>
          </div>
        )

      case 4:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <h2 style={styles.stepTitle}>📍 Tell us about your location(s)</h2>
              <p style={styles.stepDescription}>
                This helps us set up pricing and multi-location features
              </p>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>How many locations do you have?</label>
              <select
                value={businessInfo.locations}
                onChange={(e) => setBusinessInfo({ ...businessInfo, locations: parseInt(e.target.value) })}
                style={styles.select}
              >
                <option value={1}>1 location</option>
                <option value={2}>2 locations</option>
                <option value={3}>3-5 locations</option>
                <option value={6}>6-10 locations</option>
                <option value={11}>11-25 locations</option>
                <option value={26}>26+ locations</option>
              </select>
              {businessInfo.locations > 1 && (
                <small style={{ ...styles.hint, color: '#10b981', fontWeight: 600 }}>
                  ✓ Volume discount available!
                </small>
              )}
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Phone number (optional)
                <span style={{ fontSize: '12px', fontWeight: 400, color: '#6b7280', marginLeft: '8px' }}>
                  For SMS notifications and voice agent
                </span>
              </label>
              <input
                type="tel"
                value={businessInfo.phoneNumber}
                onChange={(e) => setBusinessInfo({ ...businessInfo, phoneNumber: e.target.value })}
                placeholder="(312) 555-0100"
                style={styles.input}
              />
              <small style={styles.hint}>
                You can add this later if you want to enable SMS or voice features
              </small>
            </div>

            <div style={styles.navigation}>
              <button onClick={() => setStep(3)} style={styles.backButton}>
                ← Back
              </button>
              <button onClick={() => setStep(5)} style={styles.nextButton}>
                Review & Complete →
              </button>
            </div>
          </div>
        )

      case 5:
        return (
          <div style={styles.stepContent}>
            <div style={styles.stepHeader}>
              <h2 style={styles.stepTitle}>✅ You're all set!</h2>
              <p style={styles.stepDescription}>
                Review your configuration below. You can always change these settings later.
              </p>
            </div>

            <div style={styles.summary}>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Business Name:</span>
                <span style={styles.summaryValue}>{businessInfo.businessName}</span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Industry:</span>
                <span style={styles.summaryValue}>
                  {industries.find(i => i.id === businessInfo.industry)?.name}
                </span>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Brand Color:</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    background: businessInfo.primaryColor,
                    border: '2px solid #e5e7eb'
                  }} />
                  <span style={styles.summaryValue}>{businessInfo.primaryColor}</span>
                </div>
              </div>
              <div style={styles.summaryItem}>
                <span style={styles.summaryLabel}>Locations:</span>
                <span style={styles.summaryValue}>{businessInfo.locations}</span>
              </div>
              {businessInfo.phoneNumber && (
                <div style={styles.summaryItem}>
                  <span style={styles.summaryLabel}>Phone:</span>
                  <span style={styles.summaryValue}>{businessInfo.phoneNumber}</span>
                </div>
              )}
            </div>

            <div style={styles.nextSteps}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>
                What happens next?
              </h3>
              <ul style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.8, paddingLeft: '20px' }}>
                <li>Your kiosk is now configured with these settings</li>
                <li>You can customize games, voice agent, and more in the admin panel</li>
                <li>Need help? Our support team is here: hello@agentiosk.com</li>
              </ul>
            </div>

            <div style={styles.navigation}>
              <button onClick={() => setStep(4)} style={styles.backButton}>
                ← Back
              </button>
              <button
                onClick={handleComplete}
                disabled={loading}
                style={{
                  ...styles.completeButton,
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? '⏳ Saving...' : '🚀 Complete Setup'}
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.wizard}>
        <div style={styles.progress}>
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              style={{
                ...styles.progressStep,
                background: s <= step ? businessInfo.primaryColor : '#e5e7eb'
              }}
            />
          ))}
        </div>

        <div style={styles.stepIndicator}>
          Step {step} of 5
        </div>

        {renderStep()}
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
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px',
  },
  wizard: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '680px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
  },
  progress: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  progressStep: {
    flex: 1,
    height: '4px',
    borderRadius: '2px',
    transition: 'background 0.3s ease',
  },
  stepIndicator: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 600,
    marginBottom: '24px',
  },
  stepContent: {
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
  },
  stepHeader: {
    marginBottom: '32px',
  },
  stepTitle: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '8px',
  },
  stepDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '24px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
  },
  select: {
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    cursor: 'pointer',
  },
  hint: {
    fontSize: '12px',
    color: '#6b7280',
  },
  industryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  industryCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 12px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    background: 'white',
  },
  colorPreview: {
    marginBottom: '24px',
  },
  previewBox: {
    padding: '32px',
    borderRadius: '12px',
    textAlign: 'center',
  },
  colorPicker: {
    width: '60px',
    height: '48px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  summary: {
    background: '#f9fafb',
    padding: '24px',
    borderRadius: '12px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: 600,
  },
  summaryValue: {
    fontSize: '14px',
    color: '#1a1f26',
    fontWeight: 600,
  },
  nextSteps: {
    background: '#eff6ff',
    border: '2px solid #3b82f6',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  navigation: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  backButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  nextButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    flex: 1,
  },
  completeButton: {
    padding: '14px 32px',
    fontSize: '16px',
    fontWeight: 700,
    color: 'white',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    flex: 1,
  },
}
