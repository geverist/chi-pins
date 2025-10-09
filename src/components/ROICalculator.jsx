// src/components/ROICalculator.jsx
import { useState, useMemo } from 'react'

const INDUSTRY_PRESETS = {
  restaurant: {
    name: 'Restaurant',
    avgOrderValue: 25,
    dailyCustomers: 150,
    staffHourlyCost: 18,
    hoursPerDay: 10,
    assumptions: {
      kioskOrderPercent: 30, // 30% of customers use kiosk
      upsellIncrease: 18, // 18% increase in order value
      laborSavingsHours: 4, // Hours saved per day
      dwellTimeIncrease: 15, // 15% increase in dwell time
    }
  },
  bar: {
    name: 'Bar & Entertainment',
    avgOrderValue: 35,
    dailyCustomers: 120,
    staffHourlyCost: 16,
    hoursPerDay: 12,
    assumptions: {
      kioskOrderPercent: 40,
      upsellIncrease: 22, // Music jukebox increases engagement
      laborSavingsHours: 3,
      dwellTimeIncrease: 25, // Games and jukebox increase dwell time
    }
  },
  hotel: {
    name: 'Hotel / Hospitality',
    avgOrderValue: 0, // Not transaction-based
    dailyCustomers: 50, // Daily guests
    staffHourlyCost: 22, // Concierge hourly rate
    hoursPerDay: 24,
    assumptions: {
      kioskOrderPercent: 60, // High usage for concierge services
      upsellIncrease: 0,
      laborSavingsHours: 8, // Replaces 8 hours of concierge
      dwellTimeIncrease: 0,
      affiliateRevenue: 500, // Monthly affiliate revenue from bookings
    }
  },
  spa: {
    name: 'Spa & Salon',
    avgOrderValue: 85,
    dailyCustomers: 40,
    staffHourlyCost: 20,
    hoursPerDay: 10,
    assumptions: {
      kioskOrderPercent: 70,
      upsellIncrease: 25, // High upsell on packages
      laborSavingsHours: 3,
      dwellTimeIncrease: 10,
    }
  }
}

