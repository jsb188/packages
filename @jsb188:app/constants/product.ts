/**
 * Products; all types
 */

export const PRODUCT_TYPES = [
	'LIVESTOCK',
	'CAL_EVENTS',
];

/**
 * Product features
 */

export const PRODUCT_FEATURES = [
  'CAL_EVENTS',
  'CAL_EVENTS_ATTENDANCE',
  'CAL_EVENTS_LOAD_LIST'
];

export const ACTIVITY_TO_FEATURE_MAP = {
  CAL_EVENTS_ATTENDANCE: ['MARKET_ATTENDANCE'],
  CAL_EVENTS_LOAD_LIST: ['MARKET_LOAD_LIST']
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
