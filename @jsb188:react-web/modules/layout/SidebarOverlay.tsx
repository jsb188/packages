import i18n from '@jsb188/app/i18n/index.ts';
import { usePopOver, usePopOverIsHover } from '@jsb188/react/states';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type MouseEvent as ReactMouseEvent, type SetStateAction } from 'react';
import { Icon } from '../../svgs/Icon';

const SIDEBAR_EDGE_REVEAL_WIDTH = 18;
const SIDEBAR_EDGE_REVEAL_HANDLE_WIDTH = 35;
const SIDEBAR_EDGE_STRIP_DELAY_MS = 640;
const SIDEBAR_EDGE_OPEN_DELAY_MS = 2640;
const SIDEBAR_OVERLAY_ANIMATION_MS = 200;
const SIDEBAR_OVERLAY_DISMISS_DELAY_MS = 400;

export interface SidebarOverlayLayoutState {
  edgeRevealEnabled: boolean;
  handleSidebarOverlayMouseEnter: () => void;
  handleSidebarOverlayMouseLeave: () => void;
  openSidebarOverlay: () => void;
  sidebarEdgeAutoOpenEnabled: boolean;
  sidebarOverlayClosing: boolean;
  sidebarOverlayRendered: boolean;
  sidebarVisible: boolean;
}

interface SidebarEdgeRevealState {
  edgeRevealPointerY: number;
  edgeRevealVisible: boolean;
  handleClickSidebarEdgeReveal: (e: ReactMouseEvent<HTMLButtonElement>) => void;
}

/*
 * Return whether the pointer is currently inside any rendered popover.
 */
function isPointerInsideAnyPopOver() {
  return !!globalThis.document?.querySelector?.('.popover:hover');
}

/*
 * Return whether a mouse event is inside the visible browser viewport.
 */
function isMouseEventInsideViewport(event: MouseEvent) {
  return event.clientX >= 0 &&
    event.clientY >= 0 &&
    event.clientX <= globalThis.window.innerWidth &&
    event.clientY <= globalThis.window.innerHeight;
}

/*
 * Return the left-edge width where pointer movement should keep the reveal flow active.
 */
function getSidebarEdgeRevealActiveWidth(edgeRevealVisible: boolean) {
  return edgeRevealVisible ? SIDEBAR_EDGE_REVEAL_HANDLE_WIDTH : SIDEBAR_EDGE_REVEAL_WIDTH;
}

/*
 * Track left-edge pointer state and delayed reveal/open timers for the closed overlay sidebar.
 */
