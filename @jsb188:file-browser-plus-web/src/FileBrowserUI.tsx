import i18n from '@jsb188/app/i18n';
import { cn } from '@jsb188/app/utils/string';
import { COMMON_ICON_NAMES, FileTypeIcon, Icon } from '@jsb188/react-web/svgs/Icon';
import { Button } from '@jsb188/react-web/ui/Button';
import Markdown from '@jsb188/react-web/ui/Markdown';
import { memo, useRef } from 'react';

/**
 * Types
 */

export interface FBPInstructionsItemObj {
  preset?: 'UPLOAD_BUTTON' | null;
  label?: string;
  text?: string;
}

export interface FBPInstructionsObj {
  leftItems: FBPInstructionsItemObj[],
  rightItems: FBPInstructionsItemObj[]
}

/**
 * File Browser item; presentational component
 */

export const FileBrowserItemUI = memo((p: {
  domId?: string;
  name: string;
  contentType: string;
  deleted?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  iconName?: string;
  rightText?: string;
  rightTextClassName?: string;
  dateText?: string;
  onClick?: () => void;
  onClickDelete?: () => void;
}) => {
  const { domId, name, contentType, deleted, disabled, uploading, iconName, rightText, rightTextClassName, dateText, onClick, onClickDelete } = p;

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClickDelete?.();
  };

  return <div
    id={domId}
    role={disabled ? undefined : 'button'}
    onClick={disabled ? undefined : onClick}
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
      <span className={cn('shift_down', deleted && 'strikethrough')}>
        {name}
      </span>
    </div>

    <div className={cn('h_right gap_5', deleted ? 'cl_lt' : 'cl_md')}>
			<span className={cn('ft_xs', rightTextClassName)}>
				{deleted ? i18n.t('form.deleted') : (rightText || dateText)}
			</span>
      <button
        disabled={deleted || uploading}
        className={cn('px_5 non_link', !deleted && !uploading && 'link cl_err_hv')}
        onClick={deleted || uploading ? undefined : onDelete}
      >
        <Icon name={uploading ? COMMON_ICON_NAMES.progress : COMMON_ICON_NAMES.delete} />
      </button>
    </div>
  </div>;
});

FileBrowserItemUI.displayName = 'FileBrowserItemUI';

/**
 * Upload button with .hidden <input>
 */

export const FBPUploadButton = memo((p: {
  text?: string;
  className?: string;
  disabled?: boolean;
  filesCountText?: string;
  folderIndex: number;
  onPickFile: (file: File, folderIndex: number) => void;
  acceptedFileTypes?: string;
}) => {
  const { text, className, disabled, filesCountText, folderIndex, onPickFile, acceptedFileTypes } = p;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onPickFile(file, folderIndex);
    }
    e.target.value = '';
  };

  return <>
    <input
      ref={fileInputRef}
      type='file'
      accept={acceptedFileTypes}
      className='hidden'
      onChange={handleFileChange}
    />
    <Button
      preset='outline'
      size='sm'
      className={cn(className, disabled ? 'not_allowed cl_md' : undefined)}
      disabled={disabled}
      text={(text ?? i18n.t('form.upload_file')) + (filesCountText ?? '')}
      onClick={handleButtonClick}
    />
  </>;
});

FBPUploadButton.displayName = 'FBPUploadButton';

/**
 * Instructions content item
 */

const FBPInstructionsContent = memo((p: FBPInstructionsItemObj & {
  isLast?: boolean,
  uploadDisabled: boolean,
  filesCount?: number,
  uploadLimit?: number,
  folderIndex: number,
  acceptedFileTypes?: string,
  onPickFile: (file: File, folderIndex: number) => void;
}) => {
  const { preset, isLast, uploadDisabled, filesCount, uploadLimit, folderIndex, acceptedFileTypes, onPickFile } = p;
  const filesCountText = filesCount && filesCount >= uploadLimit! ? ` (${filesCount}/${uploadLimit})` : '';

  switch (preset) {
    case 'UPLOAD_BUTTON':
      return <FBPUploadButton
        disabled={uploadDisabled}
        filesCountText={filesCountText}
        folderIndex={folderIndex}
        acceptedFileTypes={acceptedFileTypes}
        onPickFile={onPickFile}
      />;
    default:
  }

  return <div className={isLast ? undefined : 'mb_20'}>
    <p className='ft_semibold'>
      {p.label}
    </p>
    <Markdown as='p' preset='article'>
      {p.text}
    </Markdown>
  </div>;
});

FBPInstructionsContent.displayName = 'FBPInstructionsContent';

/**
 * Instructions item for empty folders
 */

export function FileBrowserInstructions(p: FBPInstructionsObj & {
  uploadDisabled: boolean,
  filesCount?: number,
  uploadLimit?: number,
  folderIndex: number,
  acceptedFileTypes?: string,
  onPickFile: (file: File, folderIndex: number) => void;
}) {
  const { leftItems, rightItems, uploadDisabled, filesCount, uploadLimit, folderIndex, acceptedFileTypes, onPickFile } = p;
  const lLastIx = leftItems.length - 1;
  const rLastIx = rightItems.length - 1;

  const itemProps = {
    acceptedFileTypes,
    uploadDisabled,
    filesCount,
    uploadLimit,
    folderIndex,
    onPickFile,
  };

  return <div className='bd_t_1 bd_lt ft_xs grid size_2 gap_n p_15'>
    <div className='p_10'>
      {leftItems.map((item, index) => {
        return <FBPInstructionsContent
          key={index}
          {...item}
          {...itemProps}
          isLast={index === lLastIx}
        />;
      })}
    </div>

    <div className='p_10'>
      {rightItems.map((item, index) => {
        return <FBPInstructionsContent
          key={index}
          {...item}
          {...itemProps}
          isLast={index === rLastIx}
        />;
      })}
    </div>
  </div>
}
