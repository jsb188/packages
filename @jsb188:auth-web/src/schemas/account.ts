import i18n from '@jsb188/app/i18n';
import { AccountData } from '@jsb188/app/types/auth.d';
import { isPhone, isEmail, passwordStrength } from '@jsb188/app/utils/string';
import { OpenModalScreenFn } from '@jsb188/react/states';

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

export const makeEditAccountSchema = (
  account?: AccountData | null,
  openModalScreen: OpenModalScreenFn
) => ({
  listData: [{
  //   __type: 'input',
  //   item: {
  //     autoFocus: true,
  //     maxLength: MIN_LEN_VALUES.displayName,
  //     name: 'displayName',
  //     label: i18n.t('account.displayName'),
  //     placeholder: i18n.t('account.displayName_ph'),
  //     info: 'info',
  //     autoComplete: 'off',
  //   },
  // }, {
    __type: 'subtitle',
    item: {
      text: i18n.t('account.profile'),
    },
  }, {
    __type: 'group',
    item: {
      items: [{
        __type: 'input',
        item: {
          name: 'profile.firstName',
          maxLength: MIN_LEN_VALUES.firstName,
          label: i18n.t('account.fName'),
          placeholder: account?.profile?.firstName,
          autoComplete: 'off',
        },
      }, {
        __type: 'input',
        item: {
          name: 'profile.lastName',
          maxLength: MIN_LEN_VALUES.lastName,
          label: i18n.t('account.lName'),
          placeholder: account?.profile?.lastName,
          autoComplete: 'off',
        },
      }],
    }
  }, {
    __type: 'input_w_button',
    item: {
      name: 'change_emailAddress',
      maxLength: MIN_LEN_VALUES.email,
      setter: (data: any) => data?.email?.address,
      label: i18n.t('account.email'),
      autoComplete: 'off',
      disabled: true,
      buttonText: 'Change',
      onClickButton: () => {
        console.log('button click wtf');
      },
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
      buttonText: 'Change',
      onClickButton: () => openModalScreen({
        name: 'ACCOUNT_PASSWORD'
      }),
    },
  }, {
    __type: 'subtitle',
    item: {
      text: i18n.t('account.preferences'),
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
});
