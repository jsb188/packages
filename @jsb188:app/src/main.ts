import i18n from './i18n/';
import app from './i18n/app';
import auth from './i18n/auth';
import billing from './i18n/billing';
import datetime from './i18n/datetime';
import error from './i18n/error';
import form from './i18n/form';
import account from './i18n/account';

// Get the correct type for ENV
let ENV: Map<string, string | boolean | number> = new Map();

/**
 * Extend i18n with app specific texts
 */

export function configI18n(texts: Record<string, any>) {

  // Locale support for later
  const locale = 'en';

  const extendedObj = {
    app: app[locale],
    auth: auth[locale],
    billing: billing[locale],
    datetime: datetime[locale],
    error: error[locale],
    form: form[locale],
    account: account[locale],
  } as Record<string, any>;

  for (const key in texts) {
    const obj = texts[key][locale];

    if (extendedObj[key]) {
      extendedObj[key] = {
        ...extendedObj[key],
        ...obj
      };
    } else {
      extendedObj[key] = obj;
    }
  }

  i18n.extend(extendedObj);
};

/**
 * Register environment variables so the package may use it
 */

export function registerENV(env: Record<string, string>) {
  // Do not use process.env; because this package is used in client + server

  for (const key in env) {
    if (
      typeof key !== 'undefined' &&
      Object.prototype.hasOwnProperty.call(env, key)
    ) {
      ENV.set(key, env[key]);
    }
  }

  // Shim some development commands
  console.dev = (
    str: string,
    ...args: any[]
  ) => {
    if (ENV.get('NODE_ENV') === 'development') {
      const [preset, ...otherArgs] = args;

      let style;
      switch (preset) {
        case 'em':
          style = 'background: #FFF380;';
          break;
        case 'warning':
          style = 'background: #E64545; color: #FFF;';
          break;
        default:
      }

      console.log(`%c${str}`, `${style || 'background: #F2F0DA;'} padding: 3px 5px;`, ...(style ? otherArgs : args));
    }
  };
}

/**
 * Get environment variables
 */

export function getENVVariable(namespace: string): string | boolean | number | undefined {
  return ENV.get(namespace);
}
