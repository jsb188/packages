import i18n from '@jsb188/app/i18n/index.ts';
import type { FormSchemaObj, FormValueSetter } from '@jsb188/app/types/form.d.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { FormItem } from '@jsb188/react-web/modules/Form';
import { type ButtonPresetEnum, FullWidthButton } from '@jsb188/react-web/ui/Button';
import { StickyFooterArea } from '@jsb188/react-web/ui/ListUI';
import { formValuesAreDiff } from '@jsb188/react/hooks';
import { makeFormValues, useSchema } from '@jsb188/react/schema';
import { FormEventHandler, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

/**
 * Types
 */

type SetFormValuesFunc = FormValueSetter<any>;

type HTTPMethodEnums = 'get' | 'post' | 'put' | 'delete';

interface SchemaFormProps {
  httpMethod?: HTTPMethodEnums;
  doNotPostForm?: boolean | ((formValues: any) => boolean);
  className?: string;
  labelClassName?: string;
  buttonClassName?: string;
  buttonPreset?: ButtonPresetEnum;
  buttonFullWidth?: boolean;
  buttonText?: string;
  name?: string;
  schema: FormSchemaObj;
  dataForSchema?: any;
  currentData?: any;
  saveCounter?: number;
  autoComplete?: boolean;
  saving?: boolean;
	notAllowed?: boolean; // This disables the entire form and puts a cursor: not-allowed on it
  disabled?: boolean;
  disabledButton?: boolean;
  hideButton?: boolean;
  stickyFooter?: boolean;
  onError?: (error: any) => void;
  onSubmit: (formValues: any, currentData: any, setFormValues: SetFormValuesFunc) => any; // Return "true" to post form; async mutation payloads are also allowed
  onFormValuesChange?: (formValues: any, currentValues: any, setFormValues: SetFormValuesFunc) => void;
  onChangeDiff?: (diff?: boolean, saving?: boolean, fv?: any) => void;
  actionUrl?: string;
  children?: React.ReactNode;
  FooterComponent?: React.ReactNode;
}

export interface SchemaFormRef<TFormValues = any> {
  reset: () => void;
  getFormValues: () => TFormValues;
  updateFormValues: (fn: (prev: TFormValues) => TFormValues) => void;
}

/**
 * Schema form
 */

const SchemaForm = forwardRef((p: SchemaFormProps, ref: React.ForwardedRef<SchemaFormRef>) => {
  const {
    className,
    labelClassName,
    buttonFullWidth,
    name,
    schema,
    dataForSchema,
    currentData,
    saveCounter,
    onError,
    onSubmit,
    onFormValuesChange,
    onChangeDiff,
    doNotPostForm,
    actionUrl,
    httpMethod,
    saving,
    disabled: disabled_,
    notAllowed,
    children,
    FooterComponent,
    hideButton,
    stickyFooter,
    buttonClassName,
  } = p;

  const disabled = disabled_ || notAllowed;
  const formRef = useRef<HTMLFormElement>(null);
  const autoComplete = p.autoComplete || true;
  const buttonPreset = p.buttonPreset || 'bg_primary';
  const buttonText = p.buttonText || i18n.t('form.continue');
  const lastSavedFormValuesRef = useRef<any>(null);

  const { formValues, setFormValues, listData, validate, isButtonDisabled } = useSchema(
    schema,
    dataForSchema,
    currentData,
  );

  /**
   * Resolve the baseline values used for diff checks.
   */

  const getDiffBaselineValues = () => {
    return lastSavedFormValuesRef.current || makeFormValues(schema, dataForSchema, currentData);
  };

  /**
   * Persist the latest saved form values as the new local baseline.
   */

  const setDiffBaselineValues = (nextFormValues: any) => {
    lastSavedFormValuesRef.current = JSON.parse(JSON.stringify(nextFormValues || {}));
  };

  // Imperative handle

  useImperativeHandle(ref, () => ({
    reset: () => setFormValues(makeFormValues(schema, dataForSchema, currentData)),
    getFormValues: () => formValues,
    updateFormValues: (fn: (prev: any) => any) => setFormValues((fv: any) => fn(fv)),
  }), [formValues, setFormValues]);

  // Error handler

  const handleError = () => {
    const error = validate?.();
    if (error) {
      if (onError) {
        onError(error);
      } else {
        console.warn('SchemaForm error:');
        console.warn(error);
      }
      return true;
    }
    return false;
  };

  // Form handlers

  const listenToInput = typeof isButtonDisabled === 'function';
  const disabledButton = useMemo(() => {
    if (disabled || p.disabledButton) {
      return true;
    } else if (listenToInput) {
      return isButtonDisabled(formValues);
    }
    return false;
  }, [disabled, listenToInput && formValues]);

  useEffect(() => {
    const currentDataObj = getDiffBaselineValues();
    if (onChangeDiff) {
      onChangeDiff(formValuesAreDiff(formValues, currentDataObj), saving, formValues);
    }
    if (onFormValuesChange) {
      onFormValuesChange(formValues, currentDataObj, setFormValues);
    }
  }, [formValues]);

  useEffect(() => {
    if (!saving && onChangeDiff) {
      const currentDataObj = getDiffBaselineValues();
      onChangeDiff(formValuesAreDiff(formValues, currentDataObj), saving, formValues);
    }
  }, [saving]);

  useEffect(() => {
    if (!saving && Number(saveCounter) > 0) {
      const errored = handleError();
      if (!errored) {
        const currentDataObj = getDiffBaselineValues();
        const hasDiff = formValuesAreDiff(formValues, currentDataObj);

        if (hasDiff) {
          Promise.resolve(onSubmit(formValues, currentData, setFormValues))
            .then((result) => {
              const hasSubmitError = !!(
                result === false ||
                (
                  result &&
                  typeof result === 'object' &&
                  'error' in result &&
                  (result as any).error
                )
              );
              if (hasSubmitError) {
                return;
              }

              setDiffBaselineValues(formValues);
              onChangeDiff?.(false, saving, formValues);
            })
            .catch(() => null);
        }
      }
    }
  }, [saveCounter]);

  const onChangeFormItem = (
    handler?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, formValues: any, setFormValues: SetFormValuesFunc) => void
  ) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, _inputName?: string) => {
      if (handler) {
        handler(e, formValues, setFormValues);
      }

      // This is done inside FVInput composer, so there's no need to do this here
      // (this update will become void and nothing will happen)
      // if (formValues.__errorFields?.includes(inputName)) {
      //   // If the input is in the error fields, remove it
      //   const newErrorFields = formValues.__errorFields.filter((f: string) => f !== inputName);
      //   setFormValues((fv: any) => ({
      //     ...fv,
      //     __errorFields: newErrorFields,
      //   }));
      // }
    };
  };

  const onClickButton = async(e: React.MouseEvent) => {
    if (!actionUrl || saving || disabled) {
      e.preventDefault();

      if (saving || disabled) {
        // Only allow if not saving and not disabled
        return;
      }
    }

    const errored = handleError();
    if (!errored && onSubmit) {
      const shouldPostForm = await onSubmit(formValues, currentData, setFormValues);
      if (shouldPostForm === true) {
        formRef.current?.submit();
      }
    }
  };

  let onSubmitForm: FormEventHandler<HTMLFormElement> | undefined;
  if (
    !actionUrl ||
    doNotPostForm === true ||
    (typeof doNotPostForm === 'function' && doNotPostForm(formValues))
  ) {
    onSubmitForm = (e: any) => {
      e.preventDefault();
    };
  }

  return (
    <form
      ref={formRef}
      method={httpMethod || (actionUrl ? 'post' : 'get')}
      action={actionUrl}
      className={cn('schema_form', notAllowed && 'form_not_allowed', className)}
      name={name || 'schema_form'}
      autoComplete={autoComplete ? 'on' : 'off'}
      onSubmit={onSubmitForm}
    >
      {children}

      {listData.map((schemaItem: any, i) => (
        <FormItem
          key={i}
          {...schemaItem}
          disabled={disabled}
          labelClassName={labelClassName}
          formValues={formValues}
          setFormValues={setFormValues}
          listenToInput={listenToInput}
          onSubmit={onClickButton}
          onChange={onChangeFormItem(schemaItem.item?.onChange)}
        />
      ))}

      {FooterComponent}

      {hideButton ? null : (
        <StickyFooterArea sticky={!!stickyFooter}>
          <FullWidthButton
            className={cn(buttonClassName || 'mt_sm', !disabledButton && 'shadow')}
            disabled={disabledButton}
            loading={saving}
            preset={buttonPreset}
            fullWidth={buttonFullWidth}
            onClick={onClickButton}
          >
            {buttonText}
          </FullWidthButton>
        </StickyFooterArea>
      )}
    </form>
  );
});

SchemaForm.displayName = 'SchemaForm';

export default SchemaForm;
