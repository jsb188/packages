/**
 * Email handling lifecycle statuses.
 */
export const EMAIL_STATUS_ENUMS = [
	'RECEIVED',
	'QUEUED',
	'SUPERSEDED',
	'PROCESSING',
	'COMPLETED',
	'IGNORED',
	'ERRORED',
] as const;

/**
 * Inbound email list sort options.
 */
export const INBOUND_EMAIL_SORT_ENUMS = [
	'RECEIVED_AT_DESC',
	'RECEIVED_AT_ASC',
] as const;

/**
 * Inbound email body display source options.
 */
export const INBOUND_EMAIL_BODY_FORMAT_ENUMS = [
	'TEXT',
	'HTML_TEXT',
] as const;
