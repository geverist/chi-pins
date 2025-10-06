// Phone Number Setup Component - Acquire, Port, or Host numbers
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function PhoneNumberSetup({ userId, onComplete }) {
  const [step, setStep] = useState(1) // 1: Choose method, 2: Setup, 3: Compliance
  const [method, setMethod] = useState(null) // 'acquire', 'port', 'host'
  const [numberType, setNumberType] = useState('10dlc') // '10dlc' or 'tollfree'
  const [selectedNumber, setSelectedNumber] = useState(null)
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Search filters
  const [areaCode, setAreaCode] = useState('')
  const [contains, setContains] = useState('')

  // Port-in form data
  const [portData, setPortData] = useState({
    phoneNumbers: [''],
    accountNumber: '',
    accountPin: '',
    serviceAddress: {
      street: '',
      street2: '',
      city: '',
      state: '',
      zip: ''
    },
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    targetDate: ''
  })

  const searchNumbers = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/twilio-search-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numberType,
          areaCode: numberType === '10dlc' ? areaCode : null,
          contains
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search numbers')
      }

      setSearchResults(data.numbers)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const purchaseNumber = async (phoneNumber) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/twilio-purchase-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          friendlyName: `EngageOS - ${phoneNumber}`
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to purchase number')
      }

      setSelectedNumber(data)
      setStep(3) // Move to compliance step
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const submitPortRequest = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/twilio-port-number', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumbers: portData.phoneNumbers.filter(n => n),
          accountInfo: {
            accountNumber: portData.accountNumber,
            pin: portData.accountPin
          },
          serviceAddress: portData.serviceAddress,
          authorizedContact: {
            name: portData.contactName,
            email: portData.contactEmail,
            phone: portData.contactPhone
          },
          targetDate: portData.targetDate
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit port request')
      }

      alert(`Port request submitted! Status: ${data.status}\nEstimated completion: ${data.estimatedCompletion || '7-14 business days'}`)
      onComplete()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      {/* Step 1: Choose Method */}
      {step === 1 && (
        <div style={styles.step}>
          <h2 style={styles.title}>Set Up Your Phone Number</h2>
          <p style={styles.subtitle}>
            Choose how you want to get a phone number for SMS notifications
          </p>

          <div style={styles.methodGrid}>
            <div
              onClick={() => { setMethod('acquire'); setStep(2) }}
              style={{
                ...styles.methodCard,
                border: method === 'acquire' ? '3px solid #667eea' : '2px solid #e5e7eb'
              }}
            >
              <div style={styles.methodIcon}>🔢</div>
              <h3 style={styles.methodTitle}>Get New Number</h3>
              <p style={styles.methodDescription}>
                Choose a new phone number from Twilio's inventory. Ready in minutes.
              </p>
              <div style={styles.badge}>Recommended</div>
            </div>

            <div
              onClick={() => { setMethod('port'); setStep(2) }}
              style={{
                ...styles.methodCard,
                border: method === 'port' ? '3px solid #667eea' : '2px solid #e5e7eb'
              }}
            >
              <div style={styles.methodIcon}>🔄</div>
              <h3 style={styles.methodTitle}>Port Existing Number</h3>
              <p style={styles.methodDescription}>
                Transfer your current phone number to Twilio. Takes 7-14 days.
              </p>
            </div>

            <div
              onClick={() => { setMethod('host'); setStep(2) }}
              style={{
                ...styles.methodCard,
                border: method === 'host' ? '3px solid #667eea' : '2px solid #e5e7eb',
                opacity: 0.6
              }}
            >
              <div style={styles.methodIcon}>🏠</div>
              <h3 style={styles.methodTitle}>Host Number</h3>
              <p style={styles.methodDescription}>
                Keep your number with current carrier, route SMS through Twilio.
              </p>
              <div style={styles.badgeComingSoon}>Coming Soon</div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Acquire New Number */}
      {step === 2 && method === 'acquire' && (
        <div style={styles.step}>
          <button onClick={() => setStep(1)} style={styles.backButton}>← Back</button>

          <h2 style={styles.title}>Choose Number Type</h2>

          <div style={styles.numberTypeGrid}>
            <label style={{
              ...styles.numberTypeCard,
              border: numberType === '10dlc' ? '3px solid #667eea' : '2px solid #e5e7eb',
              background: numberType === '10dlc' ? '#f0f4ff' : 'white'
            }}>
              <input
                type="radio"
                name="numberType"
                value="10dlc"
                checked={numberType === '10dlc'}
                onChange={(e) => setNumberType(e.target.value)}
                style={styles.radio}
              />
              <div>
                <h3 style={styles.numberTypeTitle}>10DLC (Local Number)</h3>
                <p style={styles.numberTypeDescription}>
                  Standard local phone number (e.g., 312-555-0123)
                </p>
                <ul style={styles.featureList}>
                  <li>✓ Local area code presence</li>
                  <li>✓ Up to 4,500 msgs/day</li>
                  <li>✓ Requires brand registration</li>
                  <li>✓ $1-2/month</li>
                </ul>
              </div>
            </label>

            <label style={{
              ...styles.numberTypeCard,
              border: numberType === 'tollfree' ? '3px solid #667eea' : '2px solid #e5e7eb',
              background: numberType === 'tollfree' ? '#f0f4ff' : 'white'
            }}>
              <input
                type="radio"
                name="numberType"
                value="tollfree"
                checked={numberType === 'tollfree'}
                onChange={(e) => setNumberType(e.target.value)}
                style={styles.radio}
              />
              <div>
                <h3 style={styles.numberTypeTitle}>Toll-Free</h3>
                <p style={styles.numberTypeDescription}>
                  Toll-free number (e.g., 800-555-0123)
                </p>
                <ul style={styles.featureList}>
                  <li>✓ National presence</li>
                  <li>✓ Up to 180 msgs/min</li>
                  <li>✓ Simpler verification</li>
                  <li>✓ $2-3/month</li>
                </ul>
              </div>
            </label>
          </div>

          <div style={styles.searchSection}>
            <h3 style={styles.sectionTitle}>Search for Available Numbers</h3>

            <div style={styles.searchFilters}>
              {numberType === '10dlc' && (
                <input
                  type="text"
                  placeholder="Area code (e.g., 312)"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  maxLength={3}
                  style={styles.input}
                />
              )}

              <input
                type="text"
                placeholder="Contains (e.g., 555)"
                value={contains}
                onChange={(e) => setContains(e.target.value)}
                style={styles.input}
              />

              <button onClick={searchNumbers} disabled={loading} style={styles.searchButton}>
                {loading ? 'Searching...' : '🔍 Search'}
              </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            {searchResults.length > 0 && (
              <div style={styles.results}>
                <h4 style={styles.resultsTitle}>Available Numbers ({searchResults.length})</h4>
                {searchResults.map((number, idx) => (
                  <div key={idx} style={styles.numberResult}>
                    <div style={styles.numberInfo}>
                      <div style={styles.numberDisplay}>{number.phoneNumber}</div>
                      <div style={styles.numberLocation}>
                        {number.locality}, {number.region}
                      </div>
                      <div style={styles.capabilities}>
                        {number.capabilities.voice && <span style={styles.cap}>📞 Voice</span>}
                        {number.capabilities.SMS && <span style={styles.cap}>💬 SMS</span>}
                        {number.capabilities.MMS && <span style={styles.cap}>📷 MMS</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => purchaseNumber(number.phoneNumber)}
                      style={styles.selectButton}
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Port Existing Number */}
      {step === 2 && method === 'port' && (
        <div style={styles.step}>
          <button onClick={() => setStep(1)} style={styles.backButton}>← Back</button>

          <h2 style={styles.title}>Port Your Existing Number</h2>
          <p style={styles.subtitle}>
            Transfer your phone number from your current carrier to Twilio
          </p>

          <div style={styles.notice}>
            <strong>⏱️ Typical timeline:</strong> 7-14 business days<br/>
            <strong>📋 You'll need:</strong> Recent bill, account number, PIN/passcode
          </div>

          <div style={styles.form}>
            <div style={styles.formSection}>
              <h3 style={styles.formSectionTitle}>Phone Numbers to Port</h3>
              {portData.phoneNumbers.map((num, idx) => (
                <div key={idx} style={styles.inputGroup}>
                  <input
                    type="tel"
                    placeholder="+1 (312) 555-0123"
                    value={num}
                    onChange={(e) => {
                      const newNumbers = [...portData.phoneNumbers]
                      newNumbers[idx] = e.target.value
                      setPortData({ ...portData, phoneNumbers: newNumbers })
                    }}
                    style={styles.input}
                  />
                  {idx === portData.phoneNumbers.length - 1 && (
                    <button
                      onClick={() => setPortData({
                        ...portData,
                        phoneNumbers: [...portData.phoneNumbers, '']
                      })}
                      style={styles.addButton}
                    >
                      + Add Another
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={styles.formSection}>
              <h3 style={styles.formSectionTitle}>Current Carrier Account Info</h3>
              <input
                type="text"
                placeholder="Account Number"
                value={portData.accountNumber}
                onChange={(e) => setPortData({ ...portData, accountNumber: e.target.value })}
                style={styles.input}
                required
              />
              <input
                type="text"
                placeholder="Account PIN/Passcode"
                value={portData.accountPin}
                onChange={(e) => setPortData({ ...portData, accountPin: e.target.value })}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formSection}>
              <h3 style={styles.formSectionTitle}>Service Address (Billing Address)</h3>
              <input
                type="text"
                placeholder="Street Address"
                value={portData.serviceAddress.street}
                onChange={(e) => setPortData({
                  ...portData,
                  serviceAddress: { ...portData.serviceAddress, street: e.target.value }
                })}
                style={styles.input}
                required
              />
              <input
                type="text"
                placeholder="Street Address 2 (optional)"
                value={portData.serviceAddress.street2}
                onChange={(e) => setPortData({
                  ...portData,
                  serviceAddress: { ...portData.serviceAddress, street2: e.target.value }
                })}
                style={styles.input}
              />
              <div style={styles.formRow}>
                <input
                  type="text"
                  placeholder="City"
                  value={portData.serviceAddress.city}
                  onChange={(e) => setPortData({
                    ...portData,
                    serviceAddress: { ...portData.serviceAddress, city: e.target.value }
                  })}
                  style={styles.input}
                  required
                />
                <input
                  type="text"
                  placeholder="State"
                  value={portData.serviceAddress.state}
                  onChange={(e) => setPortData({
                    ...portData,
                    serviceAddress: { ...portData.serviceAddress, state: e.target.value }
                  })}
                  style={{...styles.input, maxWidth: '100px'}}
                  maxLength={2}
                  required
                />
                <input
                  type="text"
                  placeholder="ZIP"
                  value={portData.serviceAddress.zip}
                  onChange={(e) => setPortData({
                    ...portData,
                    serviceAddress: { ...portData.serviceAddress, zip: e.target.value }
                  })}
                  style={{...styles.input, maxWidth: '120px'}}
                  required
                />
              </div>
            </div>

            <div style={styles.formSection}>
              <h3 style={styles.formSectionTitle}>Authorized Contact</h3>
              <input
                type="text"
                placeholder="Full Name"
                value={portData.contactName}
                onChange={(e) => setPortData({ ...portData, contactName: e.target.value })}
                style={styles.input}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={portData.contactEmail}
                onChange={(e) => setPortData({ ...portData, contactEmail: e.target.value })}
                style={styles.input}
                required
              />
              <input
                type="tel"
                placeholder="Phone Number"
                value={portData.contactPhone}
                onChange={(e) => setPortData({ ...portData, contactPhone: e.target.value })}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formSection}>
              <h3 style={styles.formSectionTitle}>Target Port Date (Optional)</h3>
              <input
                type="date"
                value={portData.targetDate}
                onChange={(e) => setPortData({ ...portData, targetDate: e.target.value })}
                style={styles.input}
                min={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              />
              <p style={styles.hint}>Leave blank for earliest available date</p>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            <button
              onClick={submitPortRequest}
              disabled={loading}
              style={{...styles.submitButton, opacity: loading ? 0.6 : 1}}
            >
              {loading ? 'Submitting...' : 'Submit Port Request'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Compliance (for acquired numbers) */}
      {step === 3 && selectedNumber && (
        <div style={styles.step}>
          <div style={styles.successMessage}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>Number Acquired!</h2>
            <p style={styles.successNumber}>{selectedNumber.phoneNumber}</p>
          </div>

          <div style={styles.nextSteps}>
            <h3 style={styles.nextStepsTitle}>Next: Set Up Messaging Compliance</h3>
            <p>To start sending SMS, you need to complete one of the following:</p>

            <div style={styles.complianceOptions}>
              {numberType === '10dlc' && (
                <div style={styles.complianceCard}>
                  <h4>A2P 10DLC Registration</h4>
                  <p>Required for local numbers. Provides highest throughput.</p>
                  <ul>
                    <li>Register your business brand</li>
                    <li>Register messaging campaign</li>
                    <li>Approval takes 1-2 weeks</li>
                  </ul>
                  <button onClick={() => window.location.href = '/admin/messaging/a2p-10dlc'} style={styles.complianceButton}>
                    Start A2P 10DLC Setup →
                  </button>
                </div>
              )}

              {numberType === 'tollfree' && (
                <div style={styles.complianceCard}>
                  <h4>Toll-Free Verification</h4>
                  <p>Simpler process for toll-free numbers.</p>
                  <ul>
                    <li>Submit business info</li>
                    <li>Provide message samples</li>
                    <li>Approval takes 3-5 days</li>
                  </ul>
                  <button onClick={() => window.location.href = '/admin/messaging/tollfree-verification'} style={styles.complianceButton}>
                    Start Toll-Free Verification →
                  </button>
                </div>
              )}
            </div>

            <button onClick={onComplete} style={styles.finishButton}>
              Finish Setup (Complete Compliance Later)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  step: {
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '12px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '32px',
  },
  methodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  methodCard: {
    padding: '24px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative',
  },
  methodIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  methodTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '8px',
  },
  methodDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  badge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: '#10b981',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 700,
  },
  badgeComingSoon: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: '#6b7280',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 700,
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '24px',
  },
  numberTypeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  },
  numberTypeCard: {
    padding: '20px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  radio: {
    marginTop: '4px',
    cursor: 'pointer',
  },
  numberTypeTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '4px',
  },
  numberTypeDescription: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    fontSize: '13px',
    color: '#374151',
  },
  searchSection: {
    marginTop: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '16px',
  },
  searchFilters: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  input: {
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    flex: 1,
  },
  searchButton: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  results: {
    marginTop: '24px',
  },
  resultsTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '16px',
  },
  numberResult: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  numberInfo: {
    flex: 1,
  },
  numberDisplay: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '4px',
  },
  numberLocation: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  capabilities: {
    display: 'flex',
    gap: '8px',
  },
  cap: {
    fontSize: '12px',
    color: '#374151',
  },
  selectButton: {
    padding: '10px 20px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  notice: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '16px',
    fontSize: '14px',
    color: '#1e40af',
    marginBottom: '24px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  formSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  formSectionTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1a1f26',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
  },
  inputGroup: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  addButton: {
    padding: '10px 16px',
    background: 'white',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  hint: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '-8px',
  },
  error: {
    padding: '12px 16px',
    background: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    border: '1px solid #fecaca',
  },
  submitButton: {
    padding: '14px 28px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  successMessage: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  successIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  successTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#10b981',
    marginBottom: '8px',
  },
  successNumber: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1a1f26',
  },
  nextSteps: {
    marginTop: '32px',
  },
  nextStepsTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '12px',
  },
  complianceOptions: {
    marginTop: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  complianceCard: {
    padding: '20px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
  },
  complianceButton: {
    marginTop: '16px',
    padding: '12px 24px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  finishButton: {
    marginTop: '24px',
    padding: '12px 24px',
    background: 'white',
    color: '#667eea',
    border: '2px solid #667eea',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  },
}
