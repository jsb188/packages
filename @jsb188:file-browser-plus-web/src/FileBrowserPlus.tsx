import i18n from '@jsb188/app/i18n';
import { cn } from '@jsb188/app/utils/string';
import { useGetSignedUploadUrl } from '@jsb188/graphql/hooks/use-other-mtn';
import { useUploadActions } from '@jsb188/react/states';
import { COMMON_ICON_NAMES, FileTypeIcon, Icon } from '@jsb188/react-web/svgs/Icon';
import { memo, useState } from 'react';
import { FBPUploadButton, FileBrowserFooter, FileBrowserInstructions, type FBPInstructionsObj } from './FileBrowserUI';
import { useMounted } from '@jsb188/react/hooks';
import { uploadFileToGCS } from './googleStorage';

/**
 * Types
 */

interface FBPFolderObj {
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
  uploading?: boolean;
  name: string;
  contentType: string;
  iconName?: string;
  rightText?: string;
}) => {
  const { uploading, name, iconName, contentType, rightText } = p;
  const disabled = !!uploading;

  const onDeleteFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('delete file');
  };

  return <div
    role={disabled ? undefined : 'button'}
    onClick={disabled ? undefined : () => {}}
    className={cn(
      'h_spread rel pl_7 pr_5 py_8 bd_t_1 bd_lt',
      !disabled && 'link bg_secondary_fd_hv'
    )}
  >
    <div className={cn('h_item', disabled ? 'cl_md' : '')}>
      <span className='mr_10'>
        <FileTypeIcon
          iconName={iconName}
          contentType={contentType}
          fileName={name}
        />
      </span>
      <span className='shift_down'>
        {name}
      </span>
    </div>

    <div className='h_right cl_md gap_5'>
			<span className='ft_xs'>
				{rightText}
			</span>
      <button
        className='cl_md link px_5 cl_err_hv non_link'
        onClick={onDeleteFile}
      >
        <Icon name={uploading ? COMMON_ICON_NAMES.progress : COMMON_ICON_NAMES.delete} />
      </button>
    </div>
  </div>;
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
  uploadInProgress?: UploadInProgressObj | null;
  folderIndex: number;
  everythingIsEmpty: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  showInstructionsOnMount?: boolean;
  uploadLimit?: number;
  acceptedFileTypes?: string;
  onPickFile: (file: File, folderIndex: number) => void;
}) => {

  const { uploadInProgress, folderIndex, onPickFile, everythingIsEmpty, isSubtitle, uploadLimit, acceptedFileTypes, showInstructionsOnMount, isFirst, isLast, title, files, instructions } = p;
  const fLen = files?.length;
  const hasFiles = !!fLen || !!uploadInProgress;
  const uploadDisabled = (fLen || 0) >= (uploadLimit || 1);
  const [expanded, setExpanded] = useState(!!showInstructionsOnMount || hasFiles);
  const [showInstructions, setShowInstructions] = useState(!!showInstructionsOnMount);
  const isToggleable = !!(instructions || hasFiles);
  const uploading = !!uploadInProgress;
  // const [expanded, setExpanded] = useState(true);

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
      {uploadInProgress &&
      <FileBrowserItem
        uploading
        name={uploadInProgress.name}
        contentType={uploadInProgress.contentType}
        rightText={i18n.t('form.uploading_')}
      />}

      {files?.map((file: any, i: number) => {
        return <FileBrowserItem
          key={i}
          {...file}
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

    {showInstructions && instructions &&
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
 * File Browser Plus
 */

interface FileBrowserPlusProps {
  folderUploadInProgress?: FolderUploadInProgressObj;
  showInstructionsOnMount?: boolean;
  headerTitle?: string;
  headerDescription?: string;
  headerDescriptionClassName?: string;
  footerMessage?: string;
  folders?: FBPFolderObj[];
  folderUploadLimit?: number;
  acceptedFileTypes?: string;
}

export function FileBrowserPlus(p: FileBrowserPlusProps & {
  onPickFile: (file: File, folderIndex: number) => void;
}) {

  const { folderUploadInProgress, onPickFile, folderUploadLimit, acceptedFileTypes, showInstructionsOnMount, folders, headerTitle, headerDescription, footerMessage, headerDescriptionClassName } = p;
  // const { folders: folders_, foldersX:folders, headerTitle, headerDescription, footerMessage, headerDescriptionClassName } = p;
  const lastIndex = folders ? folders.length - 1 : -1;
  const uploadLimit = folderUploadLimit ?? 5;
  const everythingIsEmpty = !!folders?.every(f => !f.files?.length);
  const firstExpandedIx = showInstructionsOnMount && folders?.findIndex(f => !f.isSubtitle);

  return <div className='p_10 rel of pattern_texture texture_bf -mx_10 r_sm'>

    {(headerTitle || headerDescription) &&
    <div className='h_spread gap_10 rel px_12 py_15 ft_xs'>
      <span className='ft_semibold'>{headerTitle}</span>
      <span className={cn('rel', headerDescriptionClassName ?? 'cl_lt')}>{headerDescription}</span>
    </div>}

    {folders?.map((item: FBPFolderObj, i: number) => {
      return <FileBrowserFolder
        key={i}
        {...item}
        uploadInProgress={folderUploadInProgress?.[i]}
        folderIndex={i}
        everythingIsEmpty={everythingIsEmpty}
        showInstructionsOnMount={i === firstExpandedIx}
        isFirst={i === 0}
        isLast={i === lastIndex}
        uploadLimit={uploadLimit}
        acceptedFileTypes={acceptedFileTypes}
        onPickFile={onPickFile}
      />;
    })}

    <FileBrowserFooter
      isEmpty={lastIndex < 0}
      iconName='upload-square-2'
      text={footerMessage ?? i18n.t('form.fbp_upload_instructions')}
    />
  </div>
}

/**
 * File Browser Plus; with data/mutations built in
 */

interface UploadInProgressObj {
  name: string;
  contentType: string;
  signedUrl?: string;
}

interface FolderUploadInProgressObj {
  [folderIndex: number]: UploadInProgressObj | null;
}

export function FileBrowserPlusWithData(p: FileBrowserPlusProps & {
  organizationId: string;
}) {
  const { acceptedFileTypes, organizationId } = p;
  const mounted = useMounted();
  const [folderUploadInProgress, setFolderUploadInProgress] = useState<FolderUploadInProgressObj>({});
  const { getSignedUploadUrl, saving: fetchingSignedUrl } = useGetSignedUploadUrl();
  const { uploads, startUploadProgress, updateUploadProgress, removeUploadProgress } = useUploadActions();
  const uploading = fetchingSignedUrl;

  console.log('uploads', uploads);

  const updateFolderUploadInProgress = (folderIndex: number, inProgressObj: Partial<UploadInProgressObj> | null) => {
    setFolderUploadInProgress((prev) => ({
      ...prev,
      [folderIndex]: !inProgressObj ? null : {
        ...prev[folderIndex] as UploadInProgressObj,
        ...inProgressObj
      },
    }));
  };

  const onPickFile = async (file: File, folderIndex: number) => {
    updateFolderUploadInProgress(folderIndex, {
      name: file.name,
      contentType: file.type,
    });

    const { getSignedUploadUrl: signedUrlResult } = await getSignedUploadUrl({
      variables: {
        organizationId,
        fileName: file.name,
        contentType: file.type,
      },
    });

    if (!mounted.current) {
      return;
    }

    if (!signedUrlResult) {
      updateFolderUploadInProgress(folderIndex, null);
      return;
    }

    startUploadProgress(signedUrlResult);
    updateFolderUploadInProgress(folderIndex, {
      name: file.name,
      contentType: file.type,
      signedUrl: signedUrlResult,
    });

    try {
      await uploadFileToGCS(signedUrlResult, file, (progress) => {
        updateUploadProgress(signedUrlResult, progress);
      });

      if (!mounted.current) return;
      removeUploadProgress(signedUrlResult);
      updateFolderUploadInProgress(folderIndex, null);
    } catch (err) {
      console.error('File upload failed:', err);
      if (!mounted.current) return;
      removeUploadProgress(signedUrlResult);
      updateFolderUploadInProgress(folderIndex, null);
    }
  };

  return <FileBrowserPlus
    {...p}
    folderUploadInProgress={folderUploadInProgress}
    onPickFile={onPickFile}
    acceptedFileTypes={
      acceptedFileTypes ??
      '.pdf,.doc,.docx,.jpg,.jpeg,.png,.txt,.csv,.webp,.xls,.xlsx,.ppt,.pptx'
    }
  />;
}