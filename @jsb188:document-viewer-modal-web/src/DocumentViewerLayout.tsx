import i18n from '@jsb188/app/i18n/index.ts';
import type { StorageGQL } from '@jsb188/app/types/storage.d.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { makeUploadsUrl } from '@jsb188/app/utils/url_client.ts';
import { COMMON_ICON_NAMES, FileTypeIcon, Icon } from '@jsb188/react-web/svgs/Icon';
import { useKeyDown } from '@jsb188/react/states';
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
  onCloseModal: () => void;
}) => {
  const { item, selected, setSelectedFile, onCloseModal } = p;
  const { isSubtitle } = item as DVItemSubtitle;

  if (isSubtitle) {
    const { text, isEmpty, iconName, pathname } = item as DVItemSubtitle;
    return (
      <div className={cn('px_10 py_4 h_spread hv_area', isEmpty ? 'cl_lt' : '')}>
        <div className='h_item gap_xs ic_sm'>
          {iconName && <Icon name={iconName} />}
          {text}
        </div>

        <Link
          to={pathname}
          onClick={onCloseModal}
          className='target op_0 anim_inner gap_3 h_right link cl_primary'
        >
          {i18n.t('form.open')}
          <Icon name='external-link' />
        </Link>
      </div>
    );
  }

  const { file } = item as DVItemFile;

  return (
    <div
      role='button'
      data-file-id={file.id}
      className={cn('px_6 py_4 h_item gap_xs ic_sm link bd_l_4', selected ? 'bd_primary' : 'bd_invis')}
      onClick={() => setSelectedFile(item as DVItemFile)}
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
  const fileName = file.name || uri;
  const fileUrl = makeUploadsUrl(uri);

  switch (contentType) {
    case 'application/pdf':
      return (
        <iframe
          src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
          className='w_f h_f bd_0'
          title={fileName}
        />
      );

    case 'image/png':
    case 'image/jpeg':
    case 'image/jpg':
    case 'image/gif':
    case 'image/webp':
      return (
        <img
          src={fileUrl}
          alt={fileName}
          className='w_f h_f img_contain'
        />
      );

    default:
  }

  return (
    <div className='abs_full v_center ic_xxxl'>
      <div className='v_center bg px_md py_lg r_md'>
        <div className='pt_sm'>
          <FileTypeIcon contentType={contentType} fileName={fileName} />
        </div>
        <p className='mt_md ellip w_250 a_c pb_df ft_md'>
          {fileName}
        </p>
      </div>
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
  const [keyDownValue, setKeyDown] = useKeyDown();

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

  // Close modal on pathname change

  useEffect(() => {
    if (!firstRenderUrl.current || firstRenderUrl.current === pathname) {
      firstRenderUrl.current = pathname;
      return;
    }
    onCloseModal();
  }, [pathname]);

  // Arrow controls

  useEffect(() => {
    const { pressed, metaKey } = keyDownValue;
    if (!pressed) return;
    if (pressed !== 'ArrowDown' && pressed !== 'ArrowUp') return;

    const fileItems = documentsList.filter((item): item is DVItemFile => 'file' in item);
    if (!fileItems.length) return;

    setSelectedFile(prev => {
      const currentIndex = prev
        ? fileItems.findIndex(item => item.id === prev.id)
        : -1;

      if (pressed === 'ArrowUp') {
        if (metaKey) {
          return fileItems[0];
        }
        if (currentIndex <= 0) {
          return prev;
        }
        return fileItems[currentIndex - 1];
      } else {
        if (metaKey) {
          return fileItems[fileItems.length - 1];
        }
        if (currentIndex >= fileItems.length - 1) {
          return prev;
        }
        return fileItems[currentIndex + 1];
      }
    });

    setKeyDown({ pressed: null });
  }, [keyDownValue.pressed]);


  return (
    <div className='h_spread'>
      <div className='of fs h_100vh rel'>
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
              onCloseModal={onCloseModal}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

DocumentViewerLayout.displayName = 'DocumentViewerLayout';
