// src/components/OrderConfirmation.jsx

export default function OrderConfirmation({ orderDetails, onClose }) {
  const { orderId, totalAmount, customerName, receiptUrl } = orderDetails;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10001,
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
          width: 500,
          padding: 40,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.1)',
          textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 48,
          }}
        >
          ✓
        </div>

        <h2 style={{ margin: '0 0 12px', color: '#f4f6f8', fontSize: 28 }}>
          Order Placed!
        </h2>

        <p style={{ margin: '0 0 32px', color: '#a7b0b8', fontSize: 16 }}>
          Thanks {customerName}! Your order has been placed successfully.
        </p>

        <div
          style={{
            padding: 20,
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.1)',
            marginBottom: 32,
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#a7b0b8', fontSize: 14, marginBottom: 4 }}>
              Order Number
            </div>
            <div style={{ color: '#f4f6f8', fontSize: 18, fontWeight: 600, fontFamily: 'monospace' }}>
              {orderId.substring(0, 8)}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ color: '#a7b0b8', fontSize: 14, marginBottom: 4 }}>
              Total
            </div>
            <div style={{ color: '#10b981', fontSize: 24, fontWeight: 600 }}>
              ${totalAmount.toFixed(2)}
            </div>
          </div>

          <div>
            <div style={{ color: '#a7b0b8', fontSize: 14, marginBottom: 4 }}>
              Pickup
            </div>
            <div style={{ color: '#f4f6f8', fontSize: 16 }}>
              Chicago Mike's • ASAP (15-20 min)
            </div>
          </div>
        </div>

        {receiptUrl && (
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              marginBottom: 16,
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 10,
              color: '#f4f6f8',
              textDecoration: 'none',
              fontSize: 16,
            }}
          >
            📄 View Receipt
          </a>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            fontSize: 18,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          aria-label="Close confirmation"
        >
          Done
        </button>
      </div>
    </div>
  );
}
