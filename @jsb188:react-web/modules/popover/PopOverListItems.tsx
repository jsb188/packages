import { COLORS } from '@jsb188/app/constants/app.ts';
import type { ColorEnum } from '@jsb188/app/types/app.d.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { useOpenModalPopUp, useOpenModalScreen } from '@jsb188/react/states';
import type {
  PODatePickerObj,
  PODateRangeObj,
  POListBorderStylesObj,
  POListBorderStyleValue,
  POListColorsObj,
  POListIface,
  POListIfaceItem,
  POListItemObj,
  POListItemPickerObj,
  POListSubmenuItemObj,
  POListTextFormatControlsObj,
  POModalItemObj,
  POStateValue,
} from '@jsb188/react/types/PopOver.d';
import { memo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../../svgs/Icon';
import { ActivityDots } from '../../ui/Loading';
import type { PONavItemBase } from '../../ui/PopOverUI';
import { POLabelsAndValues, POListBreak, POListItem, POListItemCopy, POListItemHeader, POListItemPicker, POListSubtitle, PONavAvatarItem, POText } from '../../ui/PopOverUI';
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
  '#131313', // This is exact hex of var(--color-text);
  '#FFFFFF', // This is exact hex of var(--color-bg);
  'red',
  'amber',
  'yellow',
  'emerald',
  'teal',
  'sky',
  'blue',
  'purple',
] as const satisfies readonly ColorEnum[];

interface POOpenModalListItemProps extends PONavItemBase {
  name: string | null;
  item: POModalItemObj;
}

/**
 * Return whether a popover color value is one of the app color enum values.
 */
function isPOListColorEnum(color: string): color is ColorEnum {
  return COLORS.includes(color as ColorEnum);
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
  value?: string | null;
  item: POListColorsObj;
}) => {
  const { item, name, onClickItem, value } = p;
  const { className, colors, disabled, label, onClickCustomize, selectedValue } = item;
  const selectedColor = value ?? selectedValue;
  const displayColors = colors?.length ? colors : DEFAULT_PO_LIST_COLORS;
  const emptyColorCount = Math.max(0, 10 - displayColors.length);

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
    <div
      className='grid gap_3'
      style={{ gridTemplateColumns: 'repeat(10, 18px)' }}
    >
      {displayColors.map((color, i) => {
        const selected = selectedColor === color;
        const colorClassName = isPOListColorEnum(color) ? `bg_${color}` : '';

        return <button
          key={`${name}_${color}_${i}`}
          name={name}
          disabled={disabled}
          className={cn('w_18 h_18 r_4 bd_1 op_60_hv', colorClassName, selected ? 'bd_bd' : 'bd_lt', disabled && 'op_40')}
          onClick={() => onClickItem(name, color)}
          style={colorClassName ? undefined : { backgroundColor: color }}
          type='button'
        />;
      })}
      {Array.from({ length: emptyColorCount }).map((_, i) => (
        <span
          key={`${name}_empty_color_${i}`}
          className='w_18 h_18 r_4 bd_1 bd_lt'
        />
      ))}
    </div>
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
      className='grid gapy_n gapx_12'
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
 * Return a usable font size for popover text-format controls.
 */
function getPOListTextFormatFontSize(value: POStateValue, selectedFontSize?: number | null) {
  const fontSize = Math.round(Number(value ?? selectedFontSize));

  return Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 14;
}

/**
 * Clamp a font-size value to the configured popover text-format limits.
 */
function getPOListTextFormatNextFontSize(fontSize: number, direction: -1 | 1, minFontSize: number, maxFontSize: number) {
  return Math.min(maxFontSize, Math.max(minFontSize, fontSize + direction));
}

/**
 * Render one inert placeholder button for text style controls.
 */
const POListTextStyleButton = memo((p: {
  className?: string;
  disabled?: boolean;
  label?: ReactNode;
  text: string;
}) => {
  const { className, disabled, label, text } = p;
  const title = typeof label === 'string' ? label : undefined;

  return <button
    aria-label={title}
    className={cn('btn w_32 h_32 r_xs v_center bg_alt_hv bd_1 bd_lt cl_df', className, disabled && 'op_40')}
    disabled={disabled}
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
    minFontSize = 1,
    selectedFontSize,
    textStyleButtonLabels,
    textStyleLabel,
  } = item;
  const fontSize = getPOListTextFormatFontSize(value, selectedFontSize);
  const decrementFontSize = getPOListTextFormatNextFontSize(fontSize, -1, minFontSize, maxFontSize);
  const incrementFontSize = getPOListTextFormatNextFontSize(fontSize, 1, minFontSize, maxFontSize);

  return <div className={cn('p_8', className)}>
    <POListItemHeader label={fontSizeLabel} />

    <div className='h_left gap_4 mb_8'>
      <div className='w_70 h_40 r_xs v_center bd_1 bd_lt bg_alt ft_medium'>
        {fontSize}
      </div>

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
      <POListTextStyleButton className='ft_bold' disabled={disabled} label={textStyleButtonLabels?.bold} text='B' />
      <POListTextStyleButton className='ft_italic' disabled={disabled} label={textStyleButtonLabels?.italic} text='I' />
      <POListTextStyleButton className='u' disabled={disabled} label={textStyleButtonLabels?.underline} text='U' />
      <POListTextStyleButton className='strikethrough' disabled={disabled} label={textStyleButtonLabels?.strikethrough} text='S' />
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
  const style = remainingHeight ? { maxHeight: remainingHeight } : undefined;

  return <div className={cn('inside y_scr_hidden', className)} style={style}>
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
  </div>;
});

POListItems.displayName = 'POListItems';
