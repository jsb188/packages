import i18n from '@jsb188/app/i18n';
import type { ServerErrorObj } from '@jsb188/app/types/app.d';
import { cn } from '@jsb188/app/utils/string';
import { Icon } from '@jsb188/react-web/icons';
import { Pill } from '@jsb188/react-web/ui/Avatar';
import { useAnimationVisibility } from '@jsb188/react/hooks';
import { memo } from 'react';
import type { ReactDivElement } from '../types/dom.d';

// const cssPaths = ['/css/layout.css', '/css/alert.css'];

/**
 * Types
 */

export type ContainerSizeEnum = 'tn' | 'xxs' | 'xs' | 'sm' | 'df' | 'md' | 'lg' | 'full';

/**
 * App footer
 */

function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className='p_lg h_center bg_alt ft_sm cl_md'>
      © {year} {i18n.t('app.name')}
    </footer>
  );
}

/**
 * Footer refresh button
 */

export function FooterRefreshButton() {
  return (
    <div className='abs_b p_md h_center'>
      <button
        className='text cl_md'
        onClick={() => globalThis.location.reload()}
      >
        {i18n.t('form.refresh_page')}
      </button>
    </div>
  );
}

/**
 * Full page layout with footer below the fold
 */

interface FullPageLayoutProps {
  children: React.ReactNode;
  className?: string;
  hideFooter?: boolean;
}

export function FullPageLayout(p: FullPageLayoutProps) {
  const { children, hideFooter, className } = p;
  return (
    <main>
      <div className={cn('v_center page_ht', className)}>
        {children}
      </div>

      {hideFooter ? null : <AppFooter />}
    </main>
  );
}

/**
 * Full page layout on pages where Chat should appear
 */

export function AbsoluteFullPageLayout(p: { children: React.ReactNode }) {
  const { children } = p;
  return (
    <main>
      <div className='page_ht v_center bg z9 abs_full'>
        {children}

        {/* Do footer here */}
        {/* <AppFooter /> */}
      </div>
    </main>
  );
}

/**
 * Modal components below
 */

/**
 * Modal screen cover
 * NOTE: It's important that you add ".modal_main_content" to the first immediate child
 * It's possible to do this with > :first-child but it's impossible to fool-proof target only the first child without subchilds
 */

