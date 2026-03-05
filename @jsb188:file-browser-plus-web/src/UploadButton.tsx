import { MAX_FILE_SIZE_CLIENT } from '@jsb188/app/constants/app.ts';
import i18n from '@jsb188/app/i18n/index.ts';
import { formatBytes } from '@jsb188/app/utils/number.ts';
import { addFragmentToCache, updateFragment } from '@jsb188/graphql/cache';
import { useCreateSignedUploadUrl } from '@jsb188/graphql/hooks/use-storage-mtn';
import { useMounted } from '@jsb188/react/hooks';
import { useOpenModalPopUp, useUploadActions } from '@jsb188/react/states';
import { forwardRef, useImperativeHandle, useRef, type ChangeEvent } from 'react';
import { uploadFileToGCS } from './googleStorage';

/**
 * Imperative handlers exposed by UploadInput.
 */

export interface UploadInputRef {
  click: () => void;
  upload: (options?: { doNotClearInput?: boolean }) => Promise<boolean>;
  startUpload: (options?: { doNotClearInput?: boolean }) => Promise<boolean>;
  clearPickedFile: () => void;
}

/**
 * Hidden file input component that exposes a click handler via ref.
 */

export interface UploadInputProps {
  disabled?: boolean;
  acceptedFileTypes?: string;
  organizationId?: string | null;
  maxFileSize?: number;
  initiateUploadOnPick?: boolean;
  onChangeFile?: (file: UploadInputFileObj | null) => void;
  removeProgressAfterUpload?: boolean;
  reactiveFragmentName?: string;
  dataFragmentName?: string;
  dataObject?: Record<string, any> | ((file: File) => Record<string, any>);
  uploadIntent: {
    intent: string; // See STORAGE_INTENT_ENUMS in [/constants/storage.ts]
    entries: string[][];
  };
}

/**
 * File details emitted when the selected file changes.
 */

export interface UploadInputFileObj {
  name: string;
  size: number;
  contentType: string;
  lastModified: number;
  file: File;
}

export const UploadInput = forwardRef<UploadInputRef, UploadInputProps>((p, ref) => {
  const {
    disabled,
    acceptedFileTypes,
    organizationId,
    uploadIntent,
    initiateUploadOnPick = false,
    onChangeFile,
    dataObject,
    reactiveFragmentName = '$storageFileFragment',
    dataFragmentName = '$storageFileFragment',
    removeProgressAfterUpload,
  } = p;

  const maxFileSize = p.maxFileSize || MAX_FILE_SIZE_CLIENT;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickedFileRef = useRef<File | null>(null);
  const mounted = useMounted();
  const openModalPopUp = useOpenModalPopUp();
  const { createSignedUploadUrl, updateObservers } = useCreateSignedUploadUrl({}, openModalPopUp);
  const { startUploadProgress, updateUploadProgress, removeUploadProgress } = useUploadActions();

  /**
   * Handle file selection and upload flow.
   */

  const startFileUpload = async (file: File): Promise<boolean> => {
    if (file.size > maxFileSize) {
      openModalPopUp(null, {
        statusCode: 400,
        errorCode: '20064',
        title: i18n.t('error.file_too_large'),
        message: i18n.t('error.file_too_large_msg', { maxFileSize: formatBytes(maxFileSize) }),
      });
      return false;
    }

    if (!organizationId || !uploadIntent) {
      return false;
    }

    const dataObjectValues = typeof dataObject === 'function' ? dataObject(file) : dataObject;

    let signedUrlResult: any = null;
    try {
      const result = await createSignedUploadUrl({
        variables: {
          organizationId,
          fileName: file.name,
          contentType: file.type,
          fileSize: file.size,
          uploadIntent,
        },
      });
      signedUrlResult = result?.createSignedUploadUrl;
    } catch {
      return false;
    }

    if (!mounted.current) {
      return false;
    }

    const { id, signedUrl, fileUri } = signedUrlResult || {};
    if (!id || !signedUrl || !fileUri) {
      return false;
    }

    let uploadObj = {
      __reactiveFragmentName: reactiveFragmentName,
      ...(dataObjectValues || {
        name: file.name,
        uri: undefined,
        contentType: file.type,
        at: (new Date()).toISOString(),
      }),
      id,
      uri: fileUri,
      uploadStatus: 'UPLOADING' as const,
    };

    addFragmentToCache(`${dataFragmentName}:${uploadObj.id}`, uploadObj);
    startUploadProgress(fileUri);

    try {
      await uploadFileToGCS(signedUrl, file, (progress) => {
        updateUploadProgress(fileUri, progress);
      });

      if (!mounted.current) {
        return false;
      }

      if (removeProgressAfterUpload) {
        removeUploadProgress(fileUri);
      }

      updateFragment(`${dataFragmentName}:${uploadObj.id}`, uploadObj, null, false, updateObservers);
      return true;
    } catch (_err) {
      if (!mounted.current) {
        return false;
      }

      if (removeProgressAfterUpload) {
        removeUploadProgress(fileUri);
      }

      updateFragment(
        `${dataFragmentName}:${uploadObj.id}`,
        {
          ...uploadObj,
          uploadStatus: 'ERROR',
        },
        null,
        false,
        updateObservers,
      );

      openModalPopUp(null, {
        statusCode: 400,
        errorCode: '30031',
        title: i18n.t('error.30031_title'),
        message: i18n.t('error.30031'),
      });
      return false;
    }
  };

  /**
   * Emit selected-file details to external listeners.
   */

  const emitChangeFile = (file: File | null) => {
    if (file) {
      onChangeFile?.({
        name: file.name,
        size: file.size,
        contentType: file.type,
        lastModified: file.lastModified,
        file,
      });
      return;
    }

    onChangeFile?.(null);
  };

  /**
   * Clear selected file from local state and notify listeners.
   */

  const clearPickedFile = () => {
    pickedFileRef.current = null;
    emitChangeFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Start upload for the currently selected file.
   */

  const startPickedFileUpload = async (options?: { doNotClearInput?: boolean }): Promise<boolean> => {
    const pickedFile = pickedFileRef.current;
    if (!pickedFile) {
      return false;
    }

    if (!options?.doNotClearInput) {
      clearPickedFile();
    }

    return await startFileUpload(pickedFile);
  };

  /**
   * Handle native file selection and optionally start upload.
   */

  const handleChangeFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    pickedFileRef.current = file || null;
    emitChangeFile(file || null);

    if (file && initiateUploadOnPick) {
      void startPickedFileUpload();
    }

    // Allow selecting the same file again in future picks.
    e.target.value = '';
  };

  useImperativeHandle(ref, () => ({
    click: () => {
      if (disabled) {
        return;
      }
      fileInputRef.current?.click();
    },
    upload: startPickedFileUpload,
    startUpload: startPickedFileUpload,
    clearPickedFile,
  }), [disabled, startPickedFileUpload]);

  return <input
    ref={fileInputRef}
    type='file'
    accept={acceptedFileTypes}
    className='hidden'
    onChange={handleChangeFile}
  />;
});

UploadInput.displayName = 'UploadInput';
