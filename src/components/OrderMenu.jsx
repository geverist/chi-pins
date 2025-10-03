// src/components/OrderMenu.jsx
import { useState, useEffect } from 'react';
import { useOrderCart } from '../hooks/useOrderCart';
import CheckoutModal from './CheckoutModal';
import OrderConfirmation from './OrderConfirmation';
import { useFeatureIdleTimeout } from '../hooks/useFeatureIdleTimeout';
import { useAdminSettings } from '../state/useAdminSettings';

export default function OrderMenu({ onClose }) {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCheckout, setShowCheckout] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState(null);
  const { settings: adminSettings } = useAdminSettings();

  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, getTotalPrice, getTotalItems } = useOrderCart();

  // Idle timeout - close ordering and return to map
  useFeatureIdleTimeout(
    true, // Always active when OrderMenu is open
    onClose,
    adminSettings.orderingIdleTimeout || 300
  );

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/square-menu');
      if (!response.ok) {
        throw new Error('Failed to fetch menu');
      }
      const data = await response.json();
      setMenu(data.menu || []);
    } catch (err) {
      console.error('Error fetching menu:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...new Set(menu.map(item => item.category))];

  const filteredMenu = selectedCategory === 'all'
    ? menu
    : menu.filter(item => item.category === selectedCategory);

  const handleAddToCart = (item, variation) => {
    addToCart({
      itemId: item.id,
      variationId: variation.id,
      name: item.name,
      variationName: variation.name,
      price: variation.price,
      quantity: 1,
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1f26 0%, #242a33 100%)',
          borderRadius: 20,
          maxWidth: '95vw',
          maxHeight: '90vh',
          width: 1200,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
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
          <div>
            <h2 style={{ margin: 0, color: '#f4f6f8', fontSize: 28 }}>
              🍕 Order from Chicago Mike's
            </h2>
            {getTotalItems() > 0 && (
              <p style={{ margin: '4px 0 0', color: '#a7b0b8', fontSize: 14 }}>
                {getTotalItems()} items • ${getTotalPrice().toFixed(2)}
              </p>
            )}
          </div>
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
            aria-label="Close order menu"
          >
            ✕
          </button>
        </div>

        {/* Category Filter */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
          }}
        >
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: selectedCategory === cat
                  ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                  : 'rgba(255,255,255,0.05)',
                color: '#f4f6f8',
                cursor: 'pointer',
                fontSize: 14,
                whiteSpace: 'nowrap',
              }}
            >
              {cat === 'all' ? 'All Items' : cat}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#a7b0b8' }}>
              Loading menu...
            </div>
          )}

          {error && (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                color: '#ef4444',
                background: 'rgba(239,68,68,0.1)',
                borderRadius: 12,
              }}
            >
              Error: {error}
            </div>
          )}

          {!loading && !error && filteredMenu.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#a7b0b8' }}>
              No menu items found
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 20,
            }}
          >
            {filteredMenu.map(item => (
              <div
                key={item.id}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 12,
                  padding: 16,
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <h3 style={{ margin: '0 0 8px', color: '#f4f6f8', fontSize: 18 }}>
                  {item.name}
                </h3>
                {item.description && (
                  <p style={{ margin: '0 0 12px', color: '#a7b0b8', fontSize: 14 }}>
                    {item.description}
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {item.variations.map(variation => (
                    <div
                      key={variation.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <div style={{ color: '#f4f6f8', fontSize: 14 }}>
                          {variation.name}
                        </div>
                        <div style={{ color: '#10b981', fontSize: 16, fontWeight: 600 }}>
                          ${variation.price.toFixed(2)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddToCart(item, variation)}
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          borderRadius: 8,
                          color: 'white',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                        aria-label={`Add ${item.name} ${variation.name} to cart`}
                      >
                        + Add
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Summary Footer */}
        {getTotalItems() > 0 && (
          <div
            style={{
              padding: '20px 24px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(0,0,0,0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ color: '#a7b0b8', fontSize: 14 }}>Total</div>
              <div style={{ color: '#f4f6f8', fontSize: 24, fontWeight: 600 }}>
                ${getTotalPrice().toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                borderRadius: 12,
                color: 'white',
                padding: '16px 32px',
                cursor: 'pointer',
                fontSize: 18,
                fontWeight: 600,
              }}
              aria-label="Proceed to checkout"
            >
              Checkout ({getTotalItems()})
            </button>
          </div>
        )}
      </div>

      {showCheckout && (
        <CheckoutModal
          cart={cart}
          totalPrice={getTotalPrice()}
          onClose={() => setShowCheckout(false)}
          onSuccess={(details) => {
            setShowCheckout(false);
            setOrderConfirmation(details);
            clearCart();
          }}
        />
      )}

      {orderConfirmation && (
        <OrderConfirmation
          orderDetails={orderConfirmation}
          onClose={() => {
            setOrderConfirmation(null);
            onClose();
          }}
        />
      )}
    </div>
  );
}
