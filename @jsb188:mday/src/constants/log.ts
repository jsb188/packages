import type { LogArableTypeEnum, LogFarmersMarketTypeEnum } from '../types/log.d.ts';
import type { OrganizationOperationEnum } from '@jsb188/app/types/organization.d';

/**
 * Arable farming logs
 * NOTE: This constant defines all the enums and activities for both GraphQL and database
 */

export const ARABLE_ACTIVITIES_GROUPED: [LogArableTypeEnum, string[]][] = [
	[
		'SEED',
		[
			'SEED_PURCHASE_INFO',
			'SEED_COMPLIANCE_NOTE',
			'OTHER_SEED_ACTIVITY',
		],
	],
	[
		'PLANTING',
		[
			'SEEDING',
			'DIRECT_SEEDING',
			'TRANSPLANTING',
			'OTHER_TRANSPLANT_ACTIVITY',
		],
	],
	[
		'FIELD',
		[
			'PREPARE_SOIL',
			// 'PLANTING', // <!--------------------------------- Deprecated & moved to "PLANTING" category
			'IRRIGATION',
			'FERTILIZATION_COMPOST',
			'PROTECT_CROP',
			'MONITOR_CROP',
			'PRUNING',
			'STRUCTURE_MAINTENANCE',
			'PREPARE_HARVEST',
			'OTHER_FIELD_ACTIVITY',
		],
	],
	[
		'HARVEST',
		[
			'HARVEST_CROP',
			'HARVEST_COUNT',
			'SORT_GRADE',
			'YIELD_LOSS_ESTIMATE',
			'OTHER_HARVEST_ACTIVITY',
		],
	],
	[
		'POST_HARVEST',
		[
			'POST_HARVEST_HANDLING',
			'POST_HARVEST_PACKAGING',
			'COLD_STORAGE_TEMPERATURE',
			'OTHER_POST_HARVEST_ACTIVITY',
		],
	],
	[
		'SALES',
		[
			'SALE_TRANSACTION',
			'SALE_DETAILS',
			'SALE_FEEDBACK',
			'OTHER_SALES_ACTIVITY',
		],
	],
	[
		'WATER',
		[
			'WATER_TESTING',
			'OTHER_WATER_TESTING_ACTIVITY',
		],
	],
];

export const ARABLE_TYPES_TO_TEXT: Record<LogArableTypeEnum, string> = {
	SEED: 'seed purchases',
	PLANTING: 'seeding, transplanting activities',
	FIELD: 'field activities',
	HARVEST: 'harvest activities',
	POST_HARVEST: 'after-harvest activities such as handling, packaging produce and cold storage',
	SALES: 'sales related activities',
	WATER: 'water testing activities',

	// @ts-expect-error - This is not part of the enums
	EVERYTHING: 'all activities',
};

export const TEXT_TO_ARABLE_TYPES: Record<string, string> = Object.fromEntries(
	Object.entries(ARABLE_TYPES_TO_TEXT).map(([key, value]) => [value, key]),
);

export const LOG_ARABLE_TYPE_ENUMS: LogArableTypeEnum[] = [
	'SEED',
	'PLANTING',
	'FIELD',
	'HARVEST',
	'POST_HARVEST',
	'SALES',
	'WATER',
];

export const LOG_ARABLE_ACTIVITY_ENUMS = ARABLE_ACTIVITIES_GROUPED.reduce(
	(acc, a) => acc.concat(a[1]),
	[] as string[],
);

/**
 * Farmers Market logs
 */

export const FARMERS_MARKET_ACTIVITIES_GROUPED: [LogFarmersMarketTypeEnum, string[]][] = [
	[
		'MARKET_RECEIPTS',
		[
			'MARKET_CREDIT_RECEIPT',
		],
	],
	[
		'MARKET_OPERATIONS',
		[
			'FARMER_NOTES',
			'FARMERS_MARKET_NOTES',
			'OTHER_NOTES',
		],
	],
];

export const FARMERS_MARKET_TYPES_TO_TEXT: Record<LogFarmersMarketTypeEnum, string> = {
	MARKET_RECEIPTS: 'market credit receipts and coins redemption',
	MARKET_OPERATIONS: 'notes about farmers and markets',

	// @ts-expect-error - This is not part of the enums
	EVERYTHING: 'all activities',
};

export const TEXT_TO_FARMERS_MARKET_TYPES: Record<string, string> = Object.fromEntries(
	Object.entries(FARMERS_MARKET_TYPES_TO_TEXT).map(([key, value]) => [value, key]),
);

export const LOG_FARMERS_MARKET_TYPE_ENUMS: LogFarmersMarketTypeEnum[] = [
	'MARKET_RECEIPTS',
	'MARKET_OPERATIONS',
];

export const LOG_FARMERS_MARKET_ACTIVITY_ENUMS = FARMERS_MARKET_ACTIVITIES_GROUPED.reduce(
	(acc, a) => acc.concat(a[1]),
	[] as string[],
);

/**
 * All log types & activities
 */

export const LOG_TYPE_ENUMS = [
	...LOG_ARABLE_TYPE_ENUMS,
	...LOG_FARMERS_MARKET_TYPE_ENUMS,
].filter((value, index, self) => self.indexOf(value) === index);

export const LOG_ACTIVITY_ENUMS = [
	...LOG_ARABLE_ACTIVITY_ENUMS,
	...LOG_FARMERS_MARKET_ACTIVITY_ENUMS,
].filter((value, index, self) => self.indexOf(value) === index);

export const LOG_ACTIVITIES_BY_OPERATION: Record<OrganizationOperationEnum, any> = {
	ARABLE: ARABLE_ACTIVITIES_GROUPED,
	LIVESTOCK: [],
	FARMERS_MARKET: FARMERS_MARKET_ACTIVITIES_GROUPED,
};

export const LOG_TYPES_BY_OPERATION: Record<OrganizationOperationEnum, (typeof LOG_TYPE_ENUMS)[number][]> = {
	ARABLE: LOG_ARABLE_TYPE_ENUMS,
	LIVESTOCK: [],
	FARMERS_MARKET: LOG_FARMERS_MARKET_TYPE_ENUMS,
};
