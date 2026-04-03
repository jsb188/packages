import { cn } from '@jsb188/app/utils/string.ts';
import type { POListIfaceItem } from '@jsb188/react/types/PopOver.d';
import { memo } from 'react';
import { PopOverButton } from '../modules/PopOver';
import { PillButton } from './Button';

/**
 * Filter pill button; renders a pill with optional PopOver dropdown
 */

interface FilterPillButtonProps {
  id: string;
  open: boolean;
  hasValue?: boolean;
  alwaysSelected?: boolean;
  hideClearIcon?: boolean;
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
  const { id, open, hasValue, alwaysSelected, hideClearIcon, text, popOverClassName, popOverName, options, initialState, disablePopOverButton, footerButtonText, onClickLeftIcon } = p;
  const designClassName = cn('unsel bd_1 bd_lt', hasValue || open ? 'bg_alt' : 'bg_alt_hv cl_bd_hv cl_md');
  const useCheckIcon = !!alwaysSelected || (!!hasValue && !!hideClearIcon);
  const showClearIcon = !!hasValue && !alwaysSelected && !hideClearIcon;

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
        leftIconName={useCheckIcon ? 'circle-check' : hasValue ? 'circle-x' : 'circle-plus'}
        leftIconClassName={cn('disabled', showClearIcon && 'cl_err_hv')}
        onClickLeftIcon={alwaysSelected || hideClearIcon ? undefined : onClickLeftIcon}
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
