import i18n from '@jsb188/app/i18n';
import type { OrganizationOperationEnum } from '@jsb188/app/types/organization.d';
import { formatCurrency, formatDecimal } from '@jsb188/app/utils/number';
import { textWithBrackets, ucFirst } from '@jsb188/app/utils/string';
import {
  ARABLE_ACTIVITIES_GROUPED,
  FARMERS_MARKET_ACTIVITIES_GROUPED,
  LIVESTOCK_ACTIVITIES_GROUPED
} from '../constants/log';
import type { LogEntryDataObj, LogTypeEnum } from '../types/log.d';

/**
 * Map log type to a color
 * @param type - The type of the log entry
 * @returns The color associated with the journal type
 */

export function getLogCategoryColor(type: LogTypeEnum) {
	// Do switch operation here
	// switch (operation) {
	//   case 'ARABLE':
	//   case 'LogArable':
	//     // ..
	//     break;
	//   case 'LIVESTOCK':
	//   case 'LogLivestock':
	//     // ..
	//     break;
	//   default:
	// }

	const logTypeToColor = {
		// #### ARABLE
		SEED: 'brown',
		PLANTING: 'amber',
		FIELD: 'lime',
		HARVEST: 'emerald',
		POST_HARVEST: 'cyan',
		SALES: 'blue',
		WATER: 'violet',
		DELETED: 'medium',

		// #### FARMERS_MARKET
		MARKET_RECEIPTS: 'blue',
		MARKET_OPERATIONS: 'rose',

		// #### LIVESTOCK
		SUPPLY_PURCHASE: 'brown',
		LIVESTOCK_LIFE_CYCLE: 'amber',
		LIVESTOCK_TRACKING: 'lime',
		PASTURE_LAND_MANAGEMENT: 'green',
		LIVESTOCK_HEALTHCARE: 'teal',
		LIVESTOCK_SALE: 'blue',
	} as Record<LogTypeEnum, string>;

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

export function getLogTypeFromActivity(operation: OrganizationOperationEnum | string, activity: any): LogTypeEnum | null {
	switch (operation) {
		case 'ARABLE':
    case 'ARABLE_SUPPLY_CHAIN':
		case 'LogArable':
			return ARABLE_ACTIVITIES_GROUPED.find((group: any) => group[1].includes(activity))?.[0] as LogTypeEnum || null;
		case 'LIVESTOCK':
		case 'LogLivestock':
			return LIVESTOCK_ACTIVITIES_GROUPED.find((group: any) => group[1].includes(activity))?.[0] as LogTypeEnum || null;
		case 'FARMERS_MARKET':
		case 'LogFarmersMarket':
			return FARMERS_MARKET_ACTIVITIES_GROUPED.find((group: any) => group[1].includes(activity))?.[0] as LogTypeEnum || null;
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
    case 'ARABLE_SUPPLY_CHAIN':
		case 'logs_arable':
		case 'LogArable': {
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
		case 'FARMERS_MARKET':
		case 'logs_farmers_market':
		case 'LogFarmersMarket': {
			let creditsText = '';
			if (Array.isArray(md.values) && md.values.length) {
				creditsText = md.values.map((item: any) => {
					return `${formatCurrency(item.value, 'en-US', 'USD')} ${item.label}`;
				}).join(', ');

				const totalAmount = md.values.reduce((sum: number, item: any) => sum + Number(item.value || 0), 0);
				creditsText += ` = ${i18n.t('form.total')}: ${formatCurrency(totalAmount, 'en-US', 'USD')}`;
			}

			const voidText = isServer && md.voided ? i18n.t('form.void').toUpperCase() : '';
			return `${creditsText && voidText ? '(' + voidText + ')' : voidText} ${creditsText}`.trim();
		}
		case 'LIVESTOCK':
		case 'logs_livestock':
		case 'LogLivestock': {
			return textWithBrackets(
				ucFirst(md.livestock),
				(md.livestockGroup ? [md.livestockGroup] : []).concat(
					(md.livestockIdentifiers || []).map((id: string) => `#${id}`),
				).join(', '),
				[' - ', ''],
			);
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
	const title = getLogEntryTitle(log.details || {}, true);
	return (title + '\n\n' + (notes + '')).trim();
}
