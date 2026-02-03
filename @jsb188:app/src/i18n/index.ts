import Polyglot from 'node-polyglot';
import type NodePolyglot from '../types.d.ts'

import account from './account';
import ai_agent from './ai_agent';
import app from './app';
import auth from './auth';
import billing from './billing';
import country from './country';
import datetime from './datetime';
import error from './error';
import form from './form';
import log from './log';
import message from './message';
import org from './org';
import product from './product';

export const i18nTranslations = {
  account,
  ai_agent,
  app,
  auth,
  billing,
  country,
  datetime,
  error,
  form,
  log,
  message,
  org,
  product,
} as Record<string, any>;

const i18n = new Polyglot();
export default i18n as NodePolyglot;
