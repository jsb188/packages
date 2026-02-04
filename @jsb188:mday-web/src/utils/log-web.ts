import { formatCurrency } from '@jsb188/app/utils/number.ts';
import { COMMON_ICON_NAMES } from '@jsb188/react-web/svgs/Icon';

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
	'berry',

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

/**
 * Get the icon name from crop name by using regex
 * @param crop - The name of the crop
 * @param note - Additional note that may contain crop type
 * @param defaultIcon - The default icon to return if no match is found
 * @returns The icon name or a default icon if no match is found
 */

export function getIconNameForArable(crop?: string | undefined, note?: string | null, defaultIcon?: string): string {
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
				case 'chard':
				case 'mustard green':
				case 'mix':
					return 'vegetable-spinach';
				case 'tomato':
					return 'vegetable-tomato';
				case 'grapes':
					return 'fruit-grapes';
				case 'apricot':
				case 'peach':
				case 'plum':
					return 'fruit-apricot';
				case 'raspberr':
          return 'raspberry';
				case 'blackberr':
				case 'cloudberr':
				case 'cloud berr':
					return 'fruit-cloud-berry';
				case 'blueberr':
				case 'billberr':
				case 'berry':
					return 'fruit-billberry-blackberry-blueberry';
				case 'asparagus':
					return 'vegetable-asparagus';
				case 'sunshine kabocha':
				case 'acorn squash':
				case 'acornsquash':
				case 'yellow star patty':
				case 'sweet pepper':
				case 'bell pepper':
					return 'vegetable-acornsquash';
				case 'strawberr':
					return 'fruit-strawberry';
				case 'pepper':
				case 'chilli':
					return 'seasoning-chilli';
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
				case 'savory':
					return 'vegetable-thyme';
				case 'arugula':
				case 'chicory':
				case 'puntarelle':
				case 'frisee':
				case 'kale':
				case 'dino':
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
				case 'potato':
					return 'vegetable-potato';
				case 'eggplant':
					return 'vegetable-eggplant';
				case 'jalapeno':
				case 'jalapeño':
					return 'vegetable-jalapeno';
				case 'stinging kettle':
				case 'nettle':
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
				case 'sorrel':
				case 'mint':
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
				case 'field':
					return 'farming-barn-sun';
				case 'pruning':
					return 'gardening-scissors';
				case 'trellising':
					return 'barbed-wire-fence';
				case 'preparing crops':
					return 'protein-gluten-wheat';
				case 'crops':
					return 'harvest-product';
				case 'estimating yield':
				case 'other harvest':
					return 'crop-info-biotech-1';
				case 'grading produce':
				case 'moving produce':
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
		return getIconNameForArable(note, null, defaultIcon);
	}

	return defaultIcon || 'seedling';
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
			'cow',
			'calf',
			'cattle',
			'bull',
			'sheep',
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
				case 'cow':
				case 'calf':
				case 'cattle':
				case 'bull':
					return 'livestock-cow-body';
				default:
					console.log('Missing switchcase for crop:', purchasedItem);
			}
		}

		console.log('No match found for crop:', purchasedItem);
	}

	if (note) {
		return getIconNameForLivestock(note, null, defaultIcon);
	}

	return defaultIcon || 'oat-2';
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
    case 'LIVESTOCK':
		case 'LogLivestock':
			return getIconNameForLivestock(text1, text2, defaultIcon);
    case 'FARMERS_MARKET':
		case 'LogFarmersMarket':
			return getIconNameForFarmersMarket(text1, text2, defaultIcon);
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
