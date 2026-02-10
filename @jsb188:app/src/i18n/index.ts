import Polyglot from 'node-polyglot';
import type NodePolyglot from '../types.d.ts'

import account from './account.ts';
import ai_agent from './ai_agent.ts';
import app from './app.ts';
import auth from './auth.ts';
import billing from './billing.ts';
import country from './country.ts';
import datetime from './datetime.ts';
import error from './error.ts';
import form from './form.ts';
import log from './log.ts';
import message from './message.ts';
import org from './org.ts';
import product from './product.ts';
import workflow from './workflow.ts';

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
  workflow,
} as Record<string, any>;

const i18n = new Polyglot();
export default i18n as NodePolyglot;
