# Square POS Integration Setup Guide

This guide will help you configure Square ordering for Chicago Mike's in the Chi-Pins app.

## Prerequisites

1. A Square account (sign up at https://squareup.com)
2. A Square Developer account (https://developer.squareup.com)
3. Your menu items configured in the Square Dashboard

## Step 1: Create a Square Application

1. Go to https://developer.squareup.com/apps
2. Click "Create App" or use an existing app
3. Note your **Application ID** and **Access Token**

## Step 2: Get Your Location ID

1. In your Square Dashboard, go to **Account & Settings** > **Business** > **Locations**
2. Note your **Location ID** for the Chicago Mike's location
3. Or use the Square API to list locations: `GET /v2/locations`

## Step 3: Configure Your Menu in Square

1. Log into your Square Dashboard
2. Go to **Items & Orders** > **Items Library**
3. Add your menu items with:
   - Item name (e.g., "Deep Dish Pizza")
   - Description
   - Categories (e.g., "Pizza", "Sandwiches", "Drinks")
   - Variations (e.g., "Small - $12.99", "Large - $18.99")
   - Photos (optional but recommended)

## Step 4: Set Environment Variables

Add these to your `.env` file:

```bash
# Server-side (kept secret, never exposed to client)
SQUARE_ACCESS_TOKEN=your_access_token_here
SQUARE_LOCATION_ID=your_location_id_here

# Client-side (public, used for Web Payments SDK)
VITE_SQUARE_APPLICATION_ID=your_application_id_here
VITE_SQUARE_LOCATION_ID=your_location_id_here
```

⚠️ **Important**: `SQUARE_ACCESS_TOKEN` should NEVER be prefixed with `VITE_` as it's a secret token. Only the application ID and location ID are safe to expose client-side.

## Step 5: Deploy to Vercel

The API endpoints are serverless functions that will automatically deploy with your Vercel project:

- `/api/square-menu` - Fetches menu items
- `/api/square-create-order` - Creates orders
- `/api/square-create-payment` - Processes payments

### Vercel Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add all four Square variables from Step 4
4. Redeploy your app

## Step 6: Test the Integration

### Development (Sandbox Mode)

1. Use Square's Sandbox credentials for testing
2. Test card number: `4111 1111 1111 1111`
3. CVV: any 3 digits
4. Expiration: any future date

### Production

1. Switch to production credentials in `.env`
2. Orders will appear in your Square Dashboard
3. Customers will be charged for real

## API Endpoints

### GET /api/square-menu

Fetches catalog items from Square.

**Response:**
```json
{
  "menu": [
    {
      "id": "ITEM_ID",
      "name": "Deep Dish Pizza",
      "description": "Chicago-style deep dish",
      "category": "Pizza",
      "variations": [
        {
          "id": "VARIATION_ID",
          "name": "Large",
          "price": 18.99,
          "currency": "USD"
        }
      ]
    }
  ],
  "locationId": "LOCATION_ID"
}
```

### POST /api/square-create-order

Creates an order in Square.

**Request:**
```json
{
  "lineItems": [
    {
      "catalogObjectId": "VARIATION_ID",
      "quantity": 2
    }
  ],
  "customerName": "John Doe",
  "customerPhone": "+13125550123",
  "fulfillmentType": "PICKUP"
}
```

### POST /api/square-create-payment

Processes payment for an order.

**Request:**
```json
{
  "sourceId": "CARD_TOKEN_FROM_WEB_SDK",
  "orderId": "ORDER_ID",
  "amountMoney": {
    "amount": 3799,
    "currency": "USD"
  },
  "customerName": "John Doe"
}
```

## User Flow

1. Customer clicks **🍕 Order Now** in footer
2. Browses menu pulled from Square Catalog
3. Adds items to cart
4. Clicks **Checkout**
5. Enters name and phone number
6. Enters payment details (Square Web Payments SDK)
7. Order is created and payment processed
8. Order appears in Square POS for fulfillment
9. Customer sees confirmation with order number

## Troubleshooting

### "Square API not configured" error
- Check that environment variables are set correctly
- Verify `SQUARE_ACCESS_TOKEN` doesn't have `VITE_` prefix
- Redeploy after adding variables

### Menu not loading
- Verify you have items in Square Dashboard
- Check items have at least one variation with a price
- Look at browser console for API errors

### Payment fails
- Verify Square Application ID is correct
- Check you're using correct sandbox vs production credentials
- Ensure location ID matches your Square account

### Orders not appearing in Square POS
- Verify `SQUARE_LOCATION_ID` is correct
- Check that orders are marked as "PICKUP" fulfillment
- Ensure payment completed successfully

## Security Notes

- Never commit `.env` to git
- Use Vercel's environment variables for production
- Access tokens should be kept server-side only
- Web Payments SDK handles PCI compliance
- Customer payment details never touch your server

## Support

- Square API Docs: https://developer.squareup.com/docs
- Square Support: https://squareup.com/help
- Web Payments SDK: https://developer.squareup.com/docs/web-payments/overview
