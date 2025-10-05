// src/components/MarketplaceAdmin.jsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Marketplace Admin Panel
 *
 * Separate from the kiosk admin panel - this is for EngageOS staff to manage:
 * - Widget catalog (add, edit, remove widgets)
 * - Integration catalog (3rd party services)
 * - Industry bundles & pricing
 * - Widget compatibility & dependencies
 * - Revenue analytics
 */

export default function MarketplaceAdmin() {
  const [activeTab, setActiveTab] = useState('widgets'); // widgets, integrations, bundles, analytics
  const [widgets, setWidgets] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingWidget, setEditingWidget] = useState(null);

  useEffect(() => {
    loadMarketplaceData();
  }, []);

  async function loadMarketplaceData() {
    setLoading(true);
    try {
      const [widgetsRes, integrationsRes, bundlesRes] = await Promise.all([
        supabase.from('marketplace_widgets').select('*').order('category', { ascending: true }),
        supabase.from('marketplace_integrations').select('*').order('category', { ascending: true }),
        supabase.from('marketplace_bundles').select('*, bundle_widgets(widget_id, widgets(name))').order('industry', { ascending: true })
      ]);

      if (widgetsRes.data) setWidgets(widgetsRes.data);
      if (integrationsRes.data) setIntegrations(integrationsRes.data);
      if (bundlesRes.data) setBundles(bundlesRes.data);
    } catch (error) {
      console.error('Error loading marketplace data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveWidget(widgetData) {
    try {
      if (widgetData.id) {
        // Update existing widget
        const { error } = await supabase
          .from('marketplace_widgets')
          .update(widgetData)
          .eq('id', widgetData.id);

        if (error) throw error;
      } else {
        // Create new widget
        const { error } = await supabase
          .from('marketplace_widgets')
          .insert([widgetData]);

        if (error) throw error;
      }

      await loadMarketplaceData();
      setEditingWidget(null);
      alert('Widget saved successfully!');
    } catch (error) {
      console.error('Error saving widget:', error);
      alert('Error saving widget: ' + error.message);
    }
  }

  async function deleteWidget(widgetId) {
    if (!confirm('Are you sure you want to delete this widget? This cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('marketplace_widgets')
        .delete()
        .eq('id', widgetId);

      if (error) throw error;

      await loadMarketplaceData();
      alert('Widget deleted successfully');
    } catch (error) {
      console.error('Error deleting widget:', error);
      alert('Error deleting widget: ' + error.message);
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <p>Loading marketplace data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🧩 EngageOS Marketplace Admin</h1>
        <p style={styles.subtitle}>Manage widgets, integrations, and bundles</p>
      </header>

      <nav style={styles.tabs}>
        <button
          style={activeTab === 'widgets' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('widgets')}
        >
          🎮 Widgets ({widgets.length})
        </button>
        <button
          style={activeTab === 'integrations' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('integrations')}
        >
          🔌 Integrations ({integrations.length})
        </button>
        <button
          style={activeTab === 'bundles' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('bundles')}
        >
          📦 Bundles ({bundles.length})
        </button>
        <button
          style={activeTab === 'analytics' ? styles.tabActive : styles.tab}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Analytics
        </button>
      </nav>

      <div style={styles.content}>
        {activeTab === 'widgets' && (
          <WidgetsTab
            widgets={widgets}
            onEdit={setEditingWidget}
            onDelete={deleteWidget}
            onSave={saveWidget}
            editingWidget={editingWidget}
            onCancelEdit={() => setEditingWidget(null)}
          />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsTab
            integrations={integrations}
            onRefresh={loadMarketplaceData}
          />
        )}

        {activeTab === 'bundles' && (
          <BundlesTab
            bundles={bundles}
            widgets={widgets}
            onRefresh={loadMarketplaceData}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// WIDGETS TAB
// ============================================================================

function WidgetsTab({ widgets, onEdit, onDelete, onSave, editingWidget, onCancelEdit }) {
  const categories = [...new Set(widgets.map(w => w.category))];

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <h2>Widget Catalog</h2>
        <button style={styles.btnPrimary} onClick={() => onEdit({
          name: '',
          slug: '',
          category: 'content',
          description: '',
          price_monthly: 49,
          features: [],
          compatibility: {},
          configuration_schema: {}
        })}>
          + Add New Widget
        </button>
      </div>

      {editingWidget && (
        <WidgetEditor
          widget={editingWidget}
          onSave={onSave}
          onCancel={onCancelEdit}
        />
      )}

      {categories.map(category => (
        <div key={category} style={styles.categorySection}>
          <h3 style={styles.categoryTitle}>
            {getCategoryIcon(category)} {category.toUpperCase()} WIDGETS
          </h3>
          <div style={styles.widgetGrid}>
            {widgets.filter(w => w.category === category).map(widget => (
              <WidgetCard
                key={widget.id}
                widget={widget}
                onEdit={() => onEdit(widget)}
                onDelete={() => onDelete(widget.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WidgetCard({ widget, onEdit, onDelete }) {
  return (
    <div style={styles.widgetCard}>
      <div style={styles.widgetCardHeader}>
        <h4 style={styles.widgetCardTitle}>{widget.name}</h4>
        <div style={styles.widgetCardPrice}>${widget.price_monthly}/mo</div>
      </div>

      <p style={styles.widgetCardDesc}>{widget.description}</p>

      {widget.features && widget.features.length > 0 && (
        <ul style={styles.widgetFeatures}>
          {widget.features.slice(0, 3).map((feature, i) => (
            <li key={i}>{feature}</li>
          ))}
          {widget.features.length > 3 && (
            <li style={styles.moreFeatures}>+{widget.features.length - 3} more...</li>
          )}
        </ul>
      )}

      <div style={styles.widgetCardFooter}>
        <div style={styles.widgetMeta}>
          <span style={styles.badge}>{widget.category}</span>
          {widget.active && <span style={styles.badgeActive}>Active</span>}
          {!widget.active && <span style={styles.badgeInactive}>Inactive</span>}
        </div>
        <div style={styles.widgetActions}>
          <button style={styles.btnEdit} onClick={onEdit}>Edit</button>
          <button style={styles.btnDelete} onClick={onDelete}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function WidgetEditor({ widget, onSave, onCancel }) {
  const [formData, setFormData] = useState(widget);

  function handleSubmit(e) {
    e.preventDefault();
    onSave(formData);
  }

  function updateField(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  return (
    <div style={styles.modal}>
      <div style={styles.modalContent}>
        <h3>{widget.id ? 'Edit Widget' : 'New Widget'}</h3>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <label style={styles.label}>
              Widget Name *
              <input
                type="text"
                value={formData.name}
                onChange={e => updateField('name', e.target.value)}
                style={styles.input}
                required
                placeholder="Gaming Widget"
              />
            </label>

            <label style={styles.label}>
              Slug *
              <input
                type="text"
                value={formData.slug}
                onChange={e => updateField('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                style={styles.input}
                required
                placeholder="gaming-widget"
              />
            </label>
          </div>

          <div style={styles.formRow}>
            <label style={styles.label}>
              Category *
              <select
                value={formData.category}
                onChange={e => updateField('category', e.target.value)}
                style={styles.input}
                required
              >
                <option value="content">Content</option>
                <option value="integration">Integration</option>
                <option value="analytics">Analytics</option>
                <option value="marketing">Marketing</option>
                <option value="revenue">Revenue</option>
                <option value="operations">Operations</option>
                <option value="customer">Customer</option>
                <option value="compliance">Compliance</option>
                <option value="ai">AI</option>
              </select>
            </label>

            <label style={styles.label}>
              Monthly Price ($) *
              <input
                type="number"
                value={formData.price_monthly}
                onChange={e => updateField('price_monthly', parseFloat(e.target.value))}
                style={styles.input}
                required
                min="0"
                step="1"
              />
            </label>
          </div>

          <label style={styles.label}>
            Description *
            <textarea
              value={formData.description}
              onChange={e => updateField('description', e.target.value)}
              style={{...styles.input, minHeight: '80px'}}
              required
              placeholder="What does this widget do?"
            />
          </label>

          <label style={styles.label}>
            Features (one per line)
            <textarea
              value={formData.features ? formData.features.join('\n') : ''}
              onChange={e => updateField('features', e.target.value.split('\n').filter(Boolean))}
              style={{...styles.input, minHeight: '120px'}}
              placeholder="Pre-built games&#10;Leaderboards&#10;Prize redemption"
            />
          </label>

          <div style={styles.formRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.active || false}
                onChange={e => updateField('active', e.target.checked)}
              />
              Active (visible in marketplace)
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.featured || false}
                onChange={e => updateField('featured', e.target.checked)}
              />
              Featured (show in recommended)
            </label>
          </div>

          <div style={styles.formActions}>
            <button type="button" style={styles.btnCancel} onClick={onCancel}>Cancel</button>
            <button type="submit" style={styles.btnSave}>Save Widget</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// INTEGRATIONS TAB
// ============================================================================

function IntegrationsTab({ integrations, onRefresh }) {
  const categories = [...new Set(integrations.map(i => i.category))];

  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <h2>Integration Catalog</h2>
        <button style={styles.btnPrimary}>+ Add New Integration</button>
      </div>

      {categories.map(category => (
        <div key={category} style={styles.categorySection}>
          <h3 style={styles.categoryTitle}>{category.toUpperCase()}</h3>
          <div style={styles.integrationList}>
            {integrations.filter(i => i.category === category).map(integration => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function IntegrationCard({ integration }) {
  return (
    <div style={styles.integrationCard}>
      <div style={styles.integrationHeader}>
        <div>
          <h4 style={styles.integrationName}>{integration.name}</h4>
          <p style={styles.integrationDesc}>{integration.description}</p>
        </div>
        <div style={styles.integrationPrice}>${integration.price_monthly}/mo</div>
      </div>

      {integration.industries && integration.industries.length > 0 && (
        <div style={styles.integrationIndustries}>
          <strong>Industries:</strong> {integration.industries.join(', ')}
        </div>
      )}

      <div style={styles.integrationFooter}>
        <span style={styles.badge}>{integration.api_type || 'REST API'}</span>
        {integration.oauth_supported && <span style={styles.badgeGreen}>OAuth</span>}
        {integration.webhook_supported && <span style={styles.badgeBlue}>Webhooks</span>}
        <div style={{flex: 1}}></div>
        <button style={styles.btnSmall}>Edit</button>
      </div>
    </div>
  );
}

// ============================================================================
// BUNDLES TAB
// ============================================================================

function BundlesTab({ bundles, widgets, onRefresh }) {
  return (
    <div style={styles.tabContent}>
      <div style={styles.tabHeader}>
        <h2>Industry Bundles</h2>
        <button style={styles.btnPrimary}>+ Create New Bundle</button>
      </div>

      <div style={styles.bundleGrid}>
        {bundles.map(bundle => (
          <BundleCard key={bundle.id} bundle={bundle} />
        ))}
      </div>
    </div>
  );
}

function BundleCard({ bundle }) {
  const savings = (bundle.original_price || 0) - (bundle.bundle_price || 0);
  const discountPercent = bundle.original_price ? Math.round((savings / bundle.original_price) * 100) : 0;

  return (
    <div style={styles.bundleCard}>
      <div style={styles.bundleHeader}>
        <h3 style={styles.bundleName}>{bundle.name}</h3>
        <div style={styles.bundleIndustry}>{bundle.industry}</div>
      </div>

      <p style={styles.bundleDesc}>{bundle.description}</p>

      <div style={styles.bundlePricing}>
        <div style={styles.bundleOriginalPrice}>${bundle.original_price}/mo</div>
        <div style={styles.bundleCurrentPrice}>${bundle.bundle_price}/mo</div>
        {savings > 0 && (
          <div style={styles.bundleSavings}>Save ${savings}/mo ({discountPercent}%)</div>
        )}
      </div>

      {bundle.bundle_widgets && bundle.bundle_widgets.length > 0 && (
        <div style={styles.bundleWidgets}>
          <strong>Includes:</strong>
          <ul>
            {bundle.bundle_widgets.map((bw, i) => (
              <li key={i}>{bw.widgets?.name || 'Unknown widget'}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={styles.bundleFooter}>
        {bundle.active && <span style={styles.badgeActive}>Active</span>}
        {!bundle.active && <span style={styles.badgeInactive}>Inactive</span>}
        <div style={{flex: 1}}></div>
        <button style={styles.btnSmall}>Edit</button>
      </div>
    </div>
  );
}

// ============================================================================
// ANALYTICS TAB
// ============================================================================

function AnalyticsTab() {
  const [stats, setStats] = useState({
    totalWidgets: 0,
    activeInstallations: 0,
    mrr: 0,
    topWidgets: [],
    topIndustries: []
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      // Get total widgets
      const { count: widgetCount } = await supabase
        .from('marketplace_widgets')
        .select('*', { count: 'exact', head: true });

      // Get active installations
      const { count: installCount } = await supabase
        .from('location_widgets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Get top widgets by installation count
      const { data: topWidgets } = await supabase
        .rpc('get_top_widgets', { limit_count: 10 });

      setStats({
        totalWidgets: widgetCount || 0,
        activeInstallations: installCount || 0,
        mrr: 0, // TODO: Calculate from location_widgets
        topWidgets: topWidgets || [],
        topIndustries: []
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }

  return (
    <div style={styles.tabContent}>
      <h2>Marketplace Analytics</h2>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.totalWidgets}</div>
          <div style={styles.statLabel}>Total Widgets</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.activeInstallations}</div>
          <div style={styles.statLabel}>Active Installations</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statValue}>${stats.mrr.toLocaleString()}</div>
          <div style={styles.statLabel}>Monthly Recurring Revenue</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statValue}>{stats.activeInstallations > 0 ? Math.round(stats.mrr / stats.activeInstallations) : 0}</div>
          <div style={styles.statLabel}>Avg Revenue per Location</div>
        </div>
      </div>

      <div style={styles.analyticsSection}>
        <h3>Top Widgets by Installation</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Widget</th>
              <th style={styles.th}>Category</th>
              <th style={styles.th}>Installations</th>
              <th style={styles.th}>MRR</th>
            </tr>
          </thead>
          <tbody>
            {stats.topWidgets.map((widget, i) => (
              <tr key={i}>
                <td style={styles.td}>{widget.name}</td>
                <td style={styles.td}>{widget.category}</td>
                <td style={styles.td}>{widget.installation_count}</td>
                <td style={styles.td}>${widget.mrr}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getCategoryIcon(category) {
  const icons = {
    content: '🎮',
    integration: '🔌',
    analytics: '📊',
    marketing: '🎯',
    revenue: '💰',
    operations: '🛠️',
    customer: '💬',
    compliance: '🔒',
    ai: '🤖'
  };
  return icons[category] || '📦';
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    color: 'white'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  },
  header: {
    textAlign: 'center',
    color: 'white',
    marginBottom: '40px'
  },
  title: {
    fontSize: '48px',
    fontWeight: 'bold',
    margin: '0 0 10px 0'
  },
  subtitle: {
    fontSize: '18px',
    opacity: 0.9,
    margin: 0
  },
  tabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    justifyContent: 'center',
    flexWrap: 'wrap'
  },
  tab: {
    padding: '12px 24px',
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    borderRadius: '8px',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontWeight: '500'
  },
  tabActive: {
    padding: '12px 24px',
    background: 'white',
    border: 'none',
    borderRadius: '8px',
    color: '#667eea',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: 'bold',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
  },
  content: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    minHeight: '600px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
  },
  tabContent: {
    width: '100%'
  },
  tabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px'
  },
  btnPrimary: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
  },
  categorySection: {
    marginBottom: '40px'
  },
  categoryTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: '15px',
    borderBottom: '2px solid #e5e7eb',
    paddingBottom: '10px'
  },
  widgetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px'
  },
  widgetCard: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '20px',
    transition: 'all 0.2s',
    cursor: 'pointer'
  },
  widgetCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },
  widgetCardTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
    color: '#1f2937'
  },
  widgetCardPrice: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#667eea',
    background: '#ede9fe',
    padding: '4px 12px',
    borderRadius: '6px'
  },
  widgetCardDesc: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '12px',
    lineHeight: '1.5'
  },
  widgetFeatures: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 15px 0',
    fontSize: '13px',
    color: '#4b5563'
  },
  moreFeatures: {
    color: '#667eea',
    fontStyle: 'italic'
  },
  widgetCardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb'
  },
  widgetMeta: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  widgetActions: {
    display: 'flex',
    gap: '8px'
  },
  badge: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    background: '#e5e7eb',
    color: '#4b5563',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  badgeActive: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    background: '#d1fae5',
    color: '#065f46',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  badgeInactive: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    background: '#fee2e2',
    color: '#991b1b',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  badgeGreen: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    background: '#d1fae5',
    color: '#065f46',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  badgeBlue: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    background: '#dbeafe',
    color: '#1e40af',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  btnEdit: {
    padding: '6px 12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  btnDelete: {
    padding: '6px 12px',
    background: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  btnSmall: {
    padding: '6px 12px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '600'
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  modalContent: {
    background: 'white',
    borderRadius: '12px',
    padding: '30px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  input: {
    padding: '10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb'
  },
  btnCancel: {
    padding: '10px 20px',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  btnSave: {
    padding: '10px 20px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  integrationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  integrationCard: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px'
  },
  integrationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px'
  },
  integrationName: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 4px 0'
  },
  integrationDesc: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0
  },
  integrationPrice: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#667eea'
  },
  integrationIndustries: {
    fontSize: '13px',
    color: '#4b5563',
    marginBottom: '12px'
  },
  integrationFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb'
  },
  bundleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '24px'
  },
  bundleCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
  },
  bundleHeader: {
    marginBottom: '12px'
  },
  bundleName: {
    fontSize: '22px',
    fontWeight: 'bold',
    margin: '0 0 8px 0'
  },
  bundleIndustry: {
    fontSize: '13px',
    textTransform: 'uppercase',
    fontWeight: '600',
    opacity: 0.9
  },
  bundleDesc: {
    fontSize: '14px',
    lineHeight: '1.6',
    marginBottom: '16px',
    opacity: 0.95
  },
  bundlePricing: {
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
  },
  bundleOriginalPrice: {
    fontSize: '14px',
    textDecoration: 'line-through',
    opacity: 0.7,
    marginBottom: '4px'
  },
  bundleCurrentPrice: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '4px'
  },
  bundleSavings: {
    fontSize: '13px',
    background: 'rgba(255, 255, 255, 0.2)',
    padding: '4px 8px',
    borderRadius: '4px',
    display: 'inline-block'
  },
  bundleWidgets: {
    fontSize: '13px',
    marginBottom: '16px'
  },
  bundleFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  statCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center'
  },
  statValue: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  statLabel: {
    fontSize: '14px',
    opacity: 0.9
  },
  analyticsSection: {
    marginBottom: '40px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '16px'
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid #e5e7eb',
    fontWeight: '600',
    color: '#374151'
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #e5e7eb',
    color: '#6b7280'
  }
};

// Add spinner animation to global styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
