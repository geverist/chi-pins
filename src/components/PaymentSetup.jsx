// Payment Setup Component - Stripe Integration
import { useState, useEffect } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { getStripe, PRICING, calculateMonthlyTotal, formatPrice, getVolumeDiscount } from '../lib/stripe'
import { supabase } from '../lib/supabase'

// Payment form component (inside Stripe Elements context)
function PaymentForm({ selectedPlan, locations, selectedAddons, hardwarePackage, onSuccess, onCancel }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('finance') // 'finance' or 'upfront'

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setError(null)
    setLoading(true)

    try {
      // Get card element
      const cardElement = elements.getElement(CardElement)

      // Create payment method
      const { error: pmError, paymentMethod: pm } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      })

      if (pmError) {
        throw new Error(pmError.message)
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Call API to create subscription
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          planId: selectedPlan.id,
          locations,
          addons: selectedAddons,
          hardwarePackage: hardwarePackage.id,
          paymentMethodId: pm.id,
          hardwarePaymentType: paymentMethod, // 'finance' or 'upfront'
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create subscription')
      }

      // Success!
      onSuccess(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Calculate totals
  const monthlyTotal = calculateMonthlyTotal(selectedPlan, locations, selectedAddons)
  const volumeDiscount = getVolumeDiscount(locations)
  const hardwarePrice = paymentMethod === 'finance' ? hardwarePackage.financePrice : hardwarePackage.price
  const firstMonthTotal = paymentMethod === 'finance' ? monthlyTotal + hardwarePrice : monthlyTotal

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Payment Details</h3>

        <div style={styles.cardElementContainer}>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1a1f26',
                  '::placeholder': {
                    color: '#9ca3af',
                  },
                },
                invalid: {
                  color: '#dc2626',
                },
              },
            }}
          />
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Hardware Payment</h3>

        <div style={styles.radioGroup}>
          <label style={styles.radioLabel}>
            <input
              type="radio"
              name="paymentMethod"
              value="finance"
              checked={paymentMethod === 'finance'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={styles.radio}
            />
            <div>
              <div style={styles.radioTitle}>Finance ({formatPrice(hardwarePackage.financePrice)}/mo for 36 months)</div>
              <div style={styles.radioDescription}>Add hardware cost to monthly payment</div>
            </div>
          </label>

          <label style={styles.radioLabel}>
            <input
              type="radio"
              name="paymentMethod"
              value="upfront"
              checked={paymentMethod === 'upfront'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={styles.radio}
            />
            <div>
              <div style={styles.radioTitle}>Pay Upfront ({formatPrice(hardwarePackage.price)})</div>
              <div style={styles.radioDescription}>One-time payment, save {formatPrice((hardwarePackage.financePrice * 36) - hardwarePackage.price)}</div>
            </div>
          </label>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Order Summary</h3>

        <div style={styles.summaryLine}>
          <span>{selectedPlan.name} Plan × {locations} location{locations > 1 ? 's' : ''}</span>
          <span>{formatPrice(selectedPlan.basePrice * locations)}</span>
        </div>

        {volumeDiscount > 0 && (
          <div style={{...styles.summaryLine, color: '#10b981'}}>
            <span>Volume Discount ({volumeDiscount}%)</span>
            <span>-{formatPrice((selectedPlan.basePrice * locations) * (volumeDiscount / 100))}</span>
          </div>
        )}

        {selectedAddons.map(addonId => {
          const addon = PRICING.addons[addonId]
          return (
            <div key={addonId} style={styles.summaryLine}>
              <span>{addon.name}</span>
              <span>{formatPrice(addon.price * locations)}</span>
            </div>
          )
        })}

        <div style={{...styles.summaryLine, ...styles.summaryLineHardware}}>
          <span>{hardwarePackage.name}</span>
          <span>
            {paymentMethod === 'finance'
              ? `${formatPrice(hardwarePrice)}/mo`
              : formatPrice(hardwarePrice)
            }
          </span>
        </div>

        <div style={styles.divider} />

        <div style={{...styles.summaryLine, ...styles.summaryLineTotal}}>
          <span>Monthly Total</span>
          <span>{formatPrice(monthlyTotal)}</span>
        </div>

        {paymentMethod === 'finance' && (
          <div style={{...styles.summaryLine, ...styles.summaryLineTotal}}>
            <span>First Month Total (includes hardware)</span>
            <span>{formatPrice(firstMonthTotal)}</span>
          </div>
        )}

        {paymentMethod === 'upfront' && (
          <div style={styles.summaryNote}>
            Hardware charged today: {formatPrice(hardwarePrice)}<br/>
            Billing starts when hardware ships
          </div>
        )}
      </div>

      <div style={styles.notice}>
        <strong>📦 Important:</strong> Your card will be authorized but not charged until your hardware ships.
        You'll have immediate access to all software features (admin panel, analytics, configuration).
      </div>

      {error && (
        <div style={styles.error}>
          {error}
        </div>
      )}

      <div style={styles.buttonGroup}>
        <button
          type="button"
          onClick={onCancel}
          style={styles.cancelButton}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          style={{
            ...styles.submitButton,
            opacity: (!stripe || loading) ? 0.6 : 1,
            cursor: (!stripe || loading) ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Processing...' : `Complete Setup ${paymentMethod === 'upfront' ? `(${formatPrice(hardwarePrice)} today)` : ''}`}
        </button>
      </div>
    </form>
  )
}

// Main payment setup component with Stripe Elements wrapper
export default function PaymentSetup({ selectedPlan, locations, selectedAddons, hardwarePackage, onSuccess, onCancel }) {
  const [stripePromise] = useState(() => getStripe())

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Complete Your Setup</h2>
        <p style={styles.subtitle}>
          Enter your payment details to get started. We'll authorize your card but won't charge until your hardware ships.
        </p>
      </div>

      <Elements stripe={stripePromise}>
        <PaymentForm
          selectedPlan={selectedPlan}
          locations={locations}
          selectedAddons={selectedAddons}
          hardwarePackage={hardwarePackage}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </Elements>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
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
    background: 'white',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1f26',
    marginBottom: '16px',
  },
  cardElementContainer: {
    padding: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    background: '#f9fafb',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  radio: {
    marginTop: '4px',
    cursor: 'pointer',
  },
  radioTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1a1f26',
  },
  radioDescription: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  summaryLine: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    color: '#374151',
  },
  summaryLineHardware: {
    color: '#667eea',
    fontWeight: 600,
  },
  summaryLineTotal: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1a1f26',
  },
  summaryNote: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '8px',
    fontStyle: 'italic',
  },
  divider: {
    height: '1px',
    background: '#e5e7eb',
    margin: '16px 0',
  },
  notice: {
    padding: '16px',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#1e40af',
    marginBottom: '24px',
  },
  error: {
    padding: '12px 16px',
    background: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    border: '1px solid #fecaca',
    marginBottom: '16px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
}
