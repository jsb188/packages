import { useState } from 'react';
import i18n from '@jsb188/app/i18n/index.ts';
import type { FormItemSchemaObj, FormSchemaObj } from '@jsb188/app/types/form.d.ts';
import { getObject, setObject } from '@jsb188/app/utils/object.ts';

/**
 * Types
 */

interface ComputedSchema {
  formValues: any;
  setFormValues: (formValues: any) => void;
  listData: (FormItemSchemaObj & { name: string })[];
  validate?: () => any;
  isButtonDisabled?: (formValues: any) => boolean;
}

/**
 * Make form values from current form values, current data, and schema
 */

export function makeFormValues(
  schema: any,
  dataForSchema?: any,
  currentData?: any,
) {
  const newFormValues: Record<string, any> = {};
  const { listData } = schema;

  for (const obj of listData) {
    const { item: { name, setter, items } } = obj;

    if (currentData || dataForSchema) {
      if (Array.isArray(items)) {
        items.forEach(({ item: subItem }: any) => {
          if (typeof subItem.setter === 'function') {
            setObject(newFormValues, subItem.name, subItem.setter(
              currentData,
              dataForSchema,
            ));
          } else if (currentData) {
            setObject(newFormValues, subItem.name, getObject(currentData, subItem.name));
          }
        });
      } else if (typeof setter === 'function') {
        setObject(newFormValues, name, setter(currentData, dataForSchema));
      } else if (currentData) {
        setObject(newFormValues, name, getObject(currentData, name));
      }
    }
  }

  return newFormValues;
}

/**
 * Resolve schema using data
 */

export function useSchema(
  schema: FormSchemaObj,
  dataForSchema: any,
  currentData?: any,
): ComputedSchema {
  const { listData, rules, isButtonDisabled } = schema;
  const [formValues, setFormValues] = useState(makeFormValues(schema, dataForSchema, currentData));

  // Make listData from schema

  const computedListData: any[] = listData.map((schemaItem: FormItemSchemaObj) => {
    const { __type, hidden, locked, item } = schemaItem;
    if (
      hidden === true ||
      (typeof hidden === 'function' && hidden(dataForSchema))
    ) {
      return null;
    }

    let lockedValue;
    if (typeof locked === 'function') {
      lockedValue = locked(dataForSchema);
    } else if (typeof locked === 'boolean') {
      lockedValue = locked;
    }

    const computedItem: Record<string, any> = { ...item };
    if (computedItem) {
      for (const key in computedItem) {
        if (
          typeof computedItem[key] === 'function' &&
          !key.startsWith('onClick') &&
          !['getter', 'setter'].includes(key)
        ) {
          computedItem[key] = computedItem[key](dataForSchema);
        }
      }
    }

    return {
      __type,
      locked: lockedValue,
      item: computedItem,
    };
  }).filter(Boolean);

  // Create validation function

  const validate = (): any => {
    if (rules) {
      const __errorFields: string[] = [];

      let firstError: any = null;
      for (const ruleObj of rules) {
        const { for: key, rule, error } = ruleObj;
        const value = formValues[key];
        const isValid = rule(value, formValues);

        if (!isValid) {
          if (!__errorFields.includes(key)) {
            __errorFields.push(key);
          }

          if (!firstError) {
            if (error) {
              firstError = typeof error === 'function' ? error(value) : error;
            } else {
              firstError = {
                message: i18n.t('error.unknown_error_msg'),
              };
            }
          }
        }
      }

      setFormValues({
        ...formValues,
        __errorFields,
      });

      return firstError;
    }

    return null;
  };

  return {
    formValues,
    setFormValues,
    listData: computedListData,
    validate,
    isButtonDisabled,
  };
}
