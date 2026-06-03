// Organization constants
// IMPORTANT NOTE: Array order must *never* change, indexes are used to create PDF URLs

export const OPERATION_ENUMS = [
	// Farms
	'ARABLE',
	'LIVESTOCK',

	// Umbrella orgs
	'FARMERS_MARKET',
	'GROWER_NETWORK',

  // External orgs
  'RESTAURANT',
  'VENDOR',
  'WHOLESALE_FOOD',
  'UNKNOWN',
];

export const PARENT_ORG_OPERATIONS = [
	'FARMERS_MARKET',
	'GROWER_NETWORK',
];

export const AUDITOR_ORG_OPERATIONS = [
	'GROWER_NETWORK',
];

// Membership roles
// Order of roles matter (for visualization)
// second item is default value

export const ROLE_ENUMS = ['GUEST', 'MEMBER', 'MANAGER', 'ADMIN', 'OWNER'];

// Role categories (used for reminders)

export const ROLE_CATEGORY_ENUMS = ['EMPLOYEES_ONLY', 'MANAGERS_ONLY'];

// Org departments

export const ORG_CONTACTS = [
	'PRIMARY_CONTACT',
	'ACCOUNTS_RECEIVABLE',
	'SALES',
	'CUSTOMER_SERVICE',
	'SHIPPING_RECEIVING',
	'OTHER',
];

// Compliance

export const COMPLIANCE_DOCUMENT_TYPE_MAP = {
	'Organic Certificate': 'ORGANIC',
	'Insurance Policy/Insurance Certificate': 'INSURANCE',
	"Producer's Certificate": 'PRODUCERS_CERTIFICATE',
	'Milk Handler License': 'MILK_HANDLER_LICENSE',
	'Egg Handler License': 'EGG_HANDLER_LICENSE',
	'Nursery License': 'NURSERY_LICENSE',
};

export const COMPLIANCE_DOCUMENT_TYPE_ENUMS = Object.values(COMPLIANCE_DOCUMENT_TYPE_MAP);

export const COMPLIANCE_DOCUMENT_TYPE_LABELS = Object.keys(COMPLIANCE_DOCUMENT_TYPE_MAP);

/**
 * Organization features by operation.
 */

export const FEATURES_BY_OPERATION = {
	ARABLE: [
		'NORMAL_LOGGING', // First item is always the default
		'FOOD_SAFETY',
		'GLOBAL_GAP',
	],
	FARMERS_MARKET: [
		'NORMAL_LOGGING',
		'MARKET_ATTENDANCE',
	],
	LIVESTOCK: [
		'NORMAL_LOGGING',
	],
	GROWER_NETWORK: [
		'NORMAL_LOGGING',
		'SITE_INSPECTION',
	],
};

export const PRODUCT_FEATURES = [
	...FEATURES_BY_OPERATION.ARABLE,
	...FEATURES_BY_OPERATION.FARMERS_MARKET,
	...FEATURES_BY_OPERATION.LIVESTOCK,
	...FEATURES_BY_OPERATION.GROWER_NETWORK,
].filter((value, index, self) => self.indexOf(value) === index);
