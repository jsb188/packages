import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';

/**
 * Types
 */

interface UploadEntry {
  progress: number;
}

type UploadsMap = Record<string, UploadEntry>;

/**
 * Uploads; state
 */

const uploadsState = atom<UploadsMap>({});

/**
 * Export; get uploads state value
 */

export function useUploadsValue() {
  return useAtomValue(uploadsState);
}

/**
 * Export; upload state helpers
 */

export function useUploadActions() {
  const uploads = useAtomValue(uploadsState);
  const setUploads = useSetAtom(uploadsState);

  const startUploadProgress = useCallback((signedUrl: string) => {
    setUploads((prev) => ({
      ...prev,
      [signedUrl]: { progress: 0 },
    }));
  }, [setUploads]);

  const updateUploadProgress = useCallback((signedUrl: string, progress: number) => {
    setUploads((prev) => ({
      ...prev,
      [signedUrl]: { progress },
    }));
  }, [setUploads]);

  const removeUploadProgress = useCallback((signedUrl: string) => {
    setUploads((prev) => {
      const { [signedUrl]: _, ...rest } = prev;
      return rest;
    });
  }, [setUploads]);

  return { uploads, startUploadProgress, updateUploadProgress, removeUploadProgress };
}
