import { COLORS } from '@jsb188/app/constants/app.ts';
import type { ColorEnum } from '@jsb188/app/types/app.d.ts';
import { isDarkColor } from '@jsb188/app/utils/color.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { useOpenModalPopUp, useOpenModalScreen } from '@jsb188/react/states';
import type {
  PODatePickerObj,
  PODateRangeObj,
  POListBorderStylesObj,
  POListBorderStyleValue,
  POListColorsObj,
  POListColorValue,
  POListIface,
  POListIfaceItem,
  POListItemObj,
  POListItemPickerObj,
  POListSubmenuItemObj,
  POListTextFormatControlsObj,
  POModalItemObj,
  POStateValue,
} from '@jsb188/react/types/PopOver.d';
import { memo, useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '../../svgs/Icon';
import { ActivityDots } from '../../ui/Loading';
import type { PONavItemBase } from '../../ui/PopOverUI';
import { POListBreak, POListItem, POListItemCopy, POListItemHeader, POListItemPicker, POListSubtitle, PONavAvatarItem, POText } from '../../ui/PopOverUI';
import type { CalendarSelectedObj, OnChangeCalendarDayFn } from '../Calendar';
import { Calendar, CalendarDateRange, getCalendarSelector } from '../Calendar';
import {
  DEFAULT_PO_LIST_BORDER_STYLES,
  getPOChecklistDisplayListItem,
  getPOListBorderStyleLabel,
  getPOListCurrentValue,
  getPOListItemName,
  getPOListItemValue,
  isPOListSubmenuItem,
} from './PopOverListHelpers';

export const DEFAULT_PO_LIST_COLORS = [
  'red',
  'amber',
  'yellow',
  'emerald',
  'teal',
  'sky',
  'blue',
  'purple',
] as const satisfies readonly POListColorValue[];

const DEFAULT_PO_LIST_TEXT_COLOR = '#DDDDDD';
const DEFAULT_PO_LIST_FILL_COLOR = '#222222';

const PO_LIST_SCROLL_END_THRESHOLD = 2;
const PO_LIST_SCROLL_AFFORDANCE_STYLE = {
  background: 'linear-gradient(to bottom, rgba(var(--color-bg), 0) 0%, rgba(var(--color-bg), .75) 50%, rgba(var(--color-bg), 1) 100%)',
} as const;

type POListScrollHintState = {
  hasOverflowBelow: boolean;
  hasScrolled: boolean;
};

interface POOpenModalListItemProps extends PONavItemBase {
  name: string | null;
  item: POModalItemObj;
}

/**
 * Return the scroll hint visibility state for one popover list body.
 */
function getPOListScrollHintState(element: HTMLDivElement | null): POListScrollHintState {
  if (!element) {
    return {
      hasOverflowBelow: false,
      hasScrolled: false,
    };
  }

  return {
    hasOverflowBelow: element.scrollHeight - element.scrollTop - element.clientHeight > PO_LIST_SCROLL_END_THRESHOLD,
    hasScrolled: element.scrollTop > PO_LIST_SCROLL_END_THRESHOLD,
  };
}

/**
 * Return whether a popover color value is one of the app color enum values.
 */
function isPOListColorEnum(color: string): color is ColorEnum {
  return COLORS.includes(color as ColorEnum);
}

/**
 * Return the readable icon color class for a color swatch.
 */
function getPOListColorCheckIconClassName(color: POListColorValue): string {
  return isDarkColor(color) ? 'cl_white' : 'cl_black';
}

/**
 * Return the reset swatch background for a popover color list.
 */
function getPOListResetColorStyle(name: string) {
  if (name === 'textColor') {
    return { background: 'var(--color-text)' };
  }

  if (name === 'fillColor') {
    return { background: 'var(--color-bg)' };
  }

  return undefined;
}

/**
 * Return the default color list for a named popover color picker.
 */
function getPOListDefaultColors(name: string): readonly POListColorValue[] {
  if (name === 'textColor') {
    return [DEFAULT_PO_LIST_TEXT_COLOR, ...DEFAULT_PO_LIST_COLORS];
  }

  if (name === 'fillColor') {
    return [DEFAULT_PO_LIST_FILL_COLOR, ...DEFAULT_PO_LIST_COLORS];
  }

  return DEFAULT_PO_LIST_COLORS;
}

/**
 * Render a single-date picker item inside a popover list.
 */
const PODatePicker = memo((p: {
  name: string;
  item: PODatePickerObj;
  value?: CalendarSelectedObj | null;
  onClickItem: (name: string, value: POStateValue, notEventBased?: boolean, dismissOnClick?: boolean) => void;
}) => {
  const { name, value, item, onClickItem } = p;
  const { minDate, maxDate } = item;

  useEffect(() => {
    // Fix non-Object value on mount
    const valueType = typeof value;
    if (valueType && ['number','string'].includes(valueType)) {
      console.log('getCalendarSelector(value)', value, getCalendarSelector(value));

      onClickItem(name, getCalendarSelector(value), true);
    }
  }, [value]);

  const onChangeCalendarDay: OnChangeCalendarDayFn = (nextValue) => {
    onClickItem(name, nextValue);
  };

  const calendarProps = {
    className: 'f',
    onChange: onChangeCalendarDay
  };

  return <Calendar
    {...calendarProps}
    className='pt_4'
    name='po_date_range_picker'
    value={value}
    maxDate={maxDate}
    minDate={minDate}
  />;
});

PODatePicker.displayName = 'PODatePicker';

/**
 * Render a date-range picker item inside a popover list.
 */
const PODateRange = memo((p: {
  name: string;
  item: PODateRangeObj;
  value?: [CalendarSelectedObj | null, CalendarSelectedObj | null] | null;
  onClickItem: (name: string, value: POStateValue, notEventBased?: boolean, dismissOnClick?: boolean) => void;
}) => {
  const { name, value, item, onClickItem } = p;
  const [startDate, endDate] = value || [];
  const { minDate, maxDate } = item;

  useEffect(() => {
    // Fix non-Object value on mount
    const sdType = typeof startDate;
    const edType = typeof endDate;
    if (
      (sdType && ['number','string'].includes(sdType)) ||
      (edType && ['number','string'].includes(edType))
    ) {
      onClickItem(name, [
        sdType ? getCalendarSelector(startDate) : null,
        edType ? getCalendarSelector(endDate) : null
      ], true);
    }
  }, [startDate, endDate]);

  const onChangeCalendarDay = useCallback((innerValue: CalendarSelectedObj | null, isStart: boolean) => {
    const nextValue = isStart ? [innerValue, endDate] : [startDate, innerValue];

    if (!nextValue[0] && nextValue[1]) {
      onClickItem(name, [nextValue[1], null]);
      return;
    }

    onClickItem(name, nextValue);
  }, [name, startDate, endDate]);

  const calendarProps = {
    className: 'f',
    onChange: onChangeCalendarDay
  };

  return <CalendarDateRange
    {...calendarProps}
    className='pt_4'
    name='po_date_range_picker'
    startDate={startDate}
    endDate={endDate}
    maxDate={maxDate}
    minDate={minDate}
  />;
});

PODateRange.displayName = 'PODateRange';

/**
 * Return a modal-backed option as a normal clickable list item.
 */
function getPOModalDisplayListItem(item: POModalItemObj): POListItemObj {
  return {
    ...item,
    __type: 'LIST_ITEM',
    value: item.value ?? true,
  };
}

/**
 * Render one list item that opens a modal popup.
 */
const POPopUpListItem = memo((p: POOpenModalListItemProps) => {
  const { item } = p;
  const openModalPopUp = useOpenModalPopUp();

  /**
   * Open the modal popup configured on this list item.
   */
  const onClickItem = (_name: string | null, _value: POStateValue) => {
    openModalPopUp(item.variables);
  };

  return <POListItem
    {...p}
    item={getPOModalDisplayListItem(item)}
    onClickItem={onClickItem}
  />;
});

POPopUpListItem.displayName = 'POPopUpListItem';

/**
 * Render one list item that opens a modal screen.
 */
const POModalScreenListItem = memo((p: POOpenModalListItemProps) => {
  const { item } = p;
  const openModalScreen = useOpenModalScreen();

  /**
   * Open the modal screen configured on this list item.
   */
  const onClickItem = (_name: string | null, _value: POStateValue) => {
    openModalScreen(item.variables);
  };

  return <POListItem
    {...p}
    item={getPOModalDisplayListItem(item)}
    onClickItem={onClickItem}
  />;
});

POModalScreenListItem.displayName = 'POModalScreenListItem';

/**
 * Render a list item picker that can optionally trigger its configured mutation.
 */
const POListItemPickerWithData = memo((p: PONavItemBase & {
  name: string;
  value?: POStateValue;
  item: POListItemPickerObj;
}) => {
  const { onClickItem, ...rest } = p;
  const { item } = p;
  const { mutationName, useMutation, mutationVariables, useMutationArgs } = item;
  const mutation = useMutation ? useMutation(...(useMutationArgs || [])) : null;
  const mutationHandler = mutation?.[mutationName || ''];
  const hasMutation = typeof mutationHandler === 'function';
  const allowEdit = mutation?.allowEdit;

  /**
   * Run the item mutation when configured, then notify popover state.
   */
  const onClickItemWrapper = (name: string | null, value: POStateValue, notEventBased?: boolean, dismissOnClick?: boolean) => {
    if (hasMutation) {
      if (!allowEdit) {
        return;
      }

      const variables = typeof mutationVariables === 'function' ? mutationVariables(value) : mutationVariables;
      mutationHandler({ variables });
    }

    onClickItem(name, value, notEventBased, typeof dismissOnClick === 'boolean' ? dismissOnClick : hasMutation);
  };

  return <POListItemPicker
    {...rest}
    item={item}
    allowEdit={allowEdit}
    onClickItem={onClickItemWrapper}
  />;
});

POListItemPickerWithData.displayName = 'POListItemPickerWithData';

/**
 * Render one PO_LIST color grid item.
 */
const POListColors = memo((p: PONavItemBase & {
  name: string;
  value?: POListColorValue;
  item: POListColorsObj;
}) => {
  const { item, name, onClickItem, value } = p;
  const { className, colors, disabled, iconName, label, onClickCustomize, selectedValue } = item;
  const selectedColor = value !== undefined ? value : selectedValue;
  const baseColors = colors?.length ? colors : getPOListDefaultColors(name);
  const displayColors = [null, ...baseColors.filter((color) => color !== null)];
  const emptyColorCount = Math.max(0, 10 - displayColors.length);
  const selectedColorClassName = selectedColor && isPOListColorEnum(selectedColor) ? `bg_${selectedColor}` : '';
  const selectedColorStyle = selectedColor === null
    ? getPOListResetColorStyle(name)
    : selectedColorClassName
      ? undefined
      : selectedColor
        ? { backgroundColor: selectedColor }
        : undefined;
  const colorGrid = <div
    className='grid gap_4'
    style={{ gridTemplateColumns: iconName ? 'repeat(5, 20px)' : 'repeat(10, 20px)' }}
  >
    {displayColors.map((color, i) => {
      const selected = selectedColor === color;
      const colorClassName = color && isPOListColorEnum(color) ? `bg_${color}` : '';
      const isResetColor = color === null;
      const style = isResetColor ? getPOListResetColorStyle(name) : colorClassName ? undefined : { backgroundColor: color };

      return <button
        key={`${name}_${color}_${i}`}
        name={name}
        disabled={disabled}
        className={cn('w_20 h_20 r_4 bd_1 bd_lt op_60_hv v_center rel', colorClassName, disabled && 'op_40')}
        onClick={() => onClickItem(name, color)}
        style={style}
        type='button'
      >
        {isResetColor && <span className={cn('abs h_10 w_0 bd_r_1 tf_rotate_45', name === 'fillColor' ? 'bd_darker_3' : name === 'textColor' ? 'bd_lighter_4' : 'bd_md')} />}
        {selected && !isResetColor && <span className={cn('rel z1 ic_xs v_center', getPOListColorCheckIconClassName(color))}>
          <Icon name='check-filled' />
        </span>}
      </button>;
    })}
    {Array.from({ length: emptyColorCount }).map((_, i) => (
      <span
        key={`${name}_empty_color_${i}`}
        className='w_20 h_20 r_4 bd_1 bd_lt'
      />
    ))}
  </div>;

  return <div
    className={cn('p_8', className)}
  >
    <POListItemHeader
      label={label}
      buttonDisabled={disabled}
      onClickButton={onClickCustomize
        ? () => {
          onClickCustomize(name, selectedColor);
          onClickItem(name, selectedColor, false, true);
        }
        : undefined}
    />
    {iconName
      ? <div className='h_left gap_4'>
        <div
          aria-label={typeof label === 'string' ? label : undefined}
          className='w_75 r_4 bd_1 bd_lt bg_alt p_5 v_spread no_shrink rel of fs'
          title={typeof label === 'string' ? label : undefined}
        >
          <div className='v_center fs'>
            <Icon name={iconName} />
          </div>
          <div
            className={cn('h_6 w_f bd_1 bd_lt no_shrink mt_2', selectedColorClassName)}
            style={selectedColorStyle}
          />
        </div>
        {colorGrid}
      </div>
      : colorGrid}
  </div>;
});

POListColors.displayName = 'POListColors';

/**
 * Render one PO_LIST border-style grid item.
 */
const POListBorderStyles = memo((p: PONavItemBase & {
  name: string;
  value?: POListBorderStyleValue | null;
  item: POListBorderStylesObj;
}) => {
  const { item, name, onClickItem, value } = p;
  const { className, disabled, label, onClickCustomize, selectedValue } = item;
  const selectedBorderStyle = value ?? selectedValue;

  return <div
    className={cn('p_8', className)}
  >
    <POListItemHeader
      label={label}
      buttonDisabled={disabled}
      onClickButton={onClickCustomize
        ? () => {
          onClickCustomize(name, selectedBorderStyle);
          onClickItem(name, selectedBorderStyle, false, true);
        }
        : undefined}
    />
    <div
      className='grid gapy_n gapx_10'
      style={{ gridTemplateColumns: 'repeat(5, 32px)' }}
    >
      {DEFAULT_PO_LIST_BORDER_STYLES.map((option) => {
        const labelText = getPOListBorderStyleLabel(option.value);

        return <button
          key={`${name}_${option.value}`}
          aria-label={labelText}
          className={cn('w_32 h_32 r_4 h_center bg bg_alt_hv cl_df', disabled && 'op_40')}
          disabled={disabled}
          name={name}
          onClick={() => onClickItem(name, option.value)}
          title={labelText}
          type='button'
        >
          <Icon name={option.iconName} />
        </button>;
      })}
    </div>
  </div>;
});

POListBorderStyles.displayName = 'POListBorderStyles';

/**
 * Return a valid rounded font size for popover text-format controls.
 */
function getPOListTextFormatClampedFontSize(value: POStateValue, minFontSize: number, maxFontSize: number) {
  const fontSize = Math.round(Number(value));

  return Number.isFinite(fontSize) && fontSize > 0
    ? Math.min(maxFontSize, Math.max(minFontSize, fontSize))
    : null;
}

/**
 * Return a usable font size for popover text-format controls.
 */
function getPOListTextFormatFontSize(value: POStateValue, selectedFontSize: number | null | undefined, minFontSize: number, maxFontSize: number) {
  return getPOListTextFormatClampedFontSize(value ?? selectedFontSize, minFontSize, maxFontSize)
    || Math.min(maxFontSize, Math.max(minFontSize, 14));
}

/**
 * Clamp a font-size value to the configured popover text-format limits.
 */
function getPOListTextFormatNextFontSize(fontSize: number, direction: -1 | 1, minFontSize: number, maxFontSize: number) {
  return Math.min(maxFontSize, Math.max(minFontSize, fontSize + direction));
}

/**
 * Return whether a keyboard event would enter unsupported number input characters.
 */
function isPOListTextFormatBlockedFontSizeKey(key: string) {
  return key === '-' || key === '+' || key.toLowerCase() === 'e';
}

/**
 * Render one inert placeholder button for text style controls.
 */
const POListTextStyleButton = memo((p: {
  className?: string;
  disabled?: boolean;
  label?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  text: string;
}) => {
  const { className, disabled, label, onClick, selected, text } = p;
  const title = typeof label === 'string' ? label : undefined;

  return <button
    aria-label={title}
    className={cn('btn w_32 h_32 r_xs v_center bg_alt_hv bd_1 cl_df', selected ? 'bd_primary' : 'bd_lt', className, disabled && 'op_40')}
    disabled={disabled}
    onClick={onClick}
    title={title}
    type='button'
  >
    {text}
  </button>;
});

POListTextStyleButton.displayName = 'POListTextStyleButton';

/**
 * Render Sheet-style font size and text-style controls inside a popover list.
 */
const POListTextFormatControls = memo((p: PONavItemBase & {
  name: string;
  value?: POStateValue;
  item: POListTextFormatControlsObj;
}) => {
  const { item, name, onClickItem, value } = p;
  const {
    className,
    disabled,
    fontSizeLabel,
    maxFontSize = 96,
    minFontSize = 8,
    markdownName,
    selectedFontSize,
    selectedTextStyles,
    disableMarkdown,
    textStyleButtonLabels,
    textStyleLabel,
    textStyleNames,
  } = item;
  const fontSize = getPOListTextFormatFontSize(value, selectedFontSize, minFontSize, maxFontSize);
  const [fontSizeInputValue, setFontSizeInputValue] = useState(String(fontSize));
  const [localDisableMarkdown, setLocalDisableMarkdown] = useState(disableMarkdown === true);
  const [localTextStyles, setLocalTextStyles] = useState({
    bold: selectedTextStyles?.bold === true,
    italic: selectedTextStyles?.italic === true,
    underline: selectedTextStyles?.underline === true,
    strikethrough: selectedTextStyles?.strikethrough === true,
  });
  const decrementFontSize = getPOListTextFormatNextFontSize(fontSize, -1, minFontSize, maxFontSize);
  const incrementFontSize = getPOListTextFormatNextFontSize(fontSize, 1, minFontSize, maxFontSize);
  const markdownEnabled = localDisableMarkdown !== true;

  useEffect(() => {
    setFontSizeInputValue(String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    setLocalDisableMarkdown(disableMarkdown === true);
  }, [disableMarkdown]);

  useEffect(() => {
    setLocalTextStyles({
      bold: selectedTextStyles?.bold === true,
      italic: selectedTextStyles?.italic === true,
      underline: selectedTextStyles?.underline === true,
      strikethrough: selectedTextStyles?.strikethrough === true,
    });
  }, [selectedTextStyles?.bold, selectedTextStyles?.italic, selectedTextStyles?.strikethrough, selectedTextStyles?.underline]);

  /**
   * Toggle a full-cell text style through the parent popover action.
   */
  const handleTextStyleClick = (styleName: keyof NonNullable<POListTextFormatControlsObj['textStyleNames']>) => {
    const actionName = textStyleNames?.[styleName];

    if (!actionName) {
      return;
    }

    const nextValue = localTextStyles[styleName] !== true;

    setLocalTextStyles((prevState) => ({
      ...prevState,
      [styleName]: nextValue,
    }));
    onClickItem(actionName, nextValue);
  };

  /**
   * Toggle markdown rendering for the selected Sheet cells through the parent popover action.
   */
  const handleMarkdownClick = () => {
    if (!markdownName) {
      return;
    }

    const nextDisableMarkdown = markdownEnabled;

    setLocalDisableMarkdown(nextDisableMarkdown);
    onClickItem(markdownName, nextDisableMarkdown);
  };

  /**
   * Mirror typed font-size digits and only live-apply values already inside the supported range.
   */
  const handleFontSizeInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.currentTarget.value;

    if (!/^\d*$/.test(inputValue)) {
      return;
    }

    setFontSizeInputValue(inputValue);

    // Out-of-range values stay visible while typing and only get clamped on
    // commit (blur/Enter), so a partial entry never snaps to min/max mid-typing
    const nextFontSize = Math.round(Number(inputValue));

    if (inputValue && nextFontSize >= minFontSize && nextFontSize <= maxFontSize) {
      onClickItem(name, nextFontSize);
    }
  };

  /**
   * Commit the typed font size clamped to the supported range.
   */
  const handleFontSizeInputCommit = () => {
    const nextFontSize = getPOListTextFormatClampedFontSize(fontSizeInputValue, minFontSize, maxFontSize);

    if (nextFontSize && nextFontSize !== fontSize) {
      onClickItem(name, nextFontSize);
    }

    setFontSizeInputValue(String(nextFontSize || fontSize));
  };

  const handleFontSizeInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur();
      return;
    }

    if (isPOListTextFormatBlockedFontSizeKey(event.key)) {
      event.preventDefault();
    }
  };

  return <div className={cn('p_8', className)}>
    <POListItemHeader label={fontSizeLabel} />

    <div className='h_left gap_4 mb_8'>
      <input
        aria-label='Font size'
        className={cn('w_70 h_40 r_xs bd_1 bd_lt bg_alt ft_normal a_c', fontSize >= 22 ? 'pt_4' : fontSize >= 20 ? 'pt_3' : fontSize >= 16 ? 'pt_2' : '')}
        disabled={disabled}
        inputMode='decimal'
        onBlur={handleFontSizeInputCommit}
        onChange={handleFontSizeInputChange}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={handleFontSizeInputKeyDown}
        pattern='[0-9]*'
        style={{ fontSize: `${fontSize}px` }}
        type='text'
        value={fontSizeInputValue}
      />

      <button
        aria-label='Decrease font size'
        className='btn w_32 h_32 r_xs v_center bg_alt_hv bd_1 bd_lt ft_semibold'
        disabled={disabled || decrementFontSize === fontSize}
        onClick={() => onClickItem(name, decrementFontSize)}
        type='button'
      >
        -
      </button>

      <button
        aria-label='Increase font size'
        className='btn w_32 h_32 r_xs v_center bg_alt_hv bd_1 bd_lt ft_semibold'
        disabled={disabled || incrementFontSize === fontSize}
        onClick={() => onClickItem(name, incrementFontSize)}
        type='button'
      >
        +
      </button>
    </div>

    <POListItemHeader label={textStyleLabel} />

    <div className='h_item gap_4'>
      <POListTextStyleButton className='ft_bold' disabled={disabled} label={textStyleButtonLabels?.bold} onClick={() => handleTextStyleClick('bold')} selected={localTextStyles.bold} text='B' />
      <POListTextStyleButton className='ft_italic' disabled={disabled} label={textStyleButtonLabels?.italic} onClick={() => handleTextStyleClick('italic')} selected={localTextStyles.italic} text='I' />
      <POListTextStyleButton className='u' disabled={disabled} label={textStyleButtonLabels?.underline} onClick={() => handleTextStyleClick('underline')} selected={localTextStyles.underline} text='U' />
      <POListTextStyleButton className='strikethrough' disabled={disabled} label={textStyleButtonLabels?.strikethrough} onClick={() => handleTextStyleClick('strikethrough')} selected={localTextStyles.strikethrough} text='S' />
      <POListTextStyleButton className='ft_tn' disabled={disabled} label={textStyleButtonLabels?.markdown} onClick={handleMarkdownClick} selected={markdownEnabled} text='MD' />
    </div>
  </div>;
});

