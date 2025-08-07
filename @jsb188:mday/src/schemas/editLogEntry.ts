import i18n from '@jsb188/app/i18n';
import { getCalDate } from '@jsb188/app/utils/datetime';
import { getObject } from '@jsb188/app/utils/object';
import { getTimeZoneCode } from '@jsb188/app/utils/timeZone';
import { ARABLE_ACTIVITIES_GROUPED } from '../constants/log';
import type { LogEntryGQLData } from '../types/log.d';
import { getLogCategoryColor, getLogTypeFromActivity } from '../utils/log';

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
        activity: details.activity,
        quantity: details.quantity,
        crop: details.crop,
        unit: details.unit,
        concentration: details.concentration,
        concentrationUnit: details.concentrationUnit,
        price: details.price,
        notes: details.notes,
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
 * Convert HTML input values to GQL mutation input types
 */

export function formatFormValuesForMutation(formValues: Record<string, any>) {
  for (const key in formValues) {
    if (formValues[key] && typeof formValues[key] === 'object') {

      for (const subKey in formValues[key]) {
        if (['quantity','price','concentration'].includes(subKey)) {
          formValues[key][subKey] = parseFloat(formValues[key][subKey]);
        }
      }
    }
  }
  return formValues;
}

/**
 * Get editable values based on activity & type (which is also used to display UI)
 */

export function getLogDetailsInputName(__typename: string) {
  switch (__typename) {
    case 'LogEntryArable':
      // Some of the types omit some fields, but for now, we're including all
      return 'arableDetails';
    default:
  }
  return '';
}

/**
 * Get editable values based on activity & type (which is also used to display UI)
 */

export function makeLogEntryDetailsSchema(
  scrollAreaDOMId: string,
  formId: string,
  timeZone: string | null | undefined,
  __typename: string,
  focusedName: string,
  formValues: Record<string, any> = {}
) {

  let activitiesList: any[] = [];
  let schemaItems: any[] = [];

  const poProps = {
    scrollAreaDOMId,
    zClassName: 'z9',
    position: 'bottom_left',
    offsetX: 0,
    offsetY: 7,
  };

  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 10);

  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 1);

  switch (__typename) {
    case 'LogEntryArable':
      const logType = getLogTypeFromActivity('ARABLE', formValues.arableDetails?.activity);
      const isWaterTesting = logType === 'WATER';
      const isPriceRelated = ['SALES', 'SEED'].includes(logType!);

      activitiesList = ARABLE_ACTIVITIES_GROUPED;
      schemaItems = [{
        __type: 'input_click',
        forceClickId: 'input_click_arableDetails.activity',
        label: i18n.t('form.activity'),
        item: {
          locked: () => true,
          focused: focusedName === (formId + '_activity'),
          name: 'arableDetails.activity',
          placeholder: i18n.t(`form.activity_ph`),
          getter: (value: string) => value ? i18n.t(`log.activity.${value}`) : '',
        },
      }, {
        // Water testing inputs
        __type: isWaterTesting ? 'input' : 'none',
        label: i18n.t('form.concentration'),
        item: {
          name: 'arableDetails.concentration',
          type: 'number',
          step: 0.1,
          min: 0.1,
          max: 99999999.99, // database max is numeric(10, 2)
          placeholder: i18n.t('form.concentration_ph'),
        },
      }, {
        __type: isWaterTesting ? 'input' : 'none',
        label: i18n.t('form.concentration_unit'),
        item: {
          name: 'arableDetails.concentrationUnit',
          maxLength: 40,
          placeholder: i18n.t('form.concentration_unit_ph'),
        },
      }, {
        // Regular inputs
        __type: 'input',
        label: i18n.t(isWaterTesting ? 'form.water_quantity' : 'form.quantity'),
        item: {
          name: 'arableDetails.quantity',
          type: 'number',
          step: 0.1,
          min: 0.1,
          max: 99999999.99, // database max is numeric(10, 2)
          placeholder: i18n.t('form.quantity_ph'),
        },
      }, {
        __type: 'input',
        label: i18n.t(isWaterTesting ? 'form.water_unit' : 'form.unit'),
        item: {
          name: 'arableDetails.unit',
          maxLength: 40,
          placeholder: i18n.t(isWaterTesting ? 'form.water_unit_ph' : 'log.unit_arable_ph'),
        },
      }, {
        __type: isPriceRelated ? 'input' : 'none',
        label: i18n.t('form.price'),
        item: {
          name: 'arableDetails.price',
          type: 'number',
          step: 0.1,
          min: 0.1,
          max: 99999999.99, // database max is numeric(10, 2)
          placeholder: i18n.t('log.price_arable_ph'),
        },
      }, {
        __type: isWaterTesting ? 'none' : 'input',
        label: i18n.t('form.crop'),
        item: {
          name: 'arableDetails.crop',
          placeholder: 'Tomato, broccoli, etc.',
        }
      }];
    default:
  }

  // Date, time, createdBy is common across all log types

  if (schemaItems.length) {
    const timeZoneCode = getTimeZoneCode(timeZone);

    schemaItems = schemaItems.concat([{
      __type: 'input_click',
      forceClickId: 'input_click_date',
      label: i18n.t('form.date'),
      item: {
        name: 'date',
        focused: focusedName === (formId + '_date'),
        getter: (value: string) => getCalDate(new Date(value), timeZone).calDate,
      },
      popOverProps: {
        id: formId + '_date',
        ...poProps,
        iface: {
          name: 'PO_LIST',
          variables: {
            designClassName: 'w_300',
            className: 'max_h_40vh',
            initialState: {
              date: formValues.date ? new Date(formValues.date) : new Date(),
            },
            options: [{
              __type: 'DATE_PICKER',
              name: 'date',
              minDate,
              maxDate,
            }]
          }
        }
      }
    }, {
      __type: 'input_time_from_date',
      label: i18n.t(timeZoneCode ? 'form.time_with_zone' : 'form.time', { timeZone: timeZoneCode }),
      scrollAreaDOMId,
      item: {
        name: 'date', // date value will be used to extract time
        type: 'time',
        timeZone,
      },
    }]);
  }

  if (schemaItems[0] && activitiesList.length) {
    // First item is always activity
    const activityValue = getObject(formValues, schemaItems[0].item.name);
    schemaItems[0].item.popOverProps = {
      id: formId + '_activity',
      ...poProps,
      iface: {
        name: 'PO_LIST',
        variables: {
          designClassName: 'w_225',
          className: 'max_h_40vh',
          options: activitiesList.reduce((acc, [type, activities], i) => {
            const colorIndicator = getLogCategoryColor(type);
            const isEnd = i === activitiesList.length - 1;

            const updatedList = acc.concat({
              __type: 'LIST_SUBTITLE' as const,
              colorIndicator,
              text: i18n.t(`log.type_short.${type}`),
              className: 'mt_sm',
              textClassName: `cl_${colorIndicator}`,
            }).concat(activities.map((activity: string) => ({
              __type: 'LIST_ITEM' as const,
              // colorIndicator,
              text: i18n.t(`log.activity.${activity}`),
              textClassName: 'ft_xs',
              rightIconClassName: 'ft_xs mb_2',
              name: schemaItems[0].item.name,
              value: activity,
              selected: activityValue === activity,
            })));

            if (!isEnd) {
              updatedList.push({
                __type: 'BREAK' as const,
              });
            }

            return updatedList;
          }, [])
        }
      }
    };
  }

  return schemaItems;
}
