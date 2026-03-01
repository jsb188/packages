
/**
 * Types; form schema
 */

export type FormValuesObj = {
  [key: string]: any;
  __errorFields?: string[];
};

export type FormValueSetter<TFormValues extends FormValuesObj = any> = (
  values: TFormValues | ((prev: TFormValues) => TFormValues)
) => void;

export type FormItemType =
  | 'subtitle'
  | 'break'
  | 'group'
  | 'input'
  | 'section_title'
  | 'input_click'
  | 'input_w_button'
  | 'input_time_from_date'
  | 'password'
  | 'textarea'
  | 'none'
  | (string & {});

interface SchemaItemAny<TCurrentData = any, TDataForSchema = any> {
  [key: string]: any;
  __typename?: string;
  setter?: (currentData?: TCurrentData, dataForSchema?: TDataForSchema) => any;
}

export interface FormItemSchemaObj<TCurrentData = any, TDataForSchema = any> {
  __type: FormItemType;
  autoFocus?: boolean;
  disabled?: boolean;
  hidden?: boolean | ((dataForSchema: TDataForSchema) => boolean);
  locked?: boolean | ((dataForSchema: TDataForSchema) => boolean);
  labelClassName?: string;
  listenToInput?: boolean;
  value?: any;
  item: SchemaItemAny<TCurrentData, TDataForSchema>;
}

interface SchemaRule<TFormValues extends FormValuesObj = any> {
  for: string;
  rule: (value: any, formValues: TFormValues) => boolean;
  error: any;
};

export interface FormSchemaObj<
  TFormValues extends FormValuesObj = any,
  TCurrentData = any,
  TDataForSchema = any,
> {
  listData: FormItemSchemaObj<TCurrentData, TDataForSchema>[];
  rules?: SchemaRule<TFormValues>[];
  isButtonDisabled?: (formValues: TFormValues) => boolean;
}

/**
 * Types; form items
 */

interface FormGroupType<
  TFormValues extends FormValuesObj = any,
  TCurrentData = any,
  TDataForSchema = any,
> {
  id?: string;
  name: string;
  label?: string;
  value: string | number | null;
  items: Array<FormItemIfaceObj<TFormValues, TCurrentData, TDataForSchema>>;
}

export interface FormItemIfaceObj<
  TFormValues extends FormValuesObj = any,
  TCurrentData = any,
  TDataForSchema = any,
> extends FormItemSchemaObj<TCurrentData, TDataForSchema> {
  name: string;
  preset?: string;
  className?: string;
  inputClassName?: string;
  focusStyle?: string;
  hidden?: boolean | ((dataForSchema: TDataForSchema) => boolean);
  locked?: boolean | ((dataForSchema: TDataForSchema) => boolean);
  formValues: TFormValues;
  setFormValues: FormValueSetter<TFormValues>;
  onInput?: (e: React.FormEvent, name: string) => void;
  onKeyDown?: (e: React.KeyboardEvent, name: string) => void;
  onSubmit?: (e: React.MouseEvent, name: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, name: string) => void;
}