POListTextFormatControls.displayName = 'POListTextFormatControls';

/**
 * Render one PO_LIST item that opens a nested child list inside the same popover.
 */
const POListSubmenuItem = memo((p: PONavItemBase & {
  item: POListSubmenuItemObj;
  name: string;
  onOpenSubmenu: (item: POListSubmenuItemObj, itemName: string, itemElement: HTMLElement) => void;
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const { item, name, onOpenSubmenu, ...rest } = p;

  /**
   * Open the submenu next to this list item.
   */
  const onClickItem = () => {
    if (itemRef.current) {
      onOpenSubmenu(item, name, itemRef.current);
    }
  };
  const listItem: POListItemObj = {
    ...item,
    __type: 'LIST_ITEM',
    className: cn('w_f mt_n mb_n', item.className),
    rightIconName: item.rightIconName || 'chevron-right',
    value: item.value ?? true,
    onClick: onClickItem,
  };

  return <div ref={itemRef}>
    <POListItem
      {...rest}
      name={name}
      item={listItem}
    />
  </div>;
});

POListSubmenuItem.displayName = 'POListSubmenuItem';

/**
 * Render one item from any supported popover list item interface.
 */
export function PONavItemIface(p: PONavItemBase & {
  name: string;
  value?: POStateValue;
  item: POListIfaceItem;
  checked?: boolean;
  onOpenSubmenu?: (item: POListSubmenuItemObj, itemName: string, itemElement: HTMLElement) => void;
}) {
  const { item, checked, onOpenSubmenu, ...other } = p;
  const { __type } = item;

  switch (__type) {
    case 'LIST_SUBTITLE':
      return <POListSubtitle item={item} />;
    case 'BREAK':
      return <POListBreak />;
    case 'LIST_ITEM':
      return <POListItem {...other} item={item} />;
    case 'LIST_ITEM_COPY':
      return <POListItemCopy {...other} item={item} />;
    case 'LIST_ITEM_POPUP':
      return <POPopUpListItem {...other} item={item} />;
    case 'LIST_ITEM_PICKER':
      return <POListItemPickerWithData {...other} item={item} />;
    case 'LIST_COLORS':
      return <POListColors {...other} item={item} />;
    case 'LIST_BORDER_STYLES':
      return <POListBorderStyles {...other} item={item} />;
    case 'LIST_TEXT_FORMAT_CONTROLS':
      return <POListTextFormatControls {...other} item={item} />;
    case 'LIST_SUBMENU_ITEM':
      return <POListSubmenuItem
        {...other}
        item={item}
        onOpenSubmenu={onOpenSubmenu || (() => {})}
      />;
    case 'LIST_ITEM_MODAL':
      return <POModalScreenListItem {...other} item={item} />;
    case 'CHECK_LIST_ITEM':
    case 'SINGLE_OPTION_LIST_ITEM':
      return <POListItem {...other} item={getPOChecklistDisplayListItem(item, checked)} />;
    case 'AVATAR_ITEM':
      return <PONavAvatarItem {...other} item={item} />;
    case 'DATE_RANGE':
      return <PODateRange {...other} item={item} />;
    case 'DATE_PICKER':
      return <PODatePicker {...other} item={item} />;
    case 'TEXT':
      return <POText item={item} />;
    default:
  }

  console.warn('Unknown pop over iface name:', __type);
  return null;
}

/**
 * Render the visible option items for a PO_LIST body.
 */
export const POListItems = memo((p: {
  className?: string;
  formValues: POStateValue;
  itemKeyPrefix?: string;
  notReady?: boolean;
  onClickItem: PONavItemBase['onClickItem'];
  onClickSubmenuItem?: PONavItemBase['onClickItem'];
  onOpenSubmenu?: (item: POListSubmenuItemObj, itemName: string, itemElement: HTMLElement) => void;
  options: POListIfaceItem[];
  remainingHeight?: number;
  savingValue?: POListIface['variables']['savingValue'];
}) => {
  const {
    className,
    formValues,
    itemKeyPrefix,
    notReady,
    onClickItem,
    onClickSubmenuItem,
    onOpenSubmenu,
    options,
    remainingHeight,
    savingValue,
  } = p;
  const scrollListRef = useRef<HTMLDivElement>(null);
  const [scrollHintState, setScrollHintState] = useState<POListScrollHintState>({
    hasOverflowBelow: false,
    hasScrolled: false,
  });
  const style = remainingHeight ? { maxHeight: remainingHeight } : undefined;
  const showScrollHintGradient = scrollHintState.hasOverflowBelow;
  const showScrollHintArrow = showScrollHintGradient && !scrollHintState.hasScrolled;

  /**
   * Sync the scroll affordance with the list body's current scroll position.
   */
  const updateScrollHintState = useCallback(() => {
    const nextState = getPOListScrollHintState(scrollListRef.current);

    setScrollHintState((prevState) => {
      if (
        prevState.hasOverflowBelow === nextState.hasOverflowBelow &&
        prevState.hasScrolled === nextState.hasScrolled
      ) {
        return prevState;
      }

      return nextState;
    });
  }, []);

  /**
   * Scroll the list body to the final item when the overflow hint is clicked.
   */
  const onClickScrollHint = useCallback(() => {
    const element = scrollListRef.current;

    if (!element) {
      return;
    }

    element.scrollTo({
      top: element.scrollHeight,
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    updateScrollHintState();

    const element = scrollListRef.current;
    if (!element) {
      return;
    }

    const resizeObserver = new ResizeObserver(updateScrollHintState);
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, [notReady, options, remainingHeight, updateScrollHintState]);

  return <div className='rel'>
    <div
      ref={scrollListRef}
      className={cn('inside y_scr_hidden', className)}
      onScroll={updateScrollHintState}
      style={style}
    >
      {notReady
      ? <div className='p_md'>
        <ActivityDots />
      </div>
      : options.filter((item: POListIfaceItem) => !item.hidden).map((item: POListIfaceItem, i: number) => {
        const itemName = getPOListItemName(item, i);
        const itemValue = getPOListItemValue(item);
        const currentValue = getPOListCurrentValue(formValues, itemName);

        return <PONavItemIface
          key={itemKeyPrefix ? `${itemKeyPrefix}:${i}` : i}
          name={itemName}
          item={item}
          value={currentValue}
          onClickItem={isPOListSubmenuItem(item) && onClickSubmenuItem ? onClickSubmenuItem : onClickItem}
          onOpenSubmenu={onOpenSubmenu}
          checked={currentValue !== undefined && currentValue === itemValue}
          saving={savingValue !== undefined && savingValue === itemValue}
        />;
      })}
    </div>

    {showScrollHintGradient && (
      <div
        className='abs_b h_16 v_center z1 hv_area'
        style={PO_LIST_SCROLL_AFFORDANCE_STYLE}
      >
        <button
          aria-label='Scroll to bottom'
          className={cn('btn abs_full h_center bg_darker_1_hv link target trans_op', showScrollHintArrow ? 'op_100' : 'op_0')}
          onClick={onClickScrollHint}
          type='button'
        >
          <span className='anim_bounce_light'>
            <Icon name='chevron-down' />
          </span>
        </button>
      </div>
    )}
  </div>;
});

POListItems.displayName = 'POListItems';
