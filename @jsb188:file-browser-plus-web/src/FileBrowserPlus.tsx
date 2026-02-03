import { MAX_FILE_SIZE_CLIENT } from '@jsb188/app/constants/app';
import i18n from '@jsb188/app/i18n';
import type { StorageGQL } from '@jsb188/app/types/storage.d';
import { getFullDate } from '@jsb188/app/utils/datetime';
import { formatBytes } from '@jsb188/app/utils/number';
import { cn } from '@jsb188/app/utils/string';
import { addFragmentToCache, loadFragment, updateFragment } from '@jsb188/graphql/cache';
import { useReactiveFragment } from '@jsb188/graphql/client';
import { useCreateSignedUploadUrl } from '@jsb188/graphql/hooks/use-storage-mtn';
import { useReactiveStorageFragment } from '@jsb188/graphql/hooks/use-storage-qry';
import { COMMON_ICON_NAMES, Icon } from '@jsb188/react-web/svgs/Icon';
import { useMounted } from '@jsb188/react/hooks';
import { useOpenModalPopUp, useUploadActions } from '@jsb188/react/states';
import { memo, useMemo, useState } from 'react';
import { FBPUploadButton, FileBrowserInstructions, FileBrowserItemUI, type FBPInstructionsObj } from './FileBrowserUI';
import { uploadFileToGCS } from './googleStorage';

/**
 * Types
 */

interface FBPFolderObj {
  id: string;
  isSubtitle?: boolean;
  title: string;
  iconName?: string;
  files?: any[];
  instructions?: FBPInstructionsObj | null;
}

/**
 * File Browser; item inside folders
 */

const FileBrowserItem = memo((p: {
  file: StorageGQL;
  onClickDelete?: (id: string, name: string) => void;
  rightText?: string;
  iconName?: string;
  timeZone: string | null;
  uploads?: FileBrowserPlusProps['uploads'];
}) => {
  const { onClickDelete, file, rightText, iconName, timeZone, uploads } = p;
  const { __deleted, id, uri, name, contentType, at, uploadStatus } = useReactiveStorageFragment(file.id, file);
  const uploading = !!uploadStatus; // If uploadStatus is "COMPLETED", we still have to wait for WS to update from the server side (with correct ID)
  const disabled = !!uploading || !!__deleted;
  const progress = uri ? uploads?.[uri]?.progress : undefined;

  return <FileBrowserItemUI
    domId={`file_${id}`}
    name={name}
    contentType={contentType}
    deleted={__deleted}
    disabled={disabled}
    uploading={uploading}
    iconName={iconName}
    rightText={uploading ? (progress ? `${progress}%` : i18n.t('form.uploading_')) : rightText}
    rightTextClassName={uploading ? 'cl_pass' : undefined}
    dateText={getFullDate(at, 'NUMERIC', timeZone)}
    onClickDelete={onClickDelete ? () => onClickDelete(id, name!) : undefined}
  />;
});

FileBrowserItem.displayName = 'FileBrowserItem';

/**
 * File Browser; folder options (footer for each folder)
 */

const FBPFolderOptions = memo((p: {
  uploading?: boolean,
  folderIndex: number,
  uploadDisabled: boolean,
  filesCount: number,
  uploadLimit: number,
  showInstructions: boolean,
  acceptedFileTypes?: string,
  onPickFile: (file: File, folderIndex: number) => void,
  onToggleInstructions: (e: React.MouseEvent) => void,
}) => {
  const { uploading, folderIndex, uploadDisabled, filesCount, uploadLimit, showInstructions, acceptedFileTypes, onPickFile, onToggleInstructions } = p;
  const filesCountText = filesCount && filesCount >= uploadLimit ? ` (${filesCount}/${uploadLimit})` : '';

  return <div className='h_item rel pl_7 pr_5 py_8 bd_t_1 bd_lt ft_xs gap_10'>
    <FBPUploadButton
      className='bg'
      disabled={uploadDisabled}
      acceptedFileTypes={acceptedFileTypes}
      folderIndex={folderIndex}
      onPickFile={onPickFile}
      filesCountText={filesCountText}
      text={uploading ? i18n.t('form.uploading_') : undefined}
    />
    <button
      className='h_item link non_link ic_sm cl_md'
      onClick={onToggleInstructions}
    >
      <span className='mr_5'>
        {i18n.t(showInstructions ? 'form.hide_document_guidelines' : 'form.show_document_guidelines')}
      </span>
      {!showInstructions && <Icon name={COMMON_ICON_NAMES.info} />}
    </button>
  </div>;
});

