import i18n from '@jsb188/app/i18n/index.ts';
import type { InboundContactGQL } from '../types/inboundContact.d.ts';

/**
 * Length values for validation
 */

const MIN_LEN_VALUES = {
  email: 100,
  memory: 750,
  personName: 120,
  phone: 40,
};

/**
 * Schema; Edit inbound contact
 */

export function makeEditInboundContactSchema(
  formId: string,
  focusedName: string,
  formValues: Partial<InboundContactGQL>, // always append with "|| nodeData"
) {
  return {
    listData: [{
      __type: 'input',
      item: {
        name: 'personName',
        maxLength: MIN_LEN_VALUES.personName,
        label: i18n.t('form.name'),
        placeholder: formValues.personName || '',
        autoComplete: 'off',
        focused: focusedName === (formId + '_personName'),
      }
    }, {
      __type: 'input',
      item: {
        name: 'email',
        maxLength: MIN_LEN_VALUES.email,
        label: i18n.t('form.email'),
        placeholder: formValues.email || '',
        autoComplete: 'off',
        type: 'email',
        focused: focusedName === (formId + '_email'),
      }
    }, {
      __type: 'input',
      item: {
        name: 'phone',
        maxLength: MIN_LEN_VALUES.phone,
        label: i18n.t('form.phone'),
        placeholder: formValues.phone || '',
        autoComplete: 'off',
        type: 'tel',
        focused: focusedName === (formId + '_phone'),
      }
    }, {
      __type: 'textarea',
      item: {
        name: 'memory',
        maxLength: MIN_LEN_VALUES.memory,
        label: i18n.t('form.memories'),
        description: i18n.t('form.ai_memories_desc'),
        placeholder: formValues.memory || '',
        autoComplete: 'off',
        minHeight: 80,
        focused: focusedName === (formId + '_memory'),
      }
    }],
    rules: [],
  };
}
