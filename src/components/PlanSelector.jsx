// Plan Selector Component - Choose subscription plan
import { useState } from 'react'
import { PRICING, calculateMonthlyTotal, formatPrice, getVolumeDiscount } from '../lib/stripe'

export default function PlanSelector({ onPlanSelected }) {
  const [selectedPlan, setSelectedPlan] = useState('professional')
  const [locations, setLocations] = useState(1)
  const [selectedAddons, setSelectedAddons] = useState(['ai_voice']) // AI Voice is popular
  const [hardwarePackage, setHardwarePackage] = useState('standard')

  const handleContinue = () => {
    const plan = PRICING.plans[selectedPlan]
    const hardware = PRICING.hardware[hardwarePackage]

    if (plan.custom) {
      // Enterprise - redirect to contact sales
      window.location.href = 'mailto:hello@agentiosk.com?subject=Enterprise%20Plan%20Inquiry'
      return
    }

    onPlanSelected({
      plan,
      locations,
      addons: selectedAddons,
      hardware,
    })
  }

  const toggleAddon = (addonId) => {
    setSelectedAddons(prev =>
      prev.includes(addonId)
        ? prev.filter(id => id !== addonId)
        : [...prev, addonId]
    )
  }

  const currentPlan = PRICING.plans[selectedPlan]
  const monthlyTotal = calculateMonthlyTotal(currentPlan, locations, selectedAddons)
  const volumeDiscount = getVolumeDiscount(locations)

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Choose Your Plan</h2>
        <p style={styles.subtitle}>
          Select the plan that fits your business needs. All plans include hardware and installation.
        </p>
      </div>

      {/* Plan Cards */}
      <div style={styles.planGrid}>
        {Object.values(PRICING.plans).map(plan => (
          <div
            key={plan.id}
            onClick={() => !plan.custom && setSelectedPlan(plan.id)}
            style={{
              ...styles.planCard,
              border: selectedPlan === plan.id ? '3px solid #667eea' : '2px solid #e5e7eb',
              cursor: plan.custom ? 'default' : 'pointer',
              opacity: plan.custom ? 0.9 : 1,
            }}
          >
            {plan.popular && (
              <div style={styles.popularBadge}>Most Popular</div>
            )}

            <h3 style={styles.planName}>{plan.name}</h3>

            <div style={styles.planPrice}>
              {plan.custom ? (
                <div style={styles.customPrice}>Custom Pricing</div>
              ) : (
                <>
                  <span style={styles.priceAmount}>{formatPrice(plan.basePrice)}</span>
                  <span style={styles.pricePeriod}>/month</span>
                </>
              )}
            </div>

            <ul style={styles.featureList}>
              {plan.features.map((feature, idx) => (
                <li key={idx} style={styles.featureItem}>
                  <span style={styles.checkmark}>✓</span> {feature}
                </li>
              ))}
            </ul>

            {plan.custom && (
              <button
                onClick={() => window.location.href = 'mailto:hello@agentiosk.com?subject=Enterprise%20Plan%20Inquiry'}
                style={styles.contactButton}
              >
                Contact Sales
              </button>
            )}
          </div>
        ))}
      </div>

      {!currentPlan.custom && (
        <>
          {/* Locations Selector */}
          <div style={styles.section}>
            <label style={styles.label}>
              Number of Locations
              {volumeDiscount > 0 && (
                <span style={styles.discountLabel}> ({volumeDiscount}% volume discount applied!)</span>
              )}
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={locations}
              onChange={(e) => setLocations(Math.max(1, parseInt(e.target.value) || 1))}
              style={styles.input}
            />
            <p style={styles.hint}>Add multiple locations and save up to 25%</p>
          </div>

          {/* Add-ons */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Add-ons (Optional)</h3>

            <div style={styles.addonGrid}>
              {Object.values(PRICING.addons).map(addon => (
                <label
                  key={addon.id}
                  style={{
                    ...styles.addonCard,
                    border: selectedAddons.includes(addon.id) ? '2px solid #667eea' : '2px solid #e5e7eb',
                    background: selectedAddons.includes(addon.id) ? '#f0f4ff' : 'white',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedAddons.includes(addon.id)}
                    onChange={() => toggleAddon(addon.id)}
                    style={styles.checkbox}
                  />
                  <div>
                    <div style={styles.addonName}>{addon.name}</div>
                    <div style={styles.addonDescription}>{addon.description}</div>
                    <div style={styles.addonPrice}>+{formatPrice(addon.price)}/month</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Hardware Package */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Hardware Package</h3>

            <div style={styles.hardwareGrid}>
              {Object.values(PRICING.hardware).map(pkg => (
                <label
                  key={pkg.id}
                  style={{
                    ...styles.hardwareCard,
                    border: hardwarePackage === pkg.id ? '2px solid #667eea' : '2px solid #e5e7eb',
                    background: hardwarePackage === pkg.id ? '#f0f4ff' : 'white',
                  }}
                >
                  <input
                    type="radio"
                    name="hardware"
                    value={pkg.id}
                    checked={hardwarePackage === pkg.id}
                    onChange={(e) => setHardwarePackage(e.target.value)}
                    style={styles.radio}
                  />
                  <div>
                    <div style={styles.hardwareName}>{pkg.name}</div>
                    <div style={styles.hardwarePrice}>
                      {formatPrice(pkg.price)} or {formatPrice(pkg.financePrice)}/mo
                    </div>
                    <ul style={styles.hardwareItems}>
                      {pkg.items.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={styles.summary}>
            <div style={styles.summaryHeader}>
              <h3 style={styles.summaryTitle}>Your Monthly Total</h3>
              <div style={styles.summaryTotal}>{formatPrice(monthlyTotal)}/month</div>
            </div>

            <div style={styles.summaryBreakdown}>
              <div style={styles.summaryLine}>
                <span>{currentPlan.name} Plan × {locations}</span>
                <span>{formatPrice(currentPlan.basePrice * locations)}</span>
              </div>

              {volumeDiscount > 0 && (
                <div style={{...styles.summaryLine, color: '#10b981'}}>
                  <span>Volume Discount ({volumeDiscount}%)</span>
                  <span>-{formatPrice((currentPlan.basePrice * locations) * (volumeDiscount / 100))}</span>
                </div>
              )}

              {selectedAddons.map(addonId => {
                const addon = PRICING.addons[addonId]
                return (
                  <div key={addonId} style={styles.summaryLine}>
                    <span>{addon.name}</span>
                    <span>+{formatPrice(addon.price * locations)}</span>
                  </div>
                )
              })}
            </div>

            <p style={styles.summaryNote}>
              Hardware: {formatPrice(PRICING.hardware[hardwarePackage].price)} one-time or finance for {formatPrice(PRICING.hardware[hardwarePackage].financePrice)}/mo
            </p>

            <button onClick={handleContinue} style={styles.continueButton}>
              Continue to Payment →
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '12px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
  },
  planGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '48px',
  },
  planCard: {
    position: 'relative',
    padding: '32px 24px',
    borderRadius: '12px',
    background: 'white',
    transition: 'all 0.2s',
  },
  popularBadge: {
    position: 'absolute',
    top: '-12px',
    right: '24px',
    padding: '6px 16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '12px',
    fontWeight: 700,
    borderRadius: '20px',
  },
  planName: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '16px',
  },
  planPrice: {
    marginBottom: '24px',
  },
  priceAmount: {
    fontSize: '36px',
    fontWeight: 700,
    color: '#667eea',
  },
  pricePeriod: {
    fontSize: '16px',
    color: '#6b7280',
  },
  customPrice: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#667eea',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  featureItem: {
    padding: '8px 0',
    fontSize: '14px',
    color: '#374151',
  },
  checkmark: {
    color: '#10b981',
    fontWeight: 700,
    marginRight: '8px',
  },
  contactButton: {
    width: '100%',
    marginTop: '24px',
    padding: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '8px',
  },
  discountLabel: {
    color: '#10b981',
    fontWeight: 700,
  },
  input: {
    width: '100%',
    maxWidth: '200px',
    padding: '12px 16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
  },
  hint: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  addonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
  },
  addonCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  checkbox: {
    marginTop: '4px',
    cursor: 'pointer',
    width: '18px',
    height: '18px',
  },
  addonName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1f26',
    marginBottom: '4px',
  },
  addonDescription: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  addonPrice: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#667eea',
  },
  hardwareGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
  },
  hardwareCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '20px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  radio: {
    marginTop: '4px',
    cursor: 'pointer',
  },
  hardwareName: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '8px',
  },
  hardwarePrice: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#667eea',
    marginBottom: '12px',
  },
  hardwareItems: {
    fontSize: '13px',
    color: '#6b7280',
    paddingLeft: '20px',
  },
  summary: {
    background: 'white',
    border: '2px solid #667eea',
    borderRadius: '12px',
    padding: '24px',
    marginTop: '48px',
  },
  summaryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  summaryTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1a1f26',
  },
  summaryTotal: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#667eea',
  },
  summaryBreakdown: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    marginBottom: '16px',
  },
  summaryLine: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    color: '#374151',
  },
  summaryNote: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '24px',
    fontStyle: 'italic',
  },
  continueButton: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: 700,
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
}