function useSidebarEdgeRevealState(p: {
  openSidebarOverlay: () => void;
  sidebarEdgeAutoOpenEnabled: boolean;
}): SidebarEdgeRevealState {
  const { openSidebarOverlay, sidebarEdgeAutoOpenEnabled } = p;
  const [edgeRevealVisible, setEdgeRevealVisible] = useState(false);
  const [edgeRevealPointerY, setEdgeRevealPointerY] = useState(0);
  const edgeRevealVisibleRef = useRef(false);
  const edgeRevealPointerInsideViewportRef = useRef(false);
  const latestEdgeRevealPointerYRef = useRef(0);
  const sidebarEdgeAutoOpenEnabledRef = useRef(sidebarEdgeAutoOpenEnabled);
  const openSidebarOverlayRef = useRef(openSidebarOverlay);
  const edgeStripTimerRef = useRef<number | null>(null);
  const edgeOpenTimerRef = useRef<number | null>(null);
  const edgePointerFrameRef = useRef<number | null>(null);

  /*
   * Clear pending left-edge reveal timers and animation frame updates.
   */
  const clearSidebarEdgeRevealTimers = useCallback(() => {
    if (edgeStripTimerRef.current) {
      globalThis.window.clearTimeout(edgeStripTimerRef.current);
      edgeStripTimerRef.current = null;
    }

    if (edgeOpenTimerRef.current) {
      globalThis.window.clearTimeout(edgeOpenTimerRef.current);
      edgeOpenTimerRef.current = null;
    }

    if (edgePointerFrameRef.current) {
      globalThis.window.cancelAnimationFrame(edgePointerFrameRef.current);
      edgePointerFrameRef.current = null;
    }
  }, []);

  /*
   * Schedule one pointer label position update per animation frame while the handle is visible.
   */
  const scheduleEdgeRevealPointerYUpdate = useCallback((pointerY: number) => {
    latestEdgeRevealPointerYRef.current = pointerY;

    if (!edgeRevealVisibleRef.current || edgePointerFrameRef.current) {
      return;
    }

    edgePointerFrameRef.current = globalThis.window.requestAnimationFrame(() => {
      edgePointerFrameRef.current = null;
      setEdgeRevealPointerY(latestEdgeRevealPointerYRef.current);
    });
  }, []);

  /*
   * Reset the closed-sidebar reveal strip back to the hidden/off-screen state.
   */
  const resetSidebarEdgeReveal = useCallback(() => {
    clearSidebarEdgeRevealTimers();
    edgeRevealPointerInsideViewportRef.current = false;
    edgeRevealVisibleRef.current = false;
    setEdgeRevealVisible(false);
  }, [clearSidebarEdgeRevealTimers]);

  /*
   * Reveal the left-edge handle at the latest tracked pointer position.
   */
  const showSidebarEdgeReveal = useCallback(() => {
    edgeStripTimerRef.current = null;
    edgeRevealVisibleRef.current = true;
    setEdgeRevealPointerY(latestEdgeRevealPointerYRef.current);
    setEdgeRevealVisible(true);
  }, []);

  /*
   * Keep delayed sidebar auto-open disabled while a popover is active.
   */
  useEffect(() => {
    sidebarEdgeAutoOpenEnabledRef.current = sidebarEdgeAutoOpenEnabled;

    if (!sidebarEdgeAutoOpenEnabled && edgeOpenTimerRef.current) {
      globalThis.window.clearTimeout(edgeOpenTimerRef.current);
      edgeOpenTimerRef.current = null;
    }
  }, [sidebarEdgeAutoOpenEnabled]);

  /*
   * Keep the latest route-owned open handler available to timer callbacks.
   */
  useEffect(() => {
    openSidebarOverlayRef.current = openSidebarOverlay;
  }, [openSidebarOverlay]);

  useEffect(() => {
    /*
     * Track pointer movement along the left edge to reveal and then open the sidebar.
     */
    const handleMouseMove = (event: MouseEvent) => {
      edgeRevealPointerInsideViewportRef.current = isMouseEventInsideViewport(event);

      if (!edgeRevealPointerInsideViewportRef.current) {
        resetSidebarEdgeReveal();
        return;
      }

      if (event.clientX > getSidebarEdgeRevealActiveWidth(edgeRevealVisibleRef.current)) {
        resetSidebarEdgeReveal();
        return;
      }

      scheduleEdgeRevealPointerYUpdate(event.clientY);

      if (!edgeRevealVisibleRef.current && !edgeStripTimerRef.current) {
        edgeStripTimerRef.current = globalThis.window.setTimeout(showSidebarEdgeReveal, SIDEBAR_EDGE_STRIP_DELAY_MS);
      }

      if (sidebarEdgeAutoOpenEnabledRef.current && !edgeOpenTimerRef.current) {
        edgeOpenTimerRef.current = globalThis.window.setTimeout(() => {
          edgeOpenTimerRef.current = null;

          if (sidebarEdgeAutoOpenEnabledRef.current && edgeRevealPointerInsideViewportRef.current) {
            openSidebarOverlayRef.current();
          }
        }, SIDEBAR_EDGE_OPEN_DELAY_MS);
      }
    };

    /*
     * Cancel pending edge reveal work when the pointer exits the browser viewport.
     */
    const handleWindowMouseOut = (event: MouseEvent) => {
      if (!event.relatedTarget) {
        resetSidebarEdgeReveal();
      }
    };

    /*
     * Cancel pending edge reveal work when the page stops receiving pointer context.
     */
    const handleViewportExit = () => {
      resetSidebarEdgeReveal();
    };

    /*
     * Cancel pending edge reveal work when the document is hidden.
     */
    const handleDocumentVisibilityChange = () => {
      if (globalThis.document.hidden) {
        resetSidebarEdgeReveal();
      }
    };

    const documentElement = globalThis.document.documentElement;

    globalThis.window.addEventListener('mousemove', handleMouseMove);
    globalThis.window.addEventListener('mouseout', handleWindowMouseOut);
    globalThis.window.addEventListener('blur', handleViewportExit);
    globalThis.window.addEventListener('pagehide', handleViewportExit);
    globalThis.document.addEventListener('visibilitychange', handleDocumentVisibilityChange);
    documentElement.addEventListener('mouseleave', handleViewportExit);

    return () => {
      globalThis.window.removeEventListener('mousemove', handleMouseMove);
      globalThis.window.removeEventListener('mouseout', handleWindowMouseOut);
      globalThis.window.removeEventListener('blur', handleViewportExit);
      globalThis.window.removeEventListener('pagehide', handleViewportExit);
      globalThis.document.removeEventListener('visibilitychange', handleDocumentVisibilityChange);
      documentElement.removeEventListener('mouseleave', handleViewportExit);
      clearSidebarEdgeRevealTimers();
    };
  }, [
    clearSidebarEdgeRevealTimers,
    resetSidebarEdgeReveal,
    scheduleEdgeRevealPointerYUpdate,
    showSidebarEdgeReveal,
  ]);

  /*
   * Open the overlay sidebar from a direct click on the revealed edge handle.
   */
  const handleClickSidebarEdgeReveal = useCallback((e: ReactMouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    openSidebarOverlay();
  }, [openSidebarOverlay]);

  return {
    edgeRevealPointerY,
    edgeRevealVisible,
    handleClickSidebarEdgeReveal,
  };
}

