// src/hooks/useModalManager.js
import { useState, useCallback } from 'react';

/**
 * Centralized modal state management
 * Manages all modal open/close states in the application
 */
export function useModalManager() {
  // Share modals
  const [shareOpen, setShareOpen] = useState(false);
  const [pinShareOpen, setPinShareOpen] = useState(false);

  // Message/Communication modals
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // Navigation/Feature modals
  const [orderMenuOpen, setOrderMenuOpen] = useState(false);
  const [jukeboxOpen, setJukeboxOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [photoBoothOpen, setPhotoBoothOpen] = useState(false);
  const [thenAndNowOpen, setThenAndNowOpen] = useState(false);

  // Admin modal
  const [adminOpen, setAdminOpen] = useState(false);

  /**
   * Close all modals at once
   * Useful for idle reset and cleanup
   */
  const closeAllModals = useCallback(() => {
    setShareOpen(false);
    setPinShareOpen(false);
    setMessageModalOpen(false);
    setCommentsOpen(false);
    setOrderMenuOpen(false);
    setJukeboxOpen(false);
    setGamesOpen(false);
    setPhotoBoothOpen(false);
    setThenAndNowOpen(false);
    setAdminOpen(false);
  }, []);

  return {
    // Share modals
    shareOpen,
    setShareOpen,
    pinShareOpen,
    setPinShareOpen,

    // Message modals
    messageModalOpen,
    setMessageModalOpen,
    commentsOpen,
    setCommentsOpen,

    // Feature modals
    orderMenuOpen,
    setOrderMenuOpen,
    jukeboxOpen,
    setJukeboxOpen,
    gamesOpen,
    setGamesOpen,
    photoBoothOpen,
    setPhotoBoothOpen,
    thenAndNowOpen,
    setThenAndNowOpen,

    // Admin
    adminOpen,
    setAdminOpen,

    // Utilities
    closeAllModals,
  };
}
