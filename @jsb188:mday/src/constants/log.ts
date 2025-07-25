import type { LogArableTypeEnum } from '../types/log.d.ts';
import type { OrganizationOperationEnum } from '@jsb188/app/types/organization.d';

// Arable farming logs

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
	POST_HARVEST: 'handling, washing, sorting, grading, packaging after harvest',
	SALES: 'sales related activities',
	WATER: 'water testing activities',
} as Record<LogArableTypeEnum, string>;

export const TEXT_TO_ARABLE_TYPES = Object.fromEntries(
	Object.entries(ARABLE_TYPES_TO_TEXT).map(([key, value]) => [value, key]),
) as Record<string, string>;

export const ARABLE_ACTIVITIES_TO_TEXT = {
	// # Seed purchase activities
	SEED_PURCHASE_INFO: 'seed purchase information',
	SEED_COMPLIANCE_NOTE: 'seed compliance notes',
	OTHER_SEED_ACTIVITY: 'other seed purchase related activities',

	// # Seeding & transplanting activities
	SEEDING: 'seeding crops',
	DIRECT_SEEDING: 'direct seeding crops',
	TRANSPLANTING: 'transplanting crops',
	OTHER_TRANSPLANT_ACTIVITY: 'other seeding or transplanting activities',

	// # Field activities
	PREPARE_SOIL: 'soil, beds preparation',
	// PLANTING: 'seeding, transplanting', // Deprecated & moved to "PLANTING" category
	IRRIGATION: 'irrigation management',
	FERTILIZATION_COMPOST: 'fertilization, compost application',
	PROTECT_CROP: 'hand pulling weed, hoeing, and cultivation work',
	MONITOR_CROP: 'crop monitoring',
	PRUNING: 'pruning',
	STRUCTURE_MAINTENANCE: 'trellising, structure maintenance',
	PREPARE_HARVEST: 'preparing crops for harvest',
	OTHER_FIELD_ACTIVITY: 'other field activities',

	// # Harvest activities
	HARVEST_CROP: 'harvesting crops',
	HARVEST_COUNT: 'counting, weighing harvested crops',
	SORT_GRADE: 'sorting, grading crops',
	YIELD_LOSS_ESTIMATE: 'estimating yield or loss',
	OTHER_HARVEST_ACTIVITY: 'other harvest activities',

	// # Post-harvest activities
	POST_HARVEST_HANDLING: 'washing, drying, trimming, sorting, or grading produce',
	POST_HARVEST_PACKAGING: 'packaging, cooling, or moving produce to storage',
	COLD_STORAGE_TEMPERATURE: 'checking or changing cold storage temperature',
	OTHER_POST_HARVEST_ACTIVITY: 'other post-harvest activities',

	// # Sales activities
	SALE_TRANSACTION: 'sale transactions',
	SALE_DETAILS: 'sale details',
	SALE_FEEDBACK: 'sale feedback or issues',
	OTHER_SALES_ACTIVITY: 'other sales related activities',

	// # Water testing activities
	WATER_TESTING: 'checking chlorine levels in water',
	OTHER_WATER_TESTING_ACTIVITY: 'other water testing related activities',
};

export const TEXT_TO_ARABLE_ACTIVITIES = Object.fromEntries(
	Object.entries(ARABLE_ACTIVITIES_TO_TEXT).map(([key, value]) => [value, key]),
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
