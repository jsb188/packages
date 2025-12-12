// Organization constants
// IMPORTANT NOTE: Array order must *never* change, indexes are used to create PDF URLs

export const OPERATION_ENUMS = [
	// Farms
	'ARABLE',
	'LIVESTOCK',

	// Umbrella orgs
	'FARMERS_MARKET',
  'GROWER_NETWORK',
];

export const PARENT_ORG_OPERATIONS = [
	'FARMERS_MARKET',
];

// Employee ACL

export const ROLE_ENUMS = ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER', 'GUEST']; // first is default value

// Role categories (used for reminders)

export const ROLE_CATEGORY_ENUMS = ['EMPLOYEES_ONLY', 'MANAGERS_ONLY'];

// Org departments

export const ORG_DEPARTMENTS = [
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
