import { ModalContentContainer, ModalFloatingSaveButton, ModalSideNav, ModalSideNavIface } from '@jsb188/react-web/ui/ModalUI';
import type { ModalHandlerProps, OpenModalPopUpFn } from '@jsb188/react/states';
import { useKeyDown } from '@jsb188/react/states';
import { useEffect, useState } from 'react';

/**
 * Types
 */

interface ControllerState {
  switchCase: string;
  hasChanges: boolean;
  saving: boolean;
  saveCounter: number;
  resetCounter: number;
};

export interface AppSettingsSwitchCaseProps extends ControllerState {
  onSave: () => void;
  onChangeDiff: (hasChanges?: boolean, saving?: boolean) => void;
  openModalPopUp: OpenModalPopUpFn;
}

/**
 * App settings layout
 */

export function AppSettingsLayout(p: ModalHandlerProps & {
  switchCase: string;
  SwitchCaseComponent: React.ComponentType<AppSettingsSwitchCaseProps>;
  options: ModalSideNavIface[][];
  onClickNavItem?: (value: string) => boolean | void; // If "false" is returned, it denies the switchCase change
}) {
  const { SwitchCaseComponent, openModalPopUp, options } = p;
  const [keyDown, setKeyDown] = useKeyDown();

  // const setKeyDown = (value: any) => {
  //   dispatchApp({
  //     pressed: null,
  //     alert: keyDown.alert,
  //     modal: keyDown.modal,
  //     ...value,
  //   });
  // };

  const [controller, setController] = useState<ControllerState>({
    switchCase: p.switchCase,
    hasChanges: false,
    saving: false,
    saveCounter: 0,
    resetCounter: 0,
  });

  const onClickNavItem = (value: any) => {
    const handlerValue = p.onClickNavItem?.(value);
    if (handlerValue !== false) {
      setController({
        switchCase: value,
        hasChanges: false,
        saving: false,
        saveCounter: 0,
        resetCounter: 0,
      });
    }
  };

  const onSave = () => {
    setController({
      ...controller,
      saveCounter: controller.saveCounter + 1,
    });
  };

  const onReset = () => {
    setController({
      ...controller,
      resetCounter: controller.resetCounter + 1,
    });
  };

  const onChangeDiff = (hasChanges?: boolean, saving?: boolean) => {
    setController({
      ...controller,
      hasChanges: typeof hasChanges === 'boolean' ? hasChanges : controller.hasChanges,
      saving: typeof saving === 'boolean' ? saving : controller.saving,
    });
  };

  useEffect(() => {
    if (!keyDown.alert && keyDown.pressed === 's') {
      setKeyDown({
        pressed: null,
      });
      onSave();
    }
  }, [keyDown.pressed]);

  return (
    <div className='cw md h_top f rel of'>
      <ModalSideNav
        selectedValue={controller.switchCase}
        options={options}
        onClickItem={onClickNavItem}
      />

      <ModalContentContainer addFooterPadding addYOverflow>
        <div className='f py_md px_lg'>
          <SwitchCaseComponent
            key={`switch_case_${controller.resetCounter}`}
            onSave={onSave}
            onChangeDiff={onChangeDiff}
            openModalPopUp={openModalPopUp}
            {...controller}
          />
        </div>
      </ModalContentContainer>

      <ModalFloatingSaveButton
        hasChanges={controller.hasChanges}
        saving={controller.saving}
        onSave={onSave}
        onReset={onReset}
      />
    </div>
  );
}
