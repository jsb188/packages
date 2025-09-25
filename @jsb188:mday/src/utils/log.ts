import i18n from '@jsb188/app/i18n';
import type { ColorEnum } from '@jsb188/app/types/app.d';
import type { OrganizationOperationEnum } from '@jsb188/app/types/organization.d';
import { formatCurrency, formatDecimal } from '@jsb188/app/utils/number';
import { textWithBrackets, ucFirst } from '@jsb188/app/utils/string';
import { ARABLE_ACTIVITIES_GROUPED, FARMERS_MARKET_ACTIVITIES_GROUPED } from '../constants/log';
import type { LogEntryDataObj, LogTypeEnum } from '../types/log.d';

/**
 * Map log type to a color
 * @param type - The type of the log entry
 * @returns The color associated with the journal type
 */

export function getLogCategoryColor(type: LogTypeEnum): ColorEnum {

	// Do switch operation here
	// switch (operation) {
	//   case 'ARABLE':
	//   case 'LogEntryArable':
	//     // ..
	//     break;
	//   case 'LIVESTOCK':
	//   case 'LogEntryLivestock':
	//     // ..
	//     break;
	//   default:
	// }

	const logTypeToColor = {
    // ARABLE
		SEED: 'brown',
		PLANTING: 'amber',
		FIELD: 'lime',
		HARVEST: 'emerald',
		POST_HARVEST: 'cyan',
		SALES: 'blue',
		WATER: 'violet',
		DELETED: 'medium',

    // FARMERS_MARKET
    MARKET_RECEIPTS: 'blue',
		MARKET_OPERATIONS: 'rose',
	} as Record<LogTypeEnum, ColorEnum>;

	// Default to zinc if type is not found
	const color = logTypeToColor[type] || 'zinc';
	return color;
}

/**
 * Get log type from activity; bassed on organization's industry-based operation
 * @param operation - The operation of the organization
 * @param activity - The activity of the log entry
 * @returns The log type or null if not found
 */

export function getLogTypeFromActivity(operation: OrganizationOperationEnum | string, activity: any) {
	switch (operation) {
		case 'ARABLE':
		case 'LogEntryArable':
			return ARABLE_ACTIVITIES_GROUPED.find((group: any) => group[1].includes(activity))?.[0] || null;
		case 'LIVESTOCK':
		case 'LogEntryLivestock':
			return null; // Livestock activities are not defined in this context
		case 'FARMERS_MARKET':
		case 'LogEntryFarmersMarket':
			return FARMERS_MARKET_ACTIVITIES_GROUPED.find((group: any) => group[1].includes(activity))?.[0] || null;
		default:
			console.warn('(!1) Cannot get log type from unknown operation type:', operation);
			return null;
	}
}

/**
 * Get the title for log entry for each Union interface
 * @param details - The details Union interface for log entry
 * @param isServer - True if used in server
 * @param logType - Use this param if this function is used in server; {d.type} will be undefined unless manually set
 * @param iface - In unique cases (such as client-side form), you can use this for interface name
 * @return The title for the log entry
 */

export function getLogEntryTitle(d: any, isServer?: boolean, logType_?: string, iface?: string): string {
	const { __typename, __table, type } = d;
	const logType = logType_ || type;
	const md = isServer ? (d.metadata || {}) : d;

	switch (iface || __typename || __table) {
		case 'ARABLE':
		case 'logs_arable':
		case 'LogEntryArable': {
			const quantityText = [formatDecimal(md.quantity, true, true), md.unit].filter(Boolean).join(' ');

			let cropName = ucFirst(md.crop);
			let logSpecificText = '';

			if (logType === 'WATER') {
				logSpecificText = [md.concentration, md.concentration && md.concentrationUnit].filter(Boolean).join(' ');
			} else if (logType === 'SALES') {
				if (!cropName) {
					cropName = i18n.t('log.unknown_crop');
				}
				logSpecificText = formatCurrency(md.price, 'en-US', 'USD');
			}

			return textWithBrackets(
				cropName,
				[
					logSpecificText + (logSpecificText && quantityText ? ',' : ''),
					quantityText,
				],
			);
		}
    case 'logs_farmers_market':
    case 'FARMERS_MARKET': {
      const creditsText = md.values?.map((item: any) => {
        return `${formatCurrency(item.value, 'en-US', 'USD')} ${item.label}`;
      }).join(', ') || '';

      const voidText = md.void ? i18n.t('form.void').toUpperCase() : '';
      return `${creditsText} ${creditsText && voidText ? '(' + voidText + ')' : voidText}`.trim();
    }
		case 'logs_livestock':
		case 'LogEntryLivestock': {
			// .. live stock logs here ..
		}
		default:
	}
	return '..';
}

/**
 * Get the text format for this log
 * @param log - Log entry object from database
 * @return Log in text format
 */

export function getTextFormatLog(log: LogEntryDataObj) {
	const { notes } = log.details;
	const title = getLogEntryTitle(log.details, true);
	return (title + '\n\n' + (notes + '')).trim();
}
