import i18n from '@jsb188/app/i18n';
import type { StorageGQL } from '@jsb188/app/types/storage.d';
import { cn } from '@jsb188/app/utils/string';
import { TooltipButton } from '@jsb188/react-web/modules/PopOver';
import { COMMON_ICON_NAMES, FileTypeIcon, Icon } from '@jsb188/react-web/svgs/Icon';
import { memo, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';

/**
 * Right Toolbar
 */

const DVRightToolbar = memo((p: {
  title: string | null;
  pathname: string | null;
  onCloseModal: () => void;
}) => {
  const { title, onCloseModal } = p;
  return (
    <header className='bg bd_b_1 bd_lt shadow_line h_35 f_stretch h_spread px_10'>
      <div className='h_item gap_xs ic_sm ft_medium'>
        <Icon name='folder-open' />
        {title || '..'}
      </div>

      <div className='h_right gap_5'>
        <button
          className='link h_right hv_area'
          // message={i18n.t('form.close')}
          onClick={onCloseModal}
        >
          <span className='shift_down ft_tn target op_0 anim_inner trans_op spd_0 cl_bd mr_2'>
            {i18n.t('form.esc')}
          </span>
          <Icon name={COMMON_ICON_NAMES.close} />
        </button>
        {/* <TooltipButton
          className='link'
          position='bottom'
          message={i18n.t('form.close')}
          // offsetX={2} // +2 to adjust for .pr_2 padding-right
          offsetY={3}
          onClick={onCloseModal}
        >
          <Icon name={COMMON_ICON_NAMES.close} />
        </TooltipButton> */}
      </div>
    </header>
  );
});

DVRightToolbar.displayName = 'DVRightToolbar';

/**
 * Right; nav list
 */

const DVNavItem = memo((p: {
  item: DVItem;
  selected: boolean;
  setSelectedFile: (file: DVItemFile | null) => void;
}) => {
  const { item, selected, setSelectedFile } = p;

  if ('isSubtitle' in item) {
    const { text, isEmpty, iconName, pathname } = item;
    return (
      <div className={cn('px_10 py_4 h_spread hv_area', isEmpty ? 'cl_lt' : '')}>
        <div className='h_item gap_xs ic_sm ft_medium'>
          {iconName && <Icon name={iconName} />}
          {text}
        </div>

        <Link to={pathname} className='target op_0 anim_inner gap_3 h_right link cl_primary'>
          {i18n.t('form.open')}
          <Icon name='external-link' />
        </Link>
      </div>
    );
  }

  const { file } = item;
  return (
    <div
      role='button'
      data-file-id={file.id}
      className={cn('px_6 py_4 h_item gap_xs ic_sm link bd_l_4', selected ? 'bd_primary' : 'bd_invis')}
      onClick={() => setSelectedFile(item)}
    >
      <span className='f_shrink'>
        <FileTypeIcon contentType={file.contentType} fileName={file.name} />
      </span>
      <span className='ellip'>{file.name || file.contentType}</span>
    </div>
  );
});

DVNavItem.displayName = 'DVNavItem';

/**
 * Document Viewer area
 */

const DocumentViewerArea = memo((p: {
  file?: StorageGQL;
}) => {
  const { file } = p;

  if (!file) {
    return null;
  }

  const { uri, contentType } = file;

  const renderContent = () => {
    switch (contentType) {
      case 'application/pdf':
        return (
          <iframe
            src={`${uri}#toolbar=0&navpanes=0&scrollbar=0`}
            className='w_100p h_100p bd_0'
            title='PDF Document'
          />
        );

      case 'image/png':
      case 'image/jpeg':
      case 'image/jpg':
      case 'image/gif':
      case 'image/webp':
        return (
          <img
            src={uri}
            alt={file.name || 'Document'}
            className='max_w_100p max_h_100p obj_contain'
          />
        );

      default:
        return (
          <div className='f_center h_100p'>
            <span className='cl_lt'>
              {i18n.t('form.unsupported_file_type')}
            </span>
          </div>
        );
    }
  };

  return (
    <div className='w_100p h_100p f_center'>
      {renderContent()}
    </div>
  );
});

DocumentViewerArea.displayName = 'DocumentViewerArea';

/**
 * Document Viewer (Modal)
 */

export interface DVItemSubtitle {
  id: string;
  text: string;
  isSubtitle: boolean;
  isEmpty: boolean;
  iconName: string;
  pathname: string;
}

export interface DVItemFile {
  id: string; // file.id
  title: string;
  pathname: string;
  file: StorageGQL;
}

export type DVItem = DVItemSubtitle | DVItemFile;

export const DocumentViewerLayout = memo((p: {
	onCloseModal: () => void;
  documentsList: DVItem[];
  initialFileId: string | null;
  // selectedFile: StorageGQL | null;
  // onSelectFile: (file: StorageGQL | null) => void;
}) => {
  const { initialFileId, documentsList, onCloseModal } = p;
  const { pathname } = useLocation();
  const navRef = useRef<HTMLDivElement | null>(null);
  const firstRenderUrl = useRef<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<DVItemFile | null>(() => {
    if (initialFileId) {
      const initialItem = documentsList.find(item => 'file' in item && item.id === initialFileId) as DVItemFile | undefined;
      if (initialItem) {
        return initialItem;
      }
    }
    return null;
  });

  useEffect(() => {
    const initialRendered = !firstRenderUrl.current;
    if (selectedFile && navRef.current) {
      const element = navRef.current.querySelector(`[data-file-id="${selectedFile.file.id}"]`);
      element?.scrollIntoView({ behavior: initialRendered ? 'instant' : 'smooth', block: 'start' });
    }
  }, [selectedFile]);

  useEffect(() => {
    if (!firstRenderUrl.current || firstRenderUrl.current === pathname) {
      firstRenderUrl.current = pathname;
      return;
    }
    onCloseModal();
  }, [pathname]);

  return (
    <div className='h_spread'>
      <div className='of fs h_100vh'>
        <DocumentViewerArea
          file={selectedFile?.file}
        />
      </div>
      <div className='w_225 h_100vh bg ft_xs v_item of'>
        <DVRightToolbar
          title={selectedFile?.title || null}
          pathname={selectedFile?.pathname || null}
          onCloseModal={onCloseModal}
        />
        <div className='y_scr_hidden pt_10 pb_40 fs' ref={navRef}>
          {documentsList.map((item) => (
            <DVNavItem
              key={item.id}
              item={item}
              selected={selectedFile?.id === item.id}
              setSelectedFile={setSelectedFile}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

DocumentViewerLayout.displayName = 'DocumentViewerLayout';