FBPFolderOptions.displayName = 'FBPFolderOptions';

/**
 * File Browser; folder
 */

const FileBrowserFolder = memo((p: FBPFolderObj & {
  folderFragmentName: string;
  uploads?: FileBrowserPlusProps['uploads'];
  folderIndex: number;
  everythingIsEmpty: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  showInstructionsOnMount?: boolean;
  uploadLimit?: number;
  acceptedFileTypes?: string;
  onClickDeleteFile?: (id: string, name: string) => void;
  onPickFile: (file: File, folderIndex: number) => void;
  timeZone: string | null;
  reactiveFileCount?: number;
  reactiveUploading?: boolean;
}) => {

  const { timeZone, onClickDeleteFile, uploads, folderIndex, onPickFile, everythingIsEmpty, isSubtitle, uploadLimit, acceptedFileTypes, showInstructionsOnMount, isFirst, isLast, title, files, instructions } = p;
  const fLen = p.reactiveFileCount ?? files?.filter(file => !file.__deleted).length;
  const hasFiles = !!fLen;
  const uploadDisabled = (fLen || 0) >= (uploadLimit || 1);
  const [expanded, setExpanded] = useState(!!showInstructionsOnMount || hasFiles);
  const [showInstructions, setShowInstructions] = useState(false);
  const isToggleable = !!(instructions || hasFiles);
  const uploading = p.reactiveUploading ?? !!files?.some(file => file.uploadStatus);

  let iconName;
  if (p.iconName) {
    iconName = p.iconName;
  } else if (!isSubtitle) {
    iconName = !expanded && !hasFiles ? 'folder' : hasFiles ? 'folder-open' : 'folder-empty';
  }

  const toggleFolder = () => {
    if (expanded) {
      setShowInstructions(false);
    } else if (instructions && !hasFiles) {
      setShowInstructions(true);
    }
    setExpanded(!expanded);
  };

  const toggleInstructions = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextVal = !showInstructions;
    setShowInstructions(nextVal);

    if (!nextVal && expanded && !hasFiles) {
      setExpanded(nextVal);
    }
  };

  return <div
    // className={cn('rel bg', isFirst && 'rt_sm', isLast && 'rb_sm')}
    className={cn(
      'rel bg bd_active',
      isFirst && 'rt_sm',
      isLast ? 'rb_sm bd_b_4' : 'bd_b_1'
    )}
  >
    <div
      role={isToggleable ? 'button' : undefined}
      onClick={isToggleable ? toggleFolder : undefined}
      // isSubtitle ? 'bg_secondary_fd' : 'bg',
      // className={cn('px_10 py_8 bd_active h_spread link bg_primary_fd_hv', isFirst && 'rt_sm', isLast ? 'rb_sm bd_b_4' : 'bd_b_1')}
      className={cn(
        'pl_12 pr_10 h_spread',
        isToggleable ? 'link bg_primary_fd_hv' : '',
        isSubtitle ? 'pt_15 -mt_1' : '',
        isFirst && 'rt_sm',
        isLast ? 'rb_sm' : ''
      )}
    >
      <div className='h_item py_8'>
        {iconName && !isSubtitle &&
        <span className='mr_10'>
          <Icon name={iconName} />
        </span>}
        <span className={cn('shift_down', isSubtitle && 'ft_xs ft_semibold cl_lt')}>
          {title}
        </span>
      </div>

      {isToggleable &&
      <div className='h_right cl_darker_2 gap_10'>
        {!everythingIsEmpty && !hasFiles &&
        <span className='ft_xs px_5 py_3 r_xs cl_err'>
          {i18n.t('form.missing')}
        </span>}
        <Icon name={expanded ? COMMON_ICON_NAMES.expanded_chevron : COMMON_ICON_NAMES.link_chevron} />
      </div>}
    </div>

    {expanded && hasFiles &&
    <div className='bg_secondary_fd bd_l_5 bd_primary'>
      {files?.map((file: any, i: number) => {
        return <FileBrowserItem
          key={i}
          file={file}
          timeZone={timeZone}
          onClickDelete={onClickDeleteFile}
          uploads={uploads}
        />
      })}

      <FBPFolderOptions
        uploading={uploading}
        folderIndex={folderIndex}
        uploadDisabled={!!(uploadDisabled || uploading)}
        filesCount={fLen || 0}
        uploadLimit={uploadLimit || 1}
        showInstructions={showInstructions}
        acceptedFileTypes={acceptedFileTypes}
        onPickFile={onPickFile}
        onToggleInstructions={toggleInstructions}
      />
    </div>}

    {(showInstructions || (expanded && !hasFiles)) && instructions &&
    <FileBrowserInstructions
      {...instructions}
      folderIndex={folderIndex}
      uploadDisabled={!!(uploadDisabled || uploading)}
      filesCount={fLen}
      uploadLimit={uploadLimit || 1}
      acceptedFileTypes={acceptedFileTypes}
      onPickFile={onPickFile}
    />}
  </div>;
});

