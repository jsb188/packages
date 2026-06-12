// Custom organization page route constants

// Queries that a custom page route can use as its data source
export const PAGE_ROUTE_QUERY_ENUMS = [
	'LOG_ENTRIES',
	'CHILD_ORGANIZATIONS',
];

// Slugs that can never be used for custom page routes (single-character slugs are always rejected)
export const PAGE_ROUTE_RESERVED_SLUGS = [
	'grids',
	'grid',
	'tables',
	'table',
	'workflows',
	'workflow',
	'billing',
	'inbox',
];

export const PAGE_ROUTE_SLUG_MIN_LENGTH = 2;
export const PAGE_ROUTE_SLUG_MAX_LENGTH = 40;
export const PAGE_ROUTE_MAX_COLUMNS = 30;
export const PAGE_ROUTE_ICON_NAME_MAX_LENGTH = 80;
