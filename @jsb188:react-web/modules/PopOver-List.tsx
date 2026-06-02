import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { useOnClickOutside } from '@jsb188/react-web/utils/dom';
import { useOpenModalPopUp, useOpenModalScreen } from '@jsb188/react/states';
import type { POCheckListIface, POCheckListIfaceItem, POCheckListItemObj, PODatePickerObj, PODateRangeObj, POLabelsAndValuesIface, POListColorsObj, POListIface, POListIfaceItem, POListItemObj, POListItemPickerObj, POListSubmenuItemObj, POModalItemObj, PopOverHandlerProps, POStateValue } from '@jsb188/react/types/PopOver.d';
import { type CSSProperties, memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityDots } from '../ui/Loading';
import type { PONavItemBase } from '../ui/PopOverUI';
import { POLabelsAndValues, POListBreak, POListItem, POListItemCopy, POListItemPicker, POListSubtitle, PONavAvatarItem, PopOverListContainer, PopOverListFooterButton, POText } from '../ui/PopOverUI';
import type { CalendarSelectedObj, OnChangeCalendarDayFn } from './Calendar';
import { Calendar, CalendarDateRange, getCalendarSelector } from './Calendar';

type POListSubmenuState = {
  item: POListSubmenuItemObj;
  itemName: string;
  left: number;
  top: number;
};

export const DEFAULT_PO_LIST_COLORS = ['#000000', '#FFFFFF'] as const;

/**
 * Pop over date range picker
 */

