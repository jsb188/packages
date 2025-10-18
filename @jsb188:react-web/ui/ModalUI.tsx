import i18n from '@jsb188/app/i18n';
import type { ServerErrorObj } from '@jsb188/app/types/app.d';
import { cn } from '@jsb188/app/utils/string';
import { Icon } from '../svgs/Icon';
import type { ReactDivElement } from '../types/dom.d';
import { FullWidthButton } from './Button';
import { ActivityDots, BigLoading } from './Loading';
import Markdown, { EmojiWrapper, TextWithLinks } from './Markdown';
import { ShortcutKey } from './OtherUI';

/**
 * Types
 */

interface ModalErrorProps {
  children?: React.ReactNode;
  error: ServerErrorObj;
  resetErrors: () => void;
}

interface ModalHeaderProps {
  hideBackButton: boolean;
  title: string;
  backUrl: string;
  onBack: (e: React.MouseEvent) => void;
}

interface MSSubtitleProps {
  __type: 'LIST_SUBTITLE';
  text: string;
  selected?: unknown;
  value?: unknown;
  onClick?: unknown;
}

interface MSListItemProps {
  __type: 'LIST_ITEM';
  value: string;
  iconName: string;
  text: string;
  rightIconName?: string;
  selected?: boolean;
  onClick?: (value: string) => void;
}

export type ModalSideNavIface = MSSubtitleProps | MSListItemProps;

// interface ModalSideNavItemProps {
//   __type: 'LIST_SUBTITLE' | 'LIST_ITEM' | string;
//   value?: string;
//   text?: string;
//   children?: string;
//   selected?: boolean;
//   iconName?: string;
//   rightIconName?: string;
//   onClick?: (value: string) => void;
// }

interface ModalSideNavProps {
  selectedValue: string;
  options: ModalSideNavIface[][];
  onClickItem: (value: string) => void;
}

interface ModalFloatingSaveButtonProps {
  hasChanges: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}

interface ModalContentContainerProps extends ReactDivElement {
  notReady?: boolean;
  addFooterPadding?: boolean;
  addYOverflow?: boolean;
}

/**
 * Modal content container
 */

export function ModalContentContainer(p: ModalContentContainerProps) {
  const { notReady, addFooterPadding, addYOverflow, className, ...other } = p;
  return (
    <div
      className={cn('mw_content r_df', addYOverflow ? 'scr_area' : '', addFooterPadding ? 'w_pad' : '', className, notReady ? 'v_center' : '')}
      {...other}
    >
      {notReady ? <BigLoading color='alt' /> : other.children}
    </div>
  );
}

/**
 * Modal error message notice
 */

export function ModalErrorMessage(p: ModalErrorProps) {
  const { error: { title, message, iconName }, resetErrors, children } = p;

  return (
    <div className='rel p_df mb_sm r_sm bg_alt'>
      <button
        className='r av_xxs v_center bg_active bg_medium_hv ic_sm abs_corner_xs z1'
        onClick={resetErrors}
      >
        <Icon name='x' />
      </button>

      <div className='h_item mb_xs ic_sm cl_err'>
        <span className='mr_xs'>
          <Icon
            name={iconName || 'alert-circle'}
          />
        </span>
        <strong className='shift_down'>
          {title || i18n.t('error.error')}
        </strong>
      </div>

      {message && (
        <p>
          {message}
        </p>
      )}

      {children}
    </div>
  );
}

/**
 * Modal; header
 */

export function ModalHeader(p: Partial<ModalHeaderProps>) {
  const { hideBackButton, title, onBack, backUrl } = p;

  let backProps;
  if (onBack) {
    backProps = {
      href: '#',
      onClick: onBack,
    };
  } else if (!hideBackButton) {
    backProps = {
      href: backUrl || '/'
    };
  }

  return (
    <header className='bg rt_df mw_header h_center a_c'>
      {!backProps ? null : (
        <div className='abs_l v_center px_sm'>
          <a {...backProps} role='button' className='av_df v_center r bg_alt back cl_df'>
            <Icon name='arrow-left' />
          </a>
        </div>
      )}
      {!title ? null : (
        <strong className='ft_md shift_down'>
          <EmojiWrapper>
            {title}
          </EmojiWrapper>
        </strong>
      )}
    </header>
  );
}