/*
 * Render and manage the left-edge sidebar reveal strip and its mouse-following label.
 */
export const SidebarEdgeReveal = memo(function SidebarEdgeReveal(p: {
  sidebarEdgeAutoOpenEnabled: boolean;
  openSidebarOverlay: () => void;
}) {
  const { openSidebarOverlay, sidebarEdgeAutoOpenEnabled } = p;
  const {
    edgeRevealPointerY,
    edgeRevealVisible,
    handleClickSidebarEdgeReveal,
  } = useSidebarEdgeRevealState({
    openSidebarOverlay,
    sidebarEdgeAutoOpenEnabled,
  });

  const edgeRevealStyle = useMemo<CSSProperties>(() => ({
    border: 0,
    height: '100vh',
    left: edgeRevealVisible ? 0 : -SIDEBAR_EDGE_REVEAL_WIDTH,
    transition: 'left ease .2s',
    width: edgeRevealVisible ? SIDEBAR_EDGE_REVEAL_HANDLE_WIDTH : SIDEBAR_EDGE_REVEAL_WIDTH,
  }), [edgeRevealVisible]);

  const edgeRevealTooltipStyle = useMemo<CSSProperties>(() => ({
    left: 0,
    pointerEvents: 'none',
    position: 'absolute',
    top: edgeRevealPointerY,
    transform: 'translateY(-50%)',
    whiteSpace: 'nowrap',
  }), [edgeRevealPointerY]);

  return <button
    type='button'
    aria-label={i18n.t('app.open_sidebar')}
    className='app_sidebar_edge_reveal fixed_l pointer z6 p_n'
    style={edgeRevealStyle}
    onClick={handleClickSidebarEdgeReveal}
  >
    {edgeRevealVisible
    ? <div
      className='bg shadow_light of w_35 h_70 rr ic_df'
      style={edgeRevealTooltipStyle}
    >
      <div className='h_center w_35 h_70 bg_main_fd cl_darker_2'>
        <Icon name='chevron-right' />
      </div>
    </div>
    : null}
  </button>;
});

SidebarEdgeReveal.displayName = 'SidebarEdgeReveal';

/*
 * Manage overlay sidebar reveal, close animation, and auto-dismiss timers.
 */
