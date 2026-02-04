import { orderBy } from '@jsb188/app/utils/object.ts';
import { makeUploadsUrl } from '@jsb188/app/utils/url_client.ts';
import type { ModalToolbarBreadcrumb } from '@jsb188/react-web/ui/ModalUI';
import { ModalToolbar } from '@jsb188/react-web/ui/ModalUI';
import { memo, useMemo, useState } from 'react';

/**
 * Types
 */

interface DocumentViewerFileObj {
  id: string;
  storageId: string;
  uri: string | null;
  contentType: string | null;
  order: number;
}

/**
 * View files
 */

export const FileViewer = memo((p: {
  file: DocumentViewerFileObj;
}) => {
  const { file } = p;
  const { uri, contentType } = file;

  if (!uri) {
    return null;
  }

  const fileUrl = makeUploadsUrl(uri);

  switch (contentType) {
    case 'application/pdf':
      return <iframe
        style={{ border: 'none', outline: 'none' }}
        src={fileUrl + '#toolbar=0&navpanes=0&scrollbar=0'}
        // src={fileUrl + '#navpanes=0&scrollbar=0'}
        // src={fileUrl}
        className='w_f h_f'
        title='PDF Viewer'
      />;
    case 'image/png':
    case 'image/jpg':
    case 'image/jpeg':
    case 'image/gif':
    case 'image/webp':
    default:
  }

  return <img
    src={fileUrl}
    alt='Document Image'
    className='w_f h_auto h_top'
  />;
});

FileViewer.displayName = 'FileViewer';

/**
 * Docuement viewer layout
 */

const DocumentViewer = memo((p: {
  onCloseModal?: () => void;
  children: React.ReactNode;
  initialIndex?: number;
  files: DocumentViewerFileObj[];
  title: string;
  breadcrumbs?: ModalToolbarBreadcrumb[];
}) => {

  const { onCloseModal, breadcrumbs, title, files, children, initialIndex } = p;
  const [selectedIx, setSelectedIx] = useState(initialIndex || 0);
  const documentFiles = useMemo(() => {
    return orderBy(files, 'order', 'asc');
  }, [files]);

  return <div className='w_f h_f h_top'>
    <div
      className='rel z1 fs shadow_soft_lg bd_contrast'
      // style={{ borderTop: 'solid 75px', borderLeft: 'solid 75px', borderRight: 'solid 75px' }}
      style={{ border: 'solid 75px' }}
    >
      <FileViewer
        file={documentFiles[selectedIx]}
      />
    </div>

    <aside className='w_375 f_shrink bg f_stretch'>
      {/* <ModalAsideToolbar
        title={i18n.t('org.compliance_title')}
        onCloseModal={onCloseModal}
      /> */}
      <ModalToolbar
        // paddingClassName='px_md'
        breadcrumbs={breadcrumbs}
        onCloseModal={onCloseModal}
      />

      <div className='px_md'>
        <h4 className='pt_md mb_20 ft_xs ft_medium'>
          {title}
        </h4>

        {children}
      </div>
    </aside>
  </div>;
});

DocumentViewer.displayName = 'DocumentViewer';

export default DocumentViewer;
