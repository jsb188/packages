export const ALERT_TYPE_ENUMS = [
	'CO_OWNER_ADDED',
	'CO_OWNER_INVITE',
	'NEW_FRIEND',
	'MESSAGE',
];

export const ALERT_ICON_NAMES = {
	CO_OWNER_INVITE: 'mail',
	CO_OWNER_ADDED: 'mail-check',
	NEW_FRIEND: 'user-check',
	MESSAGE: 'bell',
} as {
	[key: string]: string;
};

export const DAY_OF_WEEK = [
	'SU', // Order matters
	'MO',
	'TU',
	'WE',
	'TH',
	'FR',
	'SA',
];

export const DATE_PICKER_MIN = '1950-01-01';
