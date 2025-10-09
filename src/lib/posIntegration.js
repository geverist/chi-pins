// src/lib/posIntegration.js
// POS (Point of Sale) Integration Stub
// Supports Square, Toast, Clover, and other POS systems

import { notifyOrderReady } from './vestaboard';

/**
 * POS Provider Types
 */
export const POS_PROVIDERS = {
  SQUARE: 'square',
  TOAST: 'toast',
  CLOVER: 'clover',
  CUSTOM: 'custom', // Generic webhook-based integration
};

/**
 * Square POS Integration (Stub)
 * Docs: https://developer.squareup.com/docs/orders-api/what-it-does
 */
export class SquarePOSClient {
  constructor(accessToken, locationId) {
    this.accessToken = accessToken;
    this.locationId = locationId;
    this.baseUrl = 'https://connect.squareup.com/v2';
  }

  /**
   * Poll for new orders (webhook alternative)
   * In production, use Square Webhooks instead
   */
  async pollOrders() {
    // TODO: Implement Square Orders API polling
    // https://developer.squareup.com/docs/orders-api/fetch-orders
    console.log('[Square POS] Polling for new orders...');
    throw new Error('Not implemented - Use Square Webhooks for production');
  }

  /**
   * Handle Square webhook event
   */
  async handleWebhookEvent(event) {
    // TODO: Implement Square webhook handler
    // https://developer.squareup.com/docs/webhooks/overview
    console.log('[Square POS] Received webhook:', event);

    if (event.type === 'order.updated' || event.type === 'order.fulfilled') {
      const order = event.data.object.order;

      return {
        orderNumber: order.id.slice(-6), // Last 6 chars of order ID
        customerName: order.customer?.given_name || 'Customer',
        status: order.state,
        items: order.line_items?.map(item => ({
          name: item.name,
          quantity: item.quantity,
        })) || [],
      };
    }

    return null;
  }
}

/**
 * Toast POS Integration (Stub)
 * Docs: https://doc.toasttab.com/
 */
export class ToastPOSClient {
  constructor(apiKey, restaurantGuid) {
    this.apiKey = apiKey;
    this.restaurantGuid = restaurantGuid;
    this.baseUrl = 'https://ws-api.toasttab.com';
  }

  /**
   * Handle Toast webhook event
   */
  async handleWebhookEvent(event) {
    // TODO: Implement Toast webhook handler
    console.log('[Toast POS] Received webhook:', event);

    if (event.eventType === 'ORDER_UPDATED') {
      const order = event.order;

      return {
        orderNumber: order.orderNumber || order.guid.slice(-6),
        customerName: order.customer?.firstName || 'Customer',
        status: order.state,
        items: order.checks?.[0]?.selections?.map(item => ({
          name: item.displayName,
          quantity: item.quantity,
        })) || [],
      };
    }

    return null;
  }
}

/**
 * Clover POS Integration (Stub)
 * Docs: https://docs.clover.com/docs
 */
export class CloverPOSClient {
  constructor(accessToken, merchantId) {
    this.accessToken = accessToken;
    this.merchantId = merchantId;
    this.baseUrl = 'https://api.clover.com/v3';
  }

  /**
   * Handle Clover webhook event
   */
  async handleWebhookEvent(event) {
    // TODO: Implement Clover webhook handler
    console.log('[Clover POS] Received webhook:', event);

    if (event.type === 'ORDER_ACTION' && event.action === 'PAID') {
      const order = event.object;

      return {
        orderNumber: order.orderNumber || order.id.slice(-6),
        customerName: order.customer?.firstName || 'Customer',
        status: order.state,
        items: order.lineItems?.elements?.map(item => ({
          name: item.name,
          quantity: 1, // Clover doesn't expose quantity directly
        })) || [],
      };
    }

    return null;
  }
}

/**
 * Generic Custom POS Integration
 * For webhook-based integrations with custom POS systems
 */
export class CustomPOSClient {
  /**
   * Handle custom webhook event
   * @param {Object} event - Raw webhook payload
   * @param {Function} transformer - Custom function to transform webhook data
   */
  async handleWebhookEvent(event, transformer) {
    console.log('[Custom POS] Received webhook:', event);

    if (typeof transformer === 'function') {
      return transformer(event);
    }

    // Default transformer - assumes specific format
    return {
      orderNumber: event.orderNumber || event.order_id || 'N/A',
      customerName: event.customerName || event.customer_name || 'Customer',
      status: event.status || 'ready',
      items: event.items || [],
    };
  }
}

/**
 * POS Manager - Unified interface for all POS providers
 */
export class POSManager {
  constructor(provider, config, adminSettings) {
    this.provider = provider;
    this.config = config;
    this.adminSettings = adminSettings;

    // Initialize appropriate client
    switch (provider) {
      case POS_PROVIDERS.SQUARE:
        this.client = new SquarePOSClient(config.accessToken, config.locationId);
        break;
      case POS_PROVIDERS.TOAST:
        this.client = new ToastPOSClient(config.apiKey, config.restaurantGuid);
        break;
      case POS_PROVIDERS.CLOVER:
        this.client = new CloverPOSClient(config.accessToken, config.merchantId);
        break;
      case POS_PROVIDERS.CUSTOM:
        this.client = new CustomPOSClient();
        break;
      default:
        throw new Error(`Unsupported POS provider: ${provider}`);
    }
  }

  /**
   * Handle incoming webhook event and optionally send to Vestaboard
   */
  async handleOrderWebhook(event, transformer = null) {
    try {
      // Parse order from webhook
      let order;
      if (this.provider === POS_PROVIDERS.CUSTOM && transformer) {
        order = await this.client.handleWebhookEvent(event, transformer);
      } else {
        order = await this.client.handleWebhookEvent(event);
      }

      if (!order) {
        console.log('[POS Manager] No order extracted from webhook');
        return null;
      }

      console.log('[POS Manager] Order received:', order);

      // Send to Vestaboard if enabled
      if (this.adminSettings?.vestaboardEnabled) {
        await notifyOrderReady(
          {
            customerName: order.customerName,
            orderNumber: order.orderNumber,
          },
          this.adminSettings.vestaboardEnabled
        );
      }

      return order;
    } catch (error) {
      console.error('[POS Manager] Error handling order webhook:', error);
      throw error;
    }
  }
}

/**
 * Example webhook handler for serverless function (Vercel/Netlify)
 */
export async function handlePOSWebhook(request, adminSettings) {
  const provider = request.headers['x-pos-provider'] || POS_PROVIDERS.SQUARE;
  const config = {
    // Load from environment variables
    accessToken: process.env.SQUARE_ACCESS_TOKEN || process.env.POS_ACCESS_TOKEN,
    locationId: process.env.SQUARE_LOCATION_ID,
    apiKey: process.env.TOAST_API_KEY,
    restaurantGuid: process.env.TOAST_RESTAURANT_GUID,
    merchantId: process.env.CLOVER_MERCHANT_ID,
  };

  const manager = new POSManager(provider, config, adminSettings);
  const body = await request.json();

  return manager.handleOrderWebhook(body);
}

/**
 * Singleton instance
 */
let posManagerInstance = null;

export function getPOSManager(provider, config, adminSettings) {
  if (!posManagerInstance || posManagerInstance.provider !== provider) {
    posManagerInstance = new POSManager(provider, config, adminSettings);
  }
  return posManagerInstance;
}
