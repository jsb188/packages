import { formatCurrency } from '@jsb188/app/utils/number.ts';
import { COMMON_ICON_NAMES } from '@jsb188/react-web/svgs/Icon';

const ARABLE_ICON_WORD_GROUPS: [string, string[]][] = [
	['vegetable-lettuce-top', ['little gem', 'lil gem', 'marciano', 'red butter', 'green gem', 'red gem', 'gems\\b', 'spretnak', 'newham', 'bokchoy', 'bok choy']],
	['vegetable-lettuce', ['lettuce', 'red oak', 'romaine', 'escarol', 'radicchio', 'braci ardenti', 'braci adenti', 'di lusia', 'di lusio', 'treviso', 'thaddeus', 'cruced\\b']],
	['vegetable-lavender', ['lavendar', 'lavender', 'anise hyssop', 'alyssum']],
	['vegetable-basil', ['basil']],
	['vegetable-beet', ['chioggia', 'beet', 'yellow tooth']],
	['vegetable-broccoli', ['cauliflow', 'broccoli', 'piracicab']],
	['vegetable-pumpkin', ['pumpkin', 'pump\\b', 'cargo pump', 'bennings green', 'benning']],
	['vegetable-spinach', ['mesclun', 'spinach', 'chard', 'mustard green', 'mix\\b']],
	['vegetable-tomato', ['tomato']],
	['fruit-grapes', ['grapes']],
	['fruit-apricot', ['apricot', 'peach', 'plum']],
	['raspberry', ['raspberr']],
	['fruit-cloud-berry', ['blackberr', 'cloudberr', 'cloud berr']],
	['fruit-billberry-blackberry-blueberry', ['blueberr', 'billberr', 'berry', '\\w*berr(?:y|ies)\\b']],
	['vegetable-asparagus', ['asparagus']],
	['vegetable-acornsquash', ['sunshine kabocha', 'acorn squash', 'acornsquash', 'yellow star patty', 'sweet pepper', 'bell pepper']],
	['fruit-strawberry', ['strawberr']], // commented now for testing
	['seasoning-chilli', ['pepper', 'chilli']],
	['vegetable-delicata-squash', ['delicata', 'delicata squash']],
	['vegetable-hubbard-squash', ['hubbard squash', 'hubbard', 'red kuri']],
	['vegetable-cucumber', ['shinto', 'cucumber', 'pickle']],
	['vegetable-butternutsquash', ['butternut squash', 'butternutsquash', 'butternut', 'squash', 'starry night']],
	['vegetable-thyme', ['summar savor', 'summer savor', 'summery savor', 'summary savor', 'thyme', 'rosemary', 'savory']],
	['vegetable-arugula', ['arugula', 'chicory', 'puntarelle', 'frisee', 'kale', 'dino', 'green curl']],
	['vegetable-parsley', ['parsley', 'beoc raab', 'wasabina', 'chervil']],
	['vegetable-carrot', ['carrot']],
	['vegetable-artichoke', ['artichoke', 'romanesco', 'star\\b', 'stars\\b']],
	['vegetable-cabbage', ['cabbag']],
	['vegetable-kohlrabi', ['kohlrab']],
	['vegetable-zucchini', ['zucchini', 'zuchini', 'midnight light']],
	['vegetable-potato', ['potato']],
	['vegetable-eggplant', ['eggplant']],
	['vegetable-jalapeno', ['jalapeno', 'jalapeño']],
	['vegetable-stinging-kettle', ['stinging kettle', 'nettle', 'cardoon', 'cynara cardunculus', 'cardunculus', 'cresta', 'shiso']],
	['vegetable-okra', ['okra']],
	['plant-1', ['sage\\b', 'sages\\b', 'marjoram', 'sorrel', 'mint']],
	['vegetable-scallion', ['scallion', 'scalion', 'spring onion', 'springonion']],
	['gardening-seed-bag', ['seed']],
	['vegetable-onion', ['onion', 'shallot', 'matador']],
	['vegetable-black-bean', ['oliv']],
	['vegetable-stringbean-1', ['bean', 'stringbean']],
	['vegetable-cilantro', ['cilantro', 'flor\\b']],
	['vegetable-radish', ['raddish', 'radish']],
	['vegetable-wasabi', ['wasabi']],
	['flower', ['flower']],
	['product-growth-tree-box', ['soil']],
	['gardening-sprinkler', ['irrigation']],
	['agriculture-machine-seeder', ['direct seed']],
	['organic-bag-leaf', ['fertilization']],
	['gardening-tools-1', ['crop protection']],
	['farming-barn-sun', ['crop monitoring', 'field']],
	['gardening-scissors', ['pruning']],
	['barbed-wire-fence', ['trellising']],
	['protein-gluten-wheat', ['preparing crops']],
	['harvest-product', ['crops', 'grading produce', 'moving produce']],
	['crop-info-biotech-1', ['estimating yield', 'other harvest']],
	['warehouse-storage', ['post harvest']],
	['temperature-control-warehouse-1', ['cold storage temperature']],
	['receipt-dollar', ['sale']],
	['organic-flask', ['water testing', 'chlorine level']],
];

