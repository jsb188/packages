import type { OrganizationOperationEnum } from '../types/organization.d.ts';

/**
 * Constants
 */

export const LOG_SORT_ENUMS = [
	'GROUP_BY_VENDORS',
	'DATE_AND_VENDOR_DESC',
  'DATE_DESC',
];

export const LOG_ACTION_STATUS_ENUMS = [
	'STARTED',
	'COMPLETED',
	'COMPLETED_PARTIAL',
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
		'AI_SCHEDULED_TASK', // It's scheduled "message" now, but kept as "task" because it's an enum
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
      'GREENHOUSE_SEEDING',
			'TRANSPLANTING',
			'SEED_COMPLIANCE_NOTE',
			'OTHER_TRANSPLANT_ACTIVITY',
		],
	],
	[
		'FIELD',
		[
			'PREPARE_SOIL',
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
		'EQUIPMENT',
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
		],
		[
			'FOOD_SAFETY',
			'GLOBAL_GAP',
		],
	],
	[
		'EMPLOYEE',
		[
			'EMPLOYEE_ORIENTATION',
			'EMPLOYEE_TRAINING',
			'SICK_EMPLOYEE',
			'EMPLOYEE_INJURED',
			'EMPLOYEE_NOTES',
			'OPERATION_NOTES', // need to change to singular form
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
	EQUIPMENT: 'equipments & materials sanitation',
	BIOSECURITY: 'environment & biosecurity measures',
	EMPLOYEE: 'employee & operation notes',
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
		'MARKET_RECEIPT',
		[
			'MARKET_CREDIT_RECEIPT',
		],
	],
	[
		'MARKET_OPERATION',
		[
			'MARKET_ATTENDANCE',
			'MARKET_LOAD_LIST',
      'OPERATION_NOTE'
		],
	],
];

export const LOG_FARMERS_MARKET_TYPE_ENUMS = FARMERS_MARKET_ACTIVITIES_GROUPED.map(([type]) => type);

export const FARMERS_MARKET_TYPES_TO_TEXT = {
	MARKET_RECEIPT: 'market credit receipts and coins redemption',
	MARKET_OPERATION: 'notes about farmers and markets',
	EVERYTHING: 'all market activities', // Not part of enums
};

export const LOG_FARMERS_MARKET_ACTIVITY_ENUMS = FARMERS_MARKET_ACTIVITIES_GROUPED.reduce(
	(acc, a) => acc.concat(a[1]),
	[] as string[],
);

/**
 * #### #### #### ####
 * Grower Network logs
 * #### #### #### ####
 */

export const GROWER_NETWORK_ACTIVITIES_GROUPED: [string, string[]][] = [
	AI_TASKS_GROUP,
	[
    'WORKER_PRACTICE',
    [
      'HYGIENE_PROCEDURE', // Hygiene, Handwashing
      'SANITATION_PRACTICE', // Sanitation risk, cleanliness/food-contact, and conditions
      'PERSONNEL_PRACTICE' // PPE, training, illness, work practices, break area compliance
    ],
  ],
  [
    'EQUIPMENT',
    [
      'EQUIPMENT_MATERIAL', // Equipment, tools and materials risk, handling practices, and conditions
      'PACKAGING_STORAGE', // Packaging, storage, and handling practices
    ],
  ],
  [
    'PRODUCTION_INPUT',
    [
      'WATER_INPUT', // Water source, quality, treatment, testing, and application
      'CHEMICAL_INPUT', // Chemical storage, handling, and application
      'FERTILIZER_INPUT', // Fertilizer storage, handling, and application
    ],
  ],
  [
    'FIELD',
    [
      'ENVIRONMENT', // Environmental exposure, risks
      'FIELD_CONDITION', // Field conditions, flood zone, errosion risk, and control measures
      'ADJACENT_LAND', // Adjacent land contamination risks and control measures
    ],
  ],
  [
    'OPERATION',
    [
      'RECORDKEEPING', // Notes/issues with document control, record availability and accuracy
      'FACILITIES', // Notes/issues with facilities, physical infrastructure, and maintenance
      'OPERATION_NOTE', // Other notes/issues with operations, management, and general observations
    ]
  ]
];

export const LOG_GROWER_NETWORK_TYPE_ENUMS = GROWER_NETWORK_ACTIVITIES_GROUPED.map(([type]) => type);

export const GROWER_NETWORK_TYPES_TO_TEXT = {
	WORKER_PRACTICE: 'hygiene, sanitation, and worker practices',
	EQUIPMENT: 'equipments, materials, packaging, storage',
	PRODUCTION_INPUT: 'water, chemical, and fertilizer inputs',
	FIELD: 'field/land conditions, control measures and environmental risks',
	OPERATION: 'recordkeeping, documentation, facilities, and general operations',
	EVERYTHING: 'all grower network activities', // Not part of enums
};

export const LOG_GROWER_NETWORK_ACTIVITY_ENUMS = GROWER_NETWORK_ACTIVITIES_GROUPED.reduce(
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
	...LOG_GROWER_NETWORK_TYPE_ENUMS,
	...LOG_LIVESTOCK_TYPE_ENUMS,
].filter((value, index, self) => self.indexOf(value) === index);

export const LOG_ANY_ACTIVITY_ENUMS = [
	...LOG_ARABLE_ACTIVITY_ENUMS,
	...LOG_FARMERS_MARKET_ACTIVITY_ENUMS,
	...LOG_GROWER_NETWORK_ACTIVITY_ENUMS,
	...LOG_LIVESTOCK_ACTIVITY_ENUMS,
].filter((value, index, self) => self.indexOf(value) === index);

export const LOG_ACTIVITIES_BY_OPERATION: Record<OrganizationOperationEnum, any> = {
	ARABLE: ARABLE_ACTIVITIES_GROUPED,
	FARMERS_MARKET: FARMERS_MARKET_ACTIVITIES_GROUPED,
	GROWER_NETWORK: GROWER_NETWORK_ACTIVITIES_GROUPED,
	LIVESTOCK: LIVESTOCK_ACTIVITIES_GROUPED,
};

export const LOG_TYPES_BY_OPERATION: Record<OrganizationOperationEnum, (typeof LOG_ANY_TYPE_ENUMS)[number][]> = {
	ARABLE: LOG_ARABLE_TYPE_ENUMS,
	FARMERS_MARKET: LOG_FARMERS_MARKET_TYPE_ENUMS,
	GROWER_NETWORK: LOG_GROWER_NETWORK_TYPE_ENUMS,
	LIVESTOCK: LOG_LIVESTOCK_TYPE_ENUMS,
};

export const ALL_TEXT_TO_TYPES = {
	// Each Object has to be fromEntries() one by one to avoid key conflicts
	// (Because, for example: "EVERYTHING" exists in multiple objects)
	...Object.fromEntries(Object.entries(ARABLE_TYPES_TO_TEXT).map(([key, value]) => [value, key])),
	...Object.fromEntries(Object.entries(ARABLE_FOOD_SAFETY_TYPES_TO_TEXT).map(([key, value]) => [value, key])),
	...Object.fromEntries(Object.entries(FARMERS_MARKET_TYPES_TO_TEXT).map(([key, value]) => [value, key])),
	...Object.fromEntries(Object.entries(GROWER_NETWORK_TYPES_TO_TEXT).map(([key, value]) => [value, key])),
	...Object.fromEntries(Object.entries(LIVESTOCK_TYPES_TO_TEXT).map(([key, value]) => [value, key])),
};