const PODatePicker = memo((p: {
  name: string;
  item: PODatePickerObj;
  value?: CalendarSelectedObj | null;
  onClickItem: (name: string, value: any, notEventBased?: boolean, dismissOnClick?: boolean) => void;
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
 * Pop over date range picker
 */

const PODateRange = memo((p: {
  name: string;
  item: PODateRangeObj;
  value?: [CalendarSelectedObj | null, CalendarSelectedObj | null] | null;
  onClickItem: (name: string, value: any, notEventBased?: boolean, dismissOnClick?: boolean) => void;
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

  const onChangeCalendarDay = useCallback((innerValue: any, isStart: boolean) => {
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
 * Pop over list item -> but it opens a modal pop up
 */

interface POOpenModalListItemProps extends PONavItemBase {
  name: string | null;
  item: POModalItemObj;
}

/*
 * Return a modal-backed option as a normal clickable list item.
 */

function getPOModalDisplayListItem(item: POModalItemObj): POListItemObj {
  return {
    ...item,
    __type: 'LIST_ITEM',
    value: item.value ?? true,
  };
}

const POPopUpListItem = memo((p: POOpenModalListItemProps) => {
  const { item } = p;
  const openModalPopUp = useOpenModalPopUp();

  const onClickItem = (_name: any, _value: any) => {
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
 * Pop over list item -> but it opens a modal screen
 */

const POModalScreenListItem = memo((p: POOpenModalListItemProps) => {
  const { item } = p;
  const openModalScreen = useOpenModalScreen();

  const onClickItem = (_name: any, _value: any) => {
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
 * Pop over list item wrapper with reactive data
 */

const POListItemPickerWithData = memo((p: PONavItemBase & {
  name: string;
  value?: any;
  item: POListItemPickerObj;
}) => {
  const { onClickItem, ...rest } = p;
  const { item } = p;
  const { mutationName, useMutation, mutationVariables, useMutationArgs } = item;
  const mutation = useMutation ? useMutation(...(useMutationArgs || [])) : null;
  const mutationHandler = mutation?.[mutationName || ''];
  const hasMutation = !!mutationHandler;
  const allowEdit = mutation?.allowEdit;

  const onClickItemWrapper = (name: string | null, value: any, notEventBased?: boolean, dismissOnClick?: boolean) => {
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
    {...p}
    allowEdit={allowEdit}
    onClickItem={onClickItemWrapper}
  />;
});

POListItemPickerWithData.displayName = 'POListItemPickerWithData';

/*
 * Render one PO_LIST color grid item.
 */

const POListColors = memo((p: PONavItemBase & {
  name: string;
  value?: string | null;
  item: POListColorsObj;
}) => {
  const { item, name, onClickItem, value } = p;
  const { className, colors, disabled, selectedValue } = item;
  const selectedColor = value ?? selectedValue;
  const displayColors = colors?.length ? colors : DEFAULT_PO_LIST_COLORS;

  return <div
    className={cn('grid gap_4 p_8', className)}
    style={{ gridTemplateColumns: 'repeat(10, 20px)' }}
  >
    {displayColors.map((color, i) => {
      const selected = selectedColor === color;
      return <button
        key={`${name}_${color}_${i}`}
        name={name}
        disabled={disabled}
        className={cn('w_20 h_20 r_4 bd_1 bg_alt_hv', selected ? 'bd_bd' : 'bd_lt', disabled && 'op_40')}
        onClick={() => onClickItem(name, color)}
        style={{ backgroundColor: color }}
        type='button'
      />;
    })}
  </div>;
});

POListColors.displayName = 'POListColors';

/*
 * Return the stable form name for one PO_LIST option item.
 */

function getPOListItemName(item: POListIfaceItem, index: number) {
  return 'name' in item && item.name ? item.name : index.toString();
}

/*
 * Return the option value used by PO_LIST selected and saving states.
 */

function getPOListItemValue(item: POListIfaceItem) {
  return 'value' in item ? item.value : undefined;
}

/*
 * Return an object-shaped form state for named PO_LIST item updates.
 */

function getPOListFormStateObject(value: POStateValue): Record<string, POStateValue> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/*
 * Return the current value for one item from scalar or object-shaped PO_LIST state.
 */

function getPOListCurrentValue(formValues: POStateValue, name: string) {
  return formValues && typeof formValues === 'object' && !Array.isArray(formValues) ? formValues[name] : formValues;
}

/*
 * Return PO_LIST form state after one named item changes.
 */

function getNextPOListFormState(prev: POStateValue, name: string | null, value: POStateValue) {
  if (name === null) {
    return prev;
  }

  return {
    ...getPOListFormStateObject(prev),
    [name]: value,
  };
}

/*
 * Return whether one PO_LIST option opens a nested submenu.
 */

function isPOListSubmenuItem(item: POListIfaceItem): item is POListSubmenuItemObj {
  return item.__type === 'LIST_SUBMENU_ITEM';
}

/*
 * Build submenu panel coordinates relative to the parent PO_LIST wrapper.
 */

function getPOListSubmenuState(params: {
  item: POListSubmenuItemObj;
  itemElement: HTMLElement;
  itemName: string;
  wrapperElement: HTMLElement;
}): POListSubmenuState {
  const itemRect = params.itemElement.getBoundingClientRect();
  const wrapperRect = params.wrapperElement.getBoundingClientRect();
  const parentWidth = wrapperRect.width;
  const expectedSubmenuWidth = Math.max(parentWidth, 180);
  const openLeft = itemRect.right + expectedSubmenuWidth > globalThis.window.innerWidth - 10;

  return {
    item: params.item,
    itemName: params.itemName,
    left: openLeft ? -parentWidth : parentWidth,
    top: itemRect.top - wrapperRect.top,
  };
}

/*
 * Return the absolute style for the currently open submenu panel.
 */

function getPOListSubmenuPanelStyle(submenuState: POListSubmenuState): CSSProperties {
  return {
    left: submenuState.left,
    position: 'absolute',
    top: submenuState.top,
    zIndex: 1,
  };
}

/*
 * Render one PO_LIST item that opens a nested child list inside the same popover.
 */

const POListSubmenuItem = memo((p: PONavItemBase & {
  item: POListSubmenuItemObj;
  name: string;
  onOpenSubmenu: (item: POListSubmenuItemObj, itemName: string, itemElement: HTMLElement) => void;
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const { item, name, onOpenSubmenu, ...rest } = p;
  const onClickItem = () => {
    if (itemRef.current) {
      onOpenSubmenu(item, name, itemRef.current);
    }
  };
  const listItem: POListItemObj = {
    ...item,
    __type: 'LIST_ITEM',
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

/*
 * Return one checklist option as a normal list item with checklist icon state.
 */

function getPOChecklistDisplayListItem(item: POCheckListItemObj, checked?: boolean): POListItemObj {
  if (item.__type === 'SINGLE_OPTION_LIST_ITEM') {
    return {
      ...item,
      __type: 'LIST_ITEM',
      rightIconClassName: 'cl_df',
      rightIconName: checked ? 'check' : undefined,
    };
  }

  return {
    ...item,
    __type: 'LIST_ITEM',
    rightIconClassName: checked ? 'cl_bd' : 'cl_lt',
    rightIconName: checked ? 'circle-check' : 'circle',
  };
}

/**
 * Ifaces for pop over nav item
 */

export function PONavItemIface(p: PONavItemBase & {
  name: string;
  value?: any;
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

/*
 * Render the visible option items for a PO_LIST body.
 */

const POListItems = memo((p: {
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

/**
 * Nav list popover
 */

export function PopOverList(p: PopOverHandlerProps & {
  doNotFixToBottom?: boolean;
  variables: POListIface['variables'];
}) {
  const { closePopOver, setPopOverState, variables } = p;

  const {
    notReady,
    className,
    designClassName,
    shadowClassName,
    options,
    savingValue,
    addFooterButton,
    footerButtonText,
    initialState,
    remainingHeight
  } = variables;

  const divRef = useRef<HTMLDivElement>(null);
  const dismissFn = closePopOver ? () => closePopOver() : undefined;
  const [formValues, setFormValues] = useState<POStateValue>(initialState === null ? null : (initialState || {}));
  const [submenuState, setSubmenuState] = useState<POListSubmenuState | null>(null);
  const [submenuFormValues, setSubmenuFormValues] = useState<POStateValue>({});

  useOnClickOutside(divRef, true, false, 'ignore_outside_click', dismissFn);

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches?.('input, textarea')) {
        dismissFn?.();
      }
    };

    globalThis.document?.addEventListener('focusin', onFocusIn);
    return () => {
      globalThis.document?.removeEventListener('focusin', onFocusIn);
    };
  }, [dismissFn]);

  const onClickItem = (name: string | null, value: any, notEventBased?: boolean, dismissOnClick?: boolean) => {
    if (dismissOnClick) {
      dismissFn?.();
      return;
    }

    setPopOverState({
      action: notEventBased ? 'ITEM_AUTO' : 'ITEM',
      name,
      value
    });

    setFormValues(prev => getNextPOListFormState(prev, name, value));
  };

  const onClickParentItem = (name: string | null, value: any, notEventBased?: boolean, dismissOnClick?: boolean) => {
    setSubmenuState(null);
    onClickItem(name, value, notEventBased, dismissOnClick);
  };

  const onClickSubmenuItem = (name: string | null, value: any, notEventBased?: boolean, dismissOnClick?: boolean) => {
    if (dismissOnClick) {
      dismissFn?.();
      return;
    }

    setPopOverState({
      action: notEventBased ? 'ITEM_AUTO' : 'ITEM',
      name,
      value
    });

    setSubmenuFormValues(prev => getNextPOListFormState(prev, name, value));
  };

  const onOpenSubmenu = (item: POListSubmenuItemObj, itemName: string, itemElement: HTMLElement) => {
    if (!divRef.current) {
      return;
    }

    setSubmenuState(getPOListSubmenuState({
      item,
      itemElement,
      itemName,
      wrapperElement: divRef.current,
    }));
    setSubmenuFormValues(item.submenu.initialState === null ? null : (item.submenu.initialState || {}));
  };

  const onSubmit = () => {
    setPopOverState({
      action: 'SUBMIT',
      value: formValues,
    });
  };

  return (
    <div ref={divRef} className='rel'>
      <PopOverListContainer
        shadowClassName={shadowClassName}
        className={designClassName}
      >
        <POListItems
          className={className}
          formValues={formValues}
          notReady={notReady}
          onClickItem={onClickParentItem}
          onClickSubmenuItem={onClickItem}
          onOpenSubmenu={onOpenSubmenu}
          options={options}
          remainingHeight={remainingHeight}
          savingValue={savingValue}
        />

        {addFooterButton && (
          <PopOverListFooterButton
            onClick={onSubmit}
            text={footerButtonText || i18n.t('form.apply')}
          />
        )}
      </PopOverListContainer>

      {submenuState && (
        <div style={getPOListSubmenuPanelStyle(submenuState)}>
          <PopOverListContainer
            shadowClassName={submenuState.item.submenu.shadowClassName}
            className={submenuState.item.submenu.designClassName}
          >
            <POListItems
              className={submenuState.item.submenu.className}
              formValues={submenuFormValues}
              itemKeyPrefix={submenuState.itemName}
              notReady={submenuState.item.submenu.notReady}
              onClickItem={onClickSubmenuItem}
              onOpenSubmenu={onOpenSubmenu}
              options={submenuState.item.submenu.options}
              savingValue={submenuState.item.submenu.savingValue}
            />
          </PopOverListContainer>
        </div>
      )}
    </div>
  );
}

/**
 * Pop over check list with multiple selectable options
 */

export function PopOverCheckList(p: PopOverHandlerProps & {
  variables: POCheckListIface['variables'];
}) {
  const { closePopOver, setPopOverState, variables } = p;

  const {
    notReady,
    className,
    designClassName,
    shadowClassName,
    options,
    savingValue,
    addFooterButton,
    footerButtonText,
    initialState
  } = variables;

  const [checked, setChecked] = useState(initialState || []);
  const divRef = useRef<HTMLDivElement>(null);
  const dismissFn = closePopOver ? () => closePopOver() : undefined;

  useOnClickOutside(divRef, true, false, 'ignore_outside_click', dismissFn);

  const onClickItem = (name: string | null, value: any) => {
    setPopOverState({
      action: 'ITEM',
      name,
      value
    });
    setChecked(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const onSubmit = () => {
    setPopOverState({
      action: 'SUBMIT',
      value: checked,
    });
  };

  return (
    <PopOverListContainer
      ref={divRef}
      shadowClassName={shadowClassName}
      className={designClassName}
    >
      <div className={cn('inside y_scr_hidden', className)}>
        {notReady
        ? <div className='p_md'>
          <ActivityDots />
        </div>
        : options.filter((item: POCheckListIfaceItem) => !item.hidden).map((item: POCheckListIfaceItem, i: number) => {
          const itemValue = getPOListItemValue(item);
          const itemName = getPOListItemName(item, i);

          return <PONavItemIface
            key={i}
            name={itemName}
            item={item}
            onClickItem={onClickItem}
            saving={savingValue !== undefined && savingValue === itemValue}
            checked={itemValue !== undefined && checked.includes(itemValue)}
            selected={false}
          />;
        })}
      </div>

      {addFooterButton && (
        <PopOverListFooterButton
          onClick={onSubmit}
          text={footerButtonText || i18n.t('form.apply')}
        />
      )}
    </PopOverListContainer>
  );
}

/**
 * Pop over labels and values list/form
 */

export function PopOverLabelsAndValues(p: PopOverHandlerProps & {
  variables: POLabelsAndValuesIface['variables'];
}) {
  const { closePopOver, setPopOverState, variables } = p;

  const {
    notReady,
    designClassName,
    shadowClassName,
    className,
    gridLayoutStyle,
    name,
    labels,
    inputs,
    addFooterButton,
    footerButtonText,
    flipInputOrder,
    forceNumericValues,
    includeQuantity,
    includeUnit,
  } = variables;

  const [formValues, setFormValues] = useState(inputs);
  const divRef = useRef<HTMLDivElement>(null);
  const dismissFn = closePopOver ? () => closePopOver() : undefined;

  useOnClickOutside(divRef, true, false, 'ignore_outside_click', dismissFn);

  useEffect(() => {
    setPopOverState({
      action: 'ITEM',
      name,
      value: formValues.filter(obj => obj.label || obj.value || (includeQuantity && obj.quantity) || (includeUnit && obj.unit)),
      doNotClosePopOver: true,
    });
  }, [formValues]);

  const onChangeItem = (name: 'label' | 'value' | 'quantity' | 'unit', value_: any, i: number) => {
    const updatedValues = [...formValues];
    const value = name === 'value' && forceNumericValues ? String(value_).replace(/[^0-9.-]/g, '') : value_;
    if (i >= 0 && i < updatedValues.length) {
      updatedValues[i] = {
        ...updatedValues[i],
        [name]: value,
      };
    } else if (i >= updatedValues.length) {
      if (includeQuantity) {
        updatedValues.push({
          label: name === 'label' ? value : '',
          value: name === 'value' ? value : '',
          quantity: name === 'quantity' ? Number(value) : null, // If you use "", GraphQL will error out from Float scalar
          unit: name === 'unit' ? value : '',
        });
      } else {
        updatedValues.push({
          label: name === 'label' ? value : '',
          value: name === 'value' ? value : '',
          unit: name === 'unit' ? value : '',
        });
      }
    }
    setFormValues(updatedValues);
  };

  const onSubmit = () => {
    setPopOverState({
      action: 'SUBMIT',
      value: formValues,
    });
  };

  return (
    <PopOverListContainer
      ref={divRef}
      shadowClassName={shadowClassName}
      className={designClassName}
    >
      <div className={cn('inside y_scr_hidden', className)}>
        {notReady
        ? <div className='p_md'>
          <ActivityDots />
        </div>
        : <>
          <POLabelsAndValues
            maxItems={10}
            gridLayoutStyle={gridLayoutStyle}
            flipInputOrder={flipInputOrder}
            includeQuantity={includeQuantity}
            includeUnit={includeUnit}
            labels={labels}
            inputs={formValues}
            onChangeItem={onChangeItem}
          />
          {/* {inputs.map((item: POLabelsAndValuesIface['variables']['inputs'][number], i: number) => {
            return <LabelsAndValues
              key={i}
              name={item.label}
              // item={item}
              onClickItem={onClickItem}
              saving={savingValue !== undefined && savingValue === item.value}
              checked={checked.includes(item.value)}
              selected={false}
            />;
          })}  */}
        </>}
      </div>

      {addFooterButton && (
        <PopOverListFooterButton
          onClick={onSubmit}
          text={footerButtonText || i18n.t('form.apply')}
        />
      )}
    </PopOverListContainer>
  );
}
