import type { AbsolutePosition, ClientRectValues, POPosition } from '@jsb188/react/types/PopOver.d';

type PopOverContentDimensions = readonly [number, number];
type PositionSide = NonNullable<AbsolutePosition['left']>;

const AUTO_POSITION = 'auto';

interface PopOverPositionParams {
  contentDimensions: PopOverContentDimensions;
  doNotFixToBottom?: boolean;
  leftEdgePosition: number;
  leftEdgeThreshold: number;
  offsetX: number;
  offsetY: number;
  position?: POPosition;
  rect?: ClientRectValues;
  rightEdgePosition: number;
  rightEdgeThreshold: number;
  windowHeight: number;
  windowWidth: number;
}

interface PopOverPositionResult {
  remainingHeight?: number;
  style: AbsolutePosition;
}

interface TooltipPositionParams {
  absolute?: AbsolutePosition;
  leftEdgePosition: number;
  leftEdgeThreshold: number;
  offsetX: number;
  offsetY: number;
  position?: POPosition;
  rect?: ClientRectValues;
  rightEdgePosition: number;
  rightEdgeThreshold: number;
  tooltipHeight?: number;
  tooltipWidth: number;
  windowHeight: number;
  windowWidth: number;
}

interface TooltipXPosition {
  left: PositionSide;
  right: PositionSide;
}

interface TooltipYPosition {
  bottom: PositionSide;
  top: PositionSide;
}

/**
 * Return true when a CSS position value is a finite pixel number.
 */
function isFinitePositionSide(value: PositionSide): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Return a position value clamped to a minimum viewport edge.
 */
function getViewportEdgePosition(value: number, fallback: number): number {
  return value || fallback;
}

/**
 * Return horizontal tooltip coordinates clamped inside the viewport.
 */
function getViewportClampedTooltipX(params: {
  left: PositionSide;
  right: PositionSide;
  leftEdgePosition: number;
  leftEdgeThreshold: number;
  rightEdgePosition: number;
  rightEdgeThreshold: number;
  tooltipWidth: number;
  windowWidth: number;
}): TooltipXPosition {
  const {
    leftEdgePosition,
    leftEdgeThreshold,
    rightEdgePosition,
    rightEdgeThreshold,
    tooltipWidth,
    windowWidth,
  } = params;
  let { left, right } = params;

  if (!isFinitePositionSide(left)) {
    return { left, right };
  }

  const tooltipLeft = left;
  const tooltipRight = tooltipLeft + tooltipWidth;

  if (tooltipRight + (rightEdgeThreshold || 0) > windowWidth) {
    left = AUTO_POSITION;
    right = getViewportEdgePosition(rightEdgePosition, 0);
  } else if (tooltipLeft < (leftEdgeThreshold || 0)) {
    left = getViewportEdgePosition(leftEdgePosition, 0);
    right = AUTO_POSITION;
  }

  return { left, right };
}

/**
 * Return vertical tooltip coordinates clamped above the viewport bottom.
 */
function getViewportClampedTooltipY(params: {
  bottom: PositionSide;
  top: PositionSide;
  tooltipHeight?: number;
  windowHeight: number;
}): TooltipYPosition {
  const { tooltipHeight, windowHeight } = params;
  let { bottom, top } = params;

  if (bottom !== AUTO_POSITION || !tooltipHeight || !isFinitePositionSide(top)) {
    return { bottom, top };
  }

  if (top + tooltipHeight > windowHeight - 8) {
    bottom = 8;
    top = AUTO_POSITION;
  }

  return { bottom, top };
}

/**
 * Return coordinates with caller-provided absolute values applied last.
 */
function getAbsoluteTooltipPosition(params: {
  absolute?: AbsolutePosition;
  bottom: PositionSide;
  left: PositionSide;
  right: PositionSide;
  top: PositionSide;
}): AbsolutePosition {
  const { absolute } = params;
  let { bottom, left, right, top } = params;

  if (absolute) {
    if (absolute.left !== undefined) left = absolute.left;
    if (absolute.right !== undefined) right = absolute.right;
    if (absolute.top !== undefined) top = absolute.top;
    if (absolute.bottom !== undefined) bottom = absolute.bottom;
  }

  return { left, right, top, bottom };
}

/**
 * Return the empty rectangle used before a trigger element is measured.
 */
export function getEmptyClientRectValues(): ClientRectValues {
  return { x: 0, y: 0, width: 0, height: 0, left: 0, right: 0, top: 0, bottom: 0 };
}

/**
 * Return a plain object copy of a DOM rectangle for storing in popover state.
 */
export function getClientRectValues(rect: ClientRect | DOMRect): ClientRectValues {
  return {
    width: rect.width,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    x: rect.x,
    y: rect.y,
  };
}

/**
 * Return a zero-size rectangle anchored at a pointer location (e.g. a right-click event).
 */
export function getPointerClientRectValues(clientX: number, clientY: number): ClientRectValues {
  return {
    width: 0,
    height: 0,
    left: clientX,
    right: clientX,
    top: clientY,
    bottom: clientY,
    x: clientX,
    y: clientY,
  };
}

/**
 * Return the positioned style and optional remaining height for the popover wrapper.
 */
