export default {
	en: {
		// General
		log: 'Log',
		logs: 'Logs',
		all_logs: 'All logs',
    cleaning_logs: 'Cleaning logs',
		related_logs: 'Related logs',
		nothing_found: 'No logs found.',
		log_missing: 'Log missing',
		log_missing_msg: 'There was a problem loading this log.',
		unit_arable_ph: 'lbs',
		location_arable_ph: 'Field A, Row 4, etc.',
		location_water_ph: 'Water source A, etc.',
		location_livestock: 'Location',
		location_livestock_ph: 'Pasture A, Barn B, etc.',
		livestockGroup: 'Group',
		crop_ph: 'Tomato, broccoli, etc.',
		livestock: 'Livestock',
		livestockIdentifier: 'Livestock ID',
		livestockIdentifiers: 'Livestock IDs',
		livestock_ph: 'Cattle, goat, chicken, etc.',
		fieldLocation: 'Field',
		fieldLocation_ph: 'Field A, Section 1, etc.',
		purchases: 'Purchases',
		supply_purchases: 'Supply purchases',
		note_from_ai: 'Note from AI',
		id_tags: 'ID tag(s)',
		id_tags_ph: '121, 212, 444, etc',
		group: 'Livestock group',
		group_ph: 'Herd A, Pasture B Group, etc',
		receipt_for: 'Receipt for',
		market: 'Market',
		marketCredits: 'Market credits',
		marketCredits_ph: '$25 MC, $5 EBT, etc.',
		seeding: 'Seeding',
		transplanting: 'Transplanting',
		field_work: 'Field work',
		harvest: 'Harvest',
		harvested: 'Harvested',
		post_harvest: 'Post-harvest',
		food_safety: 'Food safety',
		hygiene: 'Hygiene',
		sanitation: 'Sanitation',
		materials: 'Materials',
		biosecurity: 'Biosecurity',
		employees: 'Employees',
		name_of_credit: 'Name of credit',
		water_testing: 'Chlorine levels',
		vendor: 'Vendor',
		invoice_number: 'Invoice number',
		'invoice_#': 'Invoice #',
		invoice_item: 'Invoice item',
		invoice_items: 'Invoice items',
		invoice_items_ph: 'Name of item, etc.',
		receipt_number: 'Receipt number',
		receipt_is_void: 'Receipt is void',
		receipt_is_not_void: 'Receipt is not void',
		no_permissions_to_edit: 'You do not have edit permissions.',
		note_ph: 'Write additional notes about this log.',
    note_ph_voided: 'Voided logs cannot be edited.',
		unknown_crop: 'Unknown crop',
		delete_confirm_msg: 'Are you sure you want to delete this %{content}? This action cannot be undone.',
		yes_delete_log: 'Yes, delete this %{content}',
		loaded_more_than_: 'You loaded more than %{limit} logs. Please refine your search to see more logs.',
		end_of_list_: (
			'You reached the end of this list with %{smart_count} entry.||||' +
			'You reached the end of this list with %{smart_count} entries.'
		),

		// Need one of each for every {contentName} for log
		inline_log: 'log',
		inline_ai_task: 'task',
		inline_invoice: 'invoice',
		inline_receipt: 'receipt',

		edit_log: 'Edit log',
		edit_ai_task: 'Edit task',
		edit_invoice: 'Edit invoice',
		edit_receipt: 'Edit receipt',

		view_edit_log: 'View or edit log',
		view_edit_ai_task: 'View or edit task',
		view_edit_invoice: 'View or edit invoice',
		view_edit_receipt: 'View or edit receipt',

		delete_log: 'Delete log',
		delete_ai_task: 'Delete task',
		delete_invoice: 'Delete invoice',
		delete_receipt: 'Delete receipt',

		// Types
		type: {
			// #### ARABLE
			SEED: 'Seed purchase',
			PLANTING: 'Seeding & transplanting',
			FIELD: 'Field activity',
			HARVEST: 'Harvest activity',
			POST_HARVEST: 'Post-harvest activity',
			SALES: 'Sales & purchase order',
			WATER: 'Water testing',

			// #### ARABLE - FOOD SAFETY
			HYGIENE: 'Hygiene procedures',
			SANITATION: 'Sanitation infrastructure',
			EQUIPMENTS: 'Materials & food containers/equipments',
			BIOSECURITY: 'Environment & biosecurity',
			EMPLOYEES: 'Employee & operation notes',

			// #### FARMERS_MARKET
			MARKET_RECEIPTS: 'Receipt',
			MARKET_OPERATIONS: 'Operation',

			// #### LIVESTOCK
			SUPPLY_PURCHASE: 'Supply purchase',
			LIVESTOCK_LIFE_CYCLE: 'Livestock life cycle',
			LIVESTOCK_TRACKING: 'Livestock tracking',
			PASTURE_LAND_MANAGEMENT: 'Pasture management',
			LIVESTOCK_HEALTHCARE: 'Livestock healthcare',
			LIVESTOCK_SALE: 'Livestock sale',

			// #### Merged into every operation
			AI_TASK: 'AI task',
		},
		type_short: {
			// #### ARABLE
			SEED: 'Seed purchase',
			PLANTING: 'Planting',
			FIELD: 'Field work',
			HARVEST: 'Harvest',
			POST_HARVEST: 'Post-harvest',
			SALES: 'Sale',
			WATER: 'Water testing',

			// #### ARABLE - FOOD SAFETY
			HYGIENE: 'Hygiene',
			SANITATION: 'Sanitation',
			EQUIPMENTS: 'Materials',
			BIOSECURITY: 'Biosecurity',
			EMPLOYEES: 'Employee',

			// #### FARMERS_MARKET
			MARKET_RECEIPTS: 'Receipt',
			MARKET_OPERATIONS: 'Operation',
			VOID_MARKET_RECEIPTS: 'Void receipt',

			// #### LIVESTOCK
			SUPPLY_PURCHASE: 'Supply purchase',
			LIVESTOCK_LIFE_CYCLE: 'Life cycle',
			LIVESTOCK_TRACKING: 'Tracking',
			PASTURE_LAND_MANAGEMENT: 'Pasture',
			LIVESTOCK_HEALTHCARE: 'Healthcare',
			LIVESTOCK_SALE: 'Sale',

			// #### Merged into every operation
			AI_TASK: 'AI task',
		},

		// Activities
		activity: {
			// #### ARABLE

			// # Seed activities
			SEED_PURCHASE_INFO: 'Seed purchase',
			OTHER_SUPPLY_PURCHASE_ACTIVITY: 'Other supply purchase',

			// # Transplanting activities
			SEEDING: 'Seeding crops',
			DIRECT_SEEDING: 'Direct seeding crops',
			TRANSPLANTING: 'Transplanting crops',
			SEED_COMPLIANCE_NOTE: 'Seed compliance notes',
			OTHER_TRANSPLANT_ACTIVITY: 'Other seeding/transplanting activities',

			// # Field activities
			PREPARE_SOIL: 'Soil, bed preparation',
			PLANTING: 'Seeding, transplanting', // Deprecated & moved to "PLANTING" category
			IRRIGATION: 'Irrigation, water management',
			FERTILIZATION_COMPOST: 'Fertilization, compost',
			PROTECT_CROP: 'Crop protection (weeds, pests, diseases)',
			MONITOR_CROP: 'Crop monitoring, observations',
			PRUNING: 'Pruning',
			STRUCTURE_MAINTENANCE: 'Trellising, structure maintenance',
			PREPARE_HARVEST: 'Preparing crops for harvest',
			OTHER_FIELD_ACTIVITY: 'General field notes',

			// # Harvest activities
			HARVEST_CROP: 'Harvested crops',
			HARVEST_COUNT: 'Counting, weighing harvested crops',
			SORT_GRADE: 'Sorting, grading crops',
			YIELD_LOSS_ESTIMATE: 'Estimating yield or loss',
			OTHER_HARVEST_ACTIVITY: 'Other harvest activities',

			// # Post-harvest activities
			POST_HARVEST_HANDLING: 'Handling or grading produce',
			POST_HARVEST_PACKAGING: 'Packaging or moving produce to storage',
			COLD_STORAGE_TEMPERATURE: 'Cold storage temperature',
			OTHER_POST_HARVEST_ACTIVITY: 'Other post-harvest activities',

			// # Sales activities
			SALE_PRODUCE_ORDER: 'Purchase order (produce)',
			OTHER_SALE_ORDER: 'Purchase order (other)',

			// # Water testing activities
			WATER_TESTING: 'Water testing (chlorine levels)',
			OTHER_WATER_TESTING_ACTIVITY: 'Other water testing activities',

			// #### ARRABLE - FOOD SAFETY

			// # Hygiene procedures
			HYGIENE_PROCEDURE: 'Hygiene procedures',
			CONTAMINANT_RISK: 'Contaminants (physical, chemical, microbial)',
			BODILY_FLUID_CONTAMINATION: 'Bodily fluid decontamination',
			SMOKING_EATING_DRINKING_CONTROL: 'Smoking/eating/drinking controls',
			PPE_USAGE: 'Personal protective equipment (PPE)',

			// # Sanitation infrastructure
			SANITATION_RISK: 'Sanitation risk',
			SANITATION_CONSTRUCTION_MAINTENANCE: 'Sanitation facilities construction/maintenance',
			SANITATION_CLEANING: 'Sanitation facilities cleaning',
			SANITATION_PEST_CONTROL: 'Sanitation facilities pest control',

			// # Materials & equipments
			EQUIPMENTS_MATERIALS_RISK: 'Materials food safety risk',
			EQUIPMENTS_MATERIALS_CLEANING: 'Materials/food equipments cleaning',

			// # Environment & biosecurity
			ENVIRONMENT_RISK: 'Environmental food safety risk',

			// # Employee incidents & training
			EMPLOYEE_ORIENTATION: 'Employee orientation',
			EMPLOYEE_TRAINING: 'Employee training',
			SICK_EMPLOYEE: 'Sick employee',
			EMPLOYEE_INJURED: 'Injured employee',
			EMPLOYEE_NOTES: 'Notes on employees',
			OPERATION_NOTES: 'General operation notes',

			// #### FARMERS MARKET

			// # Market credit receipts activities
			MARKET_CREDIT_RECEIPT: 'Market credit receipt',

			// # Market operation activities
			MARKET_ATTENDANCE: 'Event attendance',
			MARKET_LOAD_LIST: 'Market load list',
			VENDOR_NOTES: 'Notes on vendors',
			FARMERS_MARKET_NOTES: 'General operation notes',

			// #### LIVESTOCK

			// # Feed & Supply purchases activities
			FEED_PURCHASE: 'Feed purchase',
			// OTHER_SUPPLY_PURCHASE_ACTIVITY: 'Other supply purchase', // This is double'd in Arable

			// # Livestock life cycle activities
			LIVESTOCK_PURCHASE: 'Livestock purchase',
			LIVESTOCK_BIRTH: 'Livestock birth',
			LIVESTOCK_REPRODUCTION: 'Livestock reproduction',
			LIVESTOCK_DEATH: 'Livestock death',
			OTHER_LIVESTOCK_LIFE_CYCLE_ACTIVITY: 'Other life cycle activities',

			// # Livestock tracking activities
			LIVESTOCK_GROUP_TRACKING: 'Group tracking',
			LIVESTOCK_PASTURE_TRACKING: 'Pasture tracking',
			LIVESTOCK_ROTATIONAL_GRAZING: 'Rotational grazing',
			OTHER_LIVESTOCK_TRACKING_ACTIVITY: 'Other tracking activities',

			// # Pasture land management activities
			PASTURE_SEEDING: 'Pasture seeding',
			FENCE_MAINTENANCE: 'Fence maintenance',
			WATER_SOURCE_MAINTENANCE: 'Water source maintenance',
			OTHER_PASTURE_LAND_MANAGEMENT_ACTIVITY: 'General ranching operation notes',

			// # Livestock healthcare activities
			LIVESTOCK_VACCINATION: 'Livestock vaccination',
			LIVESTOCK_SICK: 'Sick livestock',
			LIVESTOCK_INJURY: 'Injured livestock',
			LIVESTOCK_CULL: 'Livestock culling',
			LIVESTOCK_TREATMENT: 'Livestock treatment',
			OTHER_LIVESTOCK_HEALTHCARE_ACTIVITY: 'Other healthcare activities',

			// # Livestock sale activities
			LIVESTOCK_SALE: 'Livestock sale',
			OTHER_LIVESTOCK_SALE_ACTIVITY: 'Other sales activities',

			// # AI Tasks
			AI_SEND_MESSAGE: 'Send message',
			AI_REMINDER: 'Smart reminder',
			AI_CHECK_IN: 'Smart check-in',
			AI_SCHEDULED_TASK: 'Scheduled task',
		},

		// Short versions will override longer version for UI purposes

		activity_short: {
			// # Seed activities
			SEED_PURCHASE_INFO: 'Seed purchase',
			OTHER_SUPPLY_PURCHASE_ACTIVITY: 'Supply purchase',

			// # Transplanting activities
			SEEDING: 'Seeding',
			DIRECT_SEEDING: 'Direct seeding',
			TRANSPLANTING: 'Transplanting',
			SEED_COMPLIANCE_NOTE: 'Notes',
			OTHER_TRANSPLANT_ACTIVITY: 'Other',

			// # Field activities
			PREPARE_SOIL: 'Soil prep',
			IRRIGATION: 'Irrigation',
			FERTILIZATION_COMPOST: 'Fertilization',
			PROTECT_CROP: 'Protection',
			MONITOR_CROP: 'Monitoring',
			PRUNING: 'Pruning',
			STRUCTURE_MAINTENANCE: 'Structure',
			PREPARE_HARVEST: 'Harvest prep',
			OTHER_FIELD_ACTIVITY: 'Notes',

			// # Harvest activities
			HARVEST_CROP: 'Harvested',
			HARVEST_COUNT: 'Counting/weighing',
			SORT_GRADE: 'Sorting/grading',
			YIELD_LOSS_ESTIMATE: 'Yield/loss',
			OTHER_HARVEST_ACTIVITY: 'Harvest-related',

			// # Post-harvest activities
			POST_HARVEST_HANDLING: 'Handling',
			POST_HARVEST_PACKAGING: 'Storage',
			COLD_STORAGE_TEMPERATURE: 'Cold storage',
			OTHER_POST_HARVEST_ACTIVITY: 'Post-harvest',

			// # Sales activities
			SALE_PRODUCE_ORDER: 'Purchase',
			OTHER_SALE_ORDER: 'Purchase (other)',

			// # Water testing activities
			WATER_TESTING: 'Water testing',
			OTHER_WATER_TESTING_ACTIVITY: 'Water testing',

			// #### ARRABLE - FOOD SAFETY

			// # Hygiene procedures
			HYGIENE_PROCEDURE: 'Hygiene',
			CONTAMINANT_RISK: 'Contaminants',
			BODILY_FLUID_CONTAMINATION: 'Excretion',
			SMOKING_EATING_DRINKING_CONTROL: 'Substance',
			PPE_USAGE: 'PPE',

			// # Sanitation infrastructure
			SANITATION_RISK: 'Sanitation',
			SANITATION_CONSTRUCTION_MAINTENANCE: 'Maintenance',
			SANITATION_CLEANING: 'Cleaning',
			SANITATION_PEST_CONTROL: 'Pest control',

			// # Materials & equipments
			EQUIPMENTS_MATERIALS_RISK: 'Materials',
			EQUIPMENTS_MATERIALS_CLEANING: 'Cleaning',

			// # Environment & biosecurity
			ENVIRONMENT_RISK: 'Environmental',

			// # Employee incidents & training
			EMPLOYEE_ORIENTATION: 'Orientation',
			EMPLOYEE_TRAINING: 'Training',
			SICK_EMPLOYEE: 'Sick',
			EMPLOYEE_INJURED: 'Injured',
			EMPLOYEE_NOTES: 'Notes',
			OPERATION_NOTES: 'Operation',

			// #### FARMERS MARKET

			// # Market credit receipts activities
			MARKET_CREDIT_RECEIPT: 'Credit receipt',

			// # Market operation activities
			MARKET_ATTENDANCE: 'Attendance',
			MARKET_LOAD_LIST: 'Load list',
			VENDOR_NOTES: 'Notes',
			FARMERS_MARKET_NOTES: 'Operation',

			// #### LIVESTOCK

			// # Feed & Supply purchases activities
			FEED_PURCHASE: 'Feed purchase',
			// OTHER_SUPPLY_PURCHASE_ACTIVITY: 'Other supply purchase', // This is double'd in Arable

			// # Livestock life cycle activities
			LIVESTOCK_PURCHASE: 'Purchase',
			LIVESTOCK_BIRTH: 'Birth',
			LIVESTOCK_REPRODUCTION: 'Reproduction',
			LIVESTOCK_DEATH: 'Death',
			OTHER_LIVESTOCK_LIFE_CYCLE_ACTIVITY: 'Life cycle',

			// # Livestock tracking activities
			LIVESTOCK_GROUP_TRACKING: 'Group tracking',
			LIVESTOCK_PASTURE_TRACKING: 'Pasture tracking',
			LIVESTOCK_ROTATIONAL_GRAZING: 'Rotational grazing',
			OTHER_LIVESTOCK_TRACKING_ACTIVITY: 'Other tracking',

			// # Pasture land management activities
			PASTURE_SEEDING: 'Pasture seeding',
			FENCE_MAINTENANCE: 'Fence maintenance',
			WATER_SOURCE_MAINTENANCE: 'Water source',
			OTHER_PASTURE_LAND_MANAGEMENT_ACTIVITY: 'Operation notes',

			// # Livestock healthcare activities
			LIVESTOCK_VACCINATION: 'Vaccination',
			LIVESTOCK_SICK: 'Sick notes',
			LIVESTOCK_INJURY: 'Injury',
			LIVESTOCK_CULL: 'Culling',
			LIVESTOCK_TREATMENT: 'Treatment',
			OTHER_LIVESTOCK_HEALTHCARE_ACTIVITY: 'Healthcare related',

			// # Livestock sale activities
			LIVESTOCK_SALE: 'Sale',
			OTHER_LIVESTOCK_SALE_ACTIVITY: 'Other sales',

			// # AI Tasks
			AI_SEND_MESSAGE: 'Send message',
			AI_REMINDER: 'Smart reminder',
			AI_CHECK_IN: 'Smart check-in',
			AI_SCHEDULED_TASK: 'Scheduled task',
		},

    // Search sort

    sort: {
      GROUP_BY_VENDORS: 'Sort by vendors',
      DATE_AND_VENDOR_DESC: 'Sort by date, vendors',
      DATE_DESC: 'Sort by date',
      null: 'Disable sorting',
    },

    sort_short: {
      GROUP_BY_VENDORS: 'Sort by vendors',
      DATE_AND_VENDOR_DESC: 'Sort by date, vendors',
      DATE_DESC: 'Sort by date',
      null: 'Disable sorting',
    },

		// Search filters
		filter: {
			logType: 'Activities',
			logType_ct: 'Activities (%{count})',
			dateRange: 'Date range',
			weeks_5: '5 weeks',
			search: 'Search',
      sort_options: 'Sort by',

			INCLUDE_AI_TASKS: 'Show all logs',
			AI_TASKS: 'AI tasks only',
			HIDE_AI_TASKS: 'Hide AI tasks',
		},

		// Search filter popover options
		filter_by: {
			preset: 'Filter by Preset',
			activity: 'Filter by Activity',
			date_range: 'Filter by Dates',
			weeks_5: '5 weeks',
			ai_tasks_only: 'AI tasks only',
			search: 'Search for Keywords',
		},

		// Accounting dates
		accounting_date: {
			INVOICE: 'Invoice date',
			RECEIPT: 'Receipt date',
		},

		// Accounting number
		accounting_number: {
			INVOICE: 'Invoice number',
			RECEIPT: 'Receipt number',
		},

		// Task status
		task_status: {
			STARTED: 'Started',
			COMPLETED: 'Completed',
			ERRORED: 'Errored',
			QUEUED: 'Queued',
			CANCELED: 'Canceled',
		},
	},
};
