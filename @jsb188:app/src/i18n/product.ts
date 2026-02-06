export default {
	en: {
		animal_id: 'Animal ID',
		dam_id: 'Dam ID',
		breed: 'Breed',

		upcoming_markets: 'Upcoming markets',
		markets_empty_msg: 'Talk to your AI to create farmers market events.',
		event_not_scheduled_msg: 'This event is not scheduled for this date.',
		attendance_list_empty_msg: 'Attendance list is empty for this date.',

		// Report
		collected_total_ct_evidences: 'Collected a total of %{smart_count} evidence.||||Collected a total of %{smart_count} evidences.',

		// Content names
		view_document: 'View document',
		view_event: 'View event',
		view_market: 'View market',

		edit_document: 'Edit document',
		edit_event: 'Edit event',
		edit_market: 'Edit market',

		delete_document: 'Delete document',
		delete_event: 'Delete event',
		delete_market: 'Delete market',

		// Enums
		status: {
			ALIVE: 'Alive',
			SICK: 'Sick',
			SOLD: 'Sold',
			DECEASED: 'Deceased',
		},

		event_frequency_msg: {
			ONCE: 'This event does not repeat.',
			WEEKLY: 'This event repeats weekly.',
		},

		contentName_plural: {
			market: 'Markets',
		},

		feature_title: {
			// This object is the "title" field of "actions" database document.
			// It's used as visualization purposes only, in front-end UI.
			CAL_EVENTS_ATTENDANCE: 'Attendance record',
			CAL_EVENTS_LOAD_LIST: 'Load list',
		},

		feature_instructions: {
			// This object is the "instruction" field of "actions" database document.
			// It's used as visualization purposes only, in front-end UI.
			CAL_EVENTS_ATTENDANCE: "Read the log and record the vendor's attendance.",
			CAL_EVENTS_LOAD_LIST: "Save the vendor's load list for the market day.",
		},

		feature_notification: {
			// This object is the "top right corner" toaster notification messages in the front-end UI.
			CAL_EVENTS_ATTENDANCE_success: 'Vendor attendance has been recorded.',
			CAL_EVENTS_ATTENDANCE_failed: 'Failed to record vendor attendance.',
			CAL_EVENTS_LOAD_LIST_success: 'Load list has been saved.',
			CAL_EVENTS_LOAD_LIST_failed: 'Failed to save load list.',
		},

		// Reports

		report: {
			GLOBAL_GAP: 'GLOBALG.A.P.',
			ORGANIC_CERTIFICATION: 'USDA National Organic Program (NOP)',
			CLEANING: 'Cleaning logs',
		},

		back_to_globalgap: 'Back to GLOBALG.A.P.',
	},
};
