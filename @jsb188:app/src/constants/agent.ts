
// AI agent inboxes

const GROUP_TO_INBOX_DOMAINS = {
  vendor: [
    'orders.marketday.ai',
    // 'agent.marketday.ai', // enable when ready
  ],
  default: [
    // 'agent.marketday.ai', // enable when ready
  ]
};

export const OPERATION_INBOX_DOMAINS = {
  ARABLE: GROUP_TO_INBOX_DOMAINS.vendor,
  RESTAURANT: GROUP_TO_INBOX_DOMAINS.vendor,
  DEFAULT: GROUP_TO_INBOX_DOMAINS.default,
};


export const DOMAIN_TO_INBOX = {
  // Assistant
  'agent.marketday.ai': 'ASSISTANT',
  'assistant.marketday.ai': 'ASSISTANT',

  // General inquiry
  'general.marketday.ai': 'GENERAL_INQUIRY',
  'info.marketday.ai': 'GENERAL_INQUIRY',
  'inquiry.marketday.ai': 'GENERAL_INQUIRY',

  // Orders
  'orders.marketday.ai': 'ORDERS',
} as const;

export const REQUEST_SOURCE_ENUMS = [
  'SMS',
  'WEB',
  'EMAIL',
  'WORKFLOW'
] as const;

export const WORKFLOW_RUN_STATUS_ENUMS = [
	'STARTED',
	'COMPLETED',
	'COMPLETED_PARTIAL',
	'ERRORED',
	'QUEUED',
	'CANCELED',
];
