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

export const EVENT_SCHDULE_FREQUENCY = [
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  // 'YEARLY', // Not allowing this since it could be forgotten/abandoned and that's a problem with AI automated systems
];

export const DAY_OF_WEEK = [
  'SU', // Order matters
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
];
