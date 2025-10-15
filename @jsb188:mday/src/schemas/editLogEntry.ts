import i18n from '@jsb188/app/i18n';
import { getCalDate } from '@jsb188/app/utils/datetime';
import { formatCurrency } from '@jsb188/app/utils/number';
import { getObject } from '@jsb188/app/utils/object';
import { textWithBrackets } from '@jsb188/app/utils/string';
import { getTimeZoneCode } from '@jsb188/app/utils/timeZone';
import { ARABLE_ACTIVITIES_GROUPED, FARMERS_MARKET_ACTIVITIES_GROUPED, LIVESTOCK_ACTIVITIES_GROUPED } from '../constants/log';
import type { LogArableMetadataGQL, LogEntryGQL, LogFarmersMarketMetadataGQL, LogLivestockMetadataGQL, LogTypeEnum } from '../types/log.d';
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
        location: details.location,
        fieldLocation: details.fieldLocation,
        referenceNumber: details.referenceNumber,
        otherParty: details.otherParty,
        values: details.values,
        notes: details.notes,
      };
    } break;
    case 'LogFarmersMarket': {
      const details = logEntry.details as LogFarmersMarketMetadataGQL;
      formValues.farmersMarketDetails = {
        activity: details.activity,
        childOrgId: details.childOrgId,
        referenceNumber: details.referenceNumber,
        voided: details.voided,
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
        livestockGroup: details.livestockGroup,
        referenceNumber: details.referenceNumber,
        otherParty: details.otherParty,
        values: details.values,
        item: details.item,
        quantity: details.quantity,
        unit: details.unit,
        location: details.location,
        fieldLocation: details.fieldLocation,
        price: details.price,
        tax: details.tax,
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
  //   voided: Boolean
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
        if (['quantity','price','tax','concentration'].includes(subKey)) {
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

export type ValidMetadataFieldName =
  | 'activity'

  // ARABLE
  | 'water_testing'
  | 'concentration_unit'
  | 'water_quantity'
  | 'quantity'
  | 'water_unit'
  | 'unit'
  | 'price'
  | 'crop'
  | 'purchased_item'
  | 'fieldLocation'
  | 'location_water'
  | 'location_arable'

  // FARMERS_MARKET
  | 'receiptNumber'
  | 'childOrgId'
  | 'void'
  | 'marketCredits'

  // LIVESTOCK
  | 'livestock'
  | 'livestockIdentifiers'
  | 'livestockGroup'
  | 'otherParty'
  | 'invoiceNumber'
  | 'invoiceItems'
  | 'tax'
  | 'item_used'
  | 'location_livestock'
  | null; // Need this for eslint satisfcation, but null will never happen (because of a filter())

function makeMetadataSchema(
  namespace: string,
  formValues: Record<string, any>,
  metadataParams: MakeMetadataSchemaParams,
  basePopOverProps: Record<string, any>,
  schemaFields: ValidMetadataFieldName[]
) {
  const { scrollAreaDOMId, formId, timeZone, focusedName, isCreateNew } = metadataParams;
  const schemaItems = schemaFields.map((field: ValidMetadataFieldName) => {
    switch (field) {
      case 'activity':
        return {
          __type: 'input_click',
          forceClickId: `input_click_${namespace}.activity`,
          label: i18n.t('form.activity'),
          item: {
            locked: () => true,
            focused: focusedName === (formId + '_activity'),
            name: `${namespace}.activity`,
            placeholder: isCreateNew ? i18n.t(`form.activity_ph`) : '',
            getter: (value: string) => value ? i18n.t(`log.activity.${value}`) : '',
          },
        };
      case 'water_testing':
        return {
          __type: 'input',
          label: i18n.t('form.concentration'),
          item: {
            name: `${namespace}.concentration`,
            type: 'number',
            step: 0.1,
            min: 0.1,
            max: 99999999.99, // database max is numeric(10, 2)
            placeholder: isCreateNew ? i18n.t('form.concentration_ph') : '',
          }
        };
      case 'concentration_unit':
        return {
          __type: 'input',
          label: i18n.t('form.concentration_unit'),
          item: {
            name: `${namespace}.concentrationUnit`,
            maxLength: 40,
            placeholder: isCreateNew ? i18n.t('form.concentration_unit_ph') : '',
          },
        };
      case 'water_quantity':
        return {
          __type: 'input',
          label: i18n.t('form.water_quantity'),
          item: {
            name: `${namespace}.quantity`,
            type: 'number',
            step: 0.1,
            min: 0.1,
            max: 99999999.99, // database max is numeric(10, 2)
            placeholder: isCreateNew ? i18n.t('form.quantity_ph') : '',
          }
        };
      case 'quantity':
        return {
          __type: 'input',
          label: i18n.t('form.quantity'),
          item: {
            name: `${namespace}.quantity`,
            type: 'number',
            step: 0.1,
            min: 0.1,
            max: 99999999.99, // database max is numeric(10, 2)
            placeholder: isCreateNew ? i18n.t('form.quantity_ph') : '',
          }
        };
      case 'water_unit':
        return {
          __type: 'input',
          label: i18n.t('form.water_unit'),
          item: {
            name: `${namespace}.unit`,
            maxLength: 40,
            placeholder: isCreateNew ? i18n.t('form.water_unit_ph') : '',
          }
        };
      case 'unit':
        return {
          __type: 'input',
          label: i18n.t('form.unit'),
          item: {
            name: `${namespace}.unit`,
            maxLength: 40,
            placeholder: isCreateNew ? i18n.t('log.unit_arable_ph') : '',
          }
        };
      case 'location_arable':
        return {
          __type: 'input',
          label: i18n.t('form.location'),
          item: {
            name: `${namespace}.location`,
            maxLength: 40,
            placeholder: isCreateNew ? i18n.t('log.location_arable_ph') : '',
          }
        };
      case 'location_water':
        return {
          __type: 'input',
          label: i18n.t('form.location'),
          item: {
            name: `${namespace}.location`,
            maxLength: 40,
            placeholder: isCreateNew ? i18n.t('log.location_water_ph') : '',
          }
        };
      case 'location_livestock':
        return {
          __type: 'input',
          label: i18n.t('form.location'),
          item: {
            name: `${namespace}.location`,
            maxLength: 100,
            placeholder: isCreateNew ? i18n.t('log.location_livestock_ph') : '',
          }
        };
      case 'fieldLocation':
        return {
          __type: 'input',
          label: i18n.t('log.fieldLocation'),
          item: {
            name: `${namespace}.fieldLocation`,
            maxLength: 100,
            placeholder: isCreateNew ? i18n.t('log.fieldLocation_ph') : '',
          }
        };
      case 'price':
        return {
          __type: 'input',
          label: i18n.t('form.price'),
          item: {
            name: `${namespace}.price`,
            type: 'number',
            step: 0.1,
            min: 0.1,
            max: 99999999.99, // database max is numeric(10, 2)
            placeholder: isCreateNew ? i18n.t('form.price_ph') : '',
          },
        };
      case 'tax':
        return {
          __type: 'input',
          label: i18n.t('form.tax'),
          item: {
            name: `${namespace}.tax`,
            type: 'number',
            step: 0.1,
            min: 0.1,
            max: 99999999.99, // database max is numeric(10, 2)
            placeholder: isCreateNew ? i18n.t('form.tax_ph') : '',
          },
        };
      case 'crop':
        return {
          __type: 'input',
          label: i18n.t('form.crop'),
          item: {
            name: `${namespace}.crop`,
            placeholder: isCreateNew ? i18n.t('log.crop_ph') : '',
          }
        };
      case 'purchased_item':
        return {
          __type: 'input',
          label: i18n.t('form.purchase_summary'),
          item: {
            name: `${namespace}.crop`,
            placeholder: isCreateNew ? i18n.t('log.crop_ph') : '',
          }
        };
      case 'livestock':
        return {
          __type: 'input',
          label: i18n.t('log.livestock'),
          item: {
            name: `${namespace}.livestock`,
            placeholder: isCreateNew ? i18n.t('log.livestock_ph') : '',
          }
        };
      case 'livestockIdentifiers':
        return {
          __type: 'input',
          label: i18n.t('log.id_tags'),
          item: {
            name: `${namespace}.livestockIdentifiers`,
            placeholder: isCreateNew ? i18n.t('log.id_tags_ph') : '',
            getter: (value: string[]) => value ? value.join(',') : '',
            setter: (value: string) => value.split(',')
          }
        };
      case 'livestockGroup':
        return {
          __type: 'input',
          label: i18n.t('log.group'),
          item: {
            name: `${namespace}.livestockGroup`,
            placeholder: isCreateNew ? i18n.t('log.group_ph') : '',
          }
        };
      case 'otherParty':
        return {
          __type: 'input',
          label: i18n.t('form.vendor'),
          item: {
            name: `${namespace}.otherParty`,
          }
        };
      case 'invoiceNumber':
        return {
          __type: 'input',
          label: i18n.t('log.invoice_number'),
          item: {
            name: `${namespace}.referenceNumber`,
          }
        };
      case 'receiptNumber':
        return {
          __type: 'input',
          label: i18n.t('log.receipt_number'),
          item: {
            name: `${namespace}.referenceNumber`,
            // placeholder: isCreateNew ? i18n.t('log.group_ph') : '',
            // getter: (value: string[]) => value ? value.join(',') : '',
            // setter: (value: string) => value.split(',')
          }
        };
      case 'childOrgId':
        return {
          __type: 'input',
          label: i18n.t('log.receipt_for'),
          item: {
            name: `${namespace}.childOrgId`,
            // placeholder: isCreateNew ? i18n.t('log.group_ph') : '',
            // getter: (value: string[]) => value ? value.join(',') : '',
            // setter: (value: string) => value.split(',')
          }
        };
      case 'void':
        return {
          __type: 'input_click',
          forceClickId: `input_click_${namespace}.voided`,
          label: i18n.t('form.void'),
          inputClassName: formValues[namespace]?.voided ? 'cl_red' : '',
          item: {
            // locked: () => true,
            focused: focusedName === (formId + '_void'),
            name: `${namespace}.voided`,
            placeholder: isCreateNew ? i18n.t(`form.void_ph`) : '',
            getter: (value: string) => i18n.t(value ? 'log.receipt_is_void' : 'log.receipt_is_not_void'),
          },
          popOverProps: {
            id: formId + '_void',
            ...basePopOverProps,
            iface: {
              name: 'PO_LIST',
              variables: {
                designClassName: 'w_250',
                className: 'max_h_40vh',
                options: [{
                  __type: 'LIST_ITEM' as const,
                  text: i18n.t('log.receipt_is_not_void'),
                  iconName: 'receipt-dollar',
                  selected: !formValues[namespace]?.voided,
                  name: `${namespace}.voided`,
                  value: false,
                }, {
                  __type: 'LIST_ITEM' as const,
                  text: i18n.t('log.receipt_is_void'),
                  iconName: 'receipt-off',
                  selected: formValues[namespace]?.voided === true,
                  name: `${namespace}.voided`,
                  value: true,
                }]
              }
            }
          }
        };
      case 'invoiceItems':
        return {
          __type: 'input_click',
          label: i18n.t('log.invoice_items'),
          forceClickId: `input_click_${namespace}.values`,
          item: {
            // locked: () => true,
            focused: focusedName === (formId + '_values'),
            name: `${namespace}.values`,
            placeholder: isCreateNew ? i18n.t(`log.invoice_items_ph`) : '',
            getter: (labelsAndValues: string[]) => {
              return labelsAndValues?.map((lv: any) => {
                return textWithBrackets(
                  `${lv.quantity ? `${lv.quantity} ` : ''}${lv.label}`,
                  formatCurrency(lv.value, 'en-US', 'USD'),
                );
              }).join(', ');
            },
          },
          popOverProps: {
            id: formId + '_invoiceItems',
            ...basePopOverProps,
            iface: {
              name: 'PO_LABELS_AND_VALUES',
              variables: {
                gridLayoutStyle: '70px 1fr 85px',
                designClassName: 'w_400',
                className: 'max_h_40vh',
                // flipInputOrder: true,
                forceNumericValues: true,
                includeQuantity: true,
                name: `${namespace}.values`,
                labels: [i18n.t('form.quantity'), i18n.t('log.invoice_item'), `$ ${i18n.t('form.amount')}`],
                inputs: formValues[namespace]?.values || [],
              }
            }
          }
        };
      case 'marketCredits':
        return {
          __type: 'input_click',
          label: i18n.t('log.marketCredits'),
          forceClickId: `input_click_${namespace}.values`,
          item: {
            // locked: () => true,
            focused: focusedName === (formId + '_values'),
            name: `${namespace}.values`,
            placeholder: isCreateNew ? i18n.t(`log.marketCredits_ph`) : '',
            getter: (labelsAndValues: string[]) => {
              return labelsAndValues?.map((lv: any) => {
                return `${formatCurrency(lv.value, 'en-US', 'USD')} ${lv.label}`;
              }).join(', ');
            },
          },
          popOverProps: {
            id: formId + '_marketCredits',
            ...basePopOverProps,
            iface: {
              name: 'PO_LABELS_AND_VALUES',
              variables: {
                gridLayoutStyle: '85px 1fr',
                designClassName: 'w_250',
                className: 'max_h_40vh',
                flipInputOrder: true,
                forceNumericValues: true,
                name: `${namespace}.values`,
                labels: [`$ ${i18n.t('form.amount')}`, i18n.t('log.name_of_credit')],
                inputs: formValues[namespace]?.values || [],
              }
            }
          }
        };
      default:
        console.warn(`Field ${field} is not defined in metadata schema.`);
        return null;
    }
  }).filter(Boolean);

  return schemaItems;
}

/**
 * Get schema fields from log type
 */

export function getSchemaFieldsFromLog(__typename: string, logType: LogTypeEnum): ValidMetadataFieldName[] {

  let schemaFields: ValidMetadataFieldName[];
  switch (__typename) {
    case 'LogArable': {
      const isWaterTesting = logType === 'WATER';
      const isSale = ['SALES'].includes(logType!);
      const isPurchase = ['SEED'].includes(logType!);
      const isSaleOrPurchase = isSale || isPurchase;

      schemaFields = [
        'activity',
        isWaterTesting ? 'water_testing' : null,
        isWaterTesting ? 'concentration_unit' : null,
        isWaterTesting ? 'water_quantity' : isSaleOrPurchase ? null : 'quantity',
        isWaterTesting ? 'water_unit' : isSaleOrPurchase ? null : 'unit',
        isWaterTesting ? null : isSaleOrPurchase ? 'purchased_item' : 'crop',
        isSaleOrPurchase ? 'otherParty' : null,
        isSaleOrPurchase ? 'invoiceNumber' : null,
        isSaleOrPurchase ? 'invoiceItems' : null,
        isSaleOrPurchase ? 'tax' : null,
        isSaleOrPurchase ? null : isWaterTesting ? 'location_water' : 'location_arable',
        isSaleOrPurchase ? null : 'fieldLocation',
      ];
    } break;
    case 'LogFarmersMarket': {
      const isReceipt = ['MARKET_RECEIPTS'].includes(logType);

      schemaFields = [
        'activity',
        isReceipt ? 'receiptNumber' : null,
        'childOrgId',
        isReceipt ? 'void' : null,
        isReceipt ? 'marketCredits' : null,
      ];
    } break;
    case 'LogLivestock': {
      const isLivestock = ['LIVESTOCK_LIFE_CYCLE', 'LIVESTOCK_TRACKING', 'LIVESTOCK_HEALTHCARE'].includes(logType);
      const isSupplyPurchase = logType === 'SUPPLY_PURCHASE';
      const isLandManagement = logType === 'PASTURE_LAND_MANAGEMENT';

      schemaFields = [
        'activity',
        isLivestock ? 'livestock' : null,
        isLivestock ? 'livestockIdentifiers' : null,
        isLivestock ? 'livestockGroup' : null,
        isSupplyPurchase ? 'otherParty' : null,
        isSupplyPurchase ? 'invoiceNumber' : null,
        isSupplyPurchase ? 'invoiceItems' : null,
        isSupplyPurchase ? 'tax' : null,
        isLandManagement ? 'item_used' : null,
        isLivestock || isSupplyPurchase ? null : 'quantity',
        isLivestock || isSupplyPurchase ? null : 'unit',
        !isSupplyPurchase ? 'location_livestock' : null,
        isLivestock ? 'price' : null,
        isLivestock ? null : 'fieldLocation',
      ];
    } break;
    default:
      schemaFields = [];
  }

  return schemaFields.filter(Boolean);
}

/**
 * Get editable values based on activity & type (which is also used to display UI)
 */

interface MakeMetadataSchemaParams {
  __typename: string;
  scrollAreaDOMId: string;
  formId: string;
  timeZone: string | null | undefined;
  focusedName: string;
  isCreateNew: boolean;
}

export function makeLogMetadataSchema(
  formValues: Record<string, any> = {},
  metadataParams: MakeMetadataSchemaParams,
) {
  const { __typename, scrollAreaDOMId, formId, timeZone, focusedName, isCreateNew } = metadataParams;

  let activitiesList: any[] = [];
  let schemaItems: any[] = [];

  const basePopOverProps = {
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

  const namespace = {
    LogArable: 'arableDetails',
    LogFarmersMarket: 'farmersMarketDetails',
    LogLivestock: 'livestockDetails',
  }[__typename] || '';

  const logType = getLogTypeFromActivity(__typename, formValues[namespace]?.activity)!;
  const schemaFields = getSchemaFieldsFromLog(__typename, logType);

  switch (__typename) {
    case 'LogArable': {
      activitiesList = ARABLE_ACTIVITIES_GROUPED;
      schemaItems = makeMetadataSchema(namespace, formValues, metadataParams, basePopOverProps, schemaFields);
    } break;
    case 'LogFarmersMarket': {
      activitiesList = FARMERS_MARKET_ACTIVITIES_GROUPED;
      schemaItems = makeMetadataSchema(namespace, formValues, metadataParams, basePopOverProps, schemaFields);
    } break;
    case 'LogLivestock': {
      activitiesList = LIVESTOCK_ACTIVITIES_GROUPED;
      schemaItems = makeMetadataSchema(namespace, formValues, metadataParams, basePopOverProps, schemaFields);
    } break;
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
        ...basePopOverProps,
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
      ...basePopOverProps,
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
