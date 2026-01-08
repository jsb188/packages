import i18n from '@jsb188/app/i18n';
import type { ServerErrorObj } from '@jsb188/app/types/app.d';
import { cn } from '@jsb188/app/utils/string';
import { Pill } from '@jsb188/react-web/ui/Button';
import { useAnimationVisibility } from '@jsb188/react/hooks';
import { memo, useEffect, useState } from 'react';
import { COMMON_ICON_NAMES, Icon } from '../svgs/Icon';
import type { ReactDivElement } from '../types/dom.d';
import { BigLoading } from './Loading';
import { DOM_IDS } from '@jsb188/app/constants/app';

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
      <div className={cn('v_center min_h_100vh', className)}>
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
      <div className='min_h_100vh v_center bg z9 abs_full'>
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

type ModalCoverProps = {
  domId?: string;
  visible: 0 | .5 | 1 | 2;
  className?: string;
  animationName?: 'anim_drop_center' | 'anim_zoom_in' | 'anim_zoom_in_fade';
  onCloseModal?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onMouseUp?: (e: React.MouseEvent) => void;
  closePopOver?: () => void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

export function ModalCover(p: ModalCoverProps) {
  const {
    domId,
    visible,
    className,
    animationName,
    onCloseModal,
    closePopOver,
    children,
    ...other
  } = p;

  if (visible === 0) {
    return null;
  }

  let visibleCn, notVisibleCn;
  if (animationName) {
    visibleCn = 'visible';
    notVisibleCn = '';
  } else {
    visibleCn = 'visible op_100';
    notVisibleCn = 'op_0';
  }

  return (
    <div
      id={domId}
      className={cn(
        // 'fixed_full',
        // visible === 2 ? 'visible' : '',
        'fixed_full bg_modal trans_op',
        visible === 2 ? visibleCn : notVisibleCn,
        animationName ? `target ${animationName}` : '',
        onCloseModal ? 'cs_back' : '',
        className
      )}
      onClick={() => {
        onCloseModal?.();
        closePopOver?.();
      }}
      {...other}
    >
      {/* <div className={cn('bg_modal abs_full trans_op spd_2', visible === 2 ? 'op_100' : 'op_0')} /> */}
      {children}
    </div>
  );
}

/**
 * Modal alert screen cover with extra animation and gradient background effect
 */

export function ModalCoverAnimation(p: ModalCoverProps & {
  bacgroundClassName?: string;
  containerClassName?: string;
  containerAnimationName?: string;
  closePopOver?: () => void;
}) {
  const { children, bacgroundClassName, containerAnimationName, containerClassName, ...other } = p;
  const { visible } = p;

  return <ModalCover {...other}>
    <>
      {bacgroundClassName && (
        <div className={cn('abs_full', bacgroundClassName)} />
      )}
      <div
        className={cn(
          'w_f h_f v_center target spd_1 anim_inner rel z2',
          containerAnimationName || 'anim_move_up_center',
          visible === 2 ? 'visible' : visible === .5 ? 'reverse' : '',
          containerClassName
        )}
      >
        {children}
      </div>
    </>
  </ModalCover>;
}

/**
 * Fixed layout with animation
 */

export function FixedAnimationLayout(p: ModalCoverProps) {
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
  size: ContainerSizeEnum | string; // allow custom sizes like max_w_#### etc
  addScrollArea?: boolean;
  onCloseModal?: () => void;
  ToolbarComponent?: React.ReactNode;
  children: React.ReactNode;
  closeText?: string;
  closePopOver?: () => void;
};

export function ModalWrapper(p: ModalWrapperProps) {
  const { ToolbarComponent, domId, className, containerClassName, outlineColor, children, closePopOver, onCloseModal, addScrollArea, ...other } = p;
  const size = p.size || 'df';
  const closeText = p.closeText || i18n.t('form.esc');

  return (
    <div
      id={domId}
      onClick={(e) => {
        e.stopPropagation();
        closePopOver?.();
      }}
      className={cn('mw modal_main_content alert_shadow_' + (outlineColor || 'default'), size, className)}
      {...other}
    >
      {!onCloseModal ? null : (
        <button
          className='abs_corner_df z1 cl_lt v_center'
          onClick={onCloseModal}
        >
          <span className='r av_sm v_center ic_df'>
            <Icon name='x' />
          </span>
          {!closeText ? null
          : <span className='ft_tn move_up'>
            {closeText}
          </span>}
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
  authHref?: string;
  buttonText?: string;
  buttonHref?: string;
  loading?: boolean;
  containerSize?: ContainerSizeEnum;
  onClickButton?: () => void;
}

export function ErrorMessage(p: ErrorMessageProps) {
  const { authHref, errorCode, statusCode, doNotRefreshIfNotLoggedIn, hideButtonIfNotRetriable, preset, iconName, buttonHref, buttonText, loading, containerSize, onClickButton } = p;
  const isAuthError = errorCode == '20019';

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

  let containerClassName, titleClassName, messageClassName, buttonClassName, buttonPreset;
  let buttonSize: any;

  switch (preset) {
    case 'inside_content':
      containerClassName = 'ic_xxl cl_md min_h_100vh';
      titleClassName = 'ft_df';
      messageClassName = 'ft_md';
      buttonClassName = 'bg';
      buttonSize = 'md';
      break;
    case 'full_page':
    default:
      containerClassName = 'ic_xxxl';
      titleClassName = 'ft_df';
      messageClassName = 'ft_md';
      buttonClassName = 'cl_secondary';
      // buttonClassName = 'bg_active ft_medium cl_bd';
      buttonPreset = 'outline_lg' as const;
      buttonSize = null;
  }

  let buttonHandler;
  if (
    // If "30000" error, this could be an outdated GraphQL fragment error,
    // so we need to refresh the browser.
    errorCode === '30000' ||
    (!doNotRefreshIfNotLoggedIn && isAuthError)
  ) {
    buttonHandler = () => globalThis.location.reload();
  } else if (
    (onClickButton || buttonHref) &&
    (!hideButtonIfNotRetriable || isRetriableError(statusCode!))
    // (!onClickButton && !buttonHref) ||
    // (hideButtonIfNotRetriable && statusCode && !isRetriableError(statusCode))
  ) {
    buttonHandler = onClickButton;
  }

  let titleIconName, iconSizeClassName;
  if (isAuthError) {
    titleIconName = COMMON_ICON_NAMES.login_related;
    iconSizeClassName = 'ft_xxl';
  } else {
    titleIconName = iconName || 'alert-circle';
    iconSizeClassName = 'ft_lg';
  }

  return (
    <div className={cn('p_md v_center cw', containerSize || 'max_w_550', containerClassName)}>
      <span className={cn('cl_secondary', iconSizeClassName)}>
        <Icon
          tryColor
          name={titleIconName}
        />
      </span>
      <h1 className={cn('ft_semibold ls_2 cl_secondary', titleClassName)}>
        {title}
      </h1>
      <p className={cn('op_70 a_c mb_md cl_bd', messageClassName)}>
        {message}
      </p>

      {isAuthError
      ? <Pill
        // No need t o use "from" url param because we're using referrer
        // href={authHref ?? '/auth/check?from=' + encodeURIComponent(globalThis.location.pathname)}
        href={authHref ?? '/auth/check'}
        className={buttonClassName}
        preset={buttonPreset}
        size={buttonSize}
      >
        {i18n.t('auth.log_in_again')}
      </Pill>
      : buttonHandler ? (
        <Pill
          addLoadingIndicator
          href={buttonHref}
          loading={loading}
          className={buttonClassName}
          preset={buttonPreset}
          size={buttonSize}
          onClick={buttonHandler}
        >
          {buttonText || i18n.t('form.try_again')}
        </Pill>
      ) : null}
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
  bodyClassName?: string;
  loading?: boolean;
  error?: ServerErrorObj | null;
}

export function PageContent(p: PageContentProps) {
  const { children, HeaderComponent, AsideComponent, loading, error, className, asideClassName, bodyClassName, ...other } = p;

  // This triggers a "50% opacity" state. I used to use this effect for all loading,
  // but data loads so fast, that it creates an opacity flicker, and that isn't a
  // wanted effect. However, when there's an error, this effect fits nicely.
  const errored = !!error && !loading;

  return (
    <div className={className}>
      {HeaderComponent}

      {AsideComponent
      ? <div className='gap_70 h_top' {...other}>
        {AsideComponent && (
          <aside className={cn('pg_aside z4 sticky', asideClassName)}>
            {AsideComponent}
          </aside>
        )}

        <div className={cn('f', bodyClassName, errored && 'op_50')}>
          {children}
        </div>
      </div>
      : <div className={cn(bodyClassName, errored && 'op_50')}>
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
  NotReadyComponent?: React.ElementType;
  showLoadingIfNotReady?: boolean;
  notReady?: boolean;
  loading?: boolean;
  notReadyClassName?: string;
  error?: ServerErrorObj | null;
  onRefetch?: () => void;
  hideButtonIfNotRetriable?: boolean;
}

export function ContentGate(p: ContentGateProps) {
  const { children, error, loading, notReady, showLoadingIfNotReady, NotReadyComponent, notReadyClassName, hideButtonIfNotRetriable, onRefetch } = p;

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
      : NotReadyComponent
      ? <NotReadyComponent />
      : showLoadingIfNotReady
        ? <BigLoading color='active' />
      : null}
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
      'floating_msg_cnt abs_t z4 cw df pt_sm',
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

/**
 * Aside component; table of contents
 */

export const AsideScrollIndicator = memo((p: {
  scrollBehavior: 'smooth' | 'instant';
  selected: string | null;
  navList: {
    text: string;
    anchor: string;
  }[];
}) => {
  const { selected, navList, scrollBehavior } = p;
  const scrollToContent = (anchor: string) => {
    const el = document.getElementById(anchor);
    if (el) {
      el.scrollIntoView({ behavior: scrollBehavior ?? 'smooth', block: 'start' });
    }
  };

  return <nav className='my_md ft_sm lh_1'>
    {/* <div className='h_40' /> */}
    {/* <div className='pattern_texture texture_bf rel my_df h_4' /> */}
    {/* <div className='bd_t_2 bd_lt my_df h_6' /> */}

    <p className='ft_semibold cl_md px_sm py_df'>
      {i18n.t('form.table_of_contents')}
    </p>

    {navList.map((navItem, i) => {
      const { text, anchor } = navItem;
      const isSelected = selected === anchor;
      return <button
        key={i}
        className={cn('bl mb_df h_left', isSelected ? '' : 'cl_lt')}
        onClick={() => scrollToContent(anchor)}
      >
        <div className={cn('w_25 h_2 mt_6 mr_10 f_shrink trans_color spd_2', isSelected ? 'bg_primary' : 'bg_active')} />
        <span>
          {text}
        </span>
      </button>;
    })}
  </nav>;
});

AsideScrollIndicator.displayName = 'AsideScrollIndicator';
