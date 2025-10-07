// src/lib/tenancy.js
/**
 * Multi-Tenancy Management
 *
 * Provides tenant isolation and context management for EngageOS platform.
 * Each tenant (restaurant, med spa, hotel) operates independently with complete data isolation.
 */

import { getPersistentStorage } from './persistentStorage';

/**
 * Get current tenant ID from environment, subdomain, or URL
 */
export const getCurrentTenant = () => {
  // Priority order:
  // 1. Environment variable (for static deployments)
  // 2. Subdomain (chicago-mikes.chi-pins.com)
  // 3. URL parameter (?location=chicago-mikes)
  // 4. Local storage (cached tenant)

  const envTenant = import.meta.env.VITE_LOCATION_ID;
  if (envTenant) return envTenant;

  const subdomainTenant = getTenantFromSubdomain();
  if (subdomainTenant) return subdomainTenant;

  const urlTenant = getTenantFromURL();
  if (urlTenant) return urlTenant;

  // Note: getTenantFromCache is now async, so we need to handle this differently
  // The cached tenant will be loaded in initializeTenantContext
  // For synchronous calls, fall through to error

  throw new Error('No tenant context available. Cannot proceed.');
};

/**
 * Extract tenant from subdomain
 * Example: chicago-mikes.chi-pins.com → chicago-mikes
 */
export const getTenantFromSubdomain = () => {
  if (typeof window === 'undefined') return null;

  const hostname = window.location.hostname;

  // Production: tenant.chi-pins.com
  const prodMatch = hostname.match(/^([a-z0-9-]+)\.chi-pins\.com$/);
  if (prodMatch) return prodMatch[1];

  // Staging: tenant.chi-pins-staging.com
  const stagingMatch = hostname.match(/^([a-z0-9-]+)\.chi-pins-staging\.com$/);
  if (stagingMatch) return stagingMatch[1];

  // Custom domains: stored in database mapping
  // (Handle via API lookup for custom.example.com → tenant-id)

  return null;
};

/**
 * Extract tenant from URL parameters
 */
export const getTenantFromURL = () => {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  return params.get('location') || params.get('tenant') || params.get('t');
};

/**
 * Get cached tenant from persistent storage
 */
export const getTenantFromCache = async () => {
  if (typeof window === 'undefined') return null;

  try {
    const storage = getPersistentStorage();
    return await storage.get('current_tenant');
  } catch (error) {
    console.warn('Failed to read tenant from cache:', error);
    return null;
  }
};

/**
 * Cache tenant ID for faster subsequent loads
 * Uses persistent storage that survives APK updates
 */
export const cacheTenant = async (tenantId) => {
  if (typeof window === 'undefined') return;

  try {
    const storage = getPersistentStorage();
    await storage.set('current_tenant', tenantId);
  } catch (error) {
    console.warn('Failed to cache tenant:', error);
  }
};

/**
 * Clear cached tenant
 */
export const clearTenantCache = async () => {
  if (typeof window === 'undefined') return;

  try {
    const storage = getPersistentStorage();
    await storage.remove('current_tenant');
  } catch (error) {
    console.warn('Failed to clear tenant cache:', error);
  }
};

/**
 * Validate tenant exists and is active
 */
export const validateTenant = async (supabase, tenantId) => {
  const { data: tenant, error } = await supabase
    .from('locations')
    .select('id, name, status, industry, plan_tier')
    .eq('id', tenantId)
    .single();

  if (error || !tenant) {
    throw new Error(`Invalid tenant: ${tenantId}`);
  }

  if (tenant.status !== 'active') {
    throw new Error(`Tenant ${tenantId} is not active`);
  }

  return tenant;
};

/**
 * Set tenant context for database queries
 * This sets a Postgres session variable that RLS policies use
 */
export const setTenantContext = async (supabase, tenantId) => {
  const { error } = await supabase.rpc('set_tenant_context', {
    p_tenant_id: tenantId
  });

  if (error) {
    console.error('Failed to set tenant context:', error);
    throw new Error('Tenant context initialization failed');
  }

  console.log(`✅ Tenant context set: ${tenantId}`);
};

