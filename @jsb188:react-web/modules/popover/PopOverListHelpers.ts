import i18n from '@jsb188/app/i18n/index.ts';
import type { CSSProperties } from 'react';
import type {
  POCheckListItemObj,
  POListBorderStyleValue,
  POListIfaceItem,
  POListItemObj,
  POListSubmenuItemObj,
  POStateValue,
} from '@jsb188/react/types/PopOver.d';

export type POListSubmenuState = {
  item: POListSubmenuItemObj;
  itemName: string;
  left: number;
  top: number;
};

export const DEFAULT_PO_LIST_BORDER_STYLES = [{
  iconName: 'cell-border-full',
  value: 'outlineAllCells',
}, {
  iconName: 'cell-border-horizontal-vertical',
  value: 'outlineInnerCells',
}, {
  iconName: 'cell-border-middle',
  value: 'outlineInnerVertical',
}, {
  iconName: 'cell-border-center',
  value: 'outlineInnerHorizontal',
}, {
  iconName: 'cell-border-frame',
  value: 'outlineAllSides',
}, {
  iconName: 'cell-border-left',
  value: 'outlineLeft',
}, {
  iconName: 'cell-border-up',
  value: 'outlineTop',
}, {
  iconName: 'cell-border-right',
  value: 'outlineRight',
}, {
  iconName: 'cell-border-bottom',
  value: 'outlineBottom',
}, {
  iconName: 'cell-border-none',
  value: 'outlineNone',
}] as const satisfies readonly {
  iconName: string;
  value: POListBorderStyleValue;
}[];

/**
 * Return the accessible label for one border-style preset button.
 */
export function getPOListBorderStyleLabel(value: POListBorderStyleValue) {
  switch (value) {
    case 'outlineAllCells':
      return i18n.t('sheet.border_outline_all_cells');
    case 'outlineInnerCells':
      return i18n.t('sheet.border_outline_inner_cells');
    case 'outlineInnerVertical':
      return i18n.t('sheet.border_outline_inner_vertical');
    case 'outlineInnerHorizontal':
      return i18n.t('sheet.border_outline_inner_horizontal');
    case 'outlineAllSides':
      return i18n.t('sheet.border_outline_all_sides');
    case 'outlineLeft':
      return i18n.t('sheet.border_outline_left');
    case 'outlineTop':
      return i18n.t('sheet.border_outline_top');
    case 'outlineRight':
      return i18n.t('sheet.border_outline_right');
    case 'outlineBottom':
      return i18n.t('sheet.border_outline_bottom');
    case 'outlineNone':
      return i18n.t('sheet.border_outline_none');
    default:
      return '';
  }
}

/**
 * Return the stable form name for one PO_LIST option item.
 */
export function getPOListItemName(item: POListIfaceItem, index: number) {
  return 'name' in item && item.name ? item.name : index.toString();
}

/**
 * Return the option value used by PO_LIST selected and saving states.
 */
export function getPOListItemValue(item: POListIfaceItem) {
  return 'value' in item ? item.value : undefined;
}

/**
 * Return an object-shaped form state for named PO_LIST item updates.
 */
export function getPOListFormStateObject(value: POStateValue): Record<string, POStateValue> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, POStateValue> : {};
}

/**
 * Return the current value for one item from scalar or object-shaped PO_LIST state.
 */
export function getPOListCurrentValue(formValues: POStateValue, name: string) {
  return formValues && typeof formValues === 'object' && !Array.isArray(formValues)
    ? (formValues as Record<string, POStateValue>)[name]
    : formValues;
}

/**
 * Return PO_LIST form state after one named item changes.
 */
export function getNextPOListFormState(prev: POStateValue, name: string | null, value: POStateValue) {
  if (name === null) {
    return prev;
  }

  return {
    ...getPOListFormStateObject(prev),
    [name]: value,
  };
}

/**
 * Return whether one PO_LIST option opens a nested submenu.
 */
export function isPOListSubmenuItem(item: POListIfaceItem): item is POListSubmenuItemObj {
  return item.__type === 'LIST_SUBMENU_ITEM';
}

/**
 * Build submenu panel coordinates relative to the parent PO_LIST wrapper.
 */
export function getPOListSubmenuState(params: {
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

/**
 * Return the absolute style for the currently open submenu panel.
 */
export function getPOListSubmenuPanelStyle(submenuState: POListSubmenuState): CSSProperties {
  return {
    left: submenuState.left,
    position: 'absolute',
    top: submenuState.top,
    zIndex: 1,
  };
}

/**
 * Return one checklist option as a normal list item with checklist icon state.
 */
export function getPOChecklistDisplayListItem(item: POCheckListItemObj, checked?: boolean): POListItemObj {
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
