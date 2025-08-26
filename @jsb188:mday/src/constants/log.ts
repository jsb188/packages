import type { LogArableTypeEnum } from '../types/log.d.ts';
import type { OrganizationOperationEnum } from '@jsb188/app/types/organization.d';

/**
 * IMPORTANT: Keep this list updated.
 *
 * These are the function call names where the AI can see the args for after calling the function.
 * When you include the args for functions such as write_log(), it's unnecessary data that only confuses the AI,
 * and makes the AI less accurate.
 */

// Not using this any more (?)
// export const SHOW_ARGS_FUNCTION_CALL_NAMES = [
// 	'search_logs_arable_farming',
// 	'search_logs_livestock_farming',
// 	'get_arable_farming_logs_file',
// 	'get_livestock_farming_logs_file',
// 	'find_persons',
// ];

// Arable farming logs
// NOTE: This constant defines all the enums and activities for both GraphQL and database

export const ARABLE_ACTIVITIES_GROUPED = [
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
] as [LogArableTypeEnum, string[]][];

export const ARABLE_TYPES_TO_TEXT = {
	SEED: 'seed purchases',
	PLANTING: 'seeding, transplanting activities',
	FIELD: 'field activities',
	HARVEST: 'harvest activities',
	POST_HARVEST: 'after-harvest activities such as handling, packaging produce and cold storage',
	SALES: 'sales related activities',
	WATER: 'water testing activities',

	// This is not part of the enums
	EVERYTHING: 'all activities',
} as Record<LogArableTypeEnum, string>;

export const TEXT_TO_ARABLE_TYPES = Object.fromEntries(
	Object.entries(ARABLE_TYPES_TO_TEXT).map(([key, value]) => [value, key]),
) as Record<string, string>;

export const LOG_ARABLE_TYPE_ENUMS = [
	'SEED',
	'PLANTING',
	'FIELD',
	'HARVEST',
	'POST_HARVEST',
	'SALES',
	'WATER',
] as LogArableTypeEnum[];

export const LOG_ARABLE_ACTIVITY_ENUMS = ARABLE_ACTIVITIES_GROUPED.reduce(
	(acc, a) => acc.concat(a[1]),
	[] as string[],
);

// All log types & activities

export const LOG_ACTIVITIES_GROUPED = [
	...ARABLE_ACTIVITIES_GROUPED,
];

export const LOG_TYPE_ENUMS = [
	...LOG_ARABLE_TYPE_ENUMS,
];

export const LOG_ACTIVITY_ENUMS = [
	...LOG_ARABLE_ACTIVITY_ENUMS,
];

export const LOG_TYPES_BY_OPERATION = {
	ARABLE: LOG_ARABLE_TYPE_ENUMS,
	LIVESTOCK: [],
} as Record<OrganizationOperationEnum, (typeof LOG_TYPE_ENUMS)[number][]>;
