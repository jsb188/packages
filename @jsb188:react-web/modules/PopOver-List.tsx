import i18n from '@jsb188/app/i18n';
import { cn } from '@jsb188/app/utils/string';
import { useOnClickOutside } from '@jsb188/react-web/utils/dom';
import type { POCheckListIface, POCheckListIfaceItem, PODateRangeObj, POListIface, POListIfaceItem, POListItemObj, PONavAvatarItemObj, PONListSubtitleObj, PopOverHandlerProps, POTextObj } from '@jsb188/react/types/PopOver.d';
import { memo, useRef, useState } from 'react';
import { ActivityDots } from '../ui/Loading';
import type { PONavItemBase } from '../ui/PopOverUI';
import { POListBreak, POListItem, POListSubtitle, PONavAvatarItem, PopOverListContainer, PopOverListFooterButton, POText } from '../ui/PopOverUI';
import type { CalendarSelectedObj, OnChangeCalendarDayFn } from './Calendar';
import CalendarMain from './Calendar';

/**
 * Pop over date range picker
 */

interface PODateRangeProps {
  name: string;
  item: PODateRangeObj;
  value?: [CalendarSelectedObj | null, CalendarSelectedObj | null] | null;
  onClickItem: (name: string, value: any) => void;
}

const PODateRange = memo((p: PODateRangeProps) => {
  const { name, value, item, onClickItem } = p;
  const [startDate, endDate] = value || [];

  const onChangeCalendarDay: OnChangeCalendarDayFn = (innerName, innerValue) => {
    const nextValue = innerName === 'startDate' ? [innerValue, endDate] : [startDate, innerValue];
    onClickItem(name, nextValue);
  };

  const calendarProps = {
    className: 'f',
    onChange: onChangeCalendarDay
  };

  return <div className='h_spread gap_md pt_4 px_4'>
    <CalendarMain {...calendarProps} name='startDate' value={startDate} />
    <CalendarMain {...calendarProps} name='endDate' value={endDate} />
  </div>;
});

PODateRange.displayName = 'PODateRange';

/**
 * Ifaces for pop over nav item
 */

interface PONavItemIfaceProps extends PONavItemBase {
  name: string;
  value?: any;
  item: POListIfaceItem;
  checked?: boolean;
}

export function PONavItemIface(p: PONavItemIfaceProps) {
  const { item, checked, ...other } = p;
  const { __type } = item;

  switch (__type) {
    case 'SUBTITLE':
      return <POListSubtitle item={item as PONListSubtitleObj} />;
    case 'BREAK':
      return <POListBreak />;
    case 'LIST_ITEM':
      return <POListItem {...other} item={item as POListItemObj} />;
    case 'CHECK_LIST_ITEM':
      const rightIconName = checked ? 'circle-check' : 'circle';
      const rightIconClassName = checked ? 'cl_bd' : 'cl_lt';
      return <POListItem {...other} item={{ ...item, rightIconName, rightIconClassName } as POListItemObj} />;
    case 'AVATAR_ITEM':
      return <PONavAvatarItem {...other} item={item as PONavAvatarItemObj} />;
    case 'DATE_RANGE':
      return <PODateRange {...other} item={item as PODateRangeObj} />;
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

interface PopOverListProps extends PopOverHandlerProps {
  variables: POListIface['variables'];
}

export function PopOverList(p: PopOverListProps) {
  const { closePopOver, setPopOverState, variables } = p;

  const {
    notReady,
    className,
    designClassName,
    options,
    selectedValue,
    savingValue,
    addFooterButton,
    footerButtonText,
    initialState
  } = variables;

  const divRef = useRef<HTMLDivElement>(null);
  const dismissFn = closePopOver ? () => closePopOver() : undefined;
  const [formValues, setFormValues] = useState(initialState || {});

  useOnClickOutside(divRef, true, false, 'ignore_outside_click', dismissFn);

  const onClickItem = (name: string | null, value: any) => {
    setPopOverState({
      action: 'ITEM',
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
      value: selectedValue,
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
            selected={selectedValue !== undefined && selectedValue === itemValue}
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

interface PopOverCheckListProps extends PopOverHandlerProps {
  variables: POCheckListIface['variables'];
}

export function PopOverCheckList(p: PopOverCheckListProps) {
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

  const onClickItem = (name: string | null, value: string | null) => {
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
