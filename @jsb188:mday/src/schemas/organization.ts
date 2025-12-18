import { SUPPORTED_LANGUAGES } from '@jsb188/app/constants/app';
import i18n from '@jsb188/app/i18n';
import type { OrganizationGQL } from '@jsb188/mday/types/organization.d';
import { formatPhoneNumber } from '@jsb188/app/utils/string';
import type { OpenModalPopUpFn } from '@jsb188/react/states';

/**
 * Length values for validation
 */

const MIN_LEN_VALUES = {
  password: 8,
  firstName: 32,
  lastName: 32,
  description: 750,
  email: 80,
};

/**
 * Schema; Edit account
 */

export function makeEditOrganizationSchema(
  formId: string,
  focusedName: string,
  org: OrganizationGQL | null,
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
      __type: 'group',
      item: {
        name: 'profile.firstName',
        maxLength: MIN_LEN_VALUES.firstName,
        label: i18n.t('org.name'),
        placeholder: account?.profile?.firstName,
        autoComplete: 'off',
      }
    }, {
      __type: 'input_click',
      forceClickId: 'input_click_settings.language',
      label: i18n.t('form.activity'),
      item: {
        label: i18n.t('account.ai_language'),
        locked: true,
        focused: focusedName === (formId + '_settings.language'),
        name: 'settings.language',
        placeholder: i18n.t(`form.activity_ph`),
        getter: (value: string) => i18n.t(`form.lang.${value || 'en'}`),

        popOverProps: {
          id: formId + '_settings.language',
          ...poProps,
          iface: {
            name: 'PO_LIST',
            variables: {
              designClassName: 'w_400',
              className: 'max_h_40vh',
              options: SUPPORTED_LANGUAGES.map(lang => ({
                __type: 'LIST_ITEM' as const,
                text: i18n.t(`form.lang.${lang}`),
                // textClassName: 'ft_xs',
                // rightIconClassName: 'ft_xs mb_2',
                name: 'settings.language',
                value: lang,
                selected: (settings?.language || 'en') === lang,
              }))
            }
          }
        }
      },
    }, {
      __type: 'input_w_button',
      item: {
        name: 'change_phoneNumber',
        maxLength: MIN_LEN_VALUES.email,
        setter: (data: any) => formatPhoneNumber(data?.phone?.number || ''),
        label: i18n.t('form.phone_number'),
        autoComplete: 'off',
        disabled: true,
        buttonText: i18n.t('form.change'),
        onClickButton: () => openModalPopUp({
          preset: 'CHANGE_PHONE',
          name: 'edit_account_phone'
        }),
      },
    }, {
      __type: 'input_w_button',
      item: {
        name: 'change_emailAddress',
        maxLength: MIN_LEN_VALUES.email,
        setter: (data: any) => data?.email?.address,
        label: i18n.t('account.email'),
        autoComplete: 'off',
        disabled: true,
        buttonText: i18n.t('form.change'),
        onClickButton: () => openModalPopUp({
          preset: 'CHANGE_EMAIL',
          name: 'edit_account_email'
        })
      },
    }, {
      __type: 'input_w_button',
      item: {
        name: 'change_password',
        minLength: MIN_LEN_VALUES.password,
        label: i18n.t('account.password'),
        setter: () => '.....',
        autoComplete: 'off',
        type: 'password',
        disabled: true,
        buttonText: i18n.t('form.change'),
        onClickButton: () => openModalPopUp({
          preset: 'CHANGE_PASSWORD',
          name: 'edit_account_password'
        }),
      },
    //   __type: 'textarea',
    //   item: {
    //     name: 'description',
    //     maxLength: MIN_LEN_VALUES.description,
    //     setter: (data: any) => data?.profile?.description,
    //     label: i18n.t('account.about'),
    //     placeholder: i18n.t('account.about_ph'),
    //     autoComplete: 'off',
    //   },
    }],
    rules: [
      // RULES.password,
    ],
  };
}
