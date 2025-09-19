import { orderBy } from '@jsb188/app/utils/object';
import { makeUploadsUrl } from '@jsb188/app/utils/url_client';
import { memo, useState, useMemo } from 'react';

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

const FileViewer = memo((p: {
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
        // src={fileUrl + '#toolbar=0&navpanes=0&scrollbar=0'}
        // src={fileUrl + '#navpanes=0&scrollbar=0'}
        src={fileUrl}
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
  children: React.ReactNode;
  initialIndex?: number;
  files: DocumentViewerFileObj[];
  title: string;
}) => {

  const { title, files, children, initialIndex } = p;
  const [selectedIx, setSelectedIx] = useState(initialIndex || 0);
  const documentFiles = useMemo(() => {
    return orderBy(files, 'order', 'asc');
  }, [files]);

  return <div className='w_f h_f h_top'>
    <div className='fs'>
      <FileViewer
        file={documentFiles[selectedIx]}
      />
    </div>

    <div className='w_350 f_shrink px_df py_df bg_alt f_stretch'>
      <h4 className='pt_md mb_df ft_xs ft_medium'>
        {title}
      </h4>

      {children}
    </div>
  </div>;
});

DocumentViewer.displayName = 'DocumentViewer';

export default DocumentViewer;
