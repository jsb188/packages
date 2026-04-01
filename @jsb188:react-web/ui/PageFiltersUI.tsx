import { cn } from '@jsb188/app/utils/string.ts';
import type { POListIfaceItem } from '@jsb188/react/types/PopOver.d';
import { Fragment, memo } from 'react';
import { PopOverButton } from '../modules/PopOver';
import { Icon } from '../svgs/Icon';
import { PillButton, SmartLink } from './Button';

/**
 * Filter pill button; renders a pill with optional PopOver dropdown
 */

interface FilterPillButtonProps {
  id: string;
  open: boolean;
  hasValue?: boolean;
  alwaysSelected?: boolean;
  text: string;
  popOverClassName?: string;
  popOverName?: string;
  options?: POListIfaceItem[];
  initialState: any;
  disablePopOverButton?: boolean;
  footerButtonText?: string;
  onClickLeftIcon?: (e: React.MouseEvent) => void;
}

export const FilterPillButton = memo((p: FilterPillButtonProps) => {
  const { id, open, hasValue, alwaysSelected, text, popOverClassName, popOverName, options, initialState, disablePopOverButton, footerButtonText, onClickLeftIcon } = p;
  const designClassName = cn('bd_double', hasValue || open ? 'bg_alt' : 'bg_alt_hv cl_bd_hv cl_md bd_md');

  if (options) {
    return <PopOverButton
      id={id}
      animationClassName='anim_dropdown_top_left on_mount'
      iface={{
        // @ts-expect-error - Both types are good
        name: popOverName || 'PO_LIST',
        variables: {
          options,
          initialState,
          className: popOverClassName,
          addFooterButton: !disablePopOverButton,
          footerButtonText,
        }
      }}
      position='bottom_left'
      offsetX={0}
      offsetY={10}
    >
      <PillButton
        preset='xs'
        designClassName={designClassName}
        leftIconName={alwaysSelected ? 'circle-check' : hasValue ? 'circle-x' : 'circle-plus'}
        leftIconClassName={cn('disabled', hasValue && !alwaysSelected && 'cl_err_hv')}
        onClickLeftIcon={alwaysSelected ? undefined : onClickLeftIcon}
        text={text}
      />
    </PopOverButton>;
  }

  return <PillButton
    preset='xs'
    designClassName={designClassName}
    leftIconName={hasValue ? 'circle-check' : 'circle-dashed-check'}
    onClick={onClickLeftIcon}
    text={text}
  />;
});

FilterPillButton.displayName = 'FilterPillButton';

/**
 * Page filters bar; horizontal container with optional title and icon
 */

interface PageFiltersBarProps {
  className?: string;
  title?: string;
  titleIconName?: string;
  titleTo?: string;
  titleBreadcrumbs?: string[];
  children?: React.ReactNode;
}

export const PageFiltersBar = memo((p: PageFiltersBarProps) => {
  const { className, title, titleIconName, titleTo, titleBreadcrumbs, children } = p;
  const hasBreadcrumbs = titleBreadcrumbs && titleBreadcrumbs.length > 0;

  return <div className={cn('h_item gap_15', className)}>
      <div className='h_item pill_xs'>
      {title && (
        <SmartLink
          className='h_item rel r -ml_7 cl_df'
          to={titleTo}
        >
          {titleIconName &&
            <span className='ft_lg shift_up_2 mr_8'>
              <Icon tryColor name={titleIconName} />
            </span>
          }
          <span className={cn('ft_medium', !hasBreadcrumbs && 'pr_5')}>
            {title}
          </span>
        </SmartLink>
      )}

      {titleBreadcrumbs?.map((breadcrumb, index) => (
        <Fragment key={index}>
          <span className='mx_xs shift_up cl_darker_2 phone:hidden'>
            /
          </span>
          <span className='h_item cl_md phone:hidden'>
            {breadcrumb}
          </span>
        </Fragment>
      ))}
    </div>

    {children}
  </div>;
});

PageFiltersBar.displayName = 'PageFiltersBar';
