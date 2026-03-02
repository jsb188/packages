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
}

/**
 * Hidden file input component that exposes a click handler via ref.
 */

export interface UploadInputProps {
  disabled?: boolean;
  acceptedFileTypes?: string;
  organizationId?: string | null;
  maxFileSize?: number;
  removeProgressAfterUpload?: boolean;
  reactiveFragmentName?: string;
  dataFragmentName?: string;
  dataObject?: Record<string, any> | ((file: File) => Record<string, any>);
  uploadIntent: {
    intent: string; // See STORAGE_INTENT_ENUMS in [/constants/storage.ts]
    entries: string[][];
  };
}

export const UploadInput = forwardRef<UploadInputRef, UploadInputProps>((p, ref) => {
  const {
    disabled,
    acceptedFileTypes,
    organizationId,
    uploadIntent,
    dataObject,
    reactiveFragmentName = '$storageFileFragment',
    dataFragmentName = '$storageFileFragment',
    removeProgressAfterUpload,
  } = p;

  const maxFileSize = p.maxFileSize || MAX_FILE_SIZE_CLIENT;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mounted = useMounted();
  const openModalPopUp = useOpenModalPopUp();
  const { createSignedUploadUrl, updateObservers } = useCreateSignedUploadUrl({}, openModalPopUp);
  const { startUploadProgress, updateUploadProgress, removeUploadProgress } = useUploadActions();

  /**
   * Handle file selection and upload flow.
   */

  const onPickFile = async (file: File) => {
    if (file.size > maxFileSize) {
      openModalPopUp(null, {
        statusCode: 400,
        errorCode: '20064',
        title: i18n.t('error.file_too_large'),
        message: i18n.t('error.file_too_large_msg', { maxFileSize: formatBytes(maxFileSize) }),
      });
      return;
    }

    if (!organizationId || !uploadIntent) {
      return;
    }

    const temporaryId = `uploading-${Date.now()}-${Math.round(Math.random() * 1000)}`;
    const dataObjectValues = typeof dataObject === 'function' ? dataObject(file) : dataObject;

    let uploadObj = {
      __reactiveFragmentName: reactiveFragmentName,
      ...(dataObjectValues || {
        name: file.name,
        uri: undefined,
        contentType: file.type,
        at: (new Date()).toISOString(),
      }),
      id: temporaryId,
      uploadStatus: 'UPLOADING' as const,
    };

    addFragmentToCache(`${dataFragmentName}:${uploadObj.id}`, uploadObj);

    const { createSignedUploadUrl: signedUrlResult } = await createSignedUploadUrl({
      variables: {
        temporaryId,
        organizationId,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        uploadIntent,
      },
    });

    if (!mounted.current) {
      return;
    }

    const { signedUrl, fileUri } = signedUrlResult || {};
    if (!signedUrl || !fileUri) {
      updateFragment(
        `${dataFragmentName}:${uploadObj.id}`,
        {
          ...uploadObj,
          uploadStatus: 'ERROR',
        },
        fileUri,
        false,
        updateObservers,
      );
      return;
    }

    uploadObj = {
      ...uploadObj,
      id: fileUri,
      uri: fileUri,
    };

    startUploadProgress(fileUri);

    const replacementKey = `${dataFragmentName}:${uploadObj.id}`;
    updateFragment(`${dataFragmentName}:${temporaryId}`, uploadObj, replacementKey, false, updateObservers);

    try {
      await uploadFileToGCS(signedUrl, file, (progress) => {
        updateUploadProgress(fileUri, progress);
      });

      if (!mounted.current) {
        return;
      }

      if (removeProgressAfterUpload) {
        removeUploadProgress(fileUri);
      }

      updateFragment(`${dataFragmentName}:${uploadObj.id}`, uploadObj, null, false, updateObservers);
    } catch (_err) {
      if (!mounted.current) {
        return;
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
    }
  };

  /**
   * Handle native file selection and start upload.
   */

  const onChangeFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void onPickFile(file);
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
    }
  }), [disabled]);

  return <input
    ref={fileInputRef}
    type='file'
    accept={acceptedFileTypes}
    className='hidden'
    onChange={onChangeFile}
  />;
});

UploadInput.displayName = 'UploadInput';