export function useSidebarOverlayLayout(p: {
  open: boolean;
  sidebarOverlayOpen: boolean;
  setSidebarOverlayOpen?: Dispatch<SetStateAction<boolean>>;
}): SidebarOverlayLayoutState {
  const {
    open,
    sidebarOverlayOpen,
    setSidebarOverlayOpen,
  } = p;
  const [sidebarOverlayRendered, setSidebarOverlayRendered] = useState(!!setSidebarOverlayOpen && sidebarOverlayOpen);
  const [sidebarOverlayClosing, setSidebarOverlayClosing] = useState(false);
  const sidebarOverlayDismissTimerRef = useRef<number | null>(null);
  const sidebarPointerInsideRef = useRef(false);
  const sidebarPointerLeftRef = useRef(false);
  const popOverIsHoverRef = useRef(false);
  const openRef = useRef(open);
  const sidebarOverlayOpenRef = useRef(sidebarOverlayOpen);
  const setSidebarOverlayOpenRef = useRef(setSidebarOverlayOpen);
  const popOverIsHover = usePopOverIsHover();
  const { popOver } = usePopOver();
  const popOverActive = !!popOver;
  const sidebarOverlayEnabled = !!setSidebarOverlayOpen;
  const sidebarVisible = open || sidebarOverlayRendered;
  const edgeRevealEnabled = sidebarOverlayEnabled && !open && !sidebarOverlayRendered;
  const sidebarEdgeAutoOpenEnabled = !popOverActive;

  openRef.current = open;
  sidebarOverlayOpenRef.current = sidebarOverlayOpen;
  setSidebarOverlayOpenRef.current = setSidebarOverlayOpen;

  /*
   * Return whether the overlay sidebar can currently be auto-dismissed.
   */
  const canDismissSidebarOverlay = useCallback(() => {
    return !!setSidebarOverlayOpenRef.current && sidebarOverlayOpenRef.current && !openRef.current;
  }, []);

  /*
   * Clear the pending overlay sidebar auto-dismiss timer.
   */
  const clearSidebarOverlayDismissTimer = useCallback(() => {
    if (sidebarOverlayDismissTimerRef.current) {
      globalThis.window.clearTimeout(sidebarOverlayDismissTimerRef.current);
      sidebarOverlayDismissTimerRef.current = null;
    }
  }, []);

  /*
   * Open the overlay sidebar through the route-owned sidebar state.
   */
  const openSidebarOverlay = useCallback(() => {
    setSidebarOverlayOpenRef.current?.(true);
  }, []);

  /*
   * Start the overlay sidebar auto-dismiss timer once the pointer leaves it.
   */
  const startSidebarOverlayDismissTimer = useCallback(() => {
    if (!canDismissSidebarOverlay()) {
      return;
    }

    clearSidebarOverlayDismissTimer();

    sidebarOverlayDismissTimerRef.current = globalThis.window.setTimeout(() => {
      sidebarOverlayDismissTimerRef.current = null;

      if (!canDismissSidebarOverlay()) {
        return;
      }

      if (popOverIsHoverRef.current || isPointerInsideAnyPopOver()) {
        startSidebarOverlayDismissTimer();
        return;
      }

      setSidebarOverlayOpenRef.current?.(false);
    }, SIDEBAR_OVERLAY_DISMISS_DELAY_MS);
  }, [canDismissSidebarOverlay, clearSidebarOverlayDismissTimer]);

  /*
   * Clear the overlay sidebar dismiss state when the pointer enters it.
   */
  const handleSidebarOverlayMouseEnter = useCallback(() => {
    sidebarPointerInsideRef.current = true;
    sidebarPointerLeftRef.current = false;
    clearSidebarOverlayDismissTimer();
  }, [clearSidebarOverlayDismissTimer]);

  /*
   * Start the overlay sidebar dismiss flow when the pointer leaves it.
   */
  const handleSidebarOverlayMouseLeave = useCallback(() => {
    sidebarPointerInsideRef.current = false;
    sidebarPointerLeftRef.current = true;

    startSidebarOverlayDismissTimer();
  }, [startSidebarOverlayDismissTimer]);

  /*
   * Keep the latest popover hover state available to timer callbacks.
   */
  useEffect(() => {
    popOverIsHoverRef.current = popOverIsHover;

    if (!popOverIsHover && !sidebarPointerInsideRef.current && sidebarPointerLeftRef.current) {
      startSidebarOverlayDismissTimer();
    }
  }, [popOverIsHover, startSidebarOverlayDismissTimer]);

  useEffect(() => {
    if (!sidebarOverlayEnabled || open) {
      setSidebarOverlayRendered(false);
      setSidebarOverlayClosing(false);
      return;
    }

    if (sidebarOverlayOpen) {
      setSidebarOverlayRendered(true);
      setSidebarOverlayClosing(false);
      return;
    }

    if (!sidebarOverlayRendered) {
      return;
    }

    setSidebarOverlayClosing(true);

    const timeout = globalThis.window.setTimeout(() => {
      setSidebarOverlayClosing(false);
      setSidebarOverlayRendered(false);
    }, SIDEBAR_OVERLAY_ANIMATION_MS);

    return () => {
      globalThis.window.clearTimeout(timeout);
    };
  }, [open, sidebarOverlayEnabled, sidebarOverlayOpen, sidebarOverlayRendered]);

  useEffect(() => {
    if (open && sidebarOverlayOpen) {
      setSidebarOverlayOpen?.(false);
    }

    if (open || !sidebarOverlayOpen) {
      clearSidebarOverlayDismissTimer();
      sidebarPointerInsideRef.current = false;
      sidebarPointerLeftRef.current = false;
    }
  }, [clearSidebarOverlayDismissTimer, open, setSidebarOverlayOpen, sidebarOverlayOpen]);

  useEffect(() => {
    return () => {
      clearSidebarOverlayDismissTimer();
    };
  }, [clearSidebarOverlayDismissTimer]);

  return {
    edgeRevealEnabled,
    handleSidebarOverlayMouseEnter,
    handleSidebarOverlayMouseLeave,
    openSidebarOverlay,
    sidebarEdgeAutoOpenEnabled,
    sidebarOverlayClosing,
    sidebarOverlayRendered,
    sidebarVisible,
  };
}
