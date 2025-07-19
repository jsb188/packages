
/**
 * Types; form schema
 */

interface SchemaItemSetter {
  setter?: (currentData?: any, dataForSchema?: any) => any;
}

export interface FormItemSchemaObj {
  __type: 'group' | 'input' | 'password' | 'textarea' | 'select' | string;
  autoFocus?: boolean;
  disabled?: boolean;
  hidden?: boolean | ((dataForSchema: any) => boolean);
  locked?: boolean | ((dataForSchema: any) => boolean);
  labelClassName?: string;
  listenToInput?: boolean;
  value?: any;
  item: Record<string, any> & SchemaItemSetter;
}

interface SchemaRule {
  for: string;
  rule: (value: any, formValues: any) => boolean;
  error: any;
};

export interface FormSchemaObj {
  listData: FormItemSchemaObj[];
  rules?: SchemaRule[];
  isButtonDisabled?: (formValues: any) => boolean;
}

/**
 * Types; form items
 */

interface FormGroupType {
  id?: string;
  name: string;
  label?: string;
  value: string | number | null;
  items: Array<FormItemIfaceObj>;
}

export interface FormItemIfaceObj extends FormItemSchemaObj {
  name: string;
  preset?: string;
  className?: string;
  inputClassName?: string;
  focusStyle?: string;
  hidden?: boolean | ((dataForSchema: any) => boolean);
  locked?: boolean | ((dataForSchema: any) => boolean);
  formValues: any;
  setFormValues: (values: any) => void;
  onInput?: (e: React.FormEvent, name: string) => void;
  onKeyDown?: (e: React.KeyboardEvent, name: string) => void;
  onSubmit?: (e: React.MouseEvent, name: string) => void;
  onChange?: (e: React.ChangeEvent, name: string) => void;
}
