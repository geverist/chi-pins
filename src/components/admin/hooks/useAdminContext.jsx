// src/components/admin/hooks/useAdminContext.js
// Shared admin panel state and actions

import { createContext, useContext, useState, useCallback } from 'react';
import { useAdminSettings } from '../../../state/useAdminSettings';
import { useNavigationSettings } from '../../../hooks/useNavigationSettings';
import { useBackgroundImages } from '../../../hooks/useBackgroundImages';
import { useLogo } from '../../../hooks/useLogo';
import { useMediaFiles } from '../../../hooks/useMediaFiles';
import { useThenAndNow } from '../../../hooks/useThenAndNow';
import { useNowPlaying } from '../../../state/useNowPlaying';

const AdminContext = createContext(null);

export function AdminProvider({ children }) {
  // Core hooks
  const { settings: adminSettings, save: saveAdminSettings, DEFAULTS } = useAdminSettings();
  const { settings: navSettings, updateSettings: updateNavSettings, loading: navLoading } = useNavigationSettings();
  const { backgrounds, loading: bgLoading, addBackground, deleteBackground } = useBackgroundImages();
  const { logoUrl, loading: logoLoading, uploadLogo, deleteLogo } = useLogo();
  const { mediaFiles, loading: mediaLoading, uploading: mediaUploading, uploadMediaFile, deleteMediaFile, updateMediaFile } = useMediaFiles();
  const { comparisons: thenAndNowComparisons, loading: thenAndNowLoading, addComparison, uploadImage: uploadThenNowImage, deleteComparison, updateComparison } = useThenAndNow();
  const { stopAll, currentTrack, queue } = useNowPlaying();

  // Local state
  const [settings, setSettings] = useState(adminSettings);
  const [toast, setToast] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Save function
  const saveAllSettings = useCallback(async () => {
    try {
      await saveAdminSettings(settings);
      setHasUnsavedChanges(false);
      setToast({ type: 'success', message: 'Settings saved successfully!' });
      setTimeout(() => setToast(null), 3000);
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      setToast({ type: 'error', message: 'Failed to save settings' });
      setTimeout(() => setToast(null), 3000);
      return false;
    }
  }, [settings, saveAdminSettings]);

  // Update setting helper
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  }, []);

  const value = {
    // Settings
    settings,
    setSettings,
    updateSetting,
    DEFAULTS,

    // Navigation
    navSettings,
    updateNavSettings,
    navLoading,

    // Media
    backgrounds,
    bgLoading,
    addBackground,
    deleteBackground,
    logoUrl,
    logoLoading,
    uploadLogo,
    deleteLogo,
    mediaFiles,
    mediaLoading,
    mediaUploading,
    uploadMediaFile,
    deleteMediaFile,
    updateMediaFile,

    // Then & Now
    thenAndNowComparisons,
    thenAndNowLoading,
    addComparison,
    uploadThenNowImage,
    deleteComparison,
    updateComparison,

    // Now Playing
    stopAll,
    currentTrack,
    queue,

    // Actions
    saveAllSettings,
    hasUnsavedChanges,

    // Toast
    toast,
    setToast,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminContext must be used within AdminProvider');
  }
  return context;
}
