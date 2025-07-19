// import { z } from 'zod';
import type { LogEntryGQLData } from '../types/log.d';
import i18n from '@jsb188/app/i18n';

/**
 * Convert GQL data to GQL mutation input format
 */

export function makeFormValuesFromData(logEntry: LogEntryGQLData) {
  const formValues = {
    logEntryId: logEntry.id,
    accountId: logEntry.accountId,
    date: logEntry.date,
  } as Record<string, any>;

  const { details } = logEntry;
  switch (details?.__typename) {
    case 'LogEntryArable':
      formValues.arableDetails = {
        type: details.type,
        activity: details.activity,
        quantity: details.quantity,
        unit: details.unit,
        price: details.price,
        notes: details.notes,
        cropId: details.crop?.id,
      };
      break;
    case 'LogEntryLivestock':
      break;
    default:
      console.log(`${details?.__typename} is not done yet.`);
  }

  return formValues;
}

/**
 * Get editable values based on activity & type (which is also used to display UI)
 */

export function getEditableInputNames(__typename: string, type: string, retried = false) {
  const switchCase = retried ? type : `${__typename}:${type}`;

  switch (switchCase) {
    case 'LogEntryArable:SEED':
    case 'LogEntryArable:FIELD':
    case 'LogEntryArable:HARVEST':
    case 'LogEntryArable:POST_HARVEST':
    case 'LogEntryArable:SALES':
    case 'LogEntryArable':
      // Some of the types omit some fields, but for now, we're including all
      return {
        notes: 'arableDetails.notes',
        details: [
          // 'arableDetails.quantity',
          // 'arableDetails.unit',
          // 'arableDetails.price',
          'arableDetails.cropId',
          'date'
        ]
      };
    default:
      if (retried) {
        console.log(`${__typename} is not done yet.`);
      } else {
        return getEditableInputNames(__typename, type, true);
      }
  }

  return {
    notes: '',
    details: []
  };
}

/**
 * Get editable values based on activity & type (which is also used to display UI)
 */

export function makeLogEntryDetailsSchema(__typename: string) {

  switch (__typename) {
    case 'LogEntryArable':
      // Some of the types omit some fields, but for now, we're including all
      return [{
        __type: 'input',
        label: i18n.t('form.quantity'),
        item: {
          name: 'arableDetails.quantity',
          type: 'number',
          step: 0.1,
          min: 0.1,
          max: 99999999.99, // database max is numeric(10, 2)
          setter: (data: any) => data?.arableDetails?.quantity,
          placeholder: i18n.t('form.quantity_ph'),
        },
      }, {
        __type: 'input',
        label: i18n.t('form.unit'),
        item: {
          name: 'arableDetails.unit',
          maxLength: 40,
          setter: (data: any) => data?.arableDetails?.unit,
          placeholder: i18n.t('log.unit_arable_ph'),
        },
      }, {
        __type: 'input',
        label: i18n.t('form.price'),
        item: {
          name: 'arableDetails.price',
          type: 'number',
          step: 0.1,
          min: 0.1,
          max: 99999999.99, // database max is numeric(10, 2)
          setter: (data: any) => data?.arableDetails?.price,
          placeholder: i18n.t('log.price_arable_ph'),
        },
      }];
    default:
  }

  return [];
}
