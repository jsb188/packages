export default {
	en: {
		// SMS responses
		sms_still_processing_1: 'Please wait a moment, I am still processing your message.',
		sms_still_processing_2: 'I am still processing your request. Please give me a moment.',
		sms_still_processing_3: 'Please hold on. I need a little more time to process your last message.',

		// Response texts
		thinking_: '💭 Thinking...',
		processing_request_: '⚙️ Processing your request...',
    creating_link_: '🔗 Creating a link...',
		getting_new_id_: '🆔 Creating new ID number...',
		saving_memories_: '💾 Saving memories...',
		reading_stored_memories_: '🧠 Reading stored memories...',
		writing_log_: '📝 Writing log entry...',
		writing_logs_: '📝 Writing log entries...',
		searching_logs_: '📖 Searching for logs...',
		searching_harvest_logs_: '📖 Searching for harvest logs...',
    searching_avail_forms_: '🗄️ Searching for available forms...',
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
    searching_site_loc_: '🗺️ Searching for site...',
    updating_site_loc_: '🗺️ Updating site location...',
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
		saving_load_list_: '📋 Saving load list...',
		searching_for_load_list_: '🔍 Searching for load list...',
		writing_report_: '✍️ Writing report...',
    processing_csv_request_: '⚙️ Processing CSV file request...',
    retrieving_customer_context_: '🧠 Retrieving customer context...',
    saving_customer_context_: '🧠 Saving customer context...',

		// Digests
		digest_for_: 'Digest for %{date}',

		// AI inbox
		ai_inbox_handle: 'Handle',
		change_ai_inbox: 'AI inbox',
		change_ai_inbox_msg: 'Choose a handle for your organization.\n This will become the address for your AI inbox email.',
		remove_ai_inbox: 'Remove AI inbox',
		ai_inbox_updated: 'AI inbox updated',
		ai_inbox_updated_msg: 'AI inbox handle has been changed to:\n [hl]%{inboundEmail}[/hl].',
		ai_inbox_removed_msg: 'AI inbox for your organization has been removed.',
		ai_inbox_addresses_ready: (
      'Emails sent to any of these addresses will automatically trigger AI workflows.'
    ),
		ai_inbox_addresses_empty: (
      'AI inboxes handles requests from emails on your team\'s behalf. Choose a handle to activate AI inboxes.'
    ),
    ai_inbox_desc: {
      orders: 'Handle incoming orders from customers.',
      agent: 'Handle general requests.',
	    },
	    change_handle: 'Change inbox handle',

		// Integrations
		integrations_desc: 'Grant your AI access to third-party apps and services.',
		integrations_read_only_desc: 'You _do not_ have permissions to edit third-party apps and services for this organization.',
		integrations_other_title: 'Looking for a different app connection?',
		integrations_other_desc: '[Send us an e-mail](mailto:hello@marketday.ai). We decide what to build next based on your feedback.',
		integrations_disconnect_msg: 'Are you sure you want to disconnect?\n All related features will be disabled.',

			// Common errors
		invalid_id: '"%{field}" (%{value}) is not a valid ID.',
		one_is_required: 'One of the following fields is required: %{fields}.',

		// Operation specific terms
		operation_activities: {
			ARABLE: 'farming activities',
			LIVESTOCK: 'ranching activities',
			FARMERS_MARKET: 'farmers market operations',
      GROWER_NETWORK: 'network activities',
      WHOLESALE_FOOD: 'wholesale food operations',
      UNKNOWN: 'organization activities',
		},
		operation_farmers: {
			ARABLE: 'farmers',
			LIVESTOCK: 'ranchers',
			FARMERS_MARKET: 'farmers market vendors',
      GROWER_NETWORK: 'growers',
      WHOLESALE_FOOD: 'wholesale food businesses',
      UNKNOWN: 'organizations',
		},

		// Real time data update messages
		log_created: 'A new log was created.',
		vendors_list_updated: 'Vendors list was updated.',
		vendor_removed: 'A vendor was removed.',
		log_updated: 'Log was updated.',
		log_deleted: 'Log was deleted.',
		attendance_list_updated: 'Attendance list was updated.',
		attendance_logged: 'Attendance record was logged.',

		// Real-time data update messages
		data_update: {
			moderation_failed_tasks_terminated: "AI's tasks were terminated because it failed our moderation tests.",
			tasks_assigned: 'AI has been assigned tasks.',
		},
	},
};