/**
 * Modal; simple content with big icon and title
 */

interface ModalSimpleContentProps {
  title: string;
  message?: string;
  iconName: string;
  className?: string;
  children?: React.ReactNode;
}

export function ModalSimpleContent(p: ModalSimpleContentProps) {
  const { title, message, iconName, className, children } = p;

  return <div className={cn('v_center a_c', className ?? 'py_md px_df')}>
    <span className='ic_xxxl cl_secondary'>
      <Icon name={iconName} />
    </span>

    <h1 className='ft_sm ft_bold ls_2 mb_4'>
      {title}
    </h1>

    <div className='pb_df'>
      {children}

      {message && (
        <p>
          {message}
        </p>
      )}
    </div>
  </div>;
}

/**
 * Modal; side nav links
 */

export function ModalSideNavItem(p: ModalSideNavIface) {
  const { __type, text } = p;
  const itemCn = 'px_xs py_3';

  switch (__type) {
    case 'LIST_SUBTITLE':
      return (
        <li className={`${itemCn} ml_2 mb_2 title`}>
          <span className='cl_lt ft_sm ft_medium'>
            {text}
          </span>
        </li>
      );
    case 'LIST_ITEM':
    default:
  }

  const { value, selected, onClick, iconName, rightIconName } = p as MSListItemProps;
  const hasLink = !!onClick;

  return (
    <li
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
      role='button'
      className={cn('r_sm h_item mb_2', itemCn, hasLink ? 'link' : '', selected ? 'bg_alt cl_df' : 'bg_alt_hv cl_df')}
      onClick={onClick ? () => onClick(value!) : undefined}
    >
      {!iconName ? null
      : <span className='w_25 h_center ic_abs shift_left mr_4'>
        <Icon name={iconName} />
      </span>}

      <span className='ellip pt_1'>
        {text}
      </span>

      {!rightIconName ? null
        : <span className='ic_sm ml_xs'>
          <Icon name={rightIconName} />
        </span>}
    </li>
  );
}

/**
 * Modal; side nav
 */

export function ModalSideNav(p: ModalSideNavProps) {
  const { selectedValue, options, onClickItem } = p;

  return (
    <nav className='mw_snav y_scr always'>
      {options?.map((list, i) => (
        <ul className='px_df py_sm' key={i}>
          {list.map((item, i) => (
            <ModalSideNavItem
              key={i}
              {...item}
              selected={selectedValue === item.value}
              onClick={onClickItem}
            />
          ))}
        </ul>
      ))}
    </nav>
  );
}

/**
 * Modal; save button
 */

export function ModalFloatingSaveButton(p: ModalFloatingSaveButtonProps) {
  const { hasChanges, saving, onSave, onReset } = p;
  // const { onSave, onReset } = p;
  // const hasChanges = true;
  // const saving = true;

  return (
    <div className={cn('mfs_cnt bg_alt h_spread rt_df z_10', hasChanges ? 'active' : '')}>
      <div className='h_item px_xs'>
        {i18n.t('form.unsaved_changes_msg')}
      </div>

      <div className='h_right'>
        <div className='pill pill_sm h_center mr_xs'>
          <button className='text' onClick={onReset}>
            <span className='h_right'>
              <Icon name='arrow-back-up' />
              <span className='ml_xs'>
                {i18n.t('form.undo_changes')}
              </span>
            </span>
          </button>
        </div>

        <button
          className={cn('mfs_btn pill pill_df r bg_primary', saving ? 'loading' : '')}
          onClick={onSave}
        >
          {!saving ? null : (
            <div className='abs_full v_center'>
              <ActivityDots />
            </div>
          )}
          <span>
            {/* Need the extra <span /> to use the :last-child rule in <ShortcutKey /> */}
            {i18n.t('form.save_changes')}
          </span>
          <ShortcutKey letter='S' />
        </button>
      </div>
    </div>
  );
}

/**
 * Alert content
 */

interface AlertDataProps {
  preset?: string;
  __type?: string;
  iconName?: string | null;
  iconClassName?: string;
  title?: string;
  message?: string;
  url?: string;
  requireInput?: boolean;
  isWarning?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputType?: 'text' | 'password';
  messageHasHTML?: boolean;
  confirmText?: string;
  confirmPreset?: 'main' | 'cancel';
  cancelText?: string;
  cancelPreset?: 'main' | 'cancel';
  onConfirm?: (inputValue?: string) => void;
  onCancel?: () => void;
  onCloseModal?: () => void;
  doNotExitOnConfirm?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}