/**
 * Initialize tenant context on app load
 */
export const initializeTenantContext = async (supabase) => {
  try {
    const tenantId = getCurrentTenant();
    console.log(`Initializing tenant: ${tenantId}`);

    // Validate tenant
    const tenant = await validateTenant(supabase, tenantId);

    // Set database context
    await setTenantContext(supabase, tenantId);

    // Cache for next session
    cacheTenant(tenantId);

    return {
      tenantId,
      tenant,
      success: true
    };
  } catch (error) {
    console.error('Tenant initialization failed:', error);
    return {
      tenantId: null,
      tenant: null,
      success: false,
      error: error.message
    };
  }
};

/**
 * Get tenant configuration
 */
export const getTenantConfig = async (supabase, tenantId) => {
  const { data, error } = await supabase
    .from('tenant_config')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    console.warn('Failed to load tenant config:', error);
    return getDefaultTenantConfig();
  }

  return data;
};

/**
 * Default tenant configuration
 */
const getDefaultTenantConfig = () => ({
  features: {
    voice_assistant: false,
    photo_booth: true,
    analytics: true,
    multi_location: false,
    custom_branding: true
  },
  limits: {
    max_pins: 100,
    max_orders_per_month: 10000,
    max_storage_gb: 50,
    max_users: 20
  },
  integrations: {
    pos_enabled: false,
    email_enabled: true,
    sms_enabled: false
  },
  compliance: {
    hipaa_baa_signed: false,
    pci_compliant: false,
    gdpr_enabled: true
  }
});

/**
 * Check if tenant has feature enabled
 */
export const hasTenantFeature = (config, featureName) => {
  return config?.features?.[featureName] === true;
};

/**
 * Check if tenant has reached limit
 */
export const checkTenantLimit = (config, limitName, currentValue) => {
  const limit = config?.limits?.[limitName];
  if (!limit) return true;  // No limit set

  return currentValue < limit;
};

/**
 * Tenant-scoped query helper
 * Ensures all queries include tenant_id
 */
export const tenantQuery = (supabase, table) => {
  const tenantId = getCurrentTenant();

  return {
    select: (columns = '*') =>
      supabase.from(table).select(columns).eq('tenant_id', tenantId),

    insert: (data) =>
      supabase.from(table).insert(Array.isArray(data)
        ? data.map(item => ({ ...item, tenant_id: tenantId }))
        : { ...data, tenant_id: tenantId }
      ),

    update: (data) =>
      supabase.from(table).update(data).eq('tenant_id', tenantId),

    delete: () =>
      supabase.from(table).delete().eq('tenant_id', tenantId),

    upsert: (data) =>
      supabase.from(table).upsert(Array.isArray(data)
        ? data.map(item => ({ ...item, tenant_id: tenantId }))
        : { ...data, tenant_id: tenantId }
      )
  };
};

/**
 * Audit log for tenant activity
 */
export const logTenantActivity = async (supabase, activity) => {
  const tenantId = getCurrentTenant();

  await supabase.from('audit_logs').insert([{
    tenant_id: tenantId,
    user_id: activity.user_id || 'anonymous',
    action: activity.action,
    resource_type: activity.resource_type,
    resource_id: activity.resource_id,
    ip_address: activity.ip_address,
    user_agent: navigator?.userAgent || 'unknown',
    metadata: activity.metadata || {},
    timestamp: new Date().toISOString()
  }]);
};

/**
 * Get tenant display info
 */
export const getTenantInfo = async (supabase) => {
  const tenantId = getCurrentTenant();

  const { data, error } = await supabase
    .from('locations')
    .select('id, name, industry, branding, contact_info')
    .eq('id', tenantId)
    .single();

  if (error) {
    console.error('Failed to load tenant info:', error);
    return null;
  }

  return data;
};
