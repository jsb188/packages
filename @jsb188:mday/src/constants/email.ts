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
