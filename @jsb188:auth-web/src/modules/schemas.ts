import i18n from '@jsb188/app/i18n/index.ts';
import { isPhone, isEmail, passwordStrength } from '@jsb188/app/utils/string.ts';

/**
 * Types
 */

interface SignInFormType {
  identifier?: string;
  password?: string;
}

interface SignUpFormType {
  email: string;
  password: string;
  passwordRepeat: string;
}

interface SignInDataForSchema {
  hidePassword: boolean;
  lastIdentifier: string;
}

/**
 * Values for validation
 */

const MIN_LEN_VALUES = {
  password: 8,
  pronouns: 20,
  description: 750,
};

/**
 * Rules for each field
 */

const RULES = function() {
  return {
    email: {
      for: 'email',
      rule: isEmail,
      error: (value: string) => ({
        message: i18n.t('error.msg_email_invalid', { value }),
      }),
    },
    password: {
      for: 'password',
      rule: (value: string) => passwordStrength(value, MIN_LEN_VALUES.password).valid,
      error: (value: string) => {
        const { isLongEnough, hasLowercase, hasUppercase, hasDigit, hasSpecial } = passwordStrength(value, MIN_LEN_VALUES.password);
        const errorMessages = [];

        if (!isLongEnough) {
          errorMessages.push(
            i18n.t('error.msg_password_too_short', { length: MIN_LEN_VALUES.password }),
          );
        }
        if (!hasLowercase) {
          errorMessages.push(i18n.t('error.msg_password_lowercase'));
        }
        if (!hasUppercase) {
          errorMessages.push(i18n.t('error.msg_password_uppercase'));
        }
        if (!hasDigit) {
          errorMessages.push(i18n.t('error.msg_password_digit'));
        }
        if (!hasSpecial) {
          errorMessages.push(i18n.t('error.msg_password_special'));
        }

        return {
          message: errorMessages.length > 1 ? i18n.t('error.msg_password_insecure') : errorMessages[0],
        };
      },
    },
    passwordRepeat: {
      for: 'passwordRepeat',
      rule: (value: string, formValues: Partial<SignUpFormType>) => value === formValues.password,
      error: {
        message: i18n.t('error.msg_password_mismatch'),
      },
    },
    phone: {
      for: 'phone',
      rule: (value: string) => isPhone(value),
      error: (value: string) => ({
        message: i18n.t('error.msg_phone_invalid', { value }),
      }),
    }
  };
}();

/**
 * Schema; Change password
 */

export const makeChangeAccountPasswordSchema = () => ({
  listData: [{
    __type: 'input',
    hidden: (dataForSchema?: SignInDataForSchema) => !!dataForSchema?.hidePassword,
    item: {
      autoFocus: true,
      name: 'currentPassword',
      type: 'password',
      label: i18n.t('account.currentPassword'),
      placeholder: i18n.t('account.password_ph'),
      // info: 'whatever you want',
    },
  }, {
    __type: 'password',
    item: {
      name: 'password',
      type: 'password',
      label: i18n.t('account.newPassword'),
      // placeholder: ''
      // info: 'whatever you want',
    },
  }, {
    __type: 'password',
    item: {
      name: 'passwordRepeat',
      type: 'password',
      label: i18n.t('account.newPasswordRepeat'),
    },
  }],
  rules: [
    RULES.password,
  ],
});

/**
 * Schema; Assign a new password
 */

export const makeAssignPasswordSchema = () => ({
  listData: [{
    __type: 'password',
    item: {
      name: 'password',
      type: 'password',
      label: i18n.t('account.password'),
    },
  }, {
    __type: 'password',
    item: {
      name: 'passwordRepeat',
      type: 'password',
      label: i18n.t('account.passwordRepeat'),
    },
  }],
  rules: [
    RULES.password,
  ],
  isButtonDisabled: (formValues: any) => {
    return !formValues?.password?.trim() || !formValues?.passwordRepeat?.trim();
  },
});

/**
 * Schema; sign in
 */

export const makeSignInSchema = () => ({
  listData: [{
    __type: 'input',
    // Can't do this because disabling the input will make post form ignore this field
    // locked: ({ hidePassword, lastIdentifier }: SignInDataForSchema) => !hidePassword && !!lastIdentifier,
    item: {
      name: 'identifier',
      allowClearIfLocked: true,
      label: i18n.t('auth.login_opts_main'),
      placeholder: i18n.t('account.email_ph'),
    },
  }, {
    __type: 'password',
    hidden: (dataForSchema?: SignInDataForSchema) => !!dataForSchema?.hidePassword,
    autoFocus: true,
    item: {
      name: 'password',
      type: 'password',
      label: i18n.t('account.password'),
      placeholder: i18n.t('account.password_ph'),
    },
  }],
  isButtonDisabled: (formValues: SignInFormType) => {
    return !formValues?.identifier?.trim();
  },
});

/**
 * Schema; Sign up
 */

export const makeSignUpSchema = () => ({
  listData: [{
    __type: 'input',
    item: {
      name: 'email',
      label: i18n.t('account.email'),
      placeholder: i18n.t('account.email_ph'),
    },
  }, {
    __type: 'password',
    item: {
      name: 'password',
      type: 'password',
      label: i18n.t('account.password'),
      placeholder: i18n.t('account.password_ph'),
    },
  }, {
    __type: 'password',
    item: {
      name: 'passwordRepeat',
      type: 'password',
      label: i18n.t('account.passwordRepeat'),
      placeholder: i18n.t('account.password_ph'),
    },
  }],
  isButtonDisabled: (formValues: Partial<SignUpFormType>) => {
    const fields: (keyof SignUpFormType)[] = ['email', 'password', 'passwordRepeat'];
    return fields.some((s) => !formValues[s]?.trim());
  },
  rules: [
    RULES.email,
    RULES.password,
    RULES.passwordRepeat,
  ],
});

/**
 * Schema; Request a link to reset password
 */

interface RequestTokenizedEmailObj {
  email: string;
}

export const makeRequestTokenizedEmailSchema = () => ({
  listData: [{
    __type: 'input',
    item: {
      name: 'email',
      label: i18n.t('account.email'),
      placeholder: i18n.t('account.email_ph'),
    },
  }],
  isButtonDisabled: (formValues: Partial<RequestTokenizedEmailObj>) => {
    return !formValues.email?.trim();
  },
  rules: [
    RULES.email,
  ],
});

/**
 * Schema; Send phone verification code
 */

interface SendPhoneVerificationObj {
  phone: string;
}

export const makeSendPhoneVerificationSchema = () => ({
  listData: [{
    __type: 'input',
    item: {
      name: 'phone',
      label: i18n.t('form.phone_number'),
      placeholder: i18n.t('account.phone_ph'),
    },
  }],
  isButtonDisabled: (formValues: Partial<SendPhoneVerificationObj>) => {
    return !formValues.phone?.trim();
  },
  rules: [
    RULES.phone,
  ],
});