type ModalScreenCoverProps = {
  domId?: string;
  visible: 0 | .5 | 1 | 2;
  className?: string;
  animationName: 'anim_drop_center' | 'anim_zoom_in' | 'anim_zoom_in_fade';
  onCloseModal?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

export function ModalScreenCover(p: ModalScreenCoverProps) {
  const {
    domId,
    visible,
    className,
    animationName,
    onCloseModal,
    children,
    ...other
  } = p;
  if (visible === 0) {
    return null;
  }
  return (
    <div
      id={domId}
      className={cn(
        // 'fixed_full',
        // visible === 2 ? 'visible' : '',
        'fixed_full bg_modal trans_opacity',
        visible === 2 ? 'visible op_100' : 'op_0',
        animationName,
        onCloseModal ? 'cs_back' : '',
        className
      )}
      onClick={onCloseModal}
      {...other}
    >
      {/* <div className={cn('bg_modal abs_full trans_opacity spd_2', visible === 2 ? 'op_100' : 'op_0')} /> */}
      {children}
    </div>
  );
}

/**
 * Modal alert screen cover with extra animation and gradient background effect
 */

interface ModalAlertCoverProps extends ModalScreenCoverProps {
  contentClassName?: string;
}

export function ModalAlertCover(p: ModalAlertCoverProps) {
  const { children, contentClassName, ...other } = p;
  const { visible } = p;

  return <ModalScreenCover {...other}>
    <div
      className={cn(
        'w_f h_f anim_shift_appear_center target anim_inner bg_alert',
        visible === 2 ? 'visible' : visible === .5 ? 'reverse' : '',
        contentClassName
      )}
    >
      {children}
    </div>
  </ModalScreenCover>;
}

/**
 * Fixed layout with animation
 */

export function FixedAnimationLayout(p: ModalScreenCoverProps) {
  const {
    domId,
    visible,
    className,
    animationName,
    children,
    ...other
  } = p;
  if (visible === 0) {
    return null;
  }

  return (
    <div
      id={domId}
      className={cn(
        'anim',
        animationName,
        visible === 2 ? 'visible' : '',
        className,
      )}
      {...other}
    >
      {children}
    </div>
  );
}

/**
 * Modal wrapper; for sizing and page view height scrolling
 */

type ModalWrapperProps = {
  domId?: string;
  className?: string;
  containerClassName?: string;
  outlineColor?: 'error' | 'default';
  size: ContainerSizeEnum;
  addScrollArea?: boolean;
  onCloseModal?: () => void;
  ToolbarComponent?: React.ReactNode;
  children: React.ReactNode;
};

export function ModalWrapper(p: ModalWrapperProps) {
  const { ToolbarComponent, domId, className, containerClassName, outlineColor, children, onCloseModal, addScrollArea, ...other } = p;
  const size = p.size || 'df';

  return (
    <div
      id={domId}
      onClick={(e) => e.stopPropagation()}
      className={cn('mw modal_main_content alert_shadow_' + (outlineColor || 'default'), size, className)}
      {...other}
    >
      {!onCloseModal ? null : (
        <button
          className='r av_sm v_center bg_alt ic_sm abs_corner z1'
          onClick={onCloseModal}
        >
          <Icon name='x' />
        </button>
      )}

      {ToolbarComponent}

      {!addScrollArea ? children : (
        <div className={cn('scr_area fs', containerClassName || 'p_df')}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Helper for checking if error code is retriable
 */

function isRetriableError(statusCode: number) {
  // 429: Too Many Requests
  // 500: Internal Server Error
  // 502: Bad gateway
  return [429, 500, 502].includes(Number(statusCode));
}

/**
 * Simple error component with icon and message
 */

export interface ErrorMessageProps {
  doNotRefreshIfNotLoggedIn?: boolean;
  hideButtonIfNotRetriable?: boolean;
  errorCode?: string;
  statusCode?: number;
  preset?: 'inside_content' | 'full_page';
  iconName?: string;
  title?: string;
  message?: string;
  buttonText?: string;
  buttonHref?: string;
  loading?: boolean;
  containerSize?: ContainerSizeEnum;
  onClickButton?: () => void;
}

export function ErrorMessage(p: ErrorMessageProps) {
  const { errorCode, statusCode, doNotRefreshIfNotLoggedIn, hideButtonIfNotRetriable, preset, iconName, buttonHref, buttonText, loading, containerSize, onClickButton } = p;

  let title;
  if (p.title) {
    title = p.title;
  } else {
    title = i18n.t('error.error');
  }

  let message;
  if (p.message) {
    message = p.message;
  } else {
    message = i18n.t('error.unknown_error');
  }

  let containerClassName;
  let titleClassName;
  let messageClassName;
  let buttonClassName;
  let buttonSize: any;

  switch (preset) {
    case 'inside_content':
      containerClassName = 'ic_xxl cl_md page_ht';
      titleClassName = 'ft_df';
      messageClassName = 'ft_md';
      buttonClassName = 'bg';
      buttonSize = 'medium';
      break;
    case 'full_page':
    default:
      containerClassName = 'ic_xxxl';
      titleClassName = 'ft_df';
      messageClassName = 'ft_md';
      buttonClassName = 'bg_secondary';
      buttonSize = 'medium';
  }

  let buttonHandler;
  if (!doNotRefreshIfNotLoggedIn && errorCode == '20019') {
    buttonHandler = () => globalThis.location.reload();
  } else if (
    (onClickButton || buttonHref) &&
    (!hideButtonIfNotRetriable || isRetriableError(statusCode!))
    // (!onClickButton && !buttonHref) ||
    // (hideButtonIfNotRetriable && statusCode && !isRetriableError(statusCode))
  ) {
    buttonHandler = onClickButton;
  }

  let titleIconName;
  if (errorCode == '20019') {
    titleIconName = 'circle-key';
  } else {
    titleIconName = iconName || 'alert-icon-filled';
  }

  return (
    <div className={cn('p_md v_center cw', containerSize || 'max_w_550', containerClassName)}>
      <span className='cl_secondary'>
        <Icon
          name={titleIconName}
        />
      </span>
      <h1 className={cn('ft_bold ls_2 cl_secondary', titleClassName)}>
        {title}
      </h1>
      <p className={cn('op_75 a_c mb_md cl_bd', messageClassName)}>
        {message}
      </p>

      {!buttonHandler ? null : (
        <Pill
          addLoadingIndicator
          href={buttonHref}
          loading={loading}
          className={buttonClassName}
          size={buttonSize}
          onClick={buttonHandler}
        >
          {buttonText || i18n.t('form.try_again')}
        </Pill>
      )}
    </div>
  );
}

/**
 * Content with right <aside /> sticky sidebar
 */

interface PageContentProps extends ReactDivElement {
  HeaderComponent?: React.ReactNode;
  AsideComponent?: React.ReactNode;
  children: React.ReactNode;
  asideClassName?: string;
  loading?: boolean;
  error?: ServerErrorObj | null;
}

export function PageContent(p: PageContentProps) {
  const { children, HeaderComponent, AsideComponent, loading, error, className, asideClassName, ...other } = p;

  // This triggers a "50% opacity" state. I used to use this effect for all loading,
  // but data loads so fast, that it creates an opacity flicker, and that isn't a
  // wanted effect. However, when there's an error, this effect fits nicely.
  const errored = !!error && !loading;

  return (
    <div className={className}>
      {HeaderComponent}

      {AsideComponent
      ? <div className='gap_md h_top' {...other}>
        <div className={cn('f', errored && 'op_50')}>
          {children}
        </div>

        {AsideComponent && (
          <aside className={cn('pg_aside sticky', asideClassName)}>
            {AsideComponent}
          </aside>
        )}
      </div>
      : <div className={errored ? 'op_50' : ''}>
        {children}
      </div>}
    </div>
  );
}

/**
 * Lock for certain content section of pages
 * NOTE: This is not designed to lock the whole page, just the main content or a specific section
 */

interface ContentGateProps {
  children: React.ReactNode;
  NotReadyComponent?: React.ReactNode;
  notReady?: boolean;
  loading?: boolean;
  notReadyClassName?: string;
  error?: ServerErrorObj | null;
  onRefetch?: () => void;
  hideButtonIfNotRetriable?: boolean;
}

export function ContentGate(p: ContentGateProps) {
  const { children, error, loading, notReady, NotReadyComponent, notReadyClassName, hideButtonIfNotRetriable, onRefetch } = p;

  if (notReady) {
    // return <div className='v_center h_f'>
    //   <BigLoading color='active' />
    // </div>;

    const hasError = error && !loading;
    return <div className={cn(hasError ? 'h_f v_center' : '', notReadyClassName)}>
      {hasError
      ? <ErrorMessage
        // message={error?.message || defaultErrorMessage}
        {...error}
        hideButtonIfNotRetriable={typeof hideButtonIfNotRetriable === 'boolean' ? hideButtonIfNotRetriable : true}
        onClickButton={onRefetch}
      />
      : NotReadyComponent}
    </div>;
  }

  return children;
}

/**
 * Floating message as a soft-alert to user
 */

interface FloatingMessageProps {
  text: string | null;
  onClose: () => void;
  className?: string;
}

export const FloatingMessage = memo((p: FloatingMessageProps) => {
  const { className, text, onClose } = p;
  // const [innerState, setInnerState] = useState({ active: !!text, text });
  const [innerStateText, visibility] = useAnimationVisibility(text || '');

  return <div
    className={cn(
      'floating_msg_cnt abs_t z3 cw df pt_sm',
      visibility >= 2 ? 'active' : visibility ? '' : 'hidden',
      className
    )}
  >
    <div className='floating_msg bg_secondary r h_40 pl_sm pr_5 shadow h_spread'>
      <span className='ellip f'>
        {innerStateText}
      </span>

      <button
        className='av av_xs r v_center bg_secondary_active link'
        onClick={onClose}
      >
        <Icon
          name='x'
        />
      </button>
    </div>
  </div>;
});

FloatingMessage.displayName = 'FloatingMessage';
