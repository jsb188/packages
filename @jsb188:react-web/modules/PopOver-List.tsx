import i18n from '@jsb188/app/i18n';
import { cn } from '@jsb188/app/utils/string';
import { useOnClickOutside } from '@jsb188/react-web/utils/dom';
import { useOpenModalPopUp, useOpenModalScreen } from '@jsb188/react/states';
import type { POLabelsAndValuesIface, POCheckListIface, POCheckListIfaceItem, PODatePickerObj, PODateRangeObj, POListIface, POListIfaceItem, POListItemObj, POModalItemObj, PONavAvatarItemObj, PONListSubtitleObj, PopOverHandlerProps, POTextObj } from '@jsb188/react/types/PopOver.d';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityDots } from '../ui/Loading';
import type { PONavItemBase } from '../ui/PopOverUI';
import { POLabelsAndValues, POListBreak, POListItem, POListSubtitle, PONavAvatarItem, PopOverListContainer, PopOverListFooterButton, POText } from '../ui/PopOverUI';
import type { CalendarSelectedObj, OnChangeCalendarDayFn } from './Calendar';
import { Calendar, CalendarDateRange, getCalendarSelector } from './Calendar';

/**
 * Pop over date range picker
 */

const PODatePicker = memo((p: {
  name: string;
  item: PODatePickerObj;
  value?: CalendarSelectedObj | null;
  onClickItem: (name: string, value: any, notEventBased?: boolean) => void;
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
  onClickItem: (name: string, value: any, notEventBased?: boolean) => void;
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

const POPopUpListItem = memo((p: POOpenModalListItemProps) => {
  const { item } = p;
  const openModalPopUp = useOpenModalPopUp();

  const onClickItem = (_name: any, _value: any) => {
    openModalPopUp(item.variables);
  };

  return <POListItem
    {...p}
    // @ts-expect-error - Not all interfaces have "value" property
    item={!item || item.value !== undefined ? item : { ...item, value: true }}
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
    // @ts-expect-error - Not all interfaces have "value" property
    item={!item || item.value !== undefined ? item : { ...item, value: true }}
    onClickItem={onClickItem}
  />;
});

POModalScreenListItem.displayName = 'POModalScreenListItem';

/**
 * Ifaces for pop over nav item
 */

export function PONavItemIface(p: PONavItemBase & {
  name: string;
  value?: any;
  item: POListIfaceItem;
  checked?: boolean;
}) {
  const { item, checked, ...other } = p;
  const { __type } = item;

  switch (__type) {
    case 'LIST_SUBTITLE':
      return <POListSubtitle item={item as PONListSubtitleObj} />;
    case 'BREAK':
      return <POListBreak />;
    case 'LIST_ITEM':
      return <POListItem {...other} item={item as POListItemObj} />;
    case 'LIST_ITEM_POPUP':
      return <POPopUpListItem {...other} item={item as POModalItemObj} />;
    case 'LIST_ITEM_MODAL':
      return <POModalScreenListItem {...other} item={item as POModalItemObj} />;
    case 'CHECK_LIST_ITEM':
      const rightIconName = checked ? 'circle-check' : 'circle';
      const rightIconClassName = checked ? 'cl_bd' : 'cl_lt';
      return <POListItem {...other} item={{ ...item, rightIconName, rightIconClassName } as POListItemObj} />;
    case 'AVATAR_ITEM':
      return <PONavAvatarItem {...other} item={item as PONavAvatarItemObj} />;
    case 'DATE_RANGE':
      return <PODateRange {...other} item={item as PODateRangeObj} />;
    case 'DATE_PICKER':
      return <PODatePicker {...other} item={item as PODatePickerObj} />;
    case 'TEXT':
      return <POText item={item as POTextObj} />;
    default:
  }

  console.warn('Unknown pop over iface name:', __type);
  return null;
}

/**
 * Nav list popover
 */

export function PopOverList(p: PopOverHandlerProps & {
  variables: POListIface['variables'];
}) {
  const { closePopOver, setPopOverState, variables } = p;

  const {
    notReady,
    className,
    designClassName,
    options,
    savingValue,
    addFooterButton,
    footerButtonText,
    initialState
  } = variables;

  const divRef = useRef<HTMLDivElement>(null);
  const dismissFn = closePopOver ? () => closePopOver() : undefined;
  const [formValues, setFormValues] = useState(initialState || {});

  useOnClickOutside(divRef, true, false, 'ignore_outside_click', dismissFn);

  const onClickItem = (name: string | null, value: any, notEventBased?: boolean) => {
    setPopOverState({
      action: notEventBased ? 'ITEM_AUTO' : 'ITEM',
      name,
      value
    });

    setFormValues(prev => ({
      ...prev,
      [name!]: value
    }));
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
      className={designClassName}
    >
      <div className={cn('inside y_scr_hidden gap_2', className)}>
        {notReady
        ? <div className='p_md'>
          <ActivityDots />
        </div>
        : options.filter((item: POListIfaceItem) => !item.hidden).map((item: POListIfaceItem, i: number) => {
          // @ts-expect-error - Not all interfaces have "name" property
          const itemName = item.name || i.toString();
          // @ts-expect-error - Not all interfaces have "value" property
          const itemValue = item.value;
          const currentValue = formValues[itemName];

          return <PONavItemIface
            key={i}
            name={itemName}
            item={item}
            value={currentValue}
            onClickItem={onClickItem}
            saving={savingValue !== undefined && savingValue === itemValue}
            // selected={selectedValue !== undefined && selectedValue === itemValue}
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
      className={designClassName}
    >
      <div className={cn('inside y_scr_hidden gap_2', className)}>
        {notReady
        ? <div className='p_md'>
          <ActivityDots />
        </div>
        : options.filter((item: POCheckListIfaceItem) => !item.hidden).map((item: POCheckListIfaceItem, i: number) => {
          // @ts-expect-error - Ignored because some components such as <PONavItemBreak /> don't have value
          const itemValue = item.value;
          // @ts-expect-error - Not all interfaces have "name" property
          const itemName = item.name || i.toString();

          return <PONavItemIface
            key={i}
            name={itemName}
            item={item}
            onClickItem={onClickItem}
            saving={savingValue !== undefined && savingValue === itemValue}
            checked={checked.includes(itemValue)}
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
    className,
    gridLayoutStyle,
    name,
    labels,
    inputs,
    addFooterButton,
    footerButtonText,
    flipInputOrder,
    forceNumericValues,
  } = variables;

  const [formValues, setFormValues] = useState(inputs);
  const divRef = useRef<HTMLDivElement>(null);
  const dismissFn = closePopOver ? () => closePopOver() : undefined;

  useOnClickOutside(divRef, true, false, 'ignore_outside_click', dismissFn);

  useEffect(() => {
    setPopOverState({
      action: 'ITEM',
      name,
      value: formValues,
      doNotClosePopOver: true,
    });
  }, [formValues]);

  const onChangeItem = (name: 'label' | 'value', value_: any, i: number) => {
    const updatedValues = [...formValues];
    const value = name === 'value' && forceNumericValues ? String(value_).replace(/[^0-9.-]/g, '') : value_;
    if (i >= 0 && i < updatedValues.length) {
      updatedValues[i] = {
        ...updatedValues[i],
        [name]: value,
      };
    } else if (i >= updatedValues.length) {
      updatedValues.push({
        label: name === 'label' ? value : '',
        value: name === 'value' ? value : '',
      });
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
      className={designClassName}
    >
      <div className={cn('inside y_scr_hidden gap_2', className)}>
        {notReady
        ? <div className='p_md'>
          <ActivityDots />
        </div>
        : <>
          <POLabelsAndValues
            maxItems={10}
            gridLayoutStyle={gridLayoutStyle}
            flipInputOrder={flipInputOrder}
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
