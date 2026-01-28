import i18n from '@jsb188/app/i18n';
import { cn } from '@jsb188/app/utils/string';
import { COMMON_ICON_NAMES, Icon } from '@jsb188/react-web/svgs/Icon';
import { memo, useState } from 'react';
import { FileBrowserFooter, FileBrowserPlaceholder, type FBPPlaceholderObj } from './FileBrowserUI';

/**
 * Types
 */

interface FBPFolderObj {
  title: string;
  iconName?: string;
  files?: any[];
  placeholder?: FBPPlaceholderObj | null;
}

/**
 * File Browser; item inside folders
 */

const FileBrowserItem = memo((p: {
  name: string;
  contentType: string;
  iconName?: string;
}) => {
  const { name, contentType, iconName } = p;

  return <div>
    {iconName && <Icon name={iconName} />}
    {name}
    {contentType}
  </div>;
});

FileBrowserItem.displayName = 'FileBrowserItem';

/**
 * File Browser; folder
 */

const FileBrowserFolder = memo((p: FBPFolderObj & {
  isFirst?: boolean;
  isLast?: boolean;
}) => {

  const { isFirst, isLast, title, files, placeholder } = p;
  const [expanded, setExpanded] = useState(!!isFirst);
  // const [expanded, setExpanded] = useState(true);
  const hasFiles = !!files?.length;
  const iconName = p.iconName ?? (!expanded ? 'folder' : hasFiles ? 'folder-open' : 'folder-empty');

  console.log(p);


  return <div
    // className={cn('rel bg', isFirst && 'rt_sm', isLast && 'rb_sm')}
    className={cn('rel bg bd_active', isFirst && 'rt_sm', isLast ? 'rb_sm bd_b_4' : 'bd_b_1')}
  >
    <div
      role='button'
      onClick={() => setExpanded(!expanded)}
      // className={cn('px_10 py_8 bd_active h_spread link bg_primary_fd_hv', isFirst && 'rt_sm', isLast ? 'rb_sm bd_b_4' : 'bd_b_1')}
      className={cn('px_10 py_8 h_spread link bg_primary_fd_hv', isFirst && 'rt_sm', isLast ? 'rb_sm' : '')}
    >
      <div className='h_item'>
        {iconName &&
        <span className='mr_xs'>
          <Icon name={iconName} />
        </span>}
        <span className='shift_down'>
          {title}
        </span>
      </div>

      <div className='h_right cl_darker_2'>
        <Icon name={expanded ? COMMON_ICON_NAMES.expanded_chevron : COMMON_ICON_NAMES.link_chevron} />
      </div>
    </div>

    {expanded && files
    ? files.map((file: any, i: number) => {
      return <FileBrowserItem
        {...file}
      />
    })
    : expanded && placeholder
    ? <FileBrowserPlaceholder
        {...placeholder}
      />
    : null}
  </div>;
});

FileBrowserFolder.displayName = 'FileBrowserFolder';

/**
 * File Browser Plus
 */

export function FileBrowserPlus(p: {
  headerTitle?: string;
  headerDescription?: string;
  headerDescriptionClassName?: string;
  footerMessage?: string;
  folders?: FBPFolderObj[];
}) {

  const { folders, headerTitle, headerDescription, footerMessage, headerDescriptionClassName } = p;
  // const { folders: folders_, foldersX:folders, headerTitle, headerDescription, footerMessage, headerDescriptionClassName } = p;
  const lastIndex = folders ? folders.length - 1 : -1;

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
        isFirst={i === 0}
        isLast={i === lastIndex}
      />;
    })}

    <FileBrowserFooter
      isEmpty={lastIndex < 0}
      iconName='upload-square-2'
      text={footerMessage ?? i18n.t('form.fbp_upload_instructions')}
    />
  </div>
}