export function AlertPopUp(p: AlertDataProps) {
  const {
    iconName,
    iconClassName,
    title,
    message,
    isWarning,
    messageHasHTML,
    confirmText,
    cancelText,
    onConfirm,
    onCancel,
    onCloseModal,
    doNotExitOnConfirm,
    url,
    loading,
    children,
  } = p;

  const onClickCancel = () => {
    if (onCancel) {
      onCancel();
    }
    if (onCloseModal) {
      onCloseModal();
    }
  };

  const onClickConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    if (url) {
      globalThis?.open(url, '_blank')?.focus();
    }
    if (onCloseModal && !doNotExitOnConfirm) {
      onCloseModal();
    }
  };

  let confirmPreset;
  if (isWarning) {
    confirmPreset = 'bg_err';
  } else if (cancelText) {
    confirmPreset = 'bg_secondary';
  } else {
    confirmPreset = 'subtle';
  }

  return (
    <>
      {iconName !== null
      ? <div className={cn('pt_lg pb_df ic_xxl', iconClassName, isWarning ? 'cl_darker_2' : 'cl_secondary' )}>
        <Icon
          tryColor
          name={iconName || 'alert-circle'}
        />
      </div>
      : <div className='h_40' />}

      <div className='w_f'>
        <h3 className='ft_sm a_c px_25'>
          {title}
        </h3>
        <div className='px_30'>
          {/* TextWithLinks */}
          {messageHasHTML && message
          ? <TextWithLinks as='p' className='a_c'>
            {message}
          </TextWithLinks>
          : <Markdown as='p' className='a_c'>
            {message}
          </Markdown>}
        </div>

        {children}

        <div className='mx_md pb_md'>
          {!url ? null : (
            <FullWidthButton
              className='mt_md mb_sm op_70'
              textClassName='ellip'
              disabled
              preset='outline'
            >
              {url}
            </FullWidthButton>
          )}

          <FullWidthButton
            // @ts-expect-error preset is correct
            preset={confirmPreset}
            className={url ? undefined : 'mt_md'}
            onClick={onClickConfirm}
            loading={loading}
          >
            {confirmText || i18n.t('form.ok')}
          </FullWidthButton>

          {!cancelText ? null : (
            <FullWidthButton
              preset='subtle'
              className='mt_xs'
              onClick={onClickCancel}
            >
              {cancelText || i18n.t('form.cancel')}
            </FullWidthButton>
          )}
        </div>
      </div>

      {iconName === null && <div className='h_20' />}
    </>
  );
}

/**
 * Modal toolbar with breadcrumbs inside screen or popup
 */

export interface ModalToolbarBreadcrumb {
  text: string;
  onClick?: () => void;
  variables?: any;
}

export function ModalToolbar(p: {
  paddingClassName?: string;
  breadcrumbs?: ModalToolbarBreadcrumb[];
  onCloseModal?: () => void;
}) {
  const { paddingClassName, breadcrumbs, onCloseModal } = p;

  // NOTE: I haven't tested this design with breadcrumbs with links/onClick() yet

  // return <div className='of w_f rt_smw bd_b_1 bd_lt rel pattern_texture medium_bf'>
  return <div className='of w_f rt_smw bd_b_1 bd_lt'>
    <nav className='h_45 h_spread shadow_bg shift_down'>
      <div className={cn('ft_medium mt_1', paddingClassName ?? 'px_df')}>
        {!breadcrumbs ? null : breadcrumbs.map((item, i) => (
          <span
            key={i}
            className={item.onClick ? 'link' : ''}
            role={item.onClick ? 'button' : undefined}
            onClick={item.onClick}
            // do modal change with variables here
          >
            {item.text}
            {i < (breadcrumbs.length - 1) && (
              <span className='mx_xs shift_up cl_darker_2'>/</span>
            )}
          </span>
        ))}
      </div>

      {!onCloseModal ? null : (
        <button
          className='link av_xs r bg_alt_hv v_center mr_xs'
          onClick={onCloseModal}
        >
          <Icon name='x' />
        </button>
      )}
    </nav>
  </div>;
}
