import type { ColorEnum } from '@jsb188/app/types/app.d';

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

/**
 * Pop over interfaces
 */

 export interface PONListSubtitleObj {
  __type: 'SUBTITLE';
  hidden?: boolean;
  text: string;
}

export interface POListBreakObj {
  __type: 'BREAK';
  hidden?: boolean;
}

export interface POListItemObj {
  __type: 'LIST_ITEM' | 'CHECK_LIST_ITEM';
  name?: string; // Name for form, for formValues object; if not set, index will be used
  value?: string | null;
  text: string;
  className?: string;
  colorIndicator?: ColorEnum;
  avatarDisplayName?: string;
  photoUri?: string | null;
  LinkComponent?: any;
  allowDisabledOnClick?: boolean;
  iconName?: string;
  rightIconName?: string;
  rightIconClassName?: string;
  hidden?: boolean;
  disabled?: boolean;

  // Presets
  preset?: 'small' | 'default';

  // Web props
  to?: string;

  // Mobile props
  // ?
}

export interface POCheckListItemObj extends POListItemObj {
  __type: 'CHECK_LIST_ITEM';
  name?: string; // Name for form, for formValues object; if not set, index will be used
  hidden?: boolean;
}

export interface PONavAvatarItemObj {
  __type: 'AVATAR_ITEM';
  name?: string; // Name for form, for formValues object; if not set, index will be used
  value?: string | null;
  text: string;
  label: string;
  avatarDisplayName?: string;
  photoUri?: string | null;
  className?: string;
  LinkComponent?: any;
  allowDisabledOnClick?: boolean;
  rightIconName?: string;
  hidden?: boolean;
  disabled?: boolean;

  // Web props
  to?: string;

  // Mobile props
  // ?
}

export interface PODateRangeObj {
  __type: 'DATE_RANGE';
  hidden?: boolean;
  name?: string; // Name for form, for formValues object; if not set, index will be used
}

export interface POTextObj {
  __type: 'TEXT';
  hidden?: boolean;
  text: string;
  className?: string;
  designClassName?: string;
}

export type POListIfaceItem = PONListSubtitleObj | POListBreakObj | POListItemObj | POCheckListItemObj | PONavAvatarItemObj | PODateRangeObj | POTextObj;
export type POCheckListIfaceItem = PONListSubtitleObj | POListBreakObj | POCheckListItemObj;

export interface POListIface {
  name: 'PO_LIST';
  variables: {
    notReady?: boolean;
    designClassName?: string;
    className?: string;
    savingValue?: string;
    iconName?: string;
    title?: string;
    description?: string;
    displayName?: string;
    photoUri?: string | null;
    selectedValue?: string | null;
    initialState?: Record<string, any>;
    options: POListIfaceItem[];
    addFooterButton?: boolean;
    footerButtonText?: string;
    LinkComponent?: any;
  };
}

export interface POCheckListIface {
  name: 'PO_CHECK_LIST';
  variables: {
    notReady?: boolean;
    className?: string;
    designClassName?: string;
    savingValue?: string;
    iconName?: string;
    title?: string;
    description?: string;
    displayName?: string;
    photoUri?: string | null;
    options: POCheckListIfaceItem[];
    initialState?: (string | null)[];
    addFooterButton?: boolean;
    footerButtonText?: string;
  };
}

export interface POImageIface {
  name: 'PO_VIEW_IMAGE'
  variables: {
    imageUri: string;
    alt?: string;
    rect: any;
  }
}

export type PopOverIface = POListIface | POCheckListIface | POImageIface;

/**
 * Pop overs
 */

export type POPosition = 'top' | 'left' | 'right' | 'bottom' | 'bottom_left';

interface FixedElementProps {
  id: string; // This ensures that the popover doesn't reset from within the same mouse pointer element
  className: string;
  position: POPosition;
  variables: any;
  popOverWidth: number;
  popOverHeight: number;
  rect?: ClientRectValues;
  offsetX: number;
  offsetY: number;
  leftEdgeThreshold: number;
  rightEdgeThreshold: number;
  leftEdgePosition: number;
  rightEdgePosition: number;
  hover: boolean;
}

export interface PopOverProps extends Partial<FixedElementProps> {
  id?: string;
  name: string; // Used to be "__type"
  closing?: boolean; // If true, multiple close() functions are triggered to animate & close popover
  animationClassName?: string;
  doNotTrackHover?: boolean;
  doNotRemoveOnPageEvents?: boolean; // If true, popover will be removed when the user scrolls or navigation events
  scrollAreaDOMId?: string | null; // Some pages have different parts as the main body, this is the scroll element that need to be tracked
  globalState?: Record<string, any> | null; // Use this to listen to state changes from outside the popover
}

export interface UpdatePopOverParams {
  name: string;
  variables: Record<string, any>;
}

export interface PopOverGlobalStateParams {
  action: 'ITEM' | 'SUBMIT' | 'MOUNT' | 'UNMOUNT';
  name?: string | null; // Name of form item
  value: any;
}

export interface PopOverGlobalStateObj extends PopOverGlobalStateParams {
  id: string;
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
  pathname: string;
  popOver: PopOverProps | null;
}

/**
 * Tooltips
 */

export interface TooltipProps extends Partial<FixedElementProps> {
  title?: string;
  message?: string;
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
