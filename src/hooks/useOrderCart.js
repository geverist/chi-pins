// src/hooks/useOrderCart.js
import { useState } from 'react';

export function useOrderCart() {
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
    setCart(prevCart => {
      // Check if item already exists in cart
      const existingIndex = prevCart.findIndex(
        cartItem =>
          cartItem.itemId === item.itemId &&
          cartItem.variationId === item.variationId
      );

      if (existingIndex >= 0) {
        // Update quantity if item exists
        const newCart = [...prevCart];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + item.quantity,
        };
        return newCart;
      } else {
        // Add new item
        return [...prevCart, item];
      }
    });
  };

  const removeFromCart = (itemId, variationId) => {
    setCart(prevCart =>
      prevCart.filter(item =>
        !(item.itemId === itemId && item.variationId === variationId)
      )
    );
  };

  const updateQuantity = (itemId, variationId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId, variationId);
      return;
    }

    setCart(prevCart => {
      const newCart = [...prevCart];
      const index = newCart.findIndex(
        item => item.itemId === itemId && item.variationId === variationId
      );

      if (index >= 0) {
        newCart[index] = { ...newCart[index], quantity };
      }

      return newCart;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
  };
}
