import type { OrganizationOperationEnum } from '../types/organization.d';

/**
 * Constants
 */

export const LOG_ACTION_STATUS_ENUMS = [
	'STARTED',
	'COMPLETED',
	'ERRORED',
	'QUEUED', // Used for AI Tasks
	'CANCELED', // Used for AI Tasks
];

export const PURCHASE_ACTIVITIES = [
	// # Arable
	'SEED_PURCHASE_INFO',
	'OTHER_SUPPLY_PURCHASE_ACTIVITY',
	// # Livestock
	'FEED_PURCHASE',
];

export const SALE_ACTIVITIES = [
	// # Arable
	'SALE_PRODUCE_ORDER',
	'OTHER_SALE_ORDER',
	// # Farmers Market
	'MARKET_CREDIT_RECEIPT',
];

export const AI_TASKS_GROUP: [string, string[]] = [
	'AI_TASK',
	[
		'AI_SEND_MESSAGE',
		'AI_REMINDER',
		'AI_CHECK_IN',
		'AI_SCHEDULED_TASK',
	],
];

export const AI_TASK_ACTIVITIES = AI_TASKS_GROUP[1];

/**
 * #### #### #### ####
 * Arable farming logs
 * NOTE: This constant defines all the enums and activities for both GraphQL and database
 * #### #### #### ####
 */

export const ARABLE_ACTIVITIES_GROUPED: [string, string[], string[]?][] = [
	AI_TASKS_GROUP,
	[
		'SEED',
		[
			'SEED_PURCHASE_INFO',
			'OTHER_SUPPLY_PURCHASE_ACTIVITY',
		],
	],
	[
		'PLANTING',
		[
			'SEEDING',
			'DIRECT_SEEDING',
			'TRANSPLANTING',
			'SEED_COMPLIANCE_NOTE',
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
			'SALE_PRODUCE_ORDER',
			'OTHER_SALE_ORDER',
		],
	],
	[
		'WATER',
		[
			'WATER_TESTING',
			'OTHER_WATER_TESTING_ACTIVITY',
		],
	],
	[
		'HYGIENE',
		[
			'HYGIENE_PROCEDURE',
			'CONTAMINANT_RISK',
			'BODILY_FLUID_CONTAMINATION',
			'SMOKING_EATING_DRINKING_CONTROL',
			'PPE_USAGE',
		],
		[
			'FOOD_SAFETY',
			'GLOBAL_GAP',
		],
	],
	[
		'SANITATION',
		[
			'SANITATION_RISK',
			'SANITATION_CONSTRUCTION_MAINTENANCE',
			'SANITATION_CLEANING',
			'SANITATION_PEST_CONTROL',
		],
		[
			'FOOD_SAFETY',
			'GLOBAL_GAP',
		],
	],
	[
		'EQUIPMENTS',
		[
			'EQUIPMENTS_MATERIALS_RISK',
			'EQUIPMENTS_MATERIALS_CLEANING',
		],
		[
			'FOOD_SAFETY',
			'GLOBAL_GAP',
		],
	],
	[
		'BIOSECURITY',
		[
			'ENVIRONMENT_RISK',
			'ENVIRONMENT_HAZARD_MITIGATION',
		],
		[
			'FOOD_SAFETY',
			'GLOBAL_GAP',
		],
	],
	[
		'EMPLOYEES',
		[
			'EMPLOYEE_ORIENTATION',
			'EMPLOYEE_TRAINING',
			'SICK_EMPLOYEE',
			'EMPLOYEE_INJURED',
			'EMPLOYEE_NOTES',
			'OPERATION_NOTES',
		],
		[
			'FOOD_SAFETY',
			'GLOBAL_GAP',
		],
	],
];

export const LOG_ARABLE_TYPE_ENUMS = ARABLE_ACTIVITIES_GROUPED.map(([type]) => type);

