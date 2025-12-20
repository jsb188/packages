/**
 * Products; all types
 */

export const PRODUCT_TYPES = [
	'LIVESTOCK',
	'CAL_EVENTS',
	'FOOD_SAFETY',
	'GLOBAL_GAP',
];

/**
 * Product features
 */

export const FEATURES_BY_OPERATION = {
	ARABLE: [
		'NORMAL_LOGGING', // First item is always the default
		'FOOD_SAFETY',
		'GLOBAL_GAP',
    'ORGANIC_CERTIFICATION'
	],
	FARMERS_MARKET: [
		'NORMAL_LOGGING',
		'CAL_EVENTS',
		'CAL_EVENTS_ATTENDANCE',
		'CAL_EVENTS_LOAD_LIST',
	],
	LIVESTOCK: [
		'NORMAL_LOGGING',
		'LIVESTOCK',
	],
};

export const PRODUCT_FEATURES = [
	...FEATURES_BY_OPERATION.ARABLE,
	...FEATURES_BY_OPERATION.FARMERS_MARKET,
	...FEATURES_BY_OPERATION.LIVESTOCK,
].filter((value, index, self) => self.indexOf(value) === index);

export const ACTIVITY_TO_FEATURE_MAP = {
	CAL_EVENTS_ATTENDANCE: ['MARKET_ATTENDANCE'],
	CAL_EVENTS_LOAD_LIST: ['MARKET_LOAD_LIST'],
};

/**
 * Products; Livestock
 */

export const PRODUCT_LIVESTOCK_TYPES = [
	'CATTLE',
	'HORSE',
	'GOAT',
	'SHEEP',
	'POULTRY',
	'PIG',
	'OTHER_LIVESTOCK',
];

export const PRODUCT_LIVESTOCK_STATUS = [
	'ALIVE',
	'SICK',
	'SOLD',
	'DECEASED',
];
