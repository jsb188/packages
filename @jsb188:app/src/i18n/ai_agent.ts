export default {
	en: {
		// SMS responses
		sms_still_processing_1: 'Please wait a moment, I am still processing your message.',
		sms_still_processing_2: 'I am still processing your request. Please give me a moment.',
		sms_still_processing_3: 'Please hold on. I need a little more time to process your last message.',

		// Response texts
		thinking_: '💭 Thinking...',
		processing_request_: '⚙️ Processing your request...',
		getting_new_id_: '🆔 Creating new ID number...',
		saving_memories_: '💾 Saving memories...',
		reading_stored_memories_: '🧠 Reading stored memories...',
		writing_log_: '📝 Writing log entry...',
		writing_logs_: '📝 Writing log entries...',
		searching_logs_: '📖 Searching for logs...',
		searching_harvest_logs_: '📖 Searching for harvest logs...',
		getting_file_url_: '📄 Getting file URL...',
		create_reminder_task_: '📅 Creating task(s)...',
		create_recurring_reminder_task_: '📅 Creating recurring task(s)...',
		update_reminder_task_: '📅 Updating task(s)...',
		search_reminders_tasks_: '📅 Opening scheduled tasks...',
		finding_item_: '🔍 Searching for item...',
		searching_contacts_: '🔍 Searching contacts list...',
		updating_contacts_: '🪪 Updating contacts list...',
		searching_directory_: '🗂️ Searching directory...',
		updating_directory_: '🗂️ Updating directory...',
		creating_report_: '📊 Creating report... ',
		updating_schedule_: '📅 Updating schedule...',
		updating_events_: '📅 Updating events...',
		searching_event_: '🔍 Searching for event(s)...',
		saving_address_: '🏠 Saving address...',
		searching_address_: '🔍 Searching for address...',
		searching_: '🔍 Searching...',
		saving_document_: '📜 Saving document...',
		saving_attendance_: '🙋 Saving attendance...',
		getting_attendance_: '🙋 Getting attendance...',
		updating_attendance_list_: '🙋 Updating attendance list...',
		updating_database_: '🗄️ Updating database...',
		sending_message_: '✉️ Sending message...',
		handle_simple_task_: '📋 Handling task...',
		schedule_next_ai_task_: '📋 Scheduling next task...',
		saving_load_list_: '📋 Saving load list...',
		searching_for_load_list_: '🔍 Searching for load list...',
		writing_report_: '✍️ Writing report...',

		// Digests
		digest_for_: 'Digest for %{date}',

		// Common errors
		invalid_id: '"%{field}" (%{value}) is not a valid ID.',
		one_is_required: 'One of the following fields is required: %{fields}.',

		// Operation specific terms
		operation_activities: {
			ARABLE: 'farming activities',
			LIVESTOCK: 'ranching activities',
			FARMERS_MARKET: 'farmers market operations',
      GROWER_NETWORK: 'network activities',
		},
		operation_farmers: {
			ARABLE: 'farmers',
			LIVESTOCK: 'ranchers',
			FARMERS_MARKET: 'farmers market vendors',
      GROWER_NETWORK: 'growers',
		},

		// Real time data update messages
		log_created: 'A new log was created.',
		vendors_list_updated: 'Vendors list was updated.',
		vendor_removed: 'A vendor was removed.',
		log_updated: 'Log was updated.',
		log_deleted: 'Log was deleted.',
		attendance_list_updated: 'Attendance list was updated.',
		attendance_logged: 'Attendance record was logged.',

		// Features
		features: {
			AI_TASK: '"AI tasks", "AI workflows", "sending an email", "sending a message", "reminders", "work check-ins"',
			CAL_EVENTS: '"events", "market days"',
			CAL_EVENTS_ATTENDANCE: '', // This must return an empty string
		},

		// Real-time data update messages
		data_update: {
			moderation_failed_tasks_terminated: "AI's tasks were terminated because it failed our moderation tests.",
			tasks_assigned: 'AI has been assigned tasks.',
		},
	},
};
