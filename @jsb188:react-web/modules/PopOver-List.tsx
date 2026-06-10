import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { useOnClickOutside } from '@jsb188/react-web/utils/dom';
import type {
  POCheckListIface,
  POCheckListIfaceItem,
  POItemValue,
  POLabelsAndValuesIface,
  POListIface,
  POListSubmenuItemObj,
  PopOverHandlerProps,
  POStateValue,
} from '@jsb188/react/types/PopOver.d';
import { useEffect, useRef, useState } from 'react';
import { ActivityDots } from '../ui/Loading';
import { POLabelsAndValues, PopOverListContainer, PopOverListFooterButton } from '../ui/PopOverUI';
import {
  getNextPOListFormState,
  getPOListItemName,
  getPOListItemValue,
  getPOListSubmenuPanelStyle,
  getPOListSubmenuState,
  type POListSubmenuState,
} from './popover/PopOverListHelpers';
import { POListItems, PONavItemIface } from './popover/PopOverListItems';

type POLabelsAndValuesInput = POLabelsAndValuesIface['variables']['inputs'][number];

/**
 * Return the initial state shape used by PO_LIST and submenu form values.
 */
function getInitialPOListFormState(initialState: POListIface['variables']['initialState'] | POListSubmenuItemObj['submenu']['initialState']) {
  return initialState === null ? null : (initialState || {});
}

/**
 * Return labels-and-values rows with empty rows removed from the live popover state.
 */
function getFilledLabelsAndValuesRows(
  formValues: POLabelsAndValuesInput[],
  includeQuantity?: boolean,
  includeUnit?: boolean,
) {
  return formValues.filter(obj => obj.label || obj.value || (includeQuantity && obj.quantity) || (includeUnit && obj.unit));
}

/**
 * Return the next labels-and-values rows after one input changes.
 */
function getNextLabelsAndValuesRows(params: {
  forceNumericValues?: boolean;
  formValues: POLabelsAndValuesInput[];
  includeQuantity?: boolean;
  index: number;
  name: 'label' | 'value' | 'quantity' | 'unit';
  value: string | number;
}) {
  const { forceNumericValues, formValues, includeQuantity, index, name, value: value_ } = params;
  const updatedValues = [...formValues];
  const value = name === 'value' && forceNumericValues ? String(value_).replace(/[^0-9.-]/g, '') : value_;

  if (index >= 0 && index < updatedValues.length) {
    updatedValues[index] = {
      ...updatedValues[index],
      [name]: value,
    };
  } else if (index >= updatedValues.length) {
    if (includeQuantity) {
      updatedValues.push({
        label: name === 'label' ? String(value) : '',
        value: name === 'value' ? String(value) : '',
        quantity: name === 'quantity' ? Number(value) : undefined,
        unit: name === 'unit' ? String(value) : '',
      });
    } else {
      updatedValues.push({
        label: name === 'label' ? String(value) : '',
        value: name === 'value' ? String(value) : '',
        unit: name === 'unit' ? String(value) : '',
      });
    }
  }

  return updatedValues;
}

/**
 * Render a PO_LIST popover with optional nested submenus.
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
  const dismissFn = () => closePopOver();
  const [formValues, setFormValues] = useState<POStateValue>(getInitialPOListFormState(initialState));
  const [submenuState, setSubmenuState] = useState<POListSubmenuState | null>(null);
  const [submenuFormValues, setSubmenuFormValues] = useState<POStateValue>({});

  useOnClickOutside(divRef, true, false, 'ignore_outside_click', dismissFn);

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches?.('input, textarea')) {
        dismissFn();
      }
    };

    globalThis.document?.addEventListener('focusin', onFocusIn);
    return () => {
      globalThis.document?.removeEventListener('focusin', onFocusIn);
    };
  }, [dismissFn]);

  const onClickItem = (name: string | null, value: POStateValue, notEventBased?: boolean, dismissOnClick?: boolean) => {
    if (dismissOnClick) {
      dismissFn();
      return;
    }

    setPopOverState({
      action: notEventBased ? 'ITEM_AUTO' : 'ITEM',
      name,
      value
    });

    setFormValues((prev: POStateValue) => getNextPOListFormState(prev, name, value));
  };

  const onClickParentItem = (name: string | null, value: POStateValue, notEventBased?: boolean, dismissOnClick?: boolean) => {
    setSubmenuState(null);
    onClickItem(name, value, notEventBased, dismissOnClick);
  };

  const onClickSubmenuItem = (name: string | null, value: POStateValue, notEventBased?: boolean, dismissOnClick?: boolean) => {
    if (dismissOnClick) {
      dismissFn();
      return;
    }

    setPopOverState({
      action: notEventBased ? 'ITEM_AUTO' : 'ITEM',
      name,
      value
    });

    setSubmenuFormValues((prev: POStateValue) => getNextPOListFormState(prev, name, value));
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
    setSubmenuFormValues(getInitialPOListFormState(item.submenu.initialState));
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
 * Render a PO_CHECK_LIST popover with multiple selectable options.
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

  const [checked, setChecked] = useState<POItemValue[]>(initialState || []);
  const divRef = useRef<HTMLDivElement>(null);
  const dismissFn = () => closePopOver();

  useOnClickOutside(divRef, true, false, 'ignore_outside_click', dismissFn);

  const onClickItem = (name: string | null, value: POStateValue) => {
    const checkedValue = value as POItemValue;

    setPopOverState({
      action: 'ITEM',
      name,
      value
    });
    setChecked(prev => prev.includes(checkedValue) ? prev.filter(v => v !== checkedValue) : [...prev, checkedValue]);
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
            checked={itemValue !== undefined && checked.includes(itemValue as POItemValue)}
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
 * Render a labels-and-values popover form.
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

  const [formValues, setFormValues] = useState<POLabelsAndValuesInput[]>(inputs);
  const divRef = useRef<HTMLDivElement>(null);
  const dismissFn = () => closePopOver();

  useOnClickOutside(divRef, true, false, 'ignore_outside_click', dismissFn);

  useEffect(() => {
    setPopOverState({
      action: 'ITEM',
      name,
      value: getFilledLabelsAndValuesRows(formValues, includeQuantity, includeUnit),
      doNotClosePopOver: true,
    });
  }, [formValues]);

  const onChangeItem = (name: 'label' | 'value' | 'quantity' | 'unit', value: string | number, i: number) => {
    setFormValues(getNextLabelsAndValuesRows({
      forceNumericValues,
      formValues,
      includeQuantity,
      index: i,
      name,
      value,
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
      shadowClassName={shadowClassName}
      className={designClassName}
    >
      <div className={cn('inside y_scr_hidden', className)}>
        {notReady
        ? <div className='p_md'>
          <ActivityDots />
        </div>
        : <POLabelsAndValues
          maxItems={10}
          gridLayoutStyle={gridLayoutStyle}
          flipInputOrder={flipInputOrder}
          includeQuantity={includeQuantity}
          includeUnit={includeUnit}
          labels={labels}
          inputs={formValues}
          onChangeItem={onChangeItem}
        />}
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
