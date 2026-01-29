import i18n from '@jsb188/app/i18n';
import { cn } from '@jsb188/app/utils/string';
import { COMMON_ICON_NAMES, FileTypeIcon, Icon } from '@jsb188/react-web/svgs/Icon';
import { memo, useState } from 'react';
import { FileBrowserFooter, FileBrowserInstructions, type FBPInstructionsObj } from './FileBrowserUI';

/**
 * Types
 */

interface FBPFolderObj {
  title: string;
  iconName?: string;
  files?: any[];
  instructions?: FBPInstructionsObj | null;
}

/**
 * File Browser; item inside folders
 */

const FileBrowserItem = memo((p: {
  name: string;
  contentType: string;
  iconName?: string;
}) => {
  const { name, iconName, contentType } = p;

  const onDeleteFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('delete file');

  };

  return <div
    role='button'
    onClick={() => {}}
    className='h_spread rel pl_7 pr_10 py_8 bd_t_1 bd_lt link bg_secondary_fd_hv'
  >
    <div className='h_item'>
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

    <div className='h_right cl_lt'>
      <button
        className='cl_lt link'
        onClick={onDeleteFile}
      >
        <Icon name={COMMON_ICON_NAMES.delete} />
      </button>
    </div>
  </div>;
});

FileBrowserItem.displayName = 'FileBrowserItem';

/**
 * File Browser; folder
 */

const FileBrowserFolder = memo((p: FBPFolderObj & {
  uploading?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  showInstructionsOnMount?: boolean;
  uploadLimit?: number;
}) => {

  const { uploading, uploadLimit, showInstructionsOnMount, isFirst, isLast, title, files, instructions } = p;
  const fLen = files?.length;
  const hasFiles = !!fLen;
  const uploadDisabled = (fLen || 0) >= (uploadLimit || 1);
  const [expanded, setExpanded] = useState(!!showInstructionsOnMount || hasFiles);
  const [showInstructions, setShowInstructions] = useState(!!showInstructionsOnMount);
  // const [expanded, setExpanded] = useState(true);
  const iconName = p.iconName ?? (!expanded ? 'folder' : hasFiles ? 'folder-open' : 'folder-empty');

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
    className={cn('rel bg bd_active', isFirst && 'rt_sm', isLast ? 'rb_sm bd_b_4' : 'bd_b_1')}
  >
    <div
      role='button'
      onClick={toggleFolder}
      // className={cn('px_10 py_8 bd_active h_spread link bg_primary_fd_hv', isFirst && 'rt_sm', isLast ? 'rb_sm bd_b_4' : 'bd_b_1')}
      className={cn('pl_12 pr_10 h_spread link bg_primary_fd_hv', isFirst && 'rt_sm', isLast ? 'rb_sm' : '')}
    >
      <div className='h_item py_8'>
        {iconName &&
        <span className='mr_10'>
          <Icon name={iconName} />
        </span>}
        <span className='shift_down'>
          {title}
        </span>
      </div>

      <div className='h_right cl_darker_2 gap_10'>
        <button
          className={cn('ft_xs px_5 py_3 r_xs cl_md', showInstructions ? 'bg_primary' : 'bg_secondary_fd')}
          onClick={toggleInstructions}
        >
          {i18n.t('form.guide')}
        </button>
        <Icon name={expanded ? COMMON_ICON_NAMES.expanded_chevron : COMMON_ICON_NAMES.link_chevron} />
      </div>
    </div>

    {showInstructions && instructions &&
    <FileBrowserInstructions
      {...instructions}
      uploadDisabled={!!(uploadDisabled || uploading)}
      uploadText={uploadDisabled ? i18n.t('form.uploaded_ct', { count: fLen, max: uploadLimit || 1 }) : undefined}
    />}

    {expanded && hasFiles &&
    <div className='bg_secondary_fd bd_l_5 bd_primary'>
      {files.map((file: any, i: number) => {
        return <FileBrowserItem
          key={i}
          {...file}
        />
      })}
    </div>}
  </div>;
});

FileBrowserFolder.displayName = 'FileBrowserFolder';

/**
 * File Browser Plus
 */

export function FileBrowserPlus(p: {
  showInstructionsOnMount?: boolean;
  headerTitle?: string;
  headerDescription?: string;
  headerDescriptionClassName?: string;
  footerMessage?: string;
  folders?: FBPFolderObj[];
  folderUploadLimit?: number;
}) {

  const { folderUploadLimit, showInstructionsOnMount, folders, headerTitle, headerDescription, footerMessage, headerDescriptionClassName } = p;
  // const { folders: folders_, foldersX:folders, headerTitle, headerDescription, footerMessage, headerDescriptionClassName } = p;
  const lastIndex = folders ? folders.length - 1 : -1;
  const uploadLimit = folderUploadLimit ?? 5;

  return <div className="p_10 rel of pattern_texture texture_bf -mx_10 r_sm">

    {(headerTitle || headerDescription) &&
    <div className='h_spread gap_10 rel px_12 py_10'>
      <span className='ft_medium'>{headerTitle}</span>
      {/* <span className="rel cl_lt">Drag & drop anywhere to add files</span> */}
      <span className={cn('rel', headerDescriptionClassName ?? 'cl_lt')}>{headerDescription}</span>
    </div>}

    {folders?.map((item: FBPFolderObj, i: number) => {
      return <FileBrowserFolder
        key={i}
        {...item}
        showInstructionsOnMount={showInstructionsOnMount && i === 0}
        isFirst={i === 0}
        isLast={i === lastIndex}
        uploadLimit={uploadLimit}
      />;
    })}

    <FileBrowserFooter
      isEmpty={lastIndex < 0}
      iconName='upload-square-2'
      text={footerMessage ?? i18n.t('form.fbp_upload_instructions')}
    />
  </div>
}
