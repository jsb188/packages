import type { ColorEnum } from '@jsb188/app/types/app.d.ts';
import type { CSSProperties, ElementType, ReactNode } from 'react';

/**
 * Utility types
 */

export interface ClientRectValues {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  x: number;
  y: number;
}

export type POPosition = 'top' | 'left' | 'right' | 'bottom' | 'bottom_left' | 'bottom_right';
export type AbsolutePosition = Pick<CSSProperties, 'left' | 'right' | 'top' | 'bottom'>;

export type POItemValue = string | number | boolean | null;
export type POStateValue = any;
export type POFormState = Record<string, POStateValue>;
export type POListItemClickFn = (
  name: string | null,
  value?: POStateValue,
  notEventBased?: boolean,
  dismissOnClick?: boolean,
) => void;

/**
 * Pop over list items
 */

export interface POItemBase {
  __type: string;
  hidden?: boolean;
}

export interface POListSubtitleObj extends POItemBase {
  __type: 'LIST_SUBTITLE';
  text: string;
  textClassName?: string;
  colorIndicator?: ColorEnum;
}

export type PONListSubtitleObj = POListSubtitleObj;

export interface POListBreakObj extends POItemBase {
  __type: 'BREAK';
}

export interface POActionListItemBase extends POItemBase {
  name?: string;
  value?: POItemValue;
  text: string;
  description?: string | null;
  className?: string;
  textClassName?: string;
  colorIndicator?: ColorEnum;
  avatarDisplayName?: string;
  photoUri?: string | null;
  LinkComponent?: ElementType;
  allowDisabledOnClick?: boolean;
  iconName?: string;
  rightIconName?: string;
  rightIconClassName?: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: POListItemClickFn;
  preset?: 'small' | 'default';
  to?: string;
}

export interface POListItemObj extends POActionListItemBase {
  __type: 'LIST_ITEM' | 'LIST_ITEM_COPY';
}

export interface POCheckListItemObj extends Omit<POActionListItemBase, 'onClick'> {
  __type: 'CHECK_LIST_ITEM' | 'SINGLE_OPTION_LIST_ITEM';
}

export interface POModalItemObj extends Omit<POActionListItemBase, 'onClick'> {
  __type: 'LIST_ITEM_POPUP' | 'LIST_ITEM_MODAL';
  variables: POStateValue;
  useMutationArgs?: POStateValue[];
}

type POListColorValue = ColorEnum | (string & {});
export type POListBorderStyleValue =
  | 'outlineAllCells'
  | 'outlineInnerCells'
  | 'outlineInnerVertical'
  | 'outlineInnerHorizontal'
  | 'outlineAllSides'
  | 'outlineLeft'
  | 'outlineTop'
  | 'outlineRight'
  | 'outlineBottom'
  | 'outlineNone';

export interface POListItemPickerOptionObj {
  iconName: string;
  selectedIconName: string;
  className?: string;
  value: POItemValue;
}

export interface POListItemPickerObj extends Omit<POActionListItemBase, '__type' | 'text' | 'value' | 'iconName' | 'onClick'> {
  __type: 'LIST_ITEM_PICKER';
  label: string;
  options: POListItemPickerOptionObj[];
  selectedValue?: POItemValue;
  mutationName: string;
  useMutation?: (...args: POStateValue[]) => Record<string, POStateValue>;
  useMutationArgs?: POStateValue[];
  mutationVariables?: Record<string, POStateValue> | ((value: POStateValue) => Record<string, POStateValue>);
}

export interface POListColorsObj extends POItemBase {
  __type: 'LIST_COLORS';
  name?: string;
  label?: ReactNode;
  onClickCustomize?: POListItemClickFn;
  colors?: readonly POListColorValue[];
  selectedValue?: POListColorValue | null;
  className?: string;
  disabled?: boolean;
}

export interface POListBorderStylesObj extends POItemBase {
  __type: 'LIST_BORDER_STYLES';
  name?: string;
  label?: ReactNode;
  onClickCustomize?: POListItemClickFn;
  selectedValue?: POListBorderStyleValue | null;
  className?: string;
  disabled?: boolean;
}

export interface POListSubmenuObj extends Pick<POListVariables, 'notReady' | 'designClassName' | 'shadowClassName' | 'className' | 'savingValue'> {
  initialState?: POFormState | null;
  options: POListIfaceItem[];
}

export interface POListSubmenuItemObj extends Omit<POActionListItemBase, '__type' | 'onClick'> {
  __type: 'LIST_SUBMENU_ITEM';
  submenu: POListSubmenuObj;
}

export interface PONavAvatarItemObj extends POItemBase {
  __type: 'AVATAR_ITEM';
  name?: string;
  value?: string | null;
  text: string;
  label: string;
  avatarDisplayName?: string;
  photoUri?: string | null;
  className?: string;
  LinkComponent?: ElementType;
  allowDisabledOnClick?: boolean;
  rightIconName?: string;
  square?: boolean;
  disabled?: boolean;
  to?: string;
}

export interface PODateItemBase extends POItemBase {
  name?: string;
  minDate?: Date;
  maxDate?: Date;
}

export interface PODatePickerObj extends PODateItemBase {
  __type: 'DATE_PICKER';
}

export interface PODateRangeObj extends PODateItemBase {
  __type: 'DATE_RANGE';
}

export interface POTextObj extends POItemBase {
  __type: 'TEXT';
  text: string;
  className?: string;
  designClassName?: string;
}

