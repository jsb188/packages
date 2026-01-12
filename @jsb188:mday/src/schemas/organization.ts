import { SUPPORTED_COUNTRIES } from '@jsb188/app/constants/app';
import i18n from '@jsb188/app/i18n';
import type { OrganizationGQL } from '../types/organization.d';
import type { OpenModalPopUpFn } from '@jsb188/react/states';

/**
 * Length values for validation
 */

const MIN_LEN_VALUES = {
  name: 40,
  address_city: 100,
  address_state: 32,
  address_postalCode: 20,
};

/**
 * Rules for each field
 */


const RULES = function() {

  const addressRule = (_value: string, fv: any, k: string) => {
    const addr = fv.address;
    const hasAddressFV = Object.values(addr).some((v: any) => v?.trim()?.length > 0);

    if (hasAddressFV) {
      return !!addr?.[k]?.trim().length;
    }

    return true;
  }

  return {
    'address.line1': {
      for: 'address.line1',
      rule: (v: any, fv: any) => addressRule(v, fv, 'line1'),
      error: () => ({
        message: i18n.t('error.msg_value_required', { value: i18n.t('form.line1') }),
      }),
    },
    'address.postalCode': {
      for: 'address.postalCode',
      rule: (v: any, fv: any) => addressRule(v, fv, 'postalCode'),
      error: () => ({
        message: i18n.t('error.msg_value_required', { value: i18n.t('form.postalCode') }),
      }),
    },
    'address.city': {
      for: 'address.city',
      rule: (v: any, fv: any) => addressRule(v, fv, 'city'),
      error: () => ({
        message: i18n.t('error.msg_value_required', { value: i18n.t('form.city') }),
      }),
    },
    'address.state': {
      for: 'address.state',
      rule: (v: any, fv: any) => addressRule(v, fv, 'state'),
      error: () => ({
        message: i18n.t('error.msg_value_required', { value: i18n.t('form.state') }),
      }),
    },
    'address.country': {
      for: 'address.country',
      rule: (v: any, fv: any) => addressRule(v, fv, 'country'),
      error: () => ({
        message: i18n.t('error.msg_value_required', { value: i18n.t('form.country') }),
      }),
    },
  };
}();

/**
 * Schema; Edit account
 */

export function makeEditOrganizationSchema(
  formId: string,
  focusedName: string,
  formValues: OrganizationGQL, // always append with "|| nodeData"
  openModalPopUp: OpenModalPopUpFn
) {

  const poProps = {
    // scrollAreaDOMId,
    zClassName: 'z9',
    position: 'bottom_left',
    offsetX: 0,
    offsetY: 7,
  };

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
        description: i18n.t('org.address_notice_msg')
      }
    }, {
      __type: 'input',
      item: {
        name: 'address.line1',
        label: i18n.t('form.line1'),
        placeholder: i18n.t('form.line1_ph'),
        // autoComplete: 'off',
      }
    }, {
      __type: 'input',
      item: {
        name: 'address.line2',
        label: i18n.t('form.line2_optional'),
        placeholder: i18n.t('form.line2_ph'),
        // autoComplete: 'off',
      }
    }, {
      __type: 'input',
      item: {
        name: 'address.postalCode',
        label: i18n.t('form.postalCode'),
        placeholder: formValues?.address?.postalCode || i18n.t('form.postalCode_ph'),
        // autoComplete: 'off',
      }
    }, {
      __type: 'group',
      item: {
        items: [{
          __type: 'input',
          item: {
            name: 'address.city',
            maxLength: MIN_LEN_VALUES.address_city,
            label: i18n.t('form.city'),
            placeholder: formValues?.address?.city || i18n.t('form.city_ph'),
          },
        }, {
          __type: 'input',
          item: {
            name: 'address.state',
            maxLength: MIN_LEN_VALUES.address_state,
            label: i18n.t('form.state'),
            placeholder: formValues?.address?.state,
          },
        }],
      }
    }, {
      __type: 'input_click',
      forceClickId: 'input_click_address.country',
      label: i18n.t('form.country'),
      item: {
        label: i18n.t('form.country'),
        locked: true,
        focused: focusedName === (formId + '_address.country'),
        name: 'address.country',
        getter: (value: string) => value ? i18n.t(`country.from_code.${value}`) : '',
        placeholder: formValues?.address?.country || i18n.t('form.country_ph'),

        popOverProps: {
          ...poProps,

          id: formId + '_address.country',
          doNotFixToBottom: true,
          iface: {
            name: 'PO_LIST',

            variables: {
              designClassName: 'w_400',
              className: 'max_h_50vh',
							initialState: {
								'address.country': formValues?.address?.country,
							},
              options: ['US','MX','CA'].map(cCode => ({
                __type: 'LIST_ITEM' as const,
                text: i18n.t(`country.from_code.${cCode}`),
                // textClassName: 'ft_xs',
                // rightIconClassName: 'ft_xs mb_2',
                name: 'address.country',
                value: cCode,
                selected: formValues?.address?.country === cCode,
              })).concat({
								__type: 'BREAK' as const
							}).concat(SUPPORTED_COUNTRIES.map(countryCode => ({
                __type: 'LIST_ITEM' as const,
                text: i18n.t(`country.from_code.${countryCode}`),
                // textClassName: 'ft_xs',
                // rightIconClassName: 'ft_xs mb_2',
                name: 'address.country',
                value: countryCode,
                selected: formValues?.address?.country === countryCode,
              })))
            }
          }
        }
      },
    }],
    rules: [
      RULES['address.line1'],
      RULES['address.postalCode'],
      RULES['address.city'],
      RULES['address.state'],
      RULES['address.country'],
    ],
  };
}
