// src/hooks/useMediaFiles.js
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const BUCKET_NAME = 'media-files';

export function useMediaFiles() {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Load all media files
  const loadMediaFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('media_files')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Get public URLs for each file
      const filesWithUrls = await Promise.all(
        (data || []).map(async (file) => {
          const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(file.storage_path);

          return {
            ...file,
            url: urlData.publicUrl,
          };
        })
      );

      setMediaFiles(filesWithUrls);
    } catch (err) {
      console.error('Failed to load media files:', err);
      setError(err.message);
      setMediaFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload a new media file
  const uploadMediaFile = useCallback(async (file, metadata = {}) => {
    try {
      setUploading(true);
      setError(null);

      // Generate unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${timestamp}_${sanitizedName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get audio duration (if browser supports it)
      let duration = null;
      try {
        const audio = new Audio();
        const objectUrl = URL.createObjectURL(file);
        audio.src = objectUrl;
        await new Promise((resolve, reject) => {
          audio.addEventListener('loadedmetadata', () => {
            duration = Math.round(audio.duration);
            URL.revokeObjectURL(objectUrl);
            resolve();
          });
          audio.addEventListener('error', () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load audio metadata'));
          });
        });
      } catch (err) {
        console.warn('Could not extract audio duration:', err);
      }

      // Insert metadata into database
      const { data: dbData, error: dbError } = await supabase
        .from('media_files')
        .insert({
          filename: file.name,
          title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
          artist: metadata.artist || null,
          duration_seconds: duration,
          file_size_bytes: file.size,
          storage_path: storagePath,
          mime_type: file.type || 'audio/mpeg',
        })
        .select()
        .single();

      if (dbError) {
        // Cleanup: delete uploaded file if database insert fails
        await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
        throw dbError;
      }

      // Reload media files
      await loadMediaFiles();

      return dbData;
    } catch (err) {
      console.error('Failed to upload media file:', err);
      setError(err.message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [loadMediaFiles]);

  // Delete a media file
  const deleteMediaFile = useCallback(async (id, storagePath) => {
    try {
      setError(null);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('media_files')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Reload media files
      await loadMediaFiles();
    } catch (err) {
      console.error('Failed to delete media file:', err);
      setError(err.message);
      throw err;
    }
  }, [loadMediaFiles]);

  // Update media file metadata
  const updateMediaFile = useCallback(async (id, updates) => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('media_files')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) throw updateError;

      // Reload media files
      await loadMediaFiles();
    } catch (err) {
      console.error('Failed to update media file:', err);
      setError(err.message);
      throw err;
    }
  }, [loadMediaFiles]);

  // Load media files on mount
  useEffect(() => {
    loadMediaFiles();
  }, [loadMediaFiles]);

  return {
    mediaFiles,
    loading,
    error,
    uploading,
    uploadMediaFile,
    deleteMediaFile,
    updateMediaFile,
    reloadMediaFiles: loadMediaFiles,
  };
}
