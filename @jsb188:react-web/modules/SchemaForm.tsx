import i18n from '@jsb188/app/i18n';
import type { FormSchemaObj } from '@jsb188/app/types/form.d';
import { cn } from '@jsb188/app/utils/string';
import { FormItem } from '@jsb188/react-web/modules/Form';
import { type ButtonPresetEnum, FullWidthButton } from '@jsb188/react-web/ui/Button';
import { StickyFooterArea } from '@jsb188/react-web/ui/ListUI';
import { formValuesAreDiff } from '@jsb188/react/hooks';
import { makeFormValues, useSchema } from '@jsb188/react/schema';
import { FormEventHandler, forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

/**
 * Types
 */

type setFormFunc = (formValues: any) => void;

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
  disabled?: boolean;
  disabledButton?: boolean;
  hideButton?: boolean;
  stickyFooter?: boolean;
  onError?: (error: any) => void;
  onSubmit: (formValues: any, currentData: any, setFormValues: setFormFunc) => boolean | void | Promise<void | boolean>; // Must return true/false which determines if form should be submitted
  onFormValuesChange?: (formValues: any, currentValues: any, setFormValues: setFormFunc) => void;
  onChangeDiff?: (diff?: boolean, saving?: boolean, fv?: any) => void;
  actionUrl?: string;
  children?: any;
  FooterComponent?: any;
}

export interface SchemaFormRef {
  reset: () => void;
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
    disabled,
    children,
    FooterComponent,
    hideButton,
    stickyFooter,
    buttonClassName,
  } = p;

  const formRef = useRef<HTMLFormElement>(null);
  const autoComplete = p.autoComplete || true;
  const buttonPreset = p.buttonPreset || 'bg_primary';
  const buttonText = p.buttonText || i18n.t('form.continue');

  const { formValues, setFormValues, listData, validate, isButtonDisabled } = useSchema(
    schema,
    dataForSchema,
    currentData,
  );

  // Imperative handle

  useImperativeHandle(ref, () => ({
    reset: () => setFormValues(makeFormValues(schema, dataForSchema, currentData)),
    updateFormValues: (fn: (prev: any) => any) => setFormValues((fv: any) => fn(fv)),
  }), [setFormValues]);

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
    const currentDataObj = makeFormValues(schema, dataForSchema, currentData);
    if (onChangeDiff) {
      onChangeDiff(formValuesAreDiff(formValues, currentDataObj), saving, formValues);
    }
    if (onFormValuesChange) {
      onFormValuesChange(formValues, currentDataObj, setFormValues);
    }
  }, [formValues]);

  useEffect(() => {
    if (!saving && onChangeDiff) {
      const currentDataObj = makeFormValues(schema, dataForSchema, currentData);
      onChangeDiff(formValuesAreDiff(formValues, currentDataObj), saving, formValues);
    }
  }, [saving]);

  useEffect(() => {
    if (!saving && Number(saveCounter) > 0) {
      const errored = handleError();
      if (!errored) {

        const currentDataObj = makeFormValues(schema, dataForSchema, currentData);
        const hasDiff = formValuesAreDiff(formValues, currentDataObj);

        if (hasDiff) {
          onSubmit(formValues, currentData, setFormValues);
        }
      }
    }
  }, [saveCounter]);

  const onChangeFormItem = (handler: any) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, inputName: any) => {
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
    }
  }

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
      className={cn('schema_form', className)}
      name={name || 'schema_form'}
      autoComplete={autoComplete ? 'on' : 'off'}
      onSubmit={onSubmitForm}
    >
      {children}

      {listData.map((schemaItem, i) => (
        <FormItem
          key={i}
          {...schemaItem}
          disabled={disabled}
          labelClassName={labelClassName}
          formValues={formValues}
          setFormValues={setFormValues}
          listenToInput={listenToInput}
          onSubmit={onClickButton}
          // @ts-expect-error - "future proofing" in case onChange is added
          onChange={onChangeFormItem(schemaItem.onChange)}
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
