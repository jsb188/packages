import { getErrorMessageContent } from '@jsb188/react-web/modules/Layout';
import { Icon } from '@jsb188/react-web/svgs/Icon';
import Markdown from '@jsb188/react-web/ui/Markdown';
import { ModalContentContainer, ModalFloatingSaveButton, ModalSideNav, ModalSideNavIface } from '@jsb188/react-web/ui/ModalUI';
import { TableListMockClient } from '@jsb188/react-web/ui/TableListUI';
import type { ModalHandlerProps, OpenModalPopUpFn } from '@jsb188/react/states';
import { useClosePopOver, useKeyDown } from '@jsb188/react/states';
import { useEffect, useRef, useState, type ReactNode } from 'react';

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

export interface AppSettingsTableContentProps {
  notReady?: boolean;
  gridLayoutStyle: string;
  children?: ReactNode;
  error?: any;
}

/**
 * App settings table content helper with a built-in loading table state
 */

export function AppSettingsTableContent(p: AppSettingsTableContentProps) {
  const { notReady, gridLayoutStyle, children, error } = p;

  if (notReady) {
    if (error) {
      const errObj = getErrorMessageContent(error);
      return <div className='h_item gap_df'>
        <div className='bd_2 bd_lt w_80 h_80 v_center r_df ic_lg ft_md rel pattern_texture medium_bf of'>
          <span className='rel'>
            <Icon
              tryColor
              name={errObj.titleIconName}
              backupName='alert-circle'
            />
          </span>
        </div>

        <div className='lh_2'>
          <div className='ft_medium ft_df mt_1 mb_4'>
            {errObj.title}
          </div>
          <Markdown
            as='p'
            preset='article'
            className='ft_sm cl_lt'
          >
            {errObj.message}
          </Markdown>
        </div>
      </div>;
    }

    return <TableListMockClient
      removeHorizontalPadding
      removeAvatarElement
      isSmallerRows
      removeBorderLine
      gridLayoutStyle={gridLayoutStyle}
    />;
  }

  return children;
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
  const closePopOver = useClosePopOver();
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    // Listen to scroll events inside scrollAreaRef

    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) {
      return;
    }

    const onScroll = () => {
      // Close pop over on scroll
      closePopOver();
    };

    scrollArea.addEventListener('scroll', onScroll);

    return () => {
      scrollArea.removeEventListener('scroll', onScroll);
    };
  }, [closePopOver]);

  return (
    <div className='cw md h_top f rel of'>
      <ModalSideNav
        selectedValue={controller.switchCase}
        options={options}
        onClickItem={onClickNavItem}
      />

      <ModalContentContainer
        ref={scrollAreaRef}
        addFooterPadding
        addYOverflow
      >
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
