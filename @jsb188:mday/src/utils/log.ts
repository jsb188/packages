import i18n from '@jsb188/app/i18n/index.ts';
import { formatCurrency, formatDecimal } from '@jsb188/app/utils/number.ts';
import { formatReferenceNumber, joinReadable, textWithBrackets, ucFirst } from '@jsb188/app/utils/string.ts';
import {
  ARABLE_ACTIVITIES_GROUPED,
  FARMERS_MARKET_ACTIVITIES_GROUPED,
  LIVESTOCK_ACTIVITIES_GROUPED,
  LOG_TYPES_BY_OPERATION
} from '../constants/log.ts';
import type { LogContentName, LogEntryData, LogTypeEnum } from '../types/log.d.ts';
import type { OrganizationOperationEnum } from '../types/organization.d.ts';

/**
 * Get content type for log by activity
 */

export function getLogContentName(activity: string): LogContentName {
	const value = {
		'SALE_PRODUCE_ORDER': 'invoice',
		'OTHER_SALE_ORDER': 'invoice',
		'FEED_PURCHASE': 'invoice',
		'OTHER_SUPPLY_PURCHASE_ACTIVITY': 'invoice',
		'MARKET_CREDIT_RECEIPT': 'receipt',
	}[activity as string] || 'log';

	return value as LogContentName;
}

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

		// #### ARABLE - Food Safety
		HYGIENE: 'teal',
		SANITATION: 'sky',
		EQUIPMENTS: 'indigo',
		BIOSECURITY: 'green',
		EMPLOYEES: 'yellow',

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

		// #### Merged into every operation
		AI_TASK: 'slate',
	} as Record<LogTypeEnum, string>;

	// Default to zinc if type is not found
	const color = logTypeToColor[type] || 'zinc';
	return color;
}

/**
 * Get all log types for the given organization operation
 * @param operation - The operation of the organization
 * @returns Array of log types for the operation
 */

export function getLogTypesForOperation(operation: OrganizationOperationEnum, includeAITask: boolean): LogTypeEnum[] {
	const logTypes = (LOG_TYPES_BY_OPERATION[operation] || []) as LogTypeEnum[];
	if (includeAITask) {
		return logTypes;
	}
	return logTypes.filter((type) => type !== 'AI_TASK');
}

/**
 * Get log type from activity; bassed on organization's industry-based operation
 * @param operation - The operation of the organization
 * @param activity - The activity of the log entry
 * @returns The log type or null if not found
 */

export function getLogTypeFromActivity(operation: OrganizationOperationEnum | string, activity: any): LogTypeEnum | null {
	let logGroup;
	switch (operation) {
		case 'ARABLE':
		case 'LogArable':
			logGroup = ARABLE_ACTIVITIES_GROUPED.find((group: any) => group[1].includes(activity));
			break;
		case 'LIVESTOCK':
		case 'LogLivestock':
			logGroup = LIVESTOCK_ACTIVITIES_GROUPED.find((group: any) => group[1].includes(activity));
			break;
		case 'FARMERS_MARKET':
		case 'LogFarmersMarket':
			logGroup = FARMERS_MARKET_ACTIVITIES_GROUPED.find((group: any) => group[1].includes(activity));
			break;
		default:
			console.warn('(!1) Cannot get log type from unknown operation type:', operation);
			return null;
	}

	return logGroup?.[0] as LogTypeEnum || null;
}

/**
 * For UI visualization, use this function to get the shortest activity text
 * @param activity - The activity of the log entry
 * @returns i18n text for activity
 */

export function getActivityText(activity: any, tryShortForm?: boolean): string {
	if (tryShortForm && i18n.has(`log.activity_short.${activity}`)) {
		return i18n.t(`log.activity_short.${activity}`);
	}
	return i18n.t(`log.activity.${activity}`);
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
		case 'LogArable': {
			const quantityText = joinReadable([formatDecimal(md.quantity, true, true), md.unit], ' ', ' ');

			let titleItem = ucFirst(md.item);
			let logSpecificText = '';

			if (logType === 'WATER') {
				logSpecificText = joinReadable([md.concentration, md.concentration && md.concentrationUnit], ' ', ' ');
			} else if (['SEED', 'SALES'].includes(logType)) {
				if (!titleItem) {
					titleItem = i18n.t('log.unknown_crop');
				}
				const totalPrice = (md?.values || []).reduce((sum: number, item: any) => sum + Number(item.value || 0), 0);
				logSpecificText = formatCurrency(totalPrice, false);
			}

			// console.log(md);
			// console.log('titleItem', titleItem);

			return textWithBrackets(
				titleItem,
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
					return `${formatCurrency(item.value, false)} ${item.label}`;
				}).join(', ');

				const totalAmount = md.values.reduce((sum: number, item: any) => sum + Number(item.value || 0), 0);
				creditsText += ` = ${i18n.t('form.total')}: ${formatCurrency(totalAmount, false)}`;
			}

			const voidText = isServer && md.voided ? i18n.t('form.void').toUpperCase() : '';
			return `${creditsText && voidText ? '(' + voidText + ')' : voidText} ${creditsText}`.trim();
		}
		case 'LIVESTOCK':
		case 'logs_livestock':
		case 'LogLivestock': {
			if (['SUPPLY_PURCHASE', 'LIVESTOCK_SALE'].includes(logType)) {
				return joinReadable(
					[
						formatReferenceNumber(md?.referenceNumber),
						formatCurrency((md?.values || []).reduce((sum: number, item: any) => sum + Number(item.value || 0), 0), false),
					],
					' - ',
					' - ',
				);
			}

			if (isServer) {
				let livestockText = '';
				if (md.livestock) {
					livestockText += 'Species: ' + ucFirst(md.livestock) + '\n';
				}
				if (d.livestockGroup) {
					livestockText += 'Group: ' + d.livestockGroup + '\n';
				}
				if (Array.isArray(d.livestockIdentifiers) && d.livestockIdentifiers.length) {
					livestockText += 'Animal ID(s): ' + d.livestockIdentifiers.join(', ') + '\n';
				}
				if (d.damIdentifier) {
					livestockText += 'Dam ID: ' + d.damIdentifier + '\n';
				}
				return livestockText.trim();
			}

			return textWithBrackets(
				ucFirst(md.livestock),
				(d.livestockGroup ? [d.livestockGroup] : []).concat(
					(d.livestockIdentifiers || []).map((id: string) => `#${id}`),
				).join(', ') + (
					d.damIdentifier ? ` (Dam: #${d.damIdentifier})` : ''
				),
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

export function getTextFormatLog(log: LogEntryData) {
	const { notes } = log.details;
	const title = getLogEntryTitle(log.details || {}, true);
	return (title + '\n\n' + (notes + '')).trim();
}