export default function ROICalculator({ onClose }) {
  const [industry, setIndustry] = useState('restaurant')
  const [monthlyFee, setMonthlyFee] = useState(299)
  const [hardwareCost, setHardwareCost] = useState(800)

  const preset = INDUSTRY_PRESETS[industry]

  const calculations = useMemo(() => {
    const {
      avgOrderValue,
      dailyCustomers,
      staffHourlyCost,
      hoursPerDay,
      assumptions
    } = preset

    // Monthly calculations
    const daysPerMonth = 30
    const monthlyCustomers = dailyCustomers * daysPerMonth
    const kioskUsers = monthlyCustomers * (assumptions.kioskOrderPercent / 100)

    // Revenue increase from upselling
    const upsellIncrease = kioskUsers * avgOrderValue * (assumptions.upsellIncrease / 100)

    // Labor savings
    const monthlyLaborSavings = assumptions.laborSavingsHours * staffHourlyCost * daysPerMonth

    // Affiliate revenue (hotels/hospitality)
    const monthlyAffiliateRevenue = assumptions.affiliateRevenue || 0

    // Total monthly benefit
    const totalMonthlyBenefit = upsellIncrease + monthlyLaborSavings + monthlyAffiliateRevenue

    // ROI calculations
    const monthlyCost = monthlyFee
    const monthlyProfit = totalMonthlyBenefit - monthlyCost
    const annualProfit = monthlyProfit * 12
    const paybackMonths = hardwareCost / monthlyProfit
    const threeYearROI = ((annualProfit * 3 - hardwareCost) / hardwareCost) * 100

    return {
      upsellIncrease: Math.round(upsellIncrease),
      monthlyLaborSavings: Math.round(monthlyLaborSavings),
      monthlyAffiliateRevenue: Math.round(monthlyAffiliateRevenue),
      totalMonthlyBenefit: Math.round(totalMonthlyBenefit),
      monthlyCost,
      monthlyProfit: Math.round(monthlyProfit),
      annualProfit: Math.round(annualProfit),
      paybackMonths: Math.max(0.1, paybackMonths).toFixed(1),
      threeYearROI: Math.round(threeYearROI),
      kioskUsers: Math.round(kioskUsers)
    }
  }, [industry, monthlyFee, hardwareCost, preset])

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.95)',
      zIndex: 10000,
      overflow: 'auto',
      padding: '40px 20px'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '24px',
        padding: '48px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
            <h1 style={{
              fontSize: '36px',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0
            }}>
              ROI Calculator
            </h1>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                fontSize: '24px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>
            Calculate your return on investment with Chi-Pins Kiosk
          </p>
        </div>

        {/* Industry Selection */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', color: '#e2e8f0', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
            Select Your Industry
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {Object.entries(INDUSTRY_PRESETS).map(([key, { name }]) => (
              <button
                key={key}
                onClick={() => setIndustry(key)}
                style={{
                  padding: '16px',
                  background: industry === key ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${industry === key ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Inputs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '40px',
          padding: '24px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div>
            <label style={{ display: 'block', color: '#e2e8f0', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
              Monthly Subscription
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontSize: '18px',
                fontWeight: '600'
              }}>$</span>
              <input
                type="number"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(parseInt(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 36px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: '600'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: '#e2e8f0', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
              Hardware Cost (One-Time)
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                fontSize: '18px',
                fontWeight: '600'
              }}>$</span>
              <input
                type="number"
                value={hardwareCost}
                onChange={(e) => setHardwareCost(parseInt(e.target.value) || 0)}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 36px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '18px',
                  fontWeight: '600'
                }}
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          padding: '32px',
          borderRadius: '16px',
          marginBottom: '32px',
          boxShadow: '0 10px 30px rgba(16, 185, 129, 0.3)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
              MONTHLY NET PROFIT
            </div>
            <div style={{ color: '#fff', fontSize: '56px', fontWeight: '800', lineHeight: 1 }}>
              ${calculations.monthlyProfit.toLocaleString()}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                PAYBACK PERIOD
              </div>
              <div style={{ color: '#fff', fontSize: '28px', fontWeight: '700' }}>
                {calculations.paybackMonths} mo
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                ANNUAL PROFIT
              </div>
              <div style={{ color: '#fff', fontSize: '28px', fontWeight: '700' }}>
                ${(calculations.annualProfit / 1000).toFixed(0)}K
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                3-YEAR ROI
              </div>
              <div style={{ color: '#fff', fontSize: '28px', fontWeight: '700' }}>
                {calculations.threeYearROI}%
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: '700', marginBottom: '16px' }}>
            Monthly Benefit Breakdown
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {calculations.upsellIncrease > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <span style={{ color: '#e2e8f0', fontSize: '15px' }}>
                  💰 Revenue from Upselling ({preset.assumptions.upsellIncrease}% increase)
                </span>
                <span style={{ color: '#60a5fa', fontSize: '18px', fontWeight: '700' }}>
                  +${calculations.upsellIncrease.toLocaleString()}
                </span>
              </div>
            )}

            {calculations.monthlyLaborSavings > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                <span style={{ color: '#e2e8f0', fontSize: '15px' }}>
                  ⏰ Labor Savings ({preset.assumptions.laborSavingsHours} hrs/day × ${preset.staffHourlyCost}/hr)
                </span>
                <span style={{ color: '#34d399', fontSize: '18px', fontWeight: '700' }}>
                  +${calculations.monthlyLaborSavings.toLocaleString()}
                </span>
              </div>
            )}

            {calculations.monthlyAffiliateRevenue > 0 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '16px',
                background: 'rgba(168, 85, 247, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(168, 85, 247, 0.2)'
              }}>
                <span style={{ color: '#e2e8f0', fontSize: '15px' }}>
                  🎯 Affiliate Revenue (bookings, tours, etc.)
                </span>
                <span style={{ color: '#a78bfa', fontSize: '18px', fontWeight: '700' }}>
                  +${calculations.monthlyAffiliateRevenue.toLocaleString()}
                </span>
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <span style={{ color: '#e2e8f0', fontSize: '15px' }}>
                💳 Monthly Subscription Cost
              </span>
              <span style={{ color: '#f87171', fontSize: '18px', fontWeight: '700' }}>
                -${calculations.monthlyCost.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Assumptions */}
        <div style={{
          padding: '20px',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <h4 style={{ color: '#94a3b8', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
            ASSUMPTIONS FOR {preset.name.toUpperCase()}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13px', color: '#64748b' }}>
            <div>• {preset.dailyCustomers} customers/day</div>
            <div>• {preset.assumptions.kioskOrderPercent}% use kiosk</div>
            {preset.avgOrderValue > 0 && <div>• ${preset.avgOrderValue} avg order value</div>}
            {preset.assumptions.upsellIncrease > 0 && <div>• {preset.assumptions.upsellIncrease}% upsell increase</div>}
            <div>• {preset.assumptions.laborSavingsHours} hrs/day labor saved</div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button
            onClick={() => window.open('https://agentiosk.com', '_blank')}
            style={{
              padding: '16px 48px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '18px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(59, 130, 246, 0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
          >
            Get Started Today →
          </button>
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '12px' }}>
            * Results based on industry averages. Actual results may vary.
          </p>
        </div>
      </div>
    </div>
  )
}