export type POListIfaceItem =
  | PONavAvatarItemObj
  | POListSubtitleObj
  | POListBreakObj
  | POListItemObj
  | POCheckListItemObj
  | POListItemPickerObj
  | POListColorsObj
  | POListBorderStylesObj
  | POListSubmenuItemObj
  | POModalItemObj
  | PODatePickerObj
  | PODateRangeObj
  | POTextObj;

export type POCheckListIfaceItem = POListSubtitleObj | POListBreakObj | POCheckListItemObj;

/**
 * Pop over ifaces
 */

export interface POListVariables {
  notReady?: boolean;
  designClassName?: string;
  shadowClassName?: string;
  className?: string;
  savingValue?: POItemValue;
  iconName?: string;
  title?: string;
  description?: string;
  displayName?: string;
  photoUri?: string | null;
  initialState?: POFormState | POStateValue[] | POItemValue;
  options: POListIfaceItem[];
  addFooterButton?: boolean;
  footerButtonText?: string;
  LinkComponent?: ElementType;
  remainingHeight?: number;
}

export interface POListIface {
  name: 'PO_LIST';
  variables: POListVariables;
}

export interface POCheckListVariables extends Omit<POListVariables, 'options' | 'initialState'> {
  options: POCheckListIfaceItem[];
  initialState?: POItemValue[];
}

export interface POCheckListIface {
  name: 'PO_CHECK_LIST';
  variables: POCheckListVariables;
}

export interface POImageIface {
  name: 'PO_VIEW_IMAGE';
  variables: {
    imageUri: string;
    alt?: string;
    rect?: ClientRectValues;
  };
}

export interface POLabelsAndValuesIface {
  name: 'PO_LABELS_AND_VALUES';
  variables: {
    name: string;
    designClassName?: string;
    shadowClassName?: string;
    className?: string;
    addFooterButton?: boolean;
    footerButtonText?: string;
    gridLayoutStyle?: string;
    notReady?: boolean;
    description?: string;
    flipInputOrder?: boolean;
    forceNumericValues?: boolean;
    includeQuantity?: boolean;
    includeUnit?: boolean;
    labels: string[];
    inputs: {
      label: string;
      value: string;
      quantity?: number;
      unit?: string;
    }[];
  };
}

export type PopOverIface = POListIface | POCheckListIface | POImageIface | POLabelsAndValuesIface;
export type PopOverName = PopOverIface['name'] | (string & {});
export type PopOverVariables = PopOverIface['variables'] | Record<string, POStateValue>;

/**
 * Pop overs
 */

export interface PopOverPositionProps {
  className: string;
  position: POPosition;
  variables: PopOverVariables;
  popOverWidth: number;
  popOverHeight: number;
  rect: ClientRectValues;
  offsetX: number;
  offsetY: number;
  leftEdgeThreshold: number;
  rightEdgeThreshold: number;
  leftEdgePosition: number;
  rightEdgePosition: number;
  hover: boolean;
}

export interface PopOverProps extends Partial<PopOverPositionProps> {
  id?: string;
  name: PopOverName;
  closing?: boolean;
  zClassName?: string;
  animationClassName?: string;
  doNotTrackHover?: boolean;
  doNotFixToBottom?: boolean;
  doNotRemoveOnPageEvents?: boolean;
  scrollAreaDOMId?: string | null;
  globalState?: PopOverGlobalStateObj | null;
}

export interface UpdatePopOverParams extends Record<string, POStateValue> {
  name: PopOverName;
}

export interface PopOverGlobalStateParams {
  action: 'ITEM' | 'ITEM_AUTO' | 'SUBMIT' | 'MOUNT' | 'UNMOUNT';
  name?: string | null;
  value: POStateValue;
  doNotClosePopOver?: boolean;
}

export interface PopOverGlobalStateObj extends PopOverGlobalStateParams {
  id?: string;
}

export type OpenPopOverFn = (data: PopOverProps) => void;
export type ClosePopOverFn = (dismissIfName?: string) => void;
export type UpdatePopOverFn = (data: UpdatePopOverParams) => void;
export type SetPopOverStateFn = (data: PopOverGlobalStateParams | null) => void;

export interface PopOverHandlerProps {
  openPopOver: OpenPopOverFn;
  closePopOver: ClosePopOverFn;
  updatePopOver: UpdatePopOverFn;
  setPopOverState: SetPopOverStateFn;
}

export interface PopOverHookProps extends PopOverHandlerProps {
  pathname?: string;
  popOver: PopOverProps | null;
}

/**
 * Tooltips
 */

export interface TooltipProps extends Partial<Omit<PopOverPositionProps, 'variables'>> {
  id?: string;
  absolute?: AbsolutePosition;
  __html?: string;
  title?: string;
  message?: string;
  tooltipClassName?: string;
  fontClassName?: string;
  leftIconName?: string;
  rightIconName?: string;
}

export type OpenTooltipFn = (data: TooltipProps) => void;
export type CloseTooltipFn = (removeId: string) => void;
export type UpdateTooltipFn = (data: TooltipProps) => void;

export interface TooltipHandlerProps {
  openTooltip: OpenTooltipFn;
  closeTooltip: CloseTooltipFn;
  updateTooltip: UpdateTooltipFn;
}

export interface TooltipHookProps extends TooltipHandlerProps {
  tooltip: TooltipProps | null;
}
