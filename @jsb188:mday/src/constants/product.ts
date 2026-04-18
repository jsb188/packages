/**
 * Products; all types
 */

export const PRODUCT_TYPES = [
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
	],
	FARMERS_MARKET: [
		'NORMAL_LOGGING',
	],
	LIVESTOCK: [
		'NORMAL_LOGGING',
	],
  GROWER_NETWORK: [
    'NORMAL_LOGGING',
    'SITE_INSPECTION'
  ]
};

export const PRODUCT_FEATURES = [
	...FEATURES_BY_OPERATION.ARABLE,
	...FEATURES_BY_OPERATION.FARMERS_MARKET,
	...FEATURES_BY_OPERATION.LIVESTOCK,
  ...FEATURES_BY_OPERATION.GROWER_NETWORK,
].filter((value, index, self) => self.indexOf(value) === index);

export const PRODUCT_FEATURES_WORKFLOW = PRODUCT_FEATURES.filter((feature) =>
  !['NORMAL_LOGGING'].includes(feature)
);
