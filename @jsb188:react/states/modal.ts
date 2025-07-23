import i18n from '@jsb188/app/i18n';
import type { ServerErrorObj } from '@jsb188/app/types/app.d';
import { atom, useAtom, useSetAtom } from 'jotai';
import { useCallback } from 'react';

/**
 * Types
 */

interface ModalRequestParams {
  name: string;
  preset?: string;
  props?: Record<string, any>;
}

export interface ModalProps {
  name: string;
  preset: string | null;
  [key: string]: any;
}

type ModalPropsFn = (prev: ModalProps | null) => ModalProps | null;

export type OpenModalScreenFn = (data: ModalRequestParams) => void;

export type OpenModalPopUpFn = (data: ModalRequestParams | null, err?: ServerErrorObj) => void;

export interface ModalScreenProps {
  screen: ModalProps | null;
  openModalScreen: OpenModalScreenFn;
  closeModalScreen: () => void;
}

export interface ModalPopUpProps {
  popUp: ModalProps | null;
  openModalPopUp: OpenModalPopUpFn;
  closeModalPopUp: () => void;
}

export interface ModalHandlerProps {
  openModalScreen: OpenModalScreenFn;
  openModalPopUp: OpenModalPopUpFn;
  closeModalScreen: () => void;
  closeModalPopUp: () => void;
}

export interface ModalHookProps extends ModalScreenProps, ModalPopUpProps {}

/**
 * Default values
 * NOTE: i18n() isn't ready yet, so I have to provide the key here and use i18n.t(..) in the logic function
 */

export const POPUP_DEFAULT_VALUES = {
  app_error: {
    iconName: 'file-broken',
    title: 'error.app_error_title',
    message: 'error.app_error',
  },
  chat_not_live_feature: {
    iconName: 'message-cancel',
    title: 'chat.is_offline',
    message: 'chat.must_be_live_feature',
  },
  not_verified_email: {
    iconName: 'mailbox',
    title: 'auth.check_email',
    message: 'auth.not_verified_yet',
  },
  not_allowed_permission: {
    iconName: 'lock',
    title: 'error.not_allowed',
    message: 'error.not_allowed_perms',
  },
  network_error: {
    iconName: 'wifi-off',
    title: 'error.network_error_title',
    message: 'error.network_error',
  },
  external_link: {
    iconName: 'outbound',
    title: 'app.leaving_app',
    message: 'app.leaving_app_desc',
    confirmText: 'app.link_yes',
  },
  '20020': {
    // Not allowed in chat
    iconName: 'lock-square-rounded-filled',
  },
  '20021': {
    iconName: 'mood-sad-dizzy',
  },
  '10000': {
    preset: 'force_reload',
    iconName: 'confetti',
  },
  '10012': {
    preset: 'force_reload',
    title: 'error.login_changed',
    iconName: 'user-question',
  },
} as Record<string, Record<string, string>>;

/**
 * Modal screen class
 */

class ModalScreen {
  readonly name: string;
  readonly state = atom<ModalProps | null>(null);
  readonly defaultValues?: Record<string, any>;

  constructor(name: string, defaultValues?: Record<string, any>) {
    this.name = `modal_${name}_state`;
    if (defaultValues) {
      this.defaultValues = defaultValues;
    }
  }

  open(data: ModalRequestParams): ModalProps | null {
    if (data) {
      const { name, props } = data;
      const values = this.defaultValues?.[name ?? ''];

      return {
        name,
        ...values,
        ...props,
      };
    }

    return null;
  }

  close() {
    return null;
  }
}

/**
 * Modal popup class
 */

class ModalPopUp extends ModalScreen {
  readonly name: string = 'modal_popup_state';

  open(data: ModalRequestParams | null, error?: ServerErrorObj): ModalProps | null {
    if (data) {
      const { preset, name, props } = data;
      const values = this.defaultValues?.[name ?? ''];

      let updatedAlertValue: ModalProps = {
        // Template values
        name,
        preset: preset || 'normal',
        // Alert props
        id: `alert-${name || 'normal'}`,
        iconName: null,
        title: '',
        message: '',
      };

      if (values?.iconName) {
        updatedAlertValue.iconName = values.iconName;
      }

      // NOTE: i18n() isn't ready yet, so I have to use i18n.t(..) in the logic
      ['title', 'message', 'confirmText', 'cancelText'].forEach((key) => {
        if (values?.[key]) {
          updatedAlertValue[key] = i18n.t(values[key]);
        } else if (key === 'message' && i18n.has(`error.${name}`)) {
          updatedAlertValue[key] = i18n.t(`error.${name}`);
        } else if (i18n.has(`error.${name}_${key}`)) {
          updatedAlertValue[key] = i18n.t(`error.${name}_${key}`);
        }
      });

      if (values?.preset) {
        updatedAlertValue.preset = values.preset;
      }

      if (props) {
        updatedAlertValue = {
          ...updatedAlertValue,
          ...props,
        };
      }

      if (!updatedAlertValue.title && !isNaN(Number(name))) {
        updatedAlertValue.title = i18n.t('error.error');
      }

      return updatedAlertValue;

    } else if (error) {
      const { errorCode } = error;
      const { iconName: defIconName, title: defTitle, message: defMessage, ...values } = this.defaultValues?.[errorCode ?? ''] || {};

      return {
        // Template values
        name: 'ERROR',
        preset: 'normal',
        // Alert props
        id: `gql-${errorCode}`,
        iconName: error.iconName || defIconName,
        title: error.title || defTitle || i18n.t('error.error'),
        message: error.message || defMessage || i18n.t('error.unknown_error'),
        ...values,
      };
    }

    return null;
  }

