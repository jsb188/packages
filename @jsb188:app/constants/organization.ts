// Organization constants
// IMPORTANT NOTE: Array order must *never* change, indexes are used to create PDF URLs

export const OPERATION_ENUMS = [
	// Farms
	'ARABLE',
	'LIVESTOCK',

	// Organizations
	'FARMERS_MARKET',
];

// Employee ACL

export const ROLE_ENUMS = ['MEMBER', 'MANAGER', 'ADMIN', 'OWNER']; // first is default value

// Role categories (used for reminders)

export const ROLE_CATEGORY_ENUMS = ['EMPLOYEES_ONLY', 'MANAGERS_ONLY'];

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
