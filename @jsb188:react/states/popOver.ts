import {
  ClosePopOverFn,
  CloseTooltipFn,
  OpenPopOverFn,
  OpenTooltipFn,
  PopOverGlobalStateParams,
  PopOverProps,
  SetPopOverStateFn,
  TooltipHookProps,
  TooltipProps,
  UpdatePopOverFn,
  UpdatePopOverParams,
  UpdateTooltipFn
} from '@jsb188/react/types/PopOver.d';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback } from 'react';

/**
 * Pop over class
 */

class PopOver {
  readonly name: string = 'pop_over_state';
  readonly state = atom<PopOverProps | null>(null);
  public lastOpenId: string | null = null;

  open(data: PopOverProps): PopOverProps | null {
    // console.log('::::: OPEN', data);
    if (!data?.name) {
      return null;
    }

    this.lastOpenId = data?.id || data?.name;
    return data;
  }

  update(data: UpdatePopOverParams, prev: PopOverProps | null): PopOverProps | null {
    const { name, ...variables } = data;
    const nextName = name || prev?.name
    if (!nextName) {
      return null;
    }

    this.lastOpenId = prev?.id || nextName;
    return {
      ...prev,
      name: nextName,
      variables,
    };
  }

  close(prev: PopOverProps | null): PopOverProps | null {
    // console.log('::::: CLOSE', this.lastOpenId, prev?.id);
    if (
      !prev || !prev.animationClassName ||
      !this.lastOpenId
      // || prev.id !== this.lastOpenId
    ) {
      return null;
    }

    let nextAnimClassName = prev.animationClassName || '';
    if (/\bon_mount\b/.test(nextAnimClassName)) {
      nextAnimClassName = nextAnimClassName.replace(/\bon_mount\b/, '').trim();
    } else if (!/\breverse\b/.test(nextAnimClassName)) {
      nextAnimClassName += ' reverse';
    } else {
      this.lastOpenId = null;
      return null;
    }

    return {
      ...prev,
      closing: true,
      animationClassName: nextAnimClassName,
    };
  }

  setGlobalState(globalState: PopOverGlobalStateParams | null, prev: PopOverProps | null): PopOverProps | null {
    if (!prev) {
      return null;
    }

    return {
      ...prev,
      globalState: !globalState ? null : {
        id: prev.id,
        ...globalState
      },
    };
  }
}

/**
 * Tooltip class
 */

class Tooltip {
  readonly name: string = 'tooltip_state';
  readonly state = atom<TooltipProps | null>(null);

  open(data: TooltipProps): TooltipProps | null {
    if (!data?.id) {
      return null;
    }
    return data;
  }

  update(data: TooltipProps, prev: TooltipProps | null): TooltipProps | null {
    if (!data || !prev) {
      return null;
    }
    return {
      ...prev,
      ...data,
    };
  }

  close(): TooltipProps | null {
    return null;
  }
}

const popOverClass = new PopOver();
const tooltipClass = new Tooltip();

/**
 * Hover state for pop overs
 */

const popOverIsHoverState = atom(false);

export function usePopOverIsHover() {
  return useAtomValue(popOverIsHoverState);
}

export function useSetPopOverIsHover() {
  return useSetAtom(popOverIsHoverState);
}

/**
 * Create handlers functions for pop overs
 */

function composeOpenPopOverFn( setPopOver: (value: PopOverProps | null) => void): OpenPopOverFn {
  return (data: PopOverProps) => {
    const nextPopOverState = popOverClass.open(data);
    if (nextPopOverState) {
      setPopOver(nextPopOverState);
    } else {
      console.warn('Invalid {popOver} data for open():', data);
    }
  };
}

function composeClosePopOverFn(
  setPopOver: (value: PopOverProps | null) => void,
  setPopOverIsHover: (update: boolean | ((prev: boolean) => boolean)) => void,
  popOver: PopOverProps | null
): ClosePopOverFn {
  return (dismissIfName?: string) => {
    if (!popOver || (typeof dismissIfName === 'string' && popOver.name !== dismissIfName)) {
      return;
    }
    setPopOverIsHover(false);
    setPopOver(popOverClass.close(popOver));
  };
}

