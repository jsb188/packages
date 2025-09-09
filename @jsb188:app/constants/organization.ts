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

// Child organization types

export const CHILD_ORGANIZATION_TYPE_ENUMS = ['PRODUCER', 'VENDOR'];
