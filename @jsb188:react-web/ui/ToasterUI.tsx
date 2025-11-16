import type { ToastObj } from '@jsb188/react/states';
import { memo } from 'react';
import { cn } from '@jsb188/app/utils/string';
import './ToasterUI.css';

/**
 * Toaster preview; container
 */

export const ToasterPreviewContainer = memo((p: {
  children: React.ReactNode;
  open: boolean;
  animating: boolean;
}) => {
  const { children, open, animating } = p;
  return <div
    id='toaster_preview'
    className={cn(
      'trans_transform spd_4',
      animating ? 'animating' : 'not_animating',
      open ? 'open' : 'closed'
    )}
  >
    {children}
  </div>
});

ToasterPreviewContainer.displayName = 'ToasterPreviewContainer';

/**
 * Toaster preview; item
 */

export const ToastPreviewItem = memo((p: ToastObj & {
  onClick?: () => void;
}) => {

  const { message, messageType, onClick } = p;

  return <div
    role={onClick ? 'button' : undefined}
    onClick={onClick}
    className={cn(
      'av_h_xs r v_center px_sm r h_item op_80 cl_darker_4 trans max_w_400 bg shadow_bg_lg',
      onClick ? 'link bg_alt_hv cl_df_hv' : '',
    )}
  >
    <span className='shift_down ellip'>
      {message}
    </span>
  </div>;
});

ToastPreviewItem.displayName = 'ToastPreviewItem';
