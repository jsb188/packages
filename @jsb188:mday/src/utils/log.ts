import i18n from '@jsb188/app/i18n';
import type { OrganizationOperationEnum } from '@jsb188/app/types/organization.d';
import { formatCurrency, formatDecimal } from '@jsb188/app/utils/number';
import { formatReferenceNumber, joinReadable, textWithBrackets, ucFirst } from '@jsb188/app/utils/string';
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
		case 'logs_arable':
		case 'LogArable': {
			const quantityText = joinReadable([formatDecimal(md.quantity, true, true), md.unit], ' ', ' ');

			let cropName = ucFirst(md.crop);
			let logSpecificText = '';

			if (logType === 'WATER') {
				logSpecificText = joinReadable([md.concentration, md.concentration && md.concentrationUnit], ' ', ' ');
			} else if (['SEED','SALES'].includes(logType)) {
				if (!cropName) {
					cropName = i18n.t('log.unknown_crop');
				}
        const totalPrice = (md?.values || []).reduce((sum: number, item: any) => sum + Number(item.value || 0), 0);
				logSpecificText = formatCurrency(totalPrice, false);
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
        return joinReadable([
          formatReferenceNumber(md?.referenceNumber),
          formatCurrency((md?.values || []).reduce((sum: number, item: any) => sum + Number(item.value || 0), 0), false),
        ],
          ' - ',
          ' - '
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

export function getTextFormatLog(log: LogEntryDataObj) {
	const { notes } = log.details;
	const title = getLogEntryTitle(log.details || {}, true);
	return (title + '\n\n' + (notes + '')).trim();
}

const PRODUCE_WORDS = [
	'little gem',
	'lil gem',
	'romaine',
	'cauliflow',
	'broccoli',
	'piracicab',
	'mesclun',
	'spinach',
	'mustard green',
	'arugula',
	'kale',
	'kohlrab',
	'cabbag',
	'parsley',
	'beoc raab',
	'wasabina',
	'chervil',
	'basil',
	'artichoke',
	'romanesco',
	'zucchini',
	'zuchini',
	'carrot',
	'midnight light',
	'cilantro',
	'bennings green',
	'lettuce',
	'escarol',
	'raddish',
	'radish',
	'bean',
	'stringbean',
	'stinging kettle',
	'radicchio',
	'braci ardenti',
	'braci adenti',
	'chicory',
	'puntarelle',
	'chioggia',
	'beet',
	'thaddeus',
	'sunshine kabocha',
	'yellow star patty',
	'butternut squash',
	'butternutsquash',
	'acorn squash',
	'acornsquash',
	'delicata squash',
	'hubbard squash',
	'hubbard',
	'red kuri',
	'squash',
	'cargo pump',
	'pumpkin',
	'cucumber',
	'shiso',
	'shinto',
	'thyme',
	'rosemary',
	'di lusia',
	'di lusio',
	'treviso',
	'scallion',
	'scalion',
	'spring onion',
	'springonion',
	'onion',
	'shallot',
	'wasabi',
	'lavendar',
	'lavender',
	'anise hyssop',
	'alyssum',
	'marjoram',
	'tomato',

	// Leave at end for backup
	'marciano',
	'spretnak',
	'newham',
	'red butter',
	'frisee',
	'cresta',
	'cardoon',
	'cynara cardunculus',
	'cardunculus',
	'butternut',
	'green gem',
	'red gem',
	'starry night',
	'benning',
	'summar savor',
	'summer savor',
	'summery savor',
	'summary savor',
	'delicata',
	'matador',
	'green curl',
	'red oak',
	'flower',
	'yellow tooth',
	'sage\\b',
	'sages\\b',
	'okra',
	'flor\\b',
	'gems\\b',
	'pump\\b',
	'cruced\\b',
	'star\\b',
	'stars\\b',
	'seed',

  // log activities
  // NOTE: If i18n words change, these have to change too
  'soil',
  'irrigation',
  'fertilization',
  'crop protection',
  'crop monitoring',
  'direct seed',
  'pruning',
  'trellising',
  'preparing crops',
  'other field',
  'crops',
  'estimating yield',
  'other harvest',
  'handling or grading produce',
  'packaging or moving produce',
  'cold storage temperature',
  'post harvest',
  'sale',
  'water testing',
  'chlorine level',
];

/**
 * Get the icon name from crop name by using regex
 * @param crop - The name of the crop
 * @param note - Additional note that may contain crop type
 * @param defaultIcon - The default icon to return if no match is found
 * @returns The icon name or a default icon if no match is found
 */

export function getIconNameForArable(crop?: string | undefined, note?: string | null): string {
	if (crop) {
		const regex = new RegExp(`\\b(${PRODUCE_WORDS.join('|')})`, 'gi');
		const match = crop.replace('-', ' ').match(regex);
		if (match) {
			let matchedWord;
			if (match.length === 1) {
				matchedWord = match[0].toLowerCase();
			} else {
				// If multiple matches, choose the first match from produce words
				const lcMatch = match.map((m) => m.toLowerCase());
				matchedWord = PRODUCE_WORDS.find((word) => lcMatch.includes(word));
			}

			switch (matchedWord) {
				case 'little gem':
				case 'lil gem':
				case 'marciano':
				case 'red butter':
				case 'green gem':
				case 'red gem':
				case 'gems':
				case 'spretnak':
				case 'newham':
					return 'vegetable-lettuce-top';
				case 'lettuce':
				case 'red oak':
				case 'romaine':
				case 'escarol':
				case 'radicchio':
				case 'braci ardenti':
				case 'braci adenti':
				case 'di lusia':
				case 'di lusio':
				case 'treviso':
				case 'thaddeus':
				case 'cruced':
					return 'vegetable-lettuce';
				case 'lavendar':
				case 'lavender':
				case 'anise hyssop':
				case 'alyssum':
					return 'vegetable-lavender';
				case 'basil':
					return 'vegetable-basil';
				case 'chioggia':
				case 'beet':
				case 'yellow tooth':
					return 'vegetable-beet';
				case 'cauliflow':
				case 'broccoli':
				case 'piracicab':
					return 'vegetable-broccoli';
				case 'pumpkin':
				case 'pump':
				case 'cargo pump':
				case 'bennings green':
				case 'benning':
					return 'vegetable-pumpkin';
				case 'mesclun':
				case 'spinach':
				case 'mustard green':
					return 'vegetable-spinach';
				case 'tomato':
					return 'vegetable-tomato';
				case 'sunshine kabocha':
				case 'acorn squash':
				case 'acornsquash':
				case 'yellow star patty':
					return 'vegetable-acornsquash';
				case 'delicata':
				case 'delicata squash':
					return 'vegetable-delicata-squash';
				case 'hubbard squash':
				case 'hubbard':
				case 'red kuri':
					return 'vegetable-hubbard-squash';
				case 'shinto':
				case 'cucumber':
					return 'vegetable-cucumber';
				case 'butternut squash':
				case 'butternutsquash':
				case 'butternut':
				case 'squash':
				case 'starry night':
					return 'vegetable-butternutsquash';
				case 'summar savor':
				case 'summer savor':
				case 'summery savor':
				case 'summary savor':
				case 'thyme':
        case 'rosemary':
					return 'vegetable-thyme';
				case 'arugula':
				case 'chicory':
				case 'puntarelle':
				case 'frisee':
				case 'kale':
				case 'green curl':
					return 'vegetable-arugula';
				case 'parsley':
				case 'beoc raab':
				case 'wasabina':
				case 'chervil':
					return 'vegetable-parsley';
				case 'carrot':
					return 'vegetable-carrot';
				case 'artichoke':
				case 'romanesco':
				case 'star':
				case 'stars':
					return 'vegetable-artichoke';
				case 'cabbag':
					return 'vegetable-cabbage';
				case 'kohlrab':
					return 'vegetable-kohlrabi';
				case 'zucchini':
				case 'zuchini':
				case 'midnight light':
					return 'vegetable-zucchini';
				case 'stinging kettle':
				case 'cardoon':
				case 'cynara cardunculus':
				case 'cardunculus':
				case 'cresta':
				case 'shiso':
					return 'vegetable-stinging-kettle';
				case 'okra':
					return 'vegetable-okra';
				case 'sage':
				case 'marjoram':
					return 'plant-1';
				case 'scallion':
				case 'scalion':
				case 'spring onion':
				case 'springonion':
					return 'vegetable-scallion';
				case 'seed':
					return 'gardening-seed-bag';
				case 'onion':
				case 'shallot':
				case 'matador':
					return 'vegetable-onion';
				case 'bean':
				case 'stringbean':
					return 'vegetable-stringbean-1';
				case 'cilantro':
				case 'flor':
					return 'vegetable-cilantro';
				case 'raddish':
				case 'radish':
					return 'vegetable-radish';
				case 'wasabi':
					return 'vegetable-wasabi';
				case 'flower':
					return 'flower';
        case 'soil':
          return 'product-growth-tree-box';
        case 'irrigation':
          return 'gardening-sprinkler';
        case 'direct seed':
          return 'agriculture-machine-seeder';
        case 'fertilization':
          return 'organic-bag-leaf';
        case 'crop protection':
          return 'gardening-tools-1';
        case 'crop monitoring':
          return 'farming-barn-sun';
        case 'pruning':
          return 'gardening-scissors'
        case 'trellising':
          return 'barbed-wire-fence';
        case 'preparing crops':
          return 'protein-gluten-wheat';
        case 'other field':
          return 'truck-animal';
        case 'crops':
          return 'harvest-product';
        case 'estimating yield':
        case 'other harvest':
          return 'crop-info-biotech-1';
        case 'handling or grading produce':
        case 'packaging or moving produce':
          return 'harvest-product';
        case 'post harvest':
          return 'warehouse-storage';
        case 'cold storage temperature':
          return 'temperature-control-warehouse-1';
        case 'sale':
          return 'receipt-dollar';
        case 'water testing':
        case 'chlorine level':
          return 'organic-flask';
				default:
					console.log('Missing switchcase for crop:', crop);
			}
		}

		// console.log('No match found for crop:', crop);
	}

	if (note) {
		return getIconNameForArable(note);
	}

	// return 'harvest-product';
	return 'seedling';
}


/**
 * Get the icon name for livestock using regex
 * @param purchasedItem - The name of the purchased item
 * @param note - Additional note that may contain livestock type
 * @param defaultIcon - The default icon to return if no match is found
 * @returns The icon name or a default icon if no match is found
 */

export function getIconNameForLivestock(
	purchasedItem?: string | null,
	note?: string | null,
	defaultIcon?: string,
): string {
	if (purchasedItem) {
		// return 'seedling';
		const LIVESTOCK_WORDS = [
			'hay\\b',
		];

		const regex = new RegExp(`\\b(${LIVESTOCK_WORDS.join('|')})`, 'gi');
		const match = purchasedItem.replace('-', ' ').match(regex);
		if (match) {
			let matchedWord;
			if (match.length === 1) {
				matchedWord = match[0].toLowerCase();
			} else {
				// If multiple matches, choose the first match from produce words
				const lcMatch = match.map((m) => m.toLowerCase());
				matchedWord = LIVESTOCK_WORDS.find((word) => lcMatch.includes(word));
			}

			switch (matchedWord) {
				case 'hay':
					return 'farming-hay';
				default:
					console.log('Missing switchcase for crop:', purchasedItem);
			}
		}

		console.log('No match found for crop:', purchasedItem);
	}

	if (note) {
		return getIconNameForLivestock(note, null, defaultIcon);
	}

	// return 'harvest-product';
	return defaultIcon || 'oat-2';
}
