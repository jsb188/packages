import i18n from '@jsb188/app/i18n';
import { getCalDate } from '@jsb188/app/utils/datetime';
import { getObject } from '@jsb188/app/utils/object';
import { getTimeZoneCode } from '@jsb188/app/utils/timeZone';
import { ARABLE_ACTIVITIES_GROUPED, FARMERS_MARKET_ACTIVITIES_GROUPED, LIVESTOCK_ACTIVITIES_GROUPED } from '../constants/log';
import type { LogArableMetadataGQL, LogEntryGQL, LogFarmersMarketMetadataGQL, LogLivestockMetadataGQL } from '../types/log.d';
import { getLogCategoryColor, getLogTypeFromActivity } from '../utils/log';

/**
 * Get editable values based on activity & type (which is also used to display UI)
 */

export const LOG_TYPENAME_TO_DETAILS_INPUT_NAME = {
  LogArable: 'arableDetails',
  LogFarmersMarket: 'farmersMarketDetails',
  LogLivestock: 'livestockDetails',
};

/**
 * Convert GQL data to GQL mutation input format
 */

export function makeFormValuesFromData(logEntry: LogEntryGQL) {
  const formValues = {
    logEntryId: logEntry.id,
    accountId: logEntry.accountId,
    date: logEntry.date,
  } as Record<string, any>;

  switch (logEntry.details?.__typename) {
    case 'LogArable': {
      const details = logEntry.details as LogArableMetadataGQL;
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
    } break;
    case 'LogFarmersMarket': {
      const details = logEntry.details as LogFarmersMarketMetadataGQL;
      formValues.farmersMarketDetails = {
        activity: details.activity,
        childOrgId: details.childOrgId,
        void: details.void,
        values: details.values,
        notes: details.notes,
      };
    } break;
    case 'LogLivestock': {
      const details = logEntry.details as LogLivestockMetadataGQL;
      formValues.livestockDetails = {
        activity: details.activity,
        livestock: details.livestock,
        livestockIdentifiers: details.livestockIdentifiers,
        item: details.item,
        quantity: details.quantity,
        unit: details.unit,
        price: details.price,
        notes: details.notes,
      };
    } break;
    default:
      console.log(`${logEntry.details?.__typename} is not done yet.`);
  }


  // input LogArableInput {
  //   activity: LogArableActivity
  //   crop: String
  //   quantity: Float
  //   unit: String
  //   concentration: Float
  //   concentrationUnit: String
  //   price: Float
  //   notes: String
  // }

  // input LogFarmersMarketInput {
  //   activity: LogFarmersMarketActivity
  //   childOrgId: GenericID
  //   void: Boolean
  //   values: [LabelAndValueInput]
  //   notes: String
  // }

  // input LogLivestockInput {
  //   activity: LogLivestockType
  //   livestock: String
  //   livestockIdentifiers: [String]
  //   item: String
  //   quantity: Float
  //   unit: String
  //   price: Float
  //   notes: String
  // }


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
 * Arable log metadata schema
 */

function makeArableMetadataSchema(
  formValues: Record<string, any>,
  focusedName: string,
  formId: string,
  isCreateNew: boolean,
) {
  const namespace = 'arableDetails';
  const logType = getLogTypeFromActivity('ARABLE', formValues[namespace]?.activity);
  const isWaterTesting = logType === 'WATER';
  const isPriceRelated = ['SALES', 'SEED'].includes(logType!);

  const schemaItems = [{
    __type: 'input_click',
    forceClickId: `input_click_${namespace}.activity`,
    label: i18n.t('form.activity'),
    item: {
      locked: () => true,
      focused: focusedName === (formId + '_activity'),
      name: `${namespace}.activity`,
      placeholder: isCreateNew && i18n.t(`form.activity_ph`),
      getter: (value: string) => value ? i18n.t(`log.activity.${value}`) : '',
    },
  }, {
    // Water testing inputs
    __type: isWaterTesting ? 'input' : 'none',
    label: i18n.t('form.concentration'),
    item: {
      name: `${namespace}.concentration`,
      type: 'number',
      step: 0.1,
      min: 0.1,
      max: 99999999.99, // database max is numeric(10, 2)
      placeholder: isCreateNew && i18n.t('form.concentration_ph'),
    },
  }, {
    __type: isWaterTesting ? 'input' : 'none',
    label: i18n.t('form.concentration_unit'),
    item: {
      name: `${namespace}.concentrationUnit`,
      maxLength: 40,
      placeholder: isCreateNew && i18n.t('form.concentration_unit_ph'),
    },
  }, {
    // Regular inputs
    __type: 'input',
    label: i18n.t(isWaterTesting ? 'form.water_quantity' : 'form.quantity'),
    item: {
      name: `${namespace}.quantity`,
      type: 'number',
      step: 0.1,
      min: 0.1,
      max: 99999999.99, // database max is numeric(10, 2)
      placeholder: isCreateNew && i18n.t('form.quantity_ph'),
    },
  }, {
    __type: 'input',
    label: i18n.t(isWaterTesting ? 'form.water_unit' : 'form.unit'),
    item: {
      name: `${namespace}.unit`,
      maxLength: 40,
      placeholder: isCreateNew && i18n.t(isWaterTesting ? 'form.water_unit_ph' : 'log.unit_arable_ph'),
    },
  }, {
    __type: isPriceRelated ? 'input' : 'none',
    label: i18n.t('form.price'),
    item: {
      name: `${namespace}.price`,
      type: 'number',
      step: 0.1,
      min: 0.1,
      max: 99999999.99, // database max is numeric(10, 2)
      placeholder: isCreateNew && i18n.t('log.price_arable_ph'),
    },
  }, {
    __type: isWaterTesting ? 'none' : 'input',
    label: i18n.t('form.crop'),
    item: {
      name: `${namespace}.crop`,
      placeholder: isCreateNew && i18n.t('log.crop_ph'),
    }
  }];

  return schemaItems;
}

/**
 * Livestock log metadata schema
 */

function makeLivestockMetadataSchema(
  formValues: Record<string, any>,
  focusedName: string,
  formId: string,
  isCreateNew: boolean
) {
  const namespace = 'livestockDetails';
  const logType = getLogTypeFromActivity('LIVESTOCK', formValues[namespace]?.activity);
  const isWaterTesting = logType === 'WATER';
  const isPriceRelated = ['SALES', 'SEED'].includes(logType!);

  console.log('logType', logType);


  const schemaItems = [{
    __type: 'input_click',
    forceClickId: `input_click_${namespace}.activity`,
    label: i18n.t('form.activity'),
    item: {
      locked: () => true,
      focused: focusedName === (formId + '_activity'),
      name: `${namespace}.activity`,
      placeholder: isCreateNew && i18n.t(`form.activity_ph`),
      getter: (value: string) => value ? i18n.t(`log.activity.${value}`) : '',
    },
  }, {
    // Water testing inputs
    __type: isWaterTesting ? 'input' : 'none',
    label: i18n.t('form.concentration'),
    item: {
      name: `${namespace}.concentration`,
      type: 'number',
      step: 0.1,
      min: 0.1,
      max: 99999999.99, // database max is numeric(10, 2)
      placeholder: isCreateNew && i18n.t('form.concentration_ph'),
    },
  }, {
    __type: isWaterTesting ? 'input' : 'none',
    label: i18n.t('form.concentration_unit'),
    item: {
      name: `${namespace}.concentrationUnit`,
      maxLength: 40,
      placeholder: isCreateNew && i18n.t('form.concentration_unit_ph'),
    },
  }, {
    // Regular inputs
    __type: 'input',
    label: i18n.t(isWaterTesting ? 'form.water_quantity' : 'form.quantity'),
    item: {
      name: `${namespace}.quantity`,
      type: 'number',
      step: 0.1,
      min: 0.1,
      max: 99999999.99, // database max is numeric(10, 2)
      placeholder: isCreateNew && i18n.t('form.quantity_ph'),
    },
  }, {
    __type: 'input',
    label: i18n.t(isWaterTesting ? 'form.water_unit' : 'form.unit'),
    item: {
      name: `${namespace}.unit`,
      maxLength: 40,
      placeholder: isCreateNew && i18n.t(isWaterTesting ? 'form.water_unit_ph' : 'log.unit_arable_ph'),
    },
  }, {
    __type: isPriceRelated ? 'input' : 'none',
    label: i18n.t('form.price'),
    item: {
      name: `${namespace}.price`,
      type: 'number',
      step: 0.1,
      min: 0.1,
      max: 99999999.99, // database max is numeric(10, 2)
      placeholder: isCreateNew && i18n.t('log.price_arable_ph'),
    },
  }, {
    __type: isWaterTesting ? 'none' : 'input',
    label: i18n.t('form.crop'),
    item: {
      name: `${namespace}.crop`,
      placeholder: isCreateNew && i18n.t('log.crop_ph'),
    }
  }];

  return schemaItems;
}

/**
 * Get editable values based on activity & type (which is also used to display UI)
 */

export function makeLogMetadataSchema(
  scrollAreaDOMId: string,
  formId: string,
  timeZone: string | null | undefined,
  __typename: string,
  focusedName: string,
  formValues: Record<string, any> = {},
  isCreateNew = false
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
    case 'LogArable':
      activitiesList = ARABLE_ACTIVITIES_GROUPED;
      schemaItems = makeArableMetadataSchema(formValues, focusedName, formId, isCreateNew);
      break;
    case 'LogFarmersMarket':
      activitiesList = FARMERS_MARKET_ACTIVITIES_GROUPED;
      schemaItems = makeFarmersMarketMetadataSchema(formValues);
      break;
    case 'LogLivestock':
      activitiesList = LIVESTOCK_ACTIVITIES_GROUPED;
      schemaItems = makeLivestockMetadataSchema(formValues);
      break;
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
            designClassName: 'w_350',
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
          designClassName: 'w_250',
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