  close() {
    return null;
  }
}

/**
 * Create states
 */

const screenClass = new ModalScreen('screen');
const popUpClass = new ModalPopUp('popup', POPUP_DEFAULT_VALUES);

/**
 * Create handler functions
 */

function composeOpenModalScreenFn(
  setScreen: (value: ModalProps | null) => void,
  prevScreen: ModalProps | null
) {
  return (data: ModalRequestParams | ModalPropsFn) => {
    const nextScreenState = typeof data === 'function' ? data(prevScreen) : screenClass.open(data);
    if (nextScreenState) {
      setScreen(nextScreenState);
    } else {
      console.warn('Invalid {screen} data:', data);
    }
  };
}

function composeCloseModalScreenFn(setScreen: (value: ModalProps | null) => void) {
  return () => {
    setScreen(screenClass.close());
  };
}

function composeOpenModalPopUpFn(setPopUp: (value: ModalProps | null) => void) {
  return (data: ModalRequestParams | null, err?: ServerErrorObj) => {
    const nextPopUpState = popUpClass.open(data, err);
    if (nextPopUpState) {
      setPopUp(nextPopUpState);
    } else {
      console.warn('Invalid {popUp} data:', data, err);
    }
  };
}

function composeCloseModalPopUpFn(setPopUp: (value: ModalProps | null) => void) {
  return () => {
    setPopUp(popUpClass.close());
  };
}

/**
 * Use modal screen hook
 */

export function useModalScreen(): ModalScreenProps {
  const [screen, setScreen] = useAtom(screenClass.state);
  const openModalScreen = useCallback( composeOpenModalScreenFn(setScreen, screen), [screen]);
  const closeModalScreen = useCallback( composeCloseModalScreenFn(setScreen), []);

  return {
    screen,
    openModalScreen,
    closeModalScreen,
  };
}

/**
 * Use screen open function
 */

export function useOpenModalScreen(): OpenModalScreenFn {
  const [screen, setScreen] = useAtom(screenClass.state);
  const openModalScreen = useCallback( composeOpenModalScreenFn(setScreen, screen), [screen]);

  return openModalScreen;
}

/**
 * Use modal popup hook
 */

export function useModalPopUp(): ModalPopUpProps {
  const [popUp, setPopUp] = useAtom(popUpClass.state);
  const openModalPopUp = useCallback( composeOpenModalPopUpFn(setPopUp), []);
  const closeModalPopUp = useCallback( composeCloseModalPopUpFn(setPopUp), []);

  return {
    popUp,
    openModalPopUp,
    closeModalPopUp,
  };
}

/**
 * Use modal hook handlers
 */

export function useModalHandlers(): ModalHandlerProps {
  const [screen, setScreen] = useAtom(screenClass.state);
  const setPopUp = useSetAtom(popUpClass.state);

  const openModalScreen = useCallback( composeOpenModalScreenFn(setScreen, screen), [screen]);
  const closeModalScreen = useCallback( composeCloseModalScreenFn(setScreen), []);
  const openModalPopUp = useCallback( composeOpenModalPopUpFn(setPopUp), []);
  const closeModalPopUp = useCallback( composeCloseModalPopUpFn(setPopUp), []);

  return {
    openModalScreen,
    closeModalScreen,
    openModalPopUp,
    closeModalPopUp,
  };
}

/**
 * Use popup open function
 */

export function useOpenModalPopUp(): OpenModalPopUpFn {
  const setPopUp = useSetAtom(popUpClass.state);
  const openModalPopUp = useCallback( composeOpenModalPopUpFn(setPopUp), []);

  return openModalPopUp;
}

/**
 * Use full modal hook
 */

export function useModal(): ModalHookProps {
  const screenProps = useModalScreen();
  const popUpProps = useModalPopUp();

  return {
    ...screenProps,
    ...popUpProps,
  };
}
