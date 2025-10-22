import type { ToastObj } from '@jsb188/react/states';
import { useToastValue } from '@jsb188/react/states';
import { memo, useEffect, useState } from 'react';
import { ToasterPreviewContainer, ToastPreviewItem } from '../ui/ToasterUI';
import { cn } from '@jsb188/app/utils/string';
// import '@jsb188/mday/utils/route';

/**
 * Toaster preview
 */

const ToasterPreview = memo((p: {
  open: boolean;
  newToast: ToastObj | null;
  onClickPreview?: () => void;
}) => {
  const { newToast, open, onClickPreview } = p;
  const [hiddenToast, setHiddenToast] = useState<ToastObj | null>(null);
  const [visibleToast, setVisibleToast] = useState<ToastObj | null>(null);
  const [animatingId, setAnimatingId] = useState<string | null>(null); // ID of the new, animating toast

  useEffect(() => {
    if (newToast?.message) {
      setAnimatingId(newToast.id);
    }
  }, [newToast]);

  useEffect(() => {
    if (animatingId && newToast?.id === animatingId) {
      const timer = setTimeout(() => {
        setHiddenToast(visibleToast);
        setVisibleToast(newToast);
        setAnimatingId(null);
      }, 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [animatingId]);

  return <ToasterPreviewContainer
    open={open}
    animating={!!animatingId}
  >
    {[hiddenToast, visibleToast, newToast?.id === visibleToast?.id ? null : newToast].map((toast, ix) => {
      return <div
        key={ix}
        className={cn(
          'v_center trans_opacity',
          ix <= 1 || toast?.message ? 'h_toolbar' : '',
          ix === 1 || animatingId ? 'op_100' : 'op_0'
        )}
      >
        {toast?.message &&
          <ToastPreviewItem
            {...toast}
            onClick={ix === 1 ? onClickPreview : undefined}
          />
        }
      </div>;
    })}
  </ToasterPreviewContainer>;
});

ToasterPreview.displayName = 'ToasterPreview';

/**
 * Toaster module
 */

function Toaster() {
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastObj[]>([]);
  const newToast = useToastValue();

  useEffect(() => {
    if (newToast?.message) {
      const existingIx = toasts.findIndex(t => t.id === newToast.id);
      if (existingIx >= 0) {
        // Update existing toast
        setToasts(toasts.map((t, ix) => ix === existingIx ? newToast : t));
      } else {
        // Add new toast
        setToasts(prevToasts => [newToast, ...prevToasts]);
      }
    }
  }, [newToast]);

  // console.log('/');
  // console.log('/');
  // console.log(toasts);

  const onClickPreview = () => {
    setOpen(!open);
  };

  return <div className='rel fs v_center w_400'>
    <ToasterPreview
      open={open}
      newToast={newToast}
      onClickPreview={onClickPreview}
    />
  </div>;
}

export default Toaster;
