// src/hooks/useThenAndNow.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook to fetch and manage Then & Now historical photo comparisons
 */
export function useThenAndNow() {
  const [comparisons, setComparisons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadComparisons();
  }, []);

  const loadComparisons = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('then_and_now')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (fetchError) {
        // Table doesn't exist yet - silently fail
        if (fetchError.code === 'PGRST204' || fetchError.code === 'PGRST116') {
          setComparisons([]);
          setError(null);
          return;
        }
        throw fetchError;
      }

      setComparisons(data || []);
    } catch (err) {
      console.warn('Then & Now comparisons not available:', err.message);
      setError(null); // Don't expose error to UI
      setComparisons([]);
    } finally {
      setLoading(false);
    }
  };

  const addComparison = async (comparisonData) => {
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('then_and_now')
        .insert({
          location: comparisonData.location,
          then_year: comparisonData.thenYear,
          then_description: comparisonData.thenDescription,
          then_image_url: comparisonData.thenImageUrl,
          now_year: comparisonData.nowYear || '2024',
          now_description: comparisonData.nowDescription,
          now_image_url: comparisonData.nowImageUrl,
          display_order: comparisons.length,
          active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Refresh list
      await loadComparisons();

      return insertData;
    } catch (err) {
      console.error('Failed to add comparison:', err);
      throw err;
    }
  };

  const uploadImage = async (file, type = 'then') => {
    try {
      // Upload file to storage
      const fileName = `${type}-${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('then-now-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('then-now-images')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Failed to upload image:', err);
      throw err;
    }
  };

  const updateComparison = async (id, updates) => {
    try {
      const { data, error: updateError } = await supabase
        .from('then_and_now')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Refresh list
      await loadComparisons();

      return data;
    } catch (err) {
      console.error('Failed to update comparison:', err);
      throw err;
    }
  };

  const deleteComparison = async (id, thenImageUrl, nowImageUrl) => {
    try {
      // Extract filenames from URLs and delete from storage
      const deleteImageFromUrl = async (url) => {
        try {
          const urlObj = new URL(url);
          const pathParts = urlObj.pathname.split('/');
          const fileName = pathParts[pathParts.length - 1];

          const { error: storageError } = await supabase.storage
            .from('then-now-images')
            .remove([fileName]);

          if (storageError) {
            console.warn('Storage delete failed:', storageError);
          }
        } catch (err) {
          console.warn('Failed to parse image URL:', err);
        }
      };

      // Delete both images from storage
      await deleteImageFromUrl(thenImageUrl);
      await deleteImageFromUrl(nowImageUrl);

      // Delete from database
      const { error: dbError } = await supabase
        .from('then_and_now')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Refresh list
      await loadComparisons();
    } catch (err) {
      console.error('Failed to delete comparison:', err);
      throw err;
    }
  };

  const updateSortOrder = async (updates) => {
    try {
      // updates is array of {id, display_order}
      const promises = updates.map(({ id, display_order }) =>
        supabase
          .from('then_and_now')
          .update({ display_order, updated_at: new Date().toISOString() })
          .eq('id', id)
      );

      await Promise.all(promises);
      await loadComparisons();
    } catch (err) {
      console.error('Failed to update sort order:', err);
      throw err;
    }
  };

  return {
    comparisons,
    loading,
    error,
    addComparison,
    uploadImage,
    updateComparison,
    deleteComparison,
    updateSortOrder,
    refresh: loadComparisons,
  };
}