FileBrowserFolder.displayName = 'FileBrowserFolder';

/**
 * File browser folder; reactive fragment wrapper
 */

function ReactiveFileBrowserFolder(p: any) {
  const { item, folderFragmentName, mapFolderData } = p;
  const reactiveData = useReactiveFragment(item, [`${folderFragmentName}:${item.id}`]);
  const folderData = mapFolderData(reactiveData);

  // Read latest file states from fragment cache (this component already
  // re-renders on every fragment change via useReactiveFragment)
  const files = folderData.files;
  let reactiveFileCount = 0;
  let reactiveUploading = false;
  if (files?.length) {
    for (const file of files) {
      const fragment = loadFragment(`$storageFileFragment:${file.id}`);
      const data = fragment ?? file;
      if (!data.__deleted) reactiveFileCount++;
      if (data.uploadStatus) reactiveUploading = true;
    }
  }

  return <FileBrowserFolder
    key={reactiveData.id}
    {...p}
    {...folderData}
    reactiveFileCount={reactiveFileCount}
    reactiveUploading={reactiveUploading}
  />;
}

/**
 * File Browser Plus
 */

interface FileBrowserPlusProps {
  timeZone: string | null;
  onClickDeleteFile?: (id: string, name: string) => void;
  folderFragmentName: string;
  showInstructionsOnMount?: boolean;
  headerTitle?: string;
  headerDescription?: string;
  headerDescriptionClassName?: string;
  footerMessage?: string;
  folders?: any[];
  mapFolderData: (folder: any) => FBPFolderObj;
  folderUploadLimit?: number;
  acceptedFileTypes?: string;
  uploads?: {
    [fileUri: string]: {
      progress: number;
    };
  }
}

export function FileBrowserPlus(p: FileBrowserPlusProps & {
  onPickFile: (file: File, folderIndex: number) => void;
}) {

  const { timeZone, onClickDeleteFile, folderFragmentName, mapFolderData, uploads, onPickFile, folderUploadLimit, acceptedFileTypes, showInstructionsOnMount, folders, headerTitle, headerDescription, footerMessage, headerDescriptionClassName } = p;
  const lastIndex = folders ? folders.length - 1 : -1;
  const uploadLimit = folderUploadLimit ?? 5;
  const everythingIsEmpty = !!folders?.every(f => !f.files?.length);

  const firstExpandedIx = useMemo(() => {
    if (showInstructionsOnMount) {
      return folders?.findIndex(f => !mapFolderData(f).isSubtitle);
    }
    return -1;
  }, [showInstructionsOnMount, folders]);

  return <div className='pt_10 px_10 pb_20 rel of pattern_texture texture_bf -mx_10 r_sm'>
    {(headerTitle || headerDescription) &&
    <div className='h_spread gap_10 rel px_12 py_15 ft_xs'>
      <span className='ft_semibold'>{headerTitle}</span>
      <span className={cn('rel', headerDescriptionClassName ?? 'cl_lt')}>{headerDescription}</span>
    </div>}

    {folders?.map((item: any, i: number) => {
      return <ReactiveFileBrowserFolder
        key={`${i}_${item?.files?.map((f: any) => f.id).join('_')}`}
        timeZone={timeZone}
        item={item}
        folderIndex={i}
        folderFragmentName={folderFragmentName}
        mapFolderData={mapFolderData}
        uploads={uploads}
        everythingIsEmpty={everythingIsEmpty}
        showInstructionsOnMount={i === firstExpandedIx}
        isFirst={i === 0}
        isLast={i === lastIndex}
        uploadLimit={uploadLimit}
        acceptedFileTypes={acceptedFileTypes}
        onPickFile={onPickFile}
        onClickDeleteFile={onClickDeleteFile}
      />;
    })}
  </div>
}

/**
 * File Browser Plus; with data/mutations built in
 */

interface UploadInProgressObj {
  id: string; // Updated via WS real time reactive fragment
  name: string;
  contentType: string;
  uri?: string;
  at: string; // ISO string
  uploadStatus?: 'ERROR' | 'UPLOADING' | null; // null means completed (matches Server)
}

