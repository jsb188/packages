
// AI agent inboxes


const INBOX_DOMAINS_BY_TYPE = {
  vendor: [
    'orders.marketday.ai',
    // 'agent.marketday.ai', // enable when ready
  ],
  default: [
    // 'agent.marketday.ai', // enable when ready
  ]
};

export const OPERATION_INBOX_DOMAINS = {
  ARABLE: INBOX_DOMAINS_BY_TYPE.vendor,
  RESTAURANT: INBOX_DOMAINS_BY_TYPE.vendor,
  DEFAULT: INBOX_DOMAINS_BY_TYPE.default,
};