export function getPopOverPosition(params: PopOverPositionParams): PopOverPositionResult {
  const {
    contentDimensions,
    doNotFixToBottom,
    leftEdgePosition,
    leftEdgeThreshold,
    offsetX,
    offsetY,
    position,
    rightEdgePosition,
    rightEdgeThreshold,
    windowHeight,
    windowWidth,
  } = params;
  const rect = params.rect || getEmptyClientRectValues();
  const notReady = (contentDimensions[1] || -1) < 0;
  let left: number | string;
  let right: number | string;
  let top: number | string;
  let bottom: number | string;

  switch (position) {
    case 'top':
      left = rect.x - (rect.width / 2) + offsetX;
      right = 'auto';
      top = 'auto';
      bottom = windowHeight - rect.y + (offsetY || 0);
      break;
    case 'bottom':
      left = rect.x - rect.width / 2 + offsetX;
      right = 'auto';
      top = rect.y + (offsetY || 0) + rect.height;
      bottom = 'auto';
      break;
    case 'bottom_left':
      left = rect.x + offsetX;
      right = 'auto';
      top = rect.y + (offsetY || 0) + rect.height;
      bottom = 'auto';
      break;
    case 'bottom_right':
      left = rect.x - contentDimensions[0] + rect.width + offsetX;
      right = 'auto';
      top = rect.y + (offsetY || 0) + rect.height;
      bottom = 'auto';
      break;
    case 'left':
      left = 'auto';
      right = windowWidth - rect.left + offsetX;
      top = rect.y + (offsetY || 0);
      bottom = 'auto';
      break;
    case 'right':
    default:
      left = rect.x + rect.width + offsetX;
      right = 'auto';
      top = rect.y + (offsetY || 0);
      bottom = 'auto';
  }

  const isLeftEdge = (Number(left) - 50) < (leftEdgeThreshold || 0);
  const rightOffset = Number(left) + (contentDimensions[0] / 2);
  const isRightEdge = (rightOffset + (rightEdgeThreshold || 0)) > windowWidth;

  if (isRightEdge) {
    left = 'auto';
    right = rightEdgePosition || 0;
  } else if (isLeftEdge) {
    left = leftEdgePosition || 0;
    right = 'auto';
  }

  let remainingHeight: number | undefined;
  if (!notReady && contentDimensions[1]) {
    if (doNotFixToBottom) {
      const nextRemainingHeight = windowHeight - (typeof top === 'number' ? top : 0) - 10;
      if (contentDimensions[1] > 200 && contentDimensions[1] > nextRemainingHeight) {
        remainingHeight = Math.max(164, nextRemainingHeight);
      }
    } else if (bottom === 'auto') {
      const contentTop = typeof top === 'number' ? top : rect.top;
      const domBottomPos = contentDimensions[1] + contentTop;
      if ((windowHeight - domBottomPos) < 10) {
        bottom = 10;
        top = 'auto';
      }
    }

    if (position === 'bottom' && !isNaN(Number(left))) {
      left = Number(left) - (contentDimensions[0] / 2);
    }
  }

  return {
    remainingHeight,
    style: { left, right, top, bottom },
  };
}

/**
 * Return the positioned style for a tooltip.
 */
export function getTooltipPosition(params: TooltipPositionParams): AbsolutePosition {
  const {
    absolute,
    leftEdgePosition,
    leftEdgeThreshold,
    offsetX,
    offsetY,
    position,
    rightEdgePosition,
    rightEdgeThreshold,
    tooltipHeight,
    tooltipWidth,
    windowHeight,
    windowWidth,
  } = params;
  const rect = params.rect || getEmptyClientRectValues();
  let left: number | string;
  let right: number | string;
  let top: number | string;
  let bottom: number | string;

  switch (position) {
    case 'top':
      left = rect.x + (rect.width / 2) - (tooltipWidth / 2);
      right = AUTO_POSITION;
      top = AUTO_POSITION;
      bottom = windowHeight - rect.y - offsetY;
      break;
    case 'bottom':
      left = rect.x + (rect.width / 2) + offsetX - (tooltipWidth / 2);
      right = AUTO_POSITION;
      top = rect.y + offsetY + rect.height;
      bottom = AUTO_POSITION;
      break;
    case 'bottom_left':
      left = rect.x + offsetX;
      right = AUTO_POSITION;
      top = rect.y + offsetY + rect.height;
      bottom = AUTO_POSITION;
      break;
    case 'bottom_right':
      left = rect.x + rect.width - tooltipWidth + offsetX;
      right = AUTO_POSITION;
      top = rect.y + offsetY + rect.height;
      bottom = AUTO_POSITION;
      break;
    case 'left':
      left = AUTO_POSITION;
      right = windowWidth - rect.left + offsetX;
      top = rect.y + offsetY;
      bottom = AUTO_POSITION;
      break;
    case 'right':
    default:
      left = rect.x + rect.width + offsetX;
      right = AUTO_POSITION;
      top = rect.y + offsetY;
      bottom = AUTO_POSITION;
  }

  ({ left, right } = getViewportClampedTooltipX({
    left,
    right,
    leftEdgePosition,
    leftEdgeThreshold,
    rightEdgePosition,
    rightEdgeThreshold,
    tooltipWidth,
    windowWidth,
  }));
  ({ bottom, top } = getViewportClampedTooltipY({
    bottom,
    top,
    tooltipHeight,
    windowHeight,
  }));

  return getAbsoluteTooltipPosition({ absolute, left, right, top, bottom });
}