function composeUpdatePopOverFn( setPopOver: (value: PopOverProps | null) => void): UpdatePopOverFn {
  return (data: UpdatePopOverParams) => {
    setPopOver((prev: PopOverProps | null) => {
      const nextPopOverState = popOverClass.update(data, prev);
      if (nextPopOverState) {
        return nextPopOverState;
      }
      console.warn('{popOver} data should never be null when using update():', data);
      return prev;
    });
  };
}

function composeSetPopOverState( setPopOver: (value: PopOverProps | null) => void): SetPopOverStateFn {
  return (data: PopOverGlobalStateParams | null) => {
    setPopOver((prev: PopOverProps | null) => {
      const nextPopOverState = popOverClass.setGlobalState(data, prev);
      if (nextPopOverState) {
        return nextPopOverState;
      }
      console.warn('{popOver} data should never be null when using setGlobalState():', data);
      return prev;
    });
  };
}

/**
 * Use pop over
 */

export function usePopOver() {
  const [popOver, setPopOver] = useAtom<PopOverProps | null>(popOverClass.state);
  const setPopOverIsHover = useSetAtom(popOverIsHoverState);

  const openPopOver = useCallback( composeOpenPopOverFn(setPopOver), []);
  const closePopOver = useCallback( composeClosePopOverFn(setPopOver, setPopOverIsHover, popOver), [popOver]);
  const updatePopOver = useCallback( composeUpdatePopOverFn(setPopOver), []);
  const setPopOverState = useCallback( composeSetPopOverState(setPopOver), []);

  return {
    popOver,
    openPopOver,
    closePopOver,
    updatePopOver,
    setPopOverState
  };
}

/**
 * Use pop over global state
 */

export function usePopOverState() {
  const [popOver, setPopOver] = useAtom<PopOverProps | null>(popOverClass.state);
  const setPopOverIsHover = useSetAtom(popOverIsHoverState);
  const updatePopOver = useCallback( composeUpdatePopOverFn(setPopOver), []);
  const closePopOver = useCallback( composeClosePopOverFn(setPopOver, setPopOverIsHover, popOver), [popOver]);

  return {
    popOverState: popOver?.globalState,
    closePopOver,
    updatePopOver
  };
}

/**
 * Create handlers functions for tooltips
 */

function composeOpenTooltipFn( setTooltip: (value: TooltipProps | null) => void): OpenTooltipFn {
  return (data: TooltipProps) => {
    const nextTooltipState = tooltipClass.open(data);
    if (nextTooltipState) {
      setTooltip(nextTooltipState);
    } else {
      console.warn('Invalid {tooltip} data for open():', data);
    }
  };
}

function composeCloseTooltipFn( setTooltip: (value: TooltipProps | null) => void): CloseTooltipFn {
  return (removeId?: string) => {
    if (!removeId) {
      return;
    }

    // @ts-expect-error - I couldn't get rid of this type error
    setTooltip((prev: TooltipProps | null) => {
      if (prev?.id !== removeId) {
        return prev;
      }
      return tooltipClass.close();
    });
  };
}

function composeUpdateTooltipFn( setTooltip: (value: TooltipProps | null) => void): UpdateTooltipFn {
  return (data: TooltipProps) => {
    // @ts-expect-error - I couldn't get rid of this type error
    setTooltip((prev: TooltipProps | null) => {
      const nextTooltipState = tooltipClass.update(data, prev);
      if (nextTooltipState) {
        return nextTooltipState;
      } else if (data && prev) {
        console.warn('Invalid {tooltip} data for update():', data);
      }
      return prev;
    });
  };
}

/**
 * Use tooltip
 */

export function useTooltip(): TooltipHookProps {
  const [tooltip, setTooltip] = useAtom<TooltipProps | null>(tooltipClass.state);

  const openTooltip = useCallback( composeOpenTooltipFn(setTooltip), []);
  const closeTooltip = useCallback( composeCloseTooltipFn(setTooltip), []);
  const updateTooltip = useCallback( composeUpdateTooltipFn(setTooltip), []);

  return {
    tooltip,
    openTooltip,
    closeTooltip,
    updateTooltip,
  };
}
