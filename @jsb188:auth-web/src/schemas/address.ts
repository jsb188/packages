import { SUPPORTED_COUNTRIES } from '@jsb188/app/constants/app.ts';
import i18n from '@jsb188/app/i18n/index.ts';

/**
 * Length values for address field validation.
 */

const MIN_LEN_VALUES = {
  city: 100,
  state: 32,
};

/**
 * Build a required-address-field validator.
 */

function makeAddressRequiredRule(fieldName: string, labelKey: string) {
  return {
    for: `address.${fieldName}`,
    rule: (_value: unknown, formValues: any) => {
      const address = formValues?.address || {};
      const hasAddressValueExceptCountry = ['line1', 'line2', 'city', 'state', 'postalCode'].some((key) => {
        return String(address?.[key] || '').trim().length > 0;
      });

      if (!hasAddressValueExceptCountry) {
        return true;
      }

      return String(address?.[fieldName] || '').trim().length > 0;
    },
    error: () => ({
      message: i18n.t('error.msg_value_required', { value: i18n.t(labelKey) }),
    }),
  };
}

/**
 * Create reusable address schema section and rules.
 */

export function makeAddressSchema(
  formId: string,
  focusedName: string,
  addressFormValues?: Partial<{
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  }> | null,
) {
  const currentAddress = addressFormValues || {};
  const selectedCountryCode = currentAddress?.country || '';
  const priorityCountryOptions = ['US', 'MX', 'CA'].map((countryCode) => ({
    __type: 'LIST_ITEM' as const,
    text: i18n.t(`country.from_code.${countryCode}`),
    name: 'address.country',
    value: countryCode,
    selected: selectedCountryCode === countryCode,
  }));
  const supportedCountryOptions = SUPPORTED_COUNTRIES.map((countryCode) => ({
    __type: 'LIST_ITEM' as const,
    text: i18n.t(`country.from_code.${countryCode}`),
    name: 'address.country',
    value: countryCode,
    selected: selectedCountryCode === countryCode,
  }));
  const countryOptions = [
    ...priorityCountryOptions,
    {
      __type: 'BREAK' as const,
    },
    ...supportedCountryOptions,
  ];
  const popOverProps = {
    zClassName: 'z9',
    position: 'bottom_left' as const,
    offsetX: 0,
    offsetY: 7,
  };

  return {
    listData: [{
      __type: 'input' as const,
      item: {
        name: 'address.line1',
        label: i18n.t('form.line1'),
        placeholder: i18n.t('form.line1_ph'),
      },
    }, {
      __type: 'input' as const,
      item: {
        name: 'address.line2',
        label: i18n.t('form.line2_optional'),
        placeholder: i18n.t('form.line2_ph'),
      },
    }, {
      __type: 'input' as const,
      item: {
        name: 'address.postalCode',
        label: i18n.t('form.postalCode'),
        placeholder: currentAddress?.postalCode || i18n.t('form.postalCode_ph'),
      },
    }, {
      __type: 'group' as const,
      item: {
        items: [{
          __type: 'input' as const,
          item: {
            name: 'address.city',
            maxLength: MIN_LEN_VALUES.city,
            label: i18n.t('form.city'),
            placeholder: currentAddress?.city || i18n.t('form.city_ph'),
          },
        }, {
          __type: 'input' as const,
          item: {
            name: 'address.state',
            maxLength: MIN_LEN_VALUES.state,
            label: i18n.t('form.state'),
            placeholder: currentAddress?.state || '',
          },
        }],
      },
    }, {
      __type: 'input_click' as const,
      forceClickId: 'input_click_address.country',
      label: i18n.t('form.country'),
      item: {
        label: i18n.t('form.country'),
        locked: true,
        focused: focusedName === (formId + '_address.country'),
        name: 'address.country',
        getter: (value: string) => value ? i18n.t(`country.from_code.${value}`) : '',
        placeholder: selectedCountryCode || i18n.t('form.country_ph'),
        popOverProps: {
          ...popOverProps,
          id: formId + '_address.country',
          doNotFixToBottom: true,
          iface: {
            name: 'PO_LIST',
            variables: {
              designClassName: 'w_400',
              className: 'max_h_50vh',
              initialState: {
                'address.country': selectedCountryCode,
              },
              options: countryOptions,
            },
          },
        },
      },
    }],
    rules: [
      makeAddressRequiredRule('line1', 'form.line1'),
      makeAddressRequiredRule('postalCode', 'form.postalCode'),
      makeAddressRequiredRule('city', 'form.city'),
      makeAddressRequiredRule('state', 'form.state'),
      makeAddressRequiredRule('country', 'form.country'),
    ],
  };
}
