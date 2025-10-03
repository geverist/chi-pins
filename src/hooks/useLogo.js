// src/hooks/useLogo.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const LOGO_BUCKET = 'logo';
const LOGO_FILENAME = 'app-logo.png'; // Single logo file

export function useLogo() {
  const [logoUrl, setLogoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch the current logo URL
  const fetchLogo = async () => {
    try {
      setLoading(true);
      setError(null);

      // List files in the logo bucket
      const { data: files, error: listError } = await supabase.storage
        .from(LOGO_BUCKET)
        .list('', {
          limit: 1,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (listError) throw listError;

      if (files && files.length > 0) {
        // Get public URL for the logo
        const { data } = supabase.storage
          .from(LOGO_BUCKET)
          .getPublicUrl(files[0].name);

        setLogoUrl(data.publicUrl);
      } else {
        setLogoUrl(null);
      }
    } catch (err) {
      console.error('Error fetching logo:', err);
      setError(err.message);
      setLogoUrl(null);
    } finally {
      setLoading(false);
    }
  };

  // Upload a new logo
  const uploadLogo = async (file) => {
    try {
      setLoading(true);
      setError(null);

      // Delete existing logo first
      const { data: existingFiles } = await supabase.storage
        .from(LOGO_BUCKET)
        .list('');

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => f.name);
        await supabase.storage
          .from(LOGO_BUCKET)
          .remove(filesToDelete);
      }

      // Upload new logo with a unique filename to bust cache
      const timestamp = Date.now();
      const extension = file.name.split('.').pop();
      const filename = `logo-${timestamp}.${extension}`;

      const { data, error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET)
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(LOGO_BUCKET)
        .getPublicUrl(filename);

      setLogoUrl(urlData.publicUrl);
      return urlData.publicUrl;
    } catch (err) {
      console.error('Error uploading logo:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete the current logo
  const deleteLogo = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: files } = await supabase.storage
        .from(LOGO_BUCKET)
        .list('');

      if (files && files.length > 0) {
        const filesToDelete = files.map(f => f.name);
        const { error: deleteError } = await supabase.storage
          .from(LOGO_BUCKET)
          .remove(filesToDelete);

        if (deleteError) throw deleteError;
      }

      setLogoUrl(null);
    } catch (err) {
      console.error('Error deleting logo:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch logo on mount
  useEffect(() => {
    fetchLogo();
  }, []);

  return {
    logoUrl,
    loading,
    error,
    uploadLogo,
    deleteLogo,
    refreshLogo: fetchLogo
  };
}