const ARABLE_ICON_PRIORITY_WORDS = [
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
	'potato',
	'eggplant',
	'jalapeno',
	'jalapeño',
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
	'oliv',
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
	'asparagus',
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
	'pickle',
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
	'mint',
	'sorrel',
	'tomato',
	'grapes',
	'apricot',
	'peach',
	'plum',
	'blueberr',
	'billberr',
	'blackberr',
	'raspberr',
	'cloudberr',
	'cloud berr',
	'sweet pepper',
	'bell pepper',
	'strawberr',
	'\\w*berr(?:y|ies)\\b',
	'berry',

	// Leave at end for backup
	'marciano',
	'spretnak',
	'newham',
	'bokchoy',
	'bok choy',
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
	'pepper',
	'chilli',
	'mix\\b',
	'chard',
	'nettle',
	'savory',
	'dino',

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
	'crops',
	'estimating yield',
	'other harvest',
	'grading produce',
	'moving produce',
	'cold storage temperature',
	'post harvest',
	'sale',
	'water testing',
	'chlorine level',
	'field',
];
const ARABLE_ICON_BY_WORD = new Map(
	ARABLE_ICON_WORD_GROUPS.flatMap(([iconName, words]) => words.map((word) => [normalizeIconMatchWord(word), iconName])),
);
const ARABLE_WORD_REGEX = new RegExp(`\\b(${ARABLE_ICON_PRIORITY_WORDS.join('|')})`, 'gi');
const ARABLE_ICON_PRIORITY_MATCHERS = ARABLE_ICON_PRIORITY_WORDS.map((word) => [word, new RegExp(`^${word}$`, 'i')] as const);

/*
 * Normalize a matched icon word so regex-only word boundary markers do not affect map lookups.
 */
function normalizeIconMatchWord(word: string): string {
	return word.replace(/\\b/g, '').toLowerCase();
}

/*
 * Pick the highest-priority arable icon word from a list of regex matches.
 */
function getPreferredArableIconWord(matches: string[]): string {
	if (matches.length === 1) {
		const matchedPriorityWord = ARABLE_ICON_PRIORITY_MATCHERS.find(([, regex]) => regex.test(matches[0]))?.[0];

		return normalizeIconMatchWord(matchedPriorityWord || matches[0]);
	}

	const preferredWord = ARABLE_ICON_PRIORITY_MATCHERS.find(([, regex]) => matches.some((match) => regex.test(match)))?.[0];

	return preferredWord ? normalizeIconMatchWord(preferredWord) : normalizeIconMatchWord(matches[0]);
}

/**
 * Get the icon name from crop name by using regex
 * @param crop - The name of the crop
 * @param note - Additional note that may contain crop type
 * @param defaultIcon - The default icon to return if no match is found
 * @returns The icon name or a default icon if no match is found
 */

export function getIconNameForArable(crop?: string | undefined, note?: string | null, defaultIcon?: string): string {
	if (crop) {
		const match = crop.replace(/-/g, ' ').match(ARABLE_WORD_REGEX);
		if (match) {
			const matchedWord = getPreferredArableIconWord(match);
			const iconName = ARABLE_ICON_BY_WORD.get(matchedWord);

			if (iconName) {
				return iconName;
			}

			console.log('Missing icon lookup for crop:', crop);
		}

		// console.log('No match found for crop:', crop);
	}

	if (note) {
		return getIconNameForArable(note, null, defaultIcon);
	}

	return defaultIcon || 'seedling';
}

