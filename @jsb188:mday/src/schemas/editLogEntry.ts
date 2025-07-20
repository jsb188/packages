// import { z } from 'zod';
import { ARABLE_ACTIVITIES_GROUPED } from '../constants/log';
import type { LogEntryGQLData } from '../types/log.d';
import i18n from '@jsb188/app/i18n';
import { getLogCategoryColor } from '../utils/log';
import { getObject } from '@jsb188/app/utils/object';

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
  __typename: string,
  focusedName: string,
  formValues: Record<string, any> = {}
) {

  let activitiesList: any[] = [];
  let schemaItems: any[] = [];

  switch (__typename) {
    case 'LogEntryArable':
      // Some of the types omit some fields, but for now, we're including all
      activitiesList = ARABLE_ACTIVITIES_GROUPED;
      schemaItems = [{
        __type: 'input_click',
        label: i18n.t('form.activity'),
        item: {
          locked: () => true,
          focused: focusedName === 'arableDetails.activity',
          name: 'arableDetails.activity',
          placeholder: i18n.t(`form.activity_ph`),
          getter: (value: string) => value ? i18n.t(`log.activity.${value}`) : '',
        },
      }, {
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

  if (schemaItems[0] && activitiesList.length) {
    // First item is always activity
    const activityValue = getObject(formValues, schemaItems[0].item.name);
    schemaItems[0].item.popOverProps = {
      id: schemaItems[0].item.name,
      zClassName: 'z9',
      position: 'bottom_left',
      offsetX: 0,
      offsetY: 7,
      iface: {
        name: 'PO_LIST',
        variables: {
          designClassName: 'w_200',
          className: 'max_h_40vh',
          options: activitiesList.reduce((acc, [type, activities], i) => {
            const colorIndicator = getLogCategoryColor(type);
            const isEnd = i === activitiesList.length - 1;

            const updatedList = acc.concat({
              __type: 'LIST_ITEM' as const,
              colorIndicator,
              text: i18n.t(`log.type_short.${type}`),
              className: 'mt_sm',
              textClassName: 'cl_md shift_down',
            }).concat(activities.map((activity: string) => ({
              __type: 'LIST_ITEM' as const,
              // colorIndicator,
              text: i18n.t(`log.activity.${activity}`),
              textClassName: 'ft_xs',
              rightIconClassName: 'ft_xs mb_2',
              value: activity,
              selected: activityValue === activity,
              variables: {
                name: 'arableDetails.activity',
                preset: 'arableDetails.activity',
                value: activity,
              },
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

  // if (item.item.name.endsWith('.activity')) {
  //   // @ts-expect-error - Lazy typing
  //   // item.item.onClick = (_e: any, inputName: string) => onClickPopOverItems(inputName);
  //   item.item.popOverProps = {
  //     zClassName: 'z9',
  //     iface: {
  //       name: 'PO_LIST',
  //       variables: {
  //         options: [{
  //           __type: 'LIST_ITEM_POPUP' as const,
  //           iconName: 'user',
  //           variables: {
  //             name: 'NOT_READY',
  //             preset: 'NOT_READY',
  //           },
  //           text: i18n.t('user.your_profile'),
  //         }, {
  //           __type: 'LIST_ITEM_POPUP' as const,
  //           iconName: 'phone',
  //           variables: {
  //             name: 'NOT_READY',
  //             preset: 'NOT_READY',
  //           },
  //           text: i18n.t('user.phone_numbers'),
  //         }, {
  //           __type: 'BREAK' as const,
  //         }, {
  //           __type: 'LIST_ITEM_POPUP' as const,
  //           iconName: 'news',
  //           variables: {
  //             name: 'new_version_update_notes',
  //             preset: 'UPDATE_NOTE',
  //           },
  //           text: i18n.t('app.latest_updates'),
  //         }, {
  //           __type: 'LIST_ITEM_POPUP' as const,
  //           iconName: 'help',
  //           variables: {
  //             name: 'NOT_READY',
  //             preset: 'NOT_READY',
  //           },
  //           text: i18n.t('form.help'),
  //         }, {
  //           __type: 'BREAK' as const,
  //         }, {
  //           __type: 'LIST_ITEM' as const,
  //           preset: 'small' as const,
  //           to: '/signout',
  //           text: i18n.t('auth.sign_out'),
  //         }]
  //       }
  //     }
  //   };
  // }

  return schemaItems;
}
