/**
 * *Not* operation-specific activities that could be used for many farming operations
 */

export const WATER_TESTING_ACTIVITY_TO_TEXT = {
	WATER_TESTING: 'checking chlorine levels in water',
	OTHER_WATER_TESTING_ACTIVITY: 'other water testing related activities',
};

/**
 * #### #### #### ####
 * Arable farming
 * #### #### #### ####
 */

export const ARABLE_FARMING_TO_TEXT = {
	// # Seeding & transplanting activities
	SEEDING: 'seeding crops',
	DIRECT_SEEDING: 'direct seeding crops',
	TRANSPLANTING: 'transplanting crops',
	SEED_COMPLIANCE_NOTE: 'seed compliance notes',
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
	OTHER_FIELD_ACTIVITY: 'other field activities or farm operation notes',

	// # Harvest activities
	HARVEST_CROP: 'harvesting crops',
	HARVEST_COUNT: 'counting, weighing harvested crops',
	SORT_GRADE: 'sorting, grading crops',
	YIELD_LOSS_ESTIMATE: 'estimating yield or loss',
	OTHER_HARVEST_ACTIVITY: 'other harvest activities',

	// # Post-harvest activities
	POST_HARVEST_HANDLING: 'washing, drying, trimming, sorting, or grading produce',
	POST_HARVEST_PACKAGING: 'packaging, cooling, or moving produce to storage',
	OTHER_POST_HARVEST_ACTIVITY: 'other post-harvest activities such as cleaning, storage, and maintenance',
};

export const ARABLE_TRANSACTIONS_TO_TEXT = {
	// # Seed purchase activities
	SEED_PURCHASE_INFO: 'seed purchase',
	OTHER_SUPPLY_PURCHASE_ACTIVITY: 'other supply purchase',

	// # Sales activities
	SALE_PRODUCE_ORDER: 'purchase order (produce)',
	OTHER_SALE_ORDER: 'purchase order (other)',
};

export const ARABLE_ACTIVITIES_TO_TEXT = {
	COLD_STORAGE_TEMPERATURE: 'checking or changing temperature (cold storage)',
	...ARABLE_TRANSACTIONS_TO_TEXT,
	...ARABLE_FARMING_TO_TEXT,
	...WATER_TESTING_ACTIVITY_TO_TEXT,
};

/**
 * #### #### #### ####
 * Farmers Market
 * #### #### #### ####
 */

export const FARMERS_MARKET_RECEIPT_TO_TEXT = {
	MARKET_CREDIT_RECEIPT: 'market credits, coins, or voucher receipts',
};

export const FARMERS_MARKET_OPERATION_TO_TEXT = {
	VENDOR_NOTES: 'notes about a vendor',
	EMPLOYEE_NOTES: 'notes about an employee',
	FARMERS_MARKET_NOTES: 'notes about farmers market',
};

export const FARMERS_MARKET_ACTIVITIES_TO_TEXT = {
	...FARMERS_MARKET_RECEIPT_TO_TEXT,
	...FARMERS_MARKET_OPERATION_TO_TEXT,
};

/**
 * #### #### #### ####
 * Livestock ranching
 * #### #### #### ####
 */

export const LIVESTOCK_LIFECYCLE_TO_TEXT = {
	// # Livestock life cycle
	LIVESTOCK_PURCHASE: 'livestock purchase',
	LIVESTOCK_BIRTH: 'livestock birth',
	LIVESTOCK_REPRODUCTION: 'livestock reproduction',
	LIVESTOCK_DEATH: 'livestock death',
	OTHER_LIVESTOCK_LIFE_CYCLE_ACTIVITY: 'other livestock life cycle notes',

	// # Livestock tracking
	LIVESTOCK_GROUP_TRACKING: 'livestock group tracking/movement based on age or other criteria',
	LIVESTOCK_PASTURE_TRACKING: 'livestock pasture tracking/movement', // where they are in pasture
	LIVESTOCK_ROTATIONAL_GRAZING: 'livestock rotational grazing/movement',
	OTHER_LIVESTOCK_TRACKING_ACTIVITY: 'other livestock tracking notes',

	// # Livestock healthcare
	LIVESTOCK_VACCINATION: 'livestock vaccination',
	LIVESTOCK_SICK: 'livestock sickness',
	LIVESTOCK_INJURY: 'livestock injury',
	LIVESTOCK_CULL: 'livestock culling',
	LIVESTOCK_TREATMENT: 'livestock treatment and recovery',
	OTHER_LIVESTOCK_HEALTHCARE_ACTIVITY: 'other livestock healthcare notes',

	// # Livestock sale
	LIVESTOCK_SALE: 'livestock sale',
	OTHER_LIVESTOCK_SALE_ACTIVITY: 'other sales activities',
};

export const LIVESTOCK_RANCH_MANAGEMENT_TO_TEXT = {
	// # Ranch management activities
	PASTURE_SEEDING: 'pasture seeding',
	FENCE_MAINTENANCE: 'fence maintenance and buffer management', // buffer zones/buffer management
	WATER_SOURCE_MAINTENANCE: 'water source maintenance',
	OTHER_PASTURE_LAND_MANAGEMENT_ACTIVITY: 'other pasture or ranch operation notes',
};

export const LIVESTOCK_TRANSACTIONS_TO_TEXT = {
	// # Supply purchases
	FEED_PURCHASE: 'feed purchase',
	OTHER_SUPPLY_PURCHASE_ACTIVITY: 'other supply purchase',
};

export const LIVESTOCK_ACTIVITIES_TO_TEXT = {
	...LIVESTOCK_LIFECYCLE_TO_TEXT,
	...LIVESTOCK_RANCH_MANAGEMENT_TO_TEXT,
	...LIVESTOCK_TRANSACTIONS_TO_TEXT,
};

/**
 * #### #### #### ####
 * AI tasks
 * #### #### #### ####
 */

export const AI_TASKS_TO_TEXT = {
	// NOTE: If updating this, update [functions-aiTasks.ts] too
	AI_SEND_MESSAGE: 'message',
	AI_REMINDER: 'reminder message',
	AI_CHECK_IN: 'check-in message',
  AI_SCHEDULED_TASK: 'scheduled task',
};

/**
 * Combine all activity texts;
 * NOTE: If one of these Objects have same key and different value,
 * That would cause a *huge* problem in the agent functions.
 */

export const AGENT_TEXT_TO_ACTIVITIES: Record<string, string> = Object.fromEntries(
	Object.entries({
		...ARABLE_ACTIVITIES_TO_TEXT,
		...FARMERS_MARKET_ACTIVITIES_TO_TEXT,
		...LIVESTOCK_ACTIVITIES_TO_TEXT,
		...AI_TASKS_TO_TEXT,
	}).map(([key, value]) => [value, key]),
);
