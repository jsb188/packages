import i18n from '@jsb188/app/i18n/index.ts';
import { makeAddressSchema } from '@jsb188/auth-web/schemas/address';
import type { OrganizationGQL } from '../types/organization.d.ts';

/**
 * Length values for validation
 */

const MIN_LEN_VALUES = {
  name: 40,
};

/**
 * Schema; Edit account
 */

export function makeEditOrganizationSchema(
  formId: string,
  focusedName: string,
  formValues: OrganizationGQL, // always append with "|| nodeData"
) {
  const addressSchema = makeAddressSchema(
    formId,
    focusedName,
    formValues?.address,
  );

  return {
    listData: [{
    //   __type: 'subtitle',
    //   item: {
    //     text: i18n.t('account.profile'),
    //   },
    // }, {
      __type: 'input',
      item: {
        name: 'name',
        maxLength: MIN_LEN_VALUES.name,
        label: i18n.t('org.name_of'),
        placeholder: formValues.name,
        autoComplete: 'off',
      }
    }, {
      __type: 'input',
      locked: true,
      item: {
        name: 'operation',
        label: i18n.t('org.type_of'),
        placeholder: i18n.t(`org.type.${formValues.operation}`),
        getter: (value: string) => i18n.t(`org.type.${value}`),
        autoComplete: 'off',
        info: i18n.t('org.contact_to_change'),
      }
    }, {
      __type: 'section_title',
      item: {
        title: i18n.t('form.address'),
        description: i18n.t('org.address_notice_msg'),
      }
    }, ...addressSchema.listData],
    rules: [
      ...addressSchema.rules,
    ],
  };
}
