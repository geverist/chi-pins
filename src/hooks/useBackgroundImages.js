// src/hooks/useBackgroundImages.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook to fetch and manage background images
 */
export function useBackgroundImages() {
  const [backgrounds, setBackgrounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadBackgrounds();
  }, []);

  const loadBackgrounds = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('background_images')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (fetchError) {
        // Table doesn't exist yet - silently fail
        if (fetchError.code === 'PGRST204' || fetchError.code === 'PGRST205') {
          setBackgrounds([]);
          setError(null);
          return;
        }
        throw fetchError;
      }

      setBackgrounds(data || []);
    } catch (err) {
      console.warn('Background images not available:', err.message);
      setError(null); // Don't expose error to UI
      setBackgrounds([]);
    } finally {
      setLoading(false);
    }
  };

  const addBackground = async (file, name) => {
    try {
      // Upload file to storage
      const fileName = `bg-${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('background-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('background-images')
        .getPublicUrl(fileName);

      // Insert database record
      const { data: insertData, error: insertError } = await supabase
        .from('background_images')
        .insert({
          name: name || file.name,
          url: urlData.publicUrl,
          thumbnail_url: urlData.publicUrl, // Could generate thumbnail separately
          sort_order: backgrounds.length,
          active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Refresh list
      await loadBackgrounds();

      return insertData;
    } catch (err) {
      console.error('Failed to add background:', err);
      throw err;
    }
  };

  const deleteBackground = async (id, url) => {
    try {
      // Extract filename from URL
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('background-images')
        .remove([fileName]);

      if (storageError) {
        console.warn('Storage delete failed:', storageError);
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('background_images')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Refresh list
      await loadBackgrounds();
    } catch (err) {
      console.error('Failed to delete background:', err);
      throw err;
    }
  };

  const updateSortOrder = async (updates) => {
    try {
      // updates is array of {id, sort_order}
      const promises = updates.map(({ id, sort_order }) =>
        supabase
          .from('background_images')
          .update({ sort_order, updated_at: new Date().toISOString() })
          .eq('id', id)
      );

      await Promise.all(promises);
      await loadBackgrounds();
    } catch (err) {
      console.error('Failed to update sort order:', err);
      throw err;
    }
  };

  return {
    backgrounds,
    loading,
    error,
    addBackground,
    deleteBackground,
    updateSortOrder,
    refresh: loadBackgrounds,
  };
}
