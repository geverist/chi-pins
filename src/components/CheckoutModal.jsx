// src/components/CheckoutModal.jsx
import { useState, useEffect } from 'react';

export default function CheckoutModal({ cart, totalPrice, onClose, onSuccess }) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentForm, setPaymentForm] = useState(null);

  useEffect(() => {
    // Load Square Web Payments SDK
    if (!window.Square) {
      const script = document.createElement('script');
      script.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
      script.async = true;
      script.onload = initializeSquarePayments;
      document.body.appendChild(script);
    } else {
      initializeSquarePayments();
    }
  }, []);

  const initializeSquarePayments = async () => {
    try {
      // Get application ID from environment or use sandbox
      const applicationId = import.meta.env.VITE_SQUARE_APPLICATION_ID || 'sandbox-sq0idb-YOUR_APP_ID';
      const locationId = import.meta.env.VITE_SQUARE_LOCATION_ID || 'LXXXXXXXXX';

      if (!window.Square) {
        throw new Error('Square.js failed to load');
      }

      const payments = window.Square.payments(applicationId, locationId);
      const card = await payments.card();
      await card.attach('#card-container');

      setPaymentForm(card);
    } catch (err) {
      console.error('Failed to initialize Square payments:', err);
      setError('Failed to load payment form. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customerName || !customerPhone) {
      setError('Please enter your name and phone number');
      return;
    }

    if (!paymentForm) {
      setError('Payment form not ready. Please wait a moment and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Tokenize payment method
      const result = await paymentForm.tokenize();
      if (result.status === 'OK') {
        const token = result.token;

        // Step 1: Create order
        const orderResponse = await fetch('/api/square-create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lineItems: cart.map(item => ({
              catalogObjectId: item.variationId,
              quantity: item.quantity,
            })),
            customerName,
            customerPhone,
            fulfillmentType: 'PICKUP',
          }),
        });

        if (!orderResponse.ok) {
          const errorData = await orderResponse.json();
          throw new Error(errorData.error || 'Failed to create order');
        }

        const orderData = await orderResponse.json();

        // Step 2: Create payment
        const paymentResponse = await fetch('/api/square-create-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceId: token,
            orderId: orderData.orderId,
            amountMoney: {
              amount: Math.round(totalPrice * 100), // Convert to cents
              currency: 'USD',
            },
            customerName,
          }),
        });

        if (!paymentResponse.ok) {
          const errorData = await paymentResponse.json();
          throw new Error(errorData.error || 'Payment failed');
        }

        const paymentData = await paymentResponse.json();

        // Success!
        onSuccess({
          orderId: orderData.orderId,
          paymentId: paymentData.paymentId,
          receiptUrl: paymentData.receiptUrl,
          totalAmount: totalPrice,
          customerName,
          customerPhone,
        });
      } else {
        setError(result.errors?.[0]?.message || 'Payment tokenization failed');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'An error occurred during checkout');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        background: 'rgba(0,0,0,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(10px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1f26 0%, #242a33 100%)',
          borderRadius: 20,
          maxWidth: '95vw',
          maxHeight: '90vh',
          width: 600,
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, color: '#f4f6f8', fontSize: 24 }}>
            Checkout
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              color: '#f4f6f8',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: 16,
            }}
            aria-label="Close checkout"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {/* Order Summary */}
          <div
            style={{
              marginBottom: 24,
              padding: 16,
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <h3 style={{ margin: '0 0 12px', color: '#f4f6f8', fontSize: 18 }}>
              Order Summary
            </h3>
            {cart.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 0',
                  color: '#a7b0b8',
                  fontSize: 14,
                }}
              >
                <span>
                  {item.quantity}x {item.name} ({item.variationName})
                </span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                color: '#f4f6f8',
                fontSize: 18,
                fontWeight: 600,
              }}
            >
              <span>Total</span>
              <span>${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          {/* Customer Info */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 8,
                color: '#f4f6f8',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Your Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="John Doe"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                color: '#f4f6f8',
                fontSize: 16,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 8,
                color: '#f4f6f8',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Phone Number
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="(312) 555-0123"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                color: '#f4f6f8',
                fontSize: 16,
                outline: 'none',
              }}
            />
          </div>

          {/* Payment Card */}
          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: 'block',
                marginBottom: 8,
                color: '#f4f6f8',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Payment Information
            </label>
            <div
              id="card-container"
              style={{
                minHeight: 100,
                padding: 12,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8,
                color: '#ef4444',
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 12,
              border: 'none',
              background: loading
                ? 'rgba(100,100,100,0.5)'
                : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              fontSize: 18,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            aria-label="Place order"
          >
            {loading ? 'Processing...' : `Pay $${totalPrice.toFixed(2)}`}
          </button>
        </form>
      </div>
    </div>
  );
}
