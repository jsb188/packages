export default {
	en: {
		organization: 'Organization',
		my_organizations: 'My organizations',
		name: 'Organization name',
		name_of: 'Name of organization',
		type_of: 'Type of organization',
		org_info: 'Organization information',
		nothing_found: 'No organizations found.',
		farms: 'Farms',
		settings: 'Organization settings',
		manage_team: 'Manage team',
		invite_members: 'Invite members',
		members_ct: '%{smart_count} member||||%{smart_count} members',
		administration: 'Administration',
		billing: 'Billing',
		plans: 'Plans',
		address_notice_msg: 'This information will appear on the invoices you generate for your customers and to others in your network.',
		no_recurring_schedule: 'This event does not have a recurring schedule.',
		daily_event_msg: 'This event repeats every day.',
		single_event_msg: 'This event only occurs once.',
		daily_digest: 'Daily digest',
		compliance_title: 'Compliance',
		compliance_docs: 'Compliance documents',
		outstanding_balance: 'Outstanding balance',
		recent_invoices: 'Recent invoices',
		upcoming_invoices: 'Upcoming invoices',
		upcoming_markets: 'Upcoming Markets',
		past_markets: 'Past Markets',
		load_lists: 'Load Lists',
		contact_to_change: 'Please contact us to change this information.',
		vendor_documents_not_found_msg: "This vendor hasn't submitted any compliance documents or certifications.",
		switch_organizations: 'Switch organizations',
		switch_msg: (
			'Messages from your phone number <span class="em_text"><span class="rel z1">%{phoneNumber}</span></span> ' +
			'will only be sent to your primary organization, <span class="em_text"><span class="rel z1">%{orgName}</span></span>.'
		),
		switch_msg_no_org_selected: (
			'Messages from your phone number <span class="em_text"><span class="rel z1">%{phoneNumber}</span></span> ' +
			'will only be sent to your primary organization.'
		),
		switch_msg_no_phone_selected: (
			'Messages from your phone number ' +
			'will only be sent to your primary organization, <span class="em_text"><span class="rel z1">%{orgName}</span></span>.'
		),
		switch_msg_none_selected: (
			'Messages from your phone number will only be sent to your primary organization.'
		),
		switch_instr: 'Select from the list below to change your primary organization.',

		switch_confirm_msg: (
			// NOTE: Because ".em_text" only works when the entire word is in 1 line,
			// we need to give as much space as possible to <span> block.
			'Do you want to switch your primary organization to ' +
			'<span class="em_text"><span class="rel z1">%{orgName}</span></span>?'
		),

		switch_finished_msg: (
			'Your primary organization has been switched to ' +
			'<span class="em_text"><span class="rel z1">%{orgName}</span></span>.'
		),

		yes_switch: 'Yes, switch organization',

    role: {
      MEMBER: 'Member',
      MANAGER: 'Manager',
      ADMIN: 'Admin',
      OWNER: 'Owner',
      GUEST: 'Guest',
    },

		type: {
			ARABLE: 'Arable farm',
			LIVESTOCK: 'Livestock ranch',
			FARMERS_MARKET: 'Farmers market',
			GROWER_NETWORK: 'Grower network',
      RESTAURANT: 'Restaurant',
      VENDOR: 'Vendor',
		},

    type_short: {
      ARABLE: 'Farm',
      LIVESTOCK: 'Ranch',
      FARMERS_MARKET: 'Market',
      GROWER_NETWORK: 'Grower network',
      RESTAURANT: 'Restaurant',
      VENDOR: 'Vendor',
    },

		type_inline: {
			ARABLE: 'farm',
			LIVESTOCK: 'ranch',
			FARMERS_MARKET: 'farmers market',
			GROWER_NETWORK: 'grower network',
      RESTAURANT: 'restaurant',
      VENDOR: 'vendor',
		},

		type_active: {
			ARABLE: 'Farming',
			LIVESTOCK: 'Ranching',
			FARMERS_MARKET: 'Market',
			GROWER_NETWORK: 'Grower network',
      RESTAURANT: 'Restaurant',
      VENDOR: 'Vendor',
		},

		type_detailed: {
			ARABLE: 'Arable farm (produce)',
			LIVESTOCK: 'Livestock ranch (livestock)',
			FARMERS_MARKET: 'Farmers market',
			GROWER_NETWORK: 'Grower network',
      RESTAURANT: 'Restaurant',
      VENDOR: 'Vendor (customer or supplier)',
    },

		operation_desc: {
			ARABLE: 'Crop production (%{commodities})',
			LIVESTOCK: 'Livestock production (%{commodities})',

			ARABLE_default: 'Crop production (produce)',
			LIVESTOCK_default: 'Livestock production',

      // ..
      // Other operations will defaults to "Unknown"
		},

		cert_scope: {
			ARABLE: 'Crop production',
			LIVESTOCK: 'Livestock production',
			// Defaults to "Unknown"
		},

		product: {
			ARABLE: 'produce',
			LIVESTOCK: 'livestock',
			FARMERS_MARKET: 'product',
			GROWER_NETWORK: 'product',
      RESTAURANT: 'product',
      VENDOR: 'product',
		},

		children: {
			GROWER_NETWORK: 'Farms',
			FARMERS_MARKET: 'Vendors',
		},

		edit: {
			ARABLE: 'Edit farm',
			LIVESTOCK: 'Edit ranch',
			FARMERS_MARKET: 'Edit farmers market',
			GROWER_NETWORK: 'Edit organization',
      RESTAURANT: 'Edit restaurant',
      VENDOR: 'Edit vendor',
		},

		delete: {
			ARABLE: 'Delete farm',
			LIVESTOCK: 'Delete ranch',
			FARMERS_MARKET: 'Delete farmers market',
			GROWER_NETWORK: 'Delete organization',
      RESTAURANT: 'Delete restaurant',
      VENDOR: 'Delete vendor',
		},

		contact_department: {
			PRIMARY_CONTACT: 'General inquiries',
			ACCOUNTS_RECEIVABLE: 'Accounts receivable',
			SALES: 'Sales',
			CUSTOMER_SERVICE: 'Customer service',
			SHIPPING_RECEIVING: 'Shipping & receiving',
			OTHER: 'Other inquiries',
		},

		compliance: {
			ORGANIC: 'Organic',
			INSURANCE: 'Insurance',
			PRODUCERS_CERTIFICATE: 'Producer',
			MILK_HANDLER_LICENSE: 'Milk Handler',
			EGG_HANDLER_LICENSE: 'Egg Handler',
			NURSERY_LICENSE: 'Nursery',
		},

		event_type: {
			FARMERS_MARKET: 'Market',
		},
	},
};