interface UploadIntentObj {
  intent: string;
  entries: string[][];
}

export function FileBrowserPlusWithData(p: FileBrowserPlusProps & {
  maxFileSize?: number;
  organizationId: string;
  getUploadIntent?: (folderIndex: any) => UploadIntentObj;
  removeProgressAfterUpload?: boolean;
  updateDataAfterUpload: (folder: any, uploadingFile: UploadInProgressObj, updateObservers: any, temporaryId?: string) => void;
}) {
  const { updateDataAfterUpload, removeProgressAfterUpload, acceptedFileTypes, organizationId, getUploadIntent, folders } = p;
  const mounted = useMounted();
  const openModalPopUp = useOpenModalPopUp();
  const { createSignedUploadUrl, saving: creatingSignedUrl, updateObservers } = useCreateSignedUploadUrl({}, openModalPopUp);
  const { uploads, startUploadProgress, updateUploadProgress, removeUploadProgress } = useUploadActions();
  const maxFileSize = p.maxFileSize || MAX_FILE_SIZE_CLIENT;
  // const uploading = creatingSignedUrl;

  // For uploading test
  // const uploads = {
  //   "2/f8115239-8274-46ee-937d-6dda66642912.png": {
  //     progress: 56
  //   }
  // };

  // console.log('>> uploads:', uploads);
  // console.log('>> uploadInProgress:', uploadInProgress);

  const onPickFile = async (file: File, folderIndex: number) => {

    if (file.size > maxFileSize) {
      openModalPopUp(null, {
        statusCode: 400,
        errorCode: '20064',
        title: i18n.t('error.file_too_large'),
        message: i18n.t('error.file_too_large_msg', { maxFileSize: formatBytes(maxFileSize) }),
      });
      return;
    }

    const uploadFolder = folders?.[folderIndex];
    const temporaryId = `uploading-${Date.now()}-${Math.round(Math.random() * 1000)}`;

    let uploadObj = {
      id: temporaryId, // Temporary, and will be updated via WS later
      name: file.name,
      uri: undefined,
      contentType: file.type,
      uploadStatus: 'UPLOADING' as const,
      at: (new Date()).toISOString(),
    };

    addFragmentToCache(`$storageFileFragment:${uploadObj.id}`, uploadObj);
    updateDataAfterUpload(uploadFolder, uploadObj, updateObservers);

    const { createSignedUploadUrl: signedUrlResult } = await createSignedUploadUrl({
      variables: {
        temporaryId,
        organizationId,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        uploadIntent: getUploadIntent?.(uploadFolder!),
      },
    });

    if (!mounted.current) {
      return;
    }

    const { signedUrl, fileUri } = signedUrlResult || {};
    if (!signedUrl || !fileUri) {
      updateFragment(`$storageFileFragment:${uploadObj.id}`, {...uploadObj, uploadStatus: 'ERROR' }, fileUri, false, updateObservers);
      return;
    }

    uploadObj = {
      ...uploadObj,
      id: fileUri,
      uri: fileUri,
    };

    // Replace temporary ID with actual fileUri after getting signed URL
    updateDataAfterUpload(uploadFolder, uploadObj, updateObservers, temporaryId);

    startUploadProgress(fileUri);

    const replacementKey = `$storageFileFragment:${uploadObj.id}`;
    updateFragment(`$storageFileFragment:${temporaryId}`, uploadObj, replacementKey, false, updateObservers);

    try {
      await uploadFileToGCS(signedUrl, file, (progress) => {
        updateUploadProgress(fileUri, progress);
      });

      if (!mounted.current) return;
      if (removeProgressAfterUpload) {
        removeUploadProgress(fileUri);
      }
      updateFragment(`$storageFileFragment:${uploadObj.id}`, {...uploadObj, uploadStatus: 'ERROR' }, null, false, updateObservers);
    } catch (err) {
      console.error('File upload failed:', err);
      if (!mounted.current) return;
      if (removeProgressAfterUpload) {
        removeUploadProgress(fileUri);
      }
      updateFragment(`$storageFileFragment:${uploadObj.id}`, {...uploadObj, uploadStatus: null }, null, false, updateObservers);
    }
  };

  return <FileBrowserPlus
    {...p}
    uploads={uploads}
    onPickFile={onPickFile}
    acceptedFileTypes={
      acceptedFileTypes ??
      '.pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.csv,.webp,.xls,.xlsx,.ppt,.pptx'
    }
  />;
}