export const ARABLE_TYPES_TO_TEXT = {
	SEED: 'seed & supply purchases',
	PLANTING: 'seeding & transplanting',
	FIELD: 'field work',
	HARVEST: 'harvest activities',
	POST_HARVEST: 'post-harvest (cleaning, storage, maintenance, packaging produce, cold storage)',
	SALES: 'sales & purchase orders',
	WATER: 'water testing activities',
	EVERYTHING: 'all farming activities', // Not part of enums
};

export const ARABLE_FOOD_SAFETY_TYPES_TO_TEXT = {
	HYGIENE: 'hygiene procdedures',
	SANITATION: 'sanitation infrastructure & practices',
	EQUIPMENTS: 'equipments & materials sanitation',
	BIOSECURITY: 'environment & biosecurity measures',
	EMPLOYEES: 'employee & operation notes',
	EVERYTHING: 'all food safety logs', // Not part of enums
};

export const LOG_ARABLE_ACTIVITY_ENUMS = ARABLE_ACTIVITIES_GROUPED.reduce(
	(acc, a) => acc.concat(a[1]),
	[] as string[],
);

/**
 * #### #### #### ####
 * Farmers Market logs
 * #### #### #### ####
 */

export const FARMERS_MARKET_ACTIVITIES_GROUPED: [string, string[]][] = [
	AI_TASKS_GROUP,
	[
		'MARKET_RECEIPTS',
		[
			'MARKET_CREDIT_RECEIPT',
		],
	],
	[
		'MARKET_OPERATIONS',
		[
			'MARKET_ATTENDANCE',
			'MARKET_LOAD_LIST',
			'VENDOR_NOTES',
			'EMPLOYEE_NOTES',
			'FARMERS_MARKET_NOTES',
		],
	],
];

export const LOG_FARMERS_MARKET_TYPE_ENUMS = FARMERS_MARKET_ACTIVITIES_GROUPED.map(([type]) => type);

export const FARMERS_MARKET_TYPES_TO_TEXT = {
	MARKET_RECEIPTS: 'market credit receipts and coins redemption',
	MARKET_OPERATIONS: 'notes about farmers and markets',
	EVERYTHING: 'all market activities', // Not part of enums
};

export const LOG_FARMERS_MARKET_ACTIVITY_ENUMS = FARMERS_MARKET_ACTIVITIES_GROUPED.reduce(
	(acc, a) => acc.concat(a[1]),
	[] as string[],
);

/**
 * #### #### #### ####
 * Livestock logs
 * #### #### #### ####
 */

export const LIVESTOCK_ACTIVITIES_GROUPED: [string, string[]][] = [
	AI_TASKS_GROUP,
	[
		'SUPPLY_PURCHASE',
		[
			'FEED_PURCHASE',
			'OTHER_SUPPLY_PURCHASE_ACTIVITY',
		],
	],
	[
		'LIVESTOCK_LIFE_CYCLE',
		[
			'LIVESTOCK_PURCHASE',
			'LIVESTOCK_BIRTH',
			'LIVESTOCK_REPRODUCTION',
			'LIVESTOCK_DEATH',
			'OTHER_LIVESTOCK_LIFE_CYCLE_ACTIVITY',
		],
	],
	[
		'LIVESTOCK_TRACKING',
		[
			'LIVESTOCK_GROUP_TRACKING', // moving to different group because of age
			'LIVESTOCK_PASTURE_TRACKING', // where they are in pasture
			'LIVESTOCK_ROTATIONAL_GRAZING',
			'OTHER_LIVESTOCK_TRACKING_ACTIVITY',
		],
	],
	[
		'PASTURE_LAND_MANAGEMENT',
		[
			'PASTURE_SEEDING',
			'FENCE_MAINTENANCE', // buffer zones/buffer management
			'WATER_SOURCE_MAINTENANCE',
			'OTHER_PASTURE_LAND_MANAGEMENT_ACTIVITY',
		],
	],
	[
		'LIVESTOCK_HEALTHCARE',
		[
			'LIVESTOCK_VACCINATION',
			'LIVESTOCK_SICK',
			'LIVESTOCK_INJURY',
			'LIVESTOCK_CULL',
			'LIVESTOCK_TREATMENT',
			'OTHER_LIVESTOCK_HEALTHCARE_ACTIVITY',
		],
	],
	[
		'LIVESTOCK_SALE',
		[
			'LIVESTOCK_SALE',
			'OTHER_LIVESTOCK_SALE_ACTIVITY',
		],
	],
];

