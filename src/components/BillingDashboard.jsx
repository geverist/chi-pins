// Billing Dashboard Component - Manage subscription and view invoices
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatPrice } from '../lib/stripe'

export default function BillingDashboard({ userId }) {
  const [subscription, setSubscription] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [hardwareShipment, setHardwareShipment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadBillingData()
  }, [userId])

  const loadBillingData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (subError && subError.code !== 'PGRST116') { // Ignore "not found" errors
        throw subError
      }

      setSubscription(subData)

      if (subData) {
        // Load invoices
        const { data: invData, error: invError } = await supabase
          .from('invoices')
          .select('*')
          .eq('subscription_id', subData.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (invError) throw invError
        setInvoices(invData || [])

        // Load hardware shipment
        const { data: shipData, error: shipError } = await supabase
          .from('hardware_shipments')
          .select('*')
          .eq('subscription_id', subData.id)
          .single()

        if (shipError && shipError.code !== 'PGRST116') {
          throw shipError
        }

        setHardwareShipment(shipData)
      }
    } catch (err) {
      setError(err.message)
      console.error('Error loading billing data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will continue to have access until the end of your billing period.')) {
      return
    }

    try {
      // TODO: Call API to cancel subscription in Stripe
      alert('Subscription cancellation requested. Please contact support@agentiosk.com to complete cancellation.')
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading billing information...</div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <h2 style={styles.emptyTitle}>No Active Subscription</h2>
          <p style={styles.emptyText}>
            You don't have an active subscription yet.
          </p>
          <button
            onClick={() => window.location.href = '/signup'}
            style={styles.ctaButton}
          >
            Get Started
          </button>
        </div>
      </div>
    )
  }

  // Calculate monthly total
  const basePrice = subscription.base_price / 100
  const discount = subscription.discount_percent || 0
  const discountedBase = basePrice * (1 - discount / 100)

  const addonTotal = (subscription.addons || []).reduce((sum, addon) => {
    return sum + (addon.price / 100)
  }, 0)

  const monthlyTotal = (discountedBase + addonTotal) * subscription.locations

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Billing & Subscription</h1>
      </div>

      {error && (
        <div style={styles.error}>{error}</div>
      )}

      {/* Subscription Status Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Current Plan</h2>
          <div style={{
            ...styles.statusBadge,
            background: subscription.status === 'active' ? '#10b981' :
                       subscription.status === 'pending_hardware' ? '#f59e0b' :
                       subscription.status === 'past_due' ? '#ef4444' : '#6b7280'
          }}>
            {subscription.status === 'pending_hardware' ? 'Pending Hardware' :
             subscription.status === 'active' ? 'Active' :
             subscription.status === 'past_due' ? 'Past Due' :
             subscription.status}
          </div>
        </div>

        <div style={styles.cardContent}>
          <div style={styles.planInfo}>
            <div style={styles.planName}>
              {subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)} Plan
            </div>
            <div style={styles.planPrice}>
              {formatPrice(monthlyTotal * 100)}/month
            </div>
          </div>

          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <span style={styles.detailLabel}>Locations:</span>
              <span style={styles.detailValue}>{subscription.locations}</span>
            </div>

            {discount > 0 && (
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Volume Discount:</span>
                <span style={{...styles.detailValue, color: '#10b981'}}>{discount}%</span>
              </div>
            )}

            {subscription.billing_start_date && (
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Billing Started:</span>
                <span style={styles.detailValue}>
                  {new Date(subscription.billing_start_date).toLocaleDateString()}
                </span>
              </div>
            )}

            {subscription.current_period_end && (
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Next Billing Date:</span>
                <span style={styles.detailValue}>
                  {new Date(subscription.current_period_end).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Add-ons */}
          {subscription.addons && subscription.addons.length > 0 && (
            <div style={styles.addonsSection}>
              <h3 style={styles.sectionTitle}>Add-ons</h3>
              <ul style={styles.addonsList}>
                {subscription.addons.map((addon, idx) => (
                  <li key={idx} style={styles.addonItem}>
                    <span>{addon.name}</span>
                    <span>{formatPrice(addon.price)}/mo</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Breakdown */}
          <div style={styles.breakdown}>
            <div style={styles.breakdownLine}>
              <span>Base price × {subscription.locations}</span>
              <span>{formatPrice(basePrice * subscription.locations * 100)}</span>
            </div>

            {discount > 0 && (
              <div style={{...styles.breakdownLine, color: '#10b981'}}>
                <span>Volume discount ({discount}%)</span>
                <span>-{formatPrice((basePrice * subscription.locations * (discount / 100)) * 100)}</span>
              </div>
            )}

            {(subscription.addons || []).map((addon, idx) => (
              <div key={idx} style={styles.breakdownLine}>
                <span>{addon.name} × {subscription.locations}</span>
                <span>+{formatPrice((addon.price / 100) * subscription.locations * 100)}</span>
              </div>
            ))}

            <div style={styles.divider} />

            <div style={{...styles.breakdownLine, fontWeight: 700, fontSize: '16px'}}>
              <span>Monthly Total</span>
              <span>{formatPrice(monthlyTotal * 100)}</span>
            </div>
          </div>

          <div style={styles.cardActions}>
            <button
              onClick={() => alert('Feature coming soon!')}
              style={styles.secondaryButton}
            >
              Update Payment Method
            </button>
            <button
              onClick={handleCancelSubscription}
              style={styles.dangerButton}
            >
              Cancel Subscription
            </button>
          </div>
        </div>
      </div>

      {/* Hardware Shipment Card */}
      {hardwareShipment && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Hardware Shipment</h2>
            <div style={{
              ...styles.statusBadge,
              background: hardwareShipment.status === 'delivered' ? '#10b981' :
                         hardwareShipment.status === 'shipped' || hardwareShipment.status === 'in_transit' ? '#3b82f6' :
                         hardwareShipment.status === 'preparing' ? '#f59e0b' : '#6b7280'
            }}>
              {hardwareShipment.status.replace('_', ' ')}
            </div>
          </div>

          <div style={styles.cardContent}>
            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Package:</span>
                <span style={styles.detailValue}>
                  {hardwareShipment.package_type.charAt(0).toUpperCase() + hardwareShipment.package_type.slice(1)}
                </span>
              </div>

              {hardwareShipment.tracking_number && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Tracking:</span>
                  <span style={styles.detailValue}>
                    {hardwareShipment.tracking_url ? (
                      <a href={hardwareShipment.tracking_url} target="_blank" rel="noopener noreferrer" style={styles.link}>
                        {hardwareShipment.tracking_number}
                      </a>
                    ) : (
                      hardwareShipment.tracking_number
                    )}
                  </span>
                </div>
              )}

              {hardwareShipment.shipped_at && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Shipped:</span>
                  <span style={styles.detailValue}>
                    {new Date(hardwareShipment.shipped_at).toLocaleDateString()}
                  </span>
                </div>
              )}

              {hardwareShipment.estimated_delivery && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Est. Delivery:</span>
                  <span style={styles.detailValue}>
                    {new Date(hardwareShipment.estimated_delivery).toLocaleDateString()}
                  </span>
                </div>
              )}

              {hardwareShipment.delivered_at && (
                <div style={styles.detailItem}>
                  <span style={styles.detailLabel}>Delivered:</span>
                  <span style={styles.detailValue}>
                    {new Date(hardwareShipment.delivered_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {subscription.status === 'pending_hardware' && (
              <div style={styles.notice}>
                <strong>📦 Billing starts when hardware ships</strong>
                <p style={{margin: '8px 0 0 0', fontSize: '13px'}}>
                  You have access to all software features now. Monthly billing will begin automatically when your hardware is delivered.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invoices Card */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>Billing History</h2>
        </div>

        <div style={styles.cardContent}>
          {invoices.length === 0 ? (
            <p style={styles.emptyText}>No invoices yet. Your first invoice will be generated after your hardware ships.</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.tableHeaderCell}>Date</th>
                  <th style={styles.tableHeaderCell}>Invoice #</th>
                  <th style={styles.tableHeaderCell}>Amount</th>
                  <th style={styles.tableHeaderCell}>Status</th>
                  <th style={styles.tableHeaderCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </td>
                    <td style={styles.tableCell}>{invoice.invoice_number}</td>
                    <td style={styles.tableCell}>{formatPrice(invoice.total)}</td>
                    <td style={styles.tableCell}>
                      <span style={{
                        ...styles.statusBadge,
                        background: invoice.status === 'paid' ? '#10b981' :
                                   invoice.status === 'open' ? '#f59e0b' :
                                   invoice.status === 'void' ? '#6b7280' : '#ef4444'
                      }}>
                        {invoice.status}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      {invoice.hosted_invoice_url && (
                        <a
                          href={invoice.hosted_invoice_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={styles.link}
                        >
                          View
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1a1f26',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: '#6b7280',
  },
  error: {
    padding: '16px',
    background: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #fecaca',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    marginBottom: '24px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1a1f26',
    margin: 0,
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 700,
    color: 'white',
    textTransform: 'capitalize',
  },
  cardContent: {
    padding: '24px',
  },
  planInfo: {
    marginBottom: '24px',
  },
  planName: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '8px',
  },
  planPrice: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#667eea',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: 600,
  },
  detailValue: {
    fontSize: '15px',
    color: '#1a1f26',
    fontWeight: 600,
  },
  addonsSection: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '12px',
  },
  addonsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  addonItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    color: '#374151',
  },
  breakdown: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  breakdownLine: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    fontSize: '14px',
    color: '#374151',
  },
  divider: {
    height: '1px',
    background: '#e5e7eb',
    margin: '16px 0',
  },
  cardActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  secondaryButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#667eea',
    background: 'white',
    border: '2px solid #667eea',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  dangerButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#dc2626',
    background: 'white',
    border: '2px solid #dc2626',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  notice: {
    padding: '16px',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1e40af',
    marginTop: '16px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    borderBottom: '2px solid #e5e7eb',
  },
  tableHeaderCell: {
    padding: '12px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 700,
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    borderBottom: '1px solid #f3f4f6',
  },
  tableCell: {
    padding: '12px',
    fontSize: '14px',
    color: '#374151',
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: 600,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1a1f26',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '24px',
  },
  ctaButton: {
    padding: '14px 28px',
    fontSize: '16px',
    fontWeight: 700,
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
}