/**
 * Get the icon name for farmers market using regex
 * @param purchasedItem - The name of the purchased item
 * @param note - Additional note that may contain livestock type
 * @param defaultIcon - The default icon to return if no match is found
 * @returns The icon name or a default icon if no match is found
 */

export function getIconNameForFarmersMarket(
	purchasedItem?: string | null,
	note?: string | null,
	defaultIcon?: string,
): string {
	if (purchasedItem) {
		// return 'seedling';
		const FARMERS_MARKET_WORDS = [
			'hay\\b',
			'cow',
			'calf',
			'cattle',
			'bull',
			'sheep',
		];

		const regex = new RegExp(`\\b(${FARMERS_MARKET_WORDS.join('|')})`, 'gi');
		const match = purchasedItem.replace('-', ' ').match(regex);
		if (match) {
			let matchedWord;
			if (match.length === 1) {
				matchedWord = match[0].toLowerCase();
			} else {
				// If multiple matches, choose the first match from produce words
				const lcMatch = match.map((m) => m.toLowerCase());
				matchedWord = FARMERS_MARKET_WORDS.find((word) => lcMatch.includes(word));
			}

			switch (matchedWord) {
				case 'hay':
					return 'farming-hay';
				case 'cow':
				case 'calf':
				case 'cattle':
				case 'bull':
					return 'livestock-cow-body';
				default:
					console.log('Missing switchcase for crop:', purchasedItem);
			}
		}

		// console.log('No match found for farmers market:', purchasedItem);
	}

	if (note) {
		return getIconNameForFarmersMarket(note, null, defaultIcon);
	}

	return defaultIcon || 'farmers-market-kiosk';
}

/**
 * Get the icon name for grower network logs
 * @param _item - The log item text
 * @param _note - Additional note text
 * @param _defaultIcon - The default icon to return if no match is found
 * @returns The icon name or a default icon if no match is found
 */

export function getIconNameForGrowerNetwork(
	_item?: string | null,
	_note?: string | null,
	_defaultIcon?: string,
): string {
	return 'circle';
}

/**
 * Get any icon name for any word
 */

export function getIconNameForWord(
  decidingWord: any,
  text1: string,
  text2?: string | null,
  defaultIcon?: string,
) {
  switch (decidingWord) {
    case 'ARABLE':
		case 'LogArable':
			return getIconNameForArable(text1, text2, defaultIcon);
    case 'FARMERS_MARKET':
		case 'LogFarmersMarket':
			return getIconNameForFarmersMarket(text1, text2, defaultIcon);
		case 'GROWER_NETWORK':
		case 'LogGrowerNetwork':
			return getIconNameForGrowerNetwork(text1, text2, defaultIcon);
		default:
	}
	return 'circle';
}

/**
 * Get icon name for any operation using regex
 * @param details - GraphQL log details object
 * @param defaultIcon - The default icon to return if no match is found
 * @returns The icon name or a default icon if no match is found
 */

export function getIconNameForLog(
	details: any,
	preferActivityText?: boolean,
	defaultIcon_?: string,
) {
	// "crop" is deprecation support -- it should be "item" going forward
	const text1 = preferActivityText ? details.activity : details.item;
	const text2 = preferActivityText ? (details.title + ' ' + details.notes) : details.notes;
	// @ts-ignore - allow dynamic key access
	const defaultIcon = (preferActivityText && COMMON_ICON_NAMES[details.activity]) || defaultIcon_;

	// console.log('defaultIcon', preferActivityText, details.activity, defaultIcon);

  return getIconNameForWord(details.__typename, text1, text2, defaultIcon);
}

/**
 * Get title for log
 */

export function getTitleForLog(details: any): string {
	switch (details.__typename) {
		case 'LogFarmersMarket':
			{
				// Check if text from values is short, else rely on the AI summary
				const valuesText = (details.values || []).map((item: any) => {
					return `${item.label} ${item.value ? formatCurrency(item.value, false) : ''}`.trim();
				}).join(', ');

				if (valuesText.length <= 40) {
					return valuesText;
				}
			}
			break;
		default:
	}
	return details.item;
}