export const LOG_LIVESTOCK_TYPE_ENUMS = LIVESTOCK_ACTIVITIES_GROUPED.map(([type]) => type);

export const LIVESTOCK_TYPES_TO_TEXT = {
	SUPPLY_PURCHASE: 'supply purchases',
	LIVESTOCK_LIFE_CYCLE: 'livestock life cycle events',
	LIVESTOCK_TRACKING: 'livestock movement and tracking',
	PASTURE_LAND_MANAGEMENT: 'pasture and land management',
	LIVESTOCK_HEALTHCARE: 'livestock healthcare',
	LIVESTOCK_SALE: 'livestock sale',
	EVERYTHING: 'all ranching activities', // Not part of enums
};

export const LOG_LIVESTOCK_ACTIVITY_ENUMS = LIVESTOCK_ACTIVITIES_GROUPED.reduce(
	(acc, a) => acc.concat(a[1]),
	[] as string[],
);

/**
 * #### #### #### ####
 * All log types & activities
 * #### #### #### ####
 */

export const LOG_ANY_TYPE_ENUMS = [
	...LOG_ARABLE_TYPE_ENUMS,
	...LOG_FARMERS_MARKET_TYPE_ENUMS,
	...LOG_LIVESTOCK_TYPE_ENUMS,
].filter((value, index, self) => self.indexOf(value) === index);

export const LOG_ANY_ACTIVITY_ENUMS = [
	...LOG_ARABLE_ACTIVITY_ENUMS,
	...LOG_FARMERS_MARKET_ACTIVITY_ENUMS,
	...LOG_LIVESTOCK_ACTIVITY_ENUMS,
].filter((value, index, self) => self.indexOf(value) === index);

export const LOG_ACTIVITIES_BY_OPERATION: Record<OrganizationOperationEnum, any> = {
	ARABLE: ARABLE_ACTIVITIES_GROUPED,
	FARMERS_MARKET: FARMERS_MARKET_ACTIVITIES_GROUPED,
	LIVESTOCK: LIVESTOCK_ACTIVITIES_GROUPED,
};

export const LOG_TYPES_BY_OPERATION: Record<OrganizationOperationEnum, (typeof LOG_ANY_TYPE_ENUMS)[number][]> = {
	ARABLE: LOG_ARABLE_TYPE_ENUMS,
	FARMERS_MARKET: LOG_FARMERS_MARKET_TYPE_ENUMS,
	LIVESTOCK: LOG_LIVESTOCK_TYPE_ENUMS,
};

export const ALL_TEXT_TO_TYPES = {
	// Each Object has to be fromEntries() one by one to avoid key conflicts
	// (Because, for example: "EVERYTHING" exists in multiple objects)
	...Object.fromEntries(Object.entries(ARABLE_TYPES_TO_TEXT).map(([key, value]) => [value, key])),
	...Object.fromEntries(Object.entries(ARABLE_FOOD_SAFETY_TYPES_TO_TEXT).map(([key, value]) => [value, key])),
	...Object.fromEntries(Object.entries(FARMERS_MARKET_TYPES_TO_TEXT).map(([key, value]) => [value, key])),
	...Object.fromEntries(Object.entries(LIVESTOCK_TYPES_TO_TEXT).map(([key, value]) => [value, key])),
};
