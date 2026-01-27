import { memo } from 'react';
import { FileBrowserMessageArea } from './FileBrowserUI';
import { cn } from '@jsb188/app/utils/string';
import { Icon } from '@jsb188/react-web/svgs/Icon';
import i18n from '@jsb188/app/i18n';

/**
 * Types
 */

interface FileBrowserItemObj {
  title: string;
  iconName?: string;
  files?: any[];
}

/**
 * File Browser; Item component
 */

const FileBrowserItem = memo((p: FileBrowserItemObj) => {

  const { title, files } = p;
  const hasFiles = !!files?.length;
  const iconName = p.iconName ?? (hasFiles ? 'folder-open' : 'folder-empty');

  return <>
    <div className='bg px_10 py_8 rel bd_b_1 bd_active h_item'>
      {iconName &&
      <span className='mr_xs'>
        <Icon name={iconName} />
      </span>}
      <span className='shift_down'>
        {title}
      </span>
    </div>
    {/* <div className='h_10 bg_alt rel'>

    </div> */}
  </>;
});

FileBrowserItem.displayName = 'FileBrowserItem';

/**
 * File Browser Plus
 */

export function FileBrowserPlus(p: {
  headerTitle?: string;
  headerDescription?: string;
  headerDescriptionClassName?: string;
  footerMessage?: string;
  requiredFiles?: FileBrowserItemObj[];
}) {

  const { requiredFiles, headerTitle, headerDescription, footerMessage, headerDescriptionClassName } = p;

  return <div className="p_10 rel of pattern_texture texture_bf">

    {(headerTitle || headerDescription) &&
    <div className='h_spread gap_10 rel px_12 py_10'>
      <span className='ft_medium'>{headerTitle}</span>
      {/* <span className="rel cl_lt">Drag & drop anywhere to add files</span> */}
      <span className={cn('rel', headerDescriptionClassName ?? 'cl_lt')}>{headerDescription}</span>
    </div>}

    {/* {[{
      id: '1',
      title: 'FV-GFS 19.01',

    }, {
      id: '2',
      title: 'FV-GFS 19.02'
    }, {
      id: '3',
      title: 'FV-GFS 19.03'
    }]} */}
    {requiredFiles?.map((item: any) => {
      // return null;
      return <FileBrowserItem
        key={item.id}
        {...item}
      />;
    })}

    <FileBrowserMessageArea
      iconName='upload-square-2'
      text={footerMessage ?? i18n.t('form.fbp_upload_instructions')}
    />
  </div>
}
