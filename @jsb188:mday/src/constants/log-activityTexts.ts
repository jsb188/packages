/**
 * *Not* operation-specific activities that could be used for many farming operations
 */

export const WATER_TESTING_ACTIVITY_TO_TEXT = {
	WATER_TESTING: 'checking chlorine levels in water',
	OTHER_WATER_TESTING_ACTIVITY: 'other water testing related activities',
};

/**
 * Arable farming activities
 */

export const ARABLE_FARMING_ACTIVITY_TO_TEXT = {
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
	OTHER_POST_HARVEST_ACTIVITY: 'other post-harvest activities',

  // # Sales activities
	SALE_TRANSACTION: 'sale transactions',
	SALE_DETAILS: 'sale details',
	SALE_FEEDBACK: 'sale feedback or issues',
	OTHER_SALES_ACTIVITY: 'other sales related activities',
};

export const ARABLE_ACTIVITIES_TO_TEXT = {
	// * Arable-specific activities (these have their own functions)
	COLD_STORAGE_TEMPERATURE: 'checking or changing temperature (cold storage)',

	// # Farming activities
	...ARABLE_FARMING_ACTIVITY_TO_TEXT,

	// # Water testing activities
	...WATER_TESTING_ACTIVITY_TO_TEXT,
};

export const TEXT_TO_ARABLE_ACTIVITIES = Object.fromEntries(
	Object.entries(ARABLE_ACTIVITIES_TO_TEXT).map(([key, value]) => [value, key]),
) as Record<string, string>;
