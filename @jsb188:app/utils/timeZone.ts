import { DateTime } from 'luxon';

// Source: https://raw.githubusercontent.com/moment/moment-timezone/refs/heads/develop/data/meta/latest.json

export const DEFAULT_TIMEZONE = 'America/Los_Angeles';

const TIMEZONE_DATA = {
	AD: {
		// Andorra
		list: [
			'Europe/Andorra',
		],
	},
	AE: {
		// United Arab Emirates
		list: [
			'Asia/Dubai',
		],
	},
	AF: {
		// Afghanistan
		list: [
			'Asia/Kabul',
		],
	},
	AG: {
		// Antigua & Barbuda
		list: [
			'America/Puerto_Rico',
			'America/Antigua',
		],
	},
	AI: {
		// Anguilla
		list: [
			'America/Puerto_Rico',
			'America/Anguilla',
		],
	},
	AL: {
		// Albania
		list: [
			'Europe/Tirane',
		],
	},
	AM: {
		// Armenia
		list: [
			'Asia/Yerevan',
		],
	},
	AO: {
		// Angola
		list: [
			'Africa/Lagos',
			'Africa/Luanda',
		],
	},
	AQ: {
		// Antarctica
		list: [
			'Antarctica/Casey',
			'Antarctica/Davis',
			'Antarctica/Mawson',
			'Antarctica/Palmer',
			'Antarctica/Rothera',
			'Antarctica/Troll',
			'Antarctica/Vostok',
			'Pacific/Auckland',
			'Pacific/Port_Moresby',
			'Asia/Riyadh',
			'Asia/Singapore',
			'Antarctica/McMurdo',
			'Antarctica/DumontDUrville',
			'Antarctica/Syowa',
		],
	},
	AR: {
		// Argentina
		list: [
			'America/Argentina/Buenos_Aires',
			'America/Argentina/Cordoba',
			'America/Argentina/Salta',
			'America/Argentina/Jujuy',
			'America/Argentina/Tucuman',
			'America/Argentina/Catamarca',
			'America/Argentina/La_Rioja',
			'America/Argentina/San_Juan',
			'America/Argentina/Mendoza',
			'America/Argentina/San_Luis',
			'America/Argentina/Rio_Gallegos',
			'America/Argentina/Ushuaia',
		],
	},
	AS: {
		// Samoa (American)
		list: [
			'Pacific/Pago_Pago',
		],
	},
	AT: {
		// Austria
		list: [
			'Europe/Vienna',
		],
	},
	AU: {
		// Australia
		list: [
			'Australia/Lord_Howe',
			'Antarctica/Macquarie',
			'Australia/Hobart',
			'Australia/Melbourne',
			'Australia/Sydney',
			'Australia/Broken_Hill',
			'Australia/Brisbane',
			'Australia/Lindeman',
			'Australia/Adelaide',
			'Australia/Darwin',
			'Australia/Perth',
			'Australia/Eucla',
			'Asia/Tokyo',
		],
	},
	AW: {
		// Aruba
		list: [
			'America/Puerto_Rico',
			'America/Aruba',
		],
	},
	AX: {
		// Åland Islands
		list: [
			'Europe/Helsinki',
			'Europe/Mariehamn',
		],
	},
	AZ: {
		// Azerbaijan
		list: [
			'Asia/Baku',
		],
	},
	BA: {
		// Bosnia & Herzegovina
		list: [
			'Europe/Belgrade',
			'Europe/Sarajevo',
		],
	},
	BB: {
		// Barbados
		list: [
			'America/Barbados',
		],
	},
	BD: {
		// Bangladesh
		list: [
			'Asia/Dhaka',
		],
	},
	BE: {
		// Belgium
		list: [
			'Europe/Brussels',
		],
	},
	BF: {
		// Burkina Faso
		list: [
			'Africa/Abidjan',
			'Africa/Ouagadougou',
		],
	},
	BG: {
		// Bulgaria
		list: [
			'Europe/Sofia',
		],
	},
	BH: {
		// Bahrain
		list: [
			'Asia/Qatar',
			'Asia/Bahrain',
		],
	},
	BI: {
		// Burundi
		list: [
			'Africa/Maputo',
			'Africa/Bujumbura',
		],
	},
	BJ: {
		// Benin
		list: [
			'Africa/Lagos',
			'Africa/Porto-Novo',
		],
	},
	BL: {
		// St Barthelemy
		list: [
			'America/Puerto_Rico',
			'America/St_Barthelemy',
		],
	},
	BM: {
		// Bermuda
		list: [
			'Atlantic/Bermuda',
		],
	},
	BN: {
		// Brunei
		list: [
			'Asia/Kuching',
			'Asia/Brunei',
		],
	},
	BO: {
		// Bolivia
		list: [
			'America/La_Paz',
		],
	},
	BQ: {
		// Caribbean NL
		list: [
			'America/Puerto_Rico',
			'America/Kralendijk',
		],
	},
	BR: {
		// Brazil
		list: [
			'America/Noronha',
			'America/Belem',
			'America/Fortaleza',
			'America/Recife',
			'America/Araguaina',
			'America/Maceio',
			'America/Bahia',
			'America/Sao_Paulo',
			'America/Campo_Grande',
			'America/Cuiaba',
			'America/Santarem',
			'America/Porto_Velho',
			'America/Boa_Vista',
			'America/Manaus',
			'America/Eirunepe',
			'America/Rio_Branco',
		],
	},
	BS: {
		// Bahamas
		list: [
			'America/Toronto',
			'America/Nassau',
		],
	},
	BT: {
		// Bhutan
		list: [
			'Asia/Thimphu',
		],
	},
	BW: {
		// Botswana
		list: [
			'Africa/Maputo',
			'Africa/Gaborone',
		],
	},
	BY: {
		// Belarus
		list: [
			'Europe/Minsk',
		],
	},
	BZ: {
		// Belize
		list: [
			'America/Belize',
		],
	},
	CA: {
		// Canada
		map: {
			AB: 'America/Edmonton',
			BC: 'America/Vancouver', // Also 'America/Dawson_Creek', 'America/Fort_Nelson'
			MB: 'America/Winnipeg',
			NB: 'America/Moncton',
			NL: 'America/St_Johns', // 'America/Goose_Bay'
			NS: 'America/Halifax',
			NT: 'America/Yellowknife',
			NU: 'America/Iqaluit', // 'America/Rankin_Inlet', 'America/Cambridge_Bay'
			ON: 'America/Toronto', // Also 'America/Thunder_Bay', 'America/Atikokan'
			PE: 'America/Halifax',
			QC: 'America/Montreal', // Also 'America/Blanc-Sablon'
			SK: 'America/Regina', // Also 'America/Swift_Current' (no DST in much of SK)
			YT: 'America/Whitehorse', // (permanent UTC−7 since 2020)
		},
		list: [
			'America/St_Johns',
			'America/Halifax',
			'America/Glace_Bay',
			'America/Moncton',
			'America/Goose_Bay',
			'America/Toronto',
			'America/Iqaluit',
			'America/Winnipeg',
			'America/Resolute',
			'America/Rankin_Inlet',
			'America/Regina',
			'America/Swift_Current',
			'America/Edmonton',
			'America/Cambridge_Bay',
			'America/Inuvik',
			'America/Dawson_Creek',
			'America/Fort_Nelson',
			'America/Whitehorse',
			'America/Dawson',
			'America/Vancouver',
			'America/Panama',
			'America/Puerto_Rico',
			'America/Phoenix',
			'America/Blanc-Sablon',
			'America/Atikokan',
			'America/Creston',
		],
	},
	CC: {
		// Cocos (Keeling) Islands
		list: [
			'Asia/Yangon',
			'Indian/Cocos',
		],
	},
	CD: {
		// Congo (Dem. Rep.)
		list: [
			'Africa/Maputo',
			'Africa/Lagos',
			'Africa/Kinshasa',
			'Africa/Lubumbashi',
		],
	},
	CF: {
		// Central African Rep.
		list: [
			'Africa/Lagos',
			'Africa/Bangui',
		],
	},
	CG: {
		// Congo (Rep.)
		list: [
			'Africa/Lagos',
			'Africa/Brazzaville',
		],
	},
	CH: {
		// Switzerland
		list: [
			'Europe/Zurich',
		],
	},
	CI: {
		// Côte d'Ivoire
		list: [
			'Africa/Abidjan',
		],
	},
	CK: {
		// Cook Islands
		list: [
			'Pacific/Rarotonga',
		],
	},
	CL: {
		// Chile
		list: [
			'America/Santiago',
			'America/Coyhaique',
			'America/Punta_Arenas',
			'Pacific/Easter',
		],
	},
	CM: {
		// Cameroon
		list: [
			'Africa/Lagos',
			'Africa/Douala',
		],
	},
	CN: {
		// China
		list: [
			'Asia/Shanghai',
			'Asia/Urumqi',
		],
	},
	CO: {
		// Colombia
		list: [
			'America/Bogota',
		],
	},
	CR: {
		// Costa Rica
		list: [
			'America/Costa_Rica',
		],
	},
	CU: {
		// Cuba
		list: [
			'America/Havana',
		],
	},
	CV: {
		// Cape Verde
		list: [
			'Atlantic/Cape_Verde',
		],
	},
	CW: {
		// Curaçao
		list: [
			'America/Puerto_Rico',
			'America/Curacao',
		],
	},
	CX: {
		// Christmas Island
		list: [
			'Asia/Bangkok',
			'Indian/Christmas',
		],
	},
	CY: {
		// Cyprus
		list: [
			'Asia/Nicosia',
			'Asia/Famagusta',
		],
	},
	CZ: {
		// Czech Republic
		list: [
			'Europe/Prague',
		],
	},
	DE: {
		// Germany
		list: [
			'Europe/Zurich',
			'Europe/Berlin',
			'Europe/Busingen',
		],
	},
	DJ: {
		// Djibouti
		list: [
			'Africa/Nairobi',
			'Africa/Djibouti',
		],
	},
	DK: {
		// Denmark
		list: [
			'Europe/Berlin',
			'Europe/Copenhagen',
		],
	},
	DM: {
		// Dominica
		list: [
			'America/Puerto_Rico',
			'America/Dominica',
		],
	},
	DO: {
		// Dominican Republic
		list: [
			'America/Santo_Domingo',
		],
	},
	DZ: {
		// Algeria
		list: [
			'Africa/Algiers',
		],
	},
	EC: {
		// Ecuador
		list: [
			'America/Guayaquil',
			'Pacific/Galapagos',
		],
	},
	EE: {
		// Estonia
		list: [
			'Europe/Tallinn',
		],
	},
	EG: {
		// Egypt
		list: [
			'Africa/Cairo',
		],
	},
	EH: {
		// Western Sahara
		list: [
			'Africa/El_Aaiun',
		],
	},
	ER: {
		// Eritrea
		list: [
			'Africa/Nairobi',
			'Africa/Asmara',
		],
	},
	ES: {
		// Spain
		list: [
			'Europe/Madrid',
			'Africa/Ceuta',
			'Atlantic/Canary',
		],
	},
	ET: {
		// Ethiopia
		list: [
			'Africa/Nairobi',
			'Africa/Addis_Ababa',
		],
	},
	FI: {
		// Finland
		list: [
			'Europe/Helsinki',
		],
	},
	FJ: {
		// Fiji
		list: [
			'Pacific/Fiji',
		],
	},
	FK: {
		// Falkland Islands
		list: [
			'Atlantic/Stanley',
		],
	},
	FM: {
		// Micronesia
		list: [
			'Pacific/Kosrae',
			'Pacific/Port_Moresby',
			'Pacific/Guadalcanal',
			'Pacific/Chuuk',
			'Pacific/Pohnpei',
		],
	},
	FO: {
		// Faroe Islands
		list: [
			'Atlantic/Faroe',
		],
	},
	FR: {
		// France
		list: [
			'Europe/Paris',
		],
	},
	GA: {
		// Gabon
		list: [
			'Africa/Lagos',
			'Africa/Libreville',
		],
	},
	GB: {
		// Britain (UK)
		list: [
			'Europe/London',
		],
	},
	GD: {
		// Grenada
		list: [
			'America/Puerto_Rico',
			'America/Grenada',
		],
	},
	GE: {
		// Georgia
		list: [
			'Asia/Tbilisi',
		],
	},
	GF: {
		// French Guiana
		list: [
			'America/Cayenne',
		],
	},
	GG: {
		// Guernsey
		list: [
			'Europe/London',
			'Europe/Guernsey',
		],
	},
	GH: {
		// Ghana
		list: [
			'Africa/Abidjan',
			'Africa/Accra',
		],
	},
	GI: {
		// Gibraltar
		list: [
			'Europe/Gibraltar',
		],
	},
	GL: {
		// Greenland
		list: [
			'America/Nuuk',
			'America/Danmarkshavn',
			'America/Scoresbysund',
			'America/Thule',
		],
	},
	GM: {
		// Gambia
		list: [
			'Africa/Abidjan',
			'Africa/Banjul',
		],
	},
	GN: {
		// Guinea
		list: [
			'Africa/Abidjan',
			'Africa/Conakry',
		],
	},
	GP: {
		// Guadeloupe
		list: [
			'America/Puerto_Rico',
			'America/Guadeloupe',
		],
	},
	GQ: {
		// Equatorial Guinea
		list: [
			'Africa/Lagos',
			'Africa/Malabo',
		],
	},
	GR: {
		// Greece
		list: [
			'Europe/Athens',
		],
	},
	GS: {
		// South Georgia & the South Sandwich Islands
		list: [
			'Atlantic/South_Georgia',
		],
	},
	GT: {
		// Guatemala
		list: [
			'America/Guatemala',
		],
	},
	GU: {
		// Guam
		list: [
			'Pacific/Guam',
		],
	},
	GW: {
		// Guinea-Bissau
		list: [
			'Africa/Bissau',
		],
	},
	GY: {
		// Guyana
		list: [
			'America/Guyana',
		],
	},
	HK: {
		// Hong Kong
		list: [
			'Asia/Hong_Kong',
		],
	},
	HN: {
		// Honduras
		list: [
			'America/Tegucigalpa',
		],
	},
	HR: {
		// Croatia
		list: [
			'Europe/Belgrade',
			'Europe/Zagreb',
		],
	},
	HT: {
		// Haiti
		list: [
			'America/Port-au-Prince',
		],
	},
	HU: {
		// Hungary
		list: [
			'Europe/Budapest',
		],
	},
	ID: {
		// Indonesia
		list: [
			'Asia/Jakarta',
			'Asia/Pontianak',
			'Asia/Makassar',
			'Asia/Jayapura',
		],
	},
	IE: {
		// Ireland
		list: [
			'Europe/Dublin',
		],
	},
	IL: {
		// Israel
		list: [
			'Asia/Jerusalem',
		],
	},
	IM: {
		// Isle of Man
		list: [
			'Europe/London',
			'Europe/Isle_of_Man',
		],
	},
	IN: {
		// India
		list: [
			'Asia/Kolkata',
		],
	},
	IO: {
		// British Indian Ocean Territory
		list: [
			'Indian/Chagos',
		],
	},
	IQ: {
		// Iraq
		list: [
			'Asia/Baghdad',
		],
	},
	IR: {
		// Iran
		list: [
			'Asia/Tehran',
		],
	},
	IS: {
		// Iceland
		list: [
			'Africa/Abidjan',
			'Atlantic/Reykjavik',
		],
	},
	IT: {
		// Italy
		list: [
			'Europe/Rome',
		],
	},
	JE: {
		// Jersey
		list: [
			'Europe/London',
			'Europe/Jersey',
		],
	},
	JM: {
		// Jamaica
		list: [
			'America/Jamaica',
		],
	},
	JO: {
		// Jordan
		list: [
			'Asia/Amman',
		],
	},
	JP: {
		// Japan
		list: [
			'Asia/Tokyo',
		],
	},
	KE: {
		// Kenya
		list: [
			'Africa/Nairobi',
		],
	},
	KG: {
		// Kyrgyzstan
		list: [
			'Asia/Bishkek',
		],
	},
	KH: {
		// Cambodia
		list: [
			'Asia/Bangkok',
			'Asia/Phnom_Penh',
		],
	},
	KI: {
		// Kiribati
		list: [
			'Pacific/Tarawa',
			'Pacific/Kanton',
			'Pacific/Kiritimati',
		],
	},
	KM: {
		// Comoros
		list: [
			'Africa/Nairobi',
			'Indian/Comoro',
		],
	},
	KN: {
		// St Kitts & Nevis
		list: [
			'America/Puerto_Rico',
			'America/St_Kitts',
		],
	},
	KP: {
		// Korea (North)
		list: [
			'Asia/Pyongyang',
		],
	},
	KR: {
		// Korea (South)
		list: [
			'Asia/Seoul',
		],
	},
	KW: {
		// Kuwait
		list: [
			'Asia/Riyadh',
			'Asia/Kuwait',
		],
	},
	KY: {
		// Cayman Islands
		list: [
			'America/Panama',
			'America/Cayman',
		],
	},
	KZ: {
		// Kazakhstan
		list: [
			'Asia/Almaty',
			'Asia/Qyzylorda',
			'Asia/Qostanay',
			'Asia/Aqtobe',
			'Asia/Aqtau',
			'Asia/Atyrau',
			'Asia/Oral',
		],
	},
	LA: {
		// Laos
		list: [
			'Asia/Bangkok',
			'Asia/Vientiane',
		],
	},
	LB: {
		// Lebanon
		list: [
			'Asia/Beirut',
		],
	},
	LC: {
		// St Lucia
		list: [
			'America/Puerto_Rico',
			'America/St_Lucia',
		],
	},
	LI: {
		// Liechtenstein
		list: [
			'Europe/Zurich',
			'Europe/Vaduz',
		],
	},
	LK: {
		// Sri Lanka
		list: [
			'Asia/Colombo',
		],
	},
	LR: {
		// Liberia
		list: [
			'Africa/Monrovia',
		],
	},
	LS: {
		// Lesotho
		list: [
			'Africa/Johannesburg',
			'Africa/Maseru',
		],
	},
	LT: {
		// Lithuania
		list: [
			'Europe/Vilnius',
		],
	},
	LU: {
		// Luxembourg
		list: [
			'Europe/Brussels',
			'Europe/Luxembourg',
		],
	},
	LV: {
		// Latvia
		list: [
			'Europe/Riga',
		],
	},
	LY: {
		// Libya
		list: [
			'Africa/Tripoli',
		],
	},
	MA: {
		// Morocco
		list: [
			'Africa/Casablanca',
		],
	},
	MC: {
		// Monaco
		list: [
			'Europe/Paris',
			'Europe/Monaco',
		],
	},
	MD: {
		// Moldova
		list: [
			'Europe/Chisinau',
		],
	},
	ME: {
		// Montenegro
		list: [
			'Europe/Belgrade',
			'Europe/Podgorica',
		],
	},
	MF: {
		// St Martin (French)
		list: [
			'America/Puerto_Rico',
			'America/Marigot',
		],
	},
	MG: {
		// Madagascar
		list: [
			'Africa/Nairobi',
			'Indian/Antananarivo',
		],
	},
	MH: {
		// Marshall Islands
		list: [
			'Pacific/Tarawa',
			'Pacific/Kwajalein',
			'Pacific/Majuro',
		],
	},
	MK: {
		// North Macedonia
		list: [
			'Europe/Belgrade',
			'Europe/Skopje',
		],
	},
	ML: {
		// Mali
		list: [
			'Africa/Abidjan',
			'Africa/Bamako',
		],
	},
	MM: {
		// Myanmar (Burma)
		list: [
			'Asia/Yangon',
		],
	},
	MN: {
		// Mongolia
		list: [
			'Asia/Ulaanbaatar',
			'Asia/Hovd',
		],
	},
	MO: {
		// Macau
		list: [
			'Asia/Macau',
		],
	},
	MP: {
		// Northern Mariana Islands
		list: [
			'Pacific/Guam',
			'Pacific/Saipan',
		],
	},
	MQ: {
		// Martinique
		list: [
			'America/Martinique',
		],
	},
	MR: {
		// Mauritania
		list: [
			'Africa/Abidjan',
			'Africa/Nouakchott',
		],
	},
	MS: {
		// Montserrat
		list: [
			'America/Puerto_Rico',
			'America/Montserrat',
		],
	},
	MT: {
		// Malta
		list: [
			'Europe/Malta',
		],
	},
	MU: {
		// Mauritius
		list: [
			'Indian/Mauritius',
		],
	},
	MV: {
		// Maldives
		list: [
			'Indian/Maldives',
		],
	},
	MW: {
		// Malawi
		list: [
			'Africa/Maputo',
			'Africa/Blantyre',
		],
	},
	MX: {
		// Mexico
		list: [
			'America/Mexico_City',
			'America/Cancun',
			'America/Merida',
			'America/Monterrey',
			'America/Matamoros',
			'America/Chihuahua',
			'America/Ciudad_Juarez',
			'America/Ojinaga',
			'America/Mazatlan',
			'America/Bahia_Banderas',
			'America/Hermosillo',
			'America/Tijuana',
		],
	},
	MY: {
		// Malaysia
		list: [
			'Asia/Kuching',
			'Asia/Singapore',
			'Asia/Kuala_Lumpur',
		],
	},
	MZ: {
		// Mozambique
		list: [
			'Africa/Maputo',
		],
	},
	NA: {
		// Namibia
		list: [
			'Africa/Windhoek',
		],
	},
	NC: {
		// New Caledonia
		list: [
			'Pacific/Noumea',
		],
	},
	NE: {
		// Niger
		list: [
			'Africa/Lagos',
			'Africa/Niamey',
		],
	},
	NF: {
		// Norfolk Island
		list: [
			'Pacific/Norfolk',
		],
	},
	NG: {
		// Nigeria
		list: [
			'Africa/Lagos',
		],
	},
	NI: {
		// Nicaragua
		list: [
			'America/Managua',
		],
	},
	NL: {
		// Netherlands
		list: [
			'Europe/Brussels',
			'Europe/Amsterdam',
		],
	},
	NO: {
		// Norway
		list: [
			'Europe/Berlin',
			'Europe/Oslo',
		],
	},
	NP: {
		// Nepal
		list: [
			'Asia/Kathmandu',
		],
	},
	NR: {
		// Nauru
		list: [
			'Pacific/Nauru',
		],
	},
	NU: {
		// Niue
		list: [
			'Pacific/Niue',
		],
	},
	NZ: {
		// New Zealand
		list: [
			'Pacific/Auckland',
			'Pacific/Chatham',
		],
	},
	OM: {
		// Oman
		list: [
			'Asia/Dubai',
			'Asia/Muscat',
		],
	},
	PA: {
		// Panama
		list: [
			'America/Panama',
		],
	},
	PE: {
		// Peru
		list: [
			'America/Lima',
		],
	},
	PF: {
		// French Polynesia
		list: [
			'Pacific/Tahiti',
			'Pacific/Marquesas',
			'Pacific/Gambier',
		],
	},
	PG: {
		// Papua New Guinea
		list: [
			'Pacific/Port_Moresby',
			'Pacific/Bougainville',
		],
	},
	PH: {
		// Philippines
		list: [
			'Asia/Manila',
		],
	},
	PK: {
		// Pakistan
		list: [
			'Asia/Karachi',
		],
	},
	PL: {
		// Poland
		list: [
			'Europe/Warsaw',
		],
	},
	PM: {
		// St Pierre & Miquelon
		list: [
			'America/Miquelon',
		],
	},
	PN: {
		// Pitcairn
		list: [
			'Pacific/Pitcairn',
		],
	},
	PR: {
		// Puerto Rico
		list: [
			'America/Puerto_Rico',
		],
	},
	PS: {
		// Palestine
		list: [
			'Asia/Gaza',
			'Asia/Hebron',
		],
	},
	PT: {
		// Portugal
		list: [
			'Europe/Lisbon',
			'Atlantic/Madeira',
			'Atlantic/Azores',
		],
	},
	PW: {
		// Palau
		list: [
			'Pacific/Palau',
		],
	},
	PY: {
		// Paraguay
		list: [
			'America/Asuncion',
		],
	},
	QA: {
		// Qatar
		list: [
			'Asia/Qatar',
		],
	},
	RE: {
		// Réunion
		list: [
			'Asia/Dubai',
			'Indian/Reunion',
		],
	},
	RO: {
		// Romania
		list: [
			'Europe/Bucharest',
		],
	},
	RS: {
		// Serbia
		list: [
			'Europe/Belgrade',
		],
	},
	RU: {
		// Russia
		list: [
			'Europe/Kaliningrad',
			'Europe/Moscow',
			'Europe/Simferopol',
			'Europe/Kirov',
			'Europe/Volgograd',
			'Europe/Astrakhan',
			'Europe/Saratov',
			'Europe/Ulyanovsk',
			'Europe/Samara',
			'Asia/Yekaterinburg',
			'Asia/Omsk',
			'Asia/Novosibirsk',
			'Asia/Barnaul',
			'Asia/Tomsk',
			'Asia/Novokuznetsk',
			'Asia/Krasnoyarsk',
			'Asia/Irkutsk',
			'Asia/Chita',
			'Asia/Yakutsk',
			'Asia/Khandyga',
			'Asia/Vladivostok',
			'Asia/Ust-Nera',
			'Asia/Magadan',
			'Asia/Sakhalin',
			'Asia/Srednekolymsk',
			'Asia/Kamchatka',
			'Asia/Anadyr',
		],
	},
	RW: {
		// Rwanda
		list: [
			'Africa/Maputo',
			'Africa/Kigali',
		],
	},
	SA: {
		// Saudi Arabia
		list: [
			'Asia/Riyadh',
		],
	},
	SB: {
		// Solomon Islands
		list: [
			'Pacific/Guadalcanal',
		],
	},
	SC: {
		// Seychelles
		list: [
			'Asia/Dubai',
			'Indian/Mahe',
		],
	},
	SD: {
		// Sudan
		list: [
			'Africa/Khartoum',
		],
	},
	SE: {
		// Sweden
		list: [
			'Europe/Berlin',
			'Europe/Stockholm',
		],
	},
	SG: {
		// Singapore
		list: [
			'Asia/Singapore',
		],
	},
	SH: {
		// St Helena
		list: [
			'Africa/Abidjan',
			'Atlantic/St_Helena',
		],
	},
	SI: {
		// Slovenia
		list: [
			'Europe/Belgrade',
			'Europe/Ljubljana',
		],
	},
	SJ: {
		// Svalbard & Jan Mayen
		list: [
			'Europe/Berlin',
			'Arctic/Longyearbyen',
		],
	},
	SK: {
		// Slovakia
		list: [
			'Europe/Prague',
			'Europe/Bratislava',
		],
	},
	SL: {
		// Sierra Leone
		list: [
			'Africa/Abidjan',
			'Africa/Freetown',
		],
	},
	SM: {
		// San Marino
		list: [
			'Europe/Rome',
			'Europe/San_Marino',
		],
	},
	SN: {
		// Senegal
		list: [
			'Africa/Abidjan',
			'Africa/Dakar',
		],
	},
	SO: {
		// Somalia
		list: [
			'Africa/Nairobi',
			'Africa/Mogadishu',
		],
	},
	SR: {
		// Suriname
		list: [
			'America/Paramaribo',
		],
	},
	SS: {
		// South Sudan
		list: [
			'Africa/Juba',
		],
	},
	ST: {
		// Sao Tome & Principe
		list: [
			'Africa/Sao_Tome',
		],
	},
	SV: {
		// El Salvador
		list: [
			'America/El_Salvador',
		],
	},
	SX: {
		// St Maarten (Dutch)
		list: [
			'America/Puerto_Rico',
			'America/Lower_Princes',
		],
	},
	SY: {
		// Syria
		list: [
			'Asia/Damascus',
		],
	},
	SZ: {
		// Eswatini (Swaziland)
		list: [
			'Africa/Johannesburg',
			'Africa/Mbabane',
		],
	},
	TC: {
		// Turks & Caicos Is
		list: [
			'America/Grand_Turk',
		],
	},
	TD: {
		// Chad
		list: [
			'Africa/Ndjamena',
		],
	},
	TF: {
		// French S. Terr.
		list: [
			'Asia/Dubai',
			'Indian/Maldives',
			'Indian/Kerguelen',
		],
	},
	TG: {
		// Togo
		list: [
			'Africa/Abidjan',
			'Africa/Lome',
		],
	},
	TH: {
		// Thailand
		list: [
			'Asia/Bangkok',
		],
	},
	TJ: {
		// Tajikistan
		list: [
			'Asia/Dushanbe',
		],
	},
	TK: {
		// Tokelau
		list: [
			'Pacific/Fakaofo',
		],
	},
	TL: {
		// East Timor
		list: [
			'Asia/Dili',
		],
	},
	TM: {
		// Turkmenistan
		list: [
			'Asia/Ashgabat',
		],
	},
	TN: {
		// Tunisia
		list: [
			'Africa/Tunis',
		],
	},
	TO: {
		// Tonga
		list: [
			'Pacific/Tongatapu',
		],
	},
	TR: {
		// Turkey
		list: [
			'Europe/Istanbul',
		],
	},
	TT: {
		// Trinidad & Tobago
		list: [
			'America/Puerto_Rico',
			'America/Port_of_Spain',
		],
	},
	TV: {
		// Tuvalu
		list: [
			'Pacific/Tarawa',
			'Pacific/Funafuti',
		],
	},
	TW: {
		// Taiwan
		list: [
			'Asia/Taipei',
		],
	},
	TZ: {
		// Tanzania
		list: [
			'Africa/Nairobi',
			'Africa/Dar_es_Salaam',
		],
	},
	UA: {
		// Ukraine
		list: [
			'Europe/Simferopol',
			'Europe/Kyiv',
		],
	},
	UG: {
		// Uganda
		list: [
			'Africa/Nairobi',
			'Africa/Kampala',
		],
	},
	UM: {
		// US minor outlying islands
		list: [
			'Pacific/Pago_Pago',
			'Pacific/Tarawa',
			'Pacific/Midway',
			'Pacific/Wake',
		],
	},
	US: {
		// United States
		map: {
			AL: 'America/Chicago',
			AK: 'America/Anchorage, America/Adak',
			AZ: 'America/Phoenix',
			AR: 'America/Chicago',
			CA: 'America/Los_Angeles',
			CO: 'America/Denver',
			CT: 'America/New_York',
			DE: 'America/New_York',
			FL: 'America/New_York', // Also 'America/Chicago',
			GA: 'America/New_York',
			HI: 'Pacific/Honolulu',
			ID: 'America/Boise', // Also 'America/Los_Angeles',
			IL: 'America/Chicago',
			IN: 'America/New_York', // Also 'America/Chicago',
			IA: 'America/Chicago',
			KS: 'America/Chicago', // Also 'America/Denver',
			KY: 'America/New_York', // Also 'America/Chicago',
			LA: 'America/Chicago',
			ME: 'America/New_York',
			MD: 'America/New_York',
			MA: 'America/New_York',
			MI: 'America/Detroit',
			MN: 'America/Chicago',
			MS: 'America/Chicago',
			MO: 'America/Chicago',
			MT: 'America/Denver',
			NE: 'America/Chicago', // Also 'America/Denver',
			NV: 'America/Los_Angeles',
			NH: 'America/New_York',
			NJ: 'America/New_York',
			NM: 'America/Denver',
			NY: 'America/New_York',
			NC: 'America/New_York',
			ND: 'America/Chicago', // Also 'America/Denver',
			OH: 'America/New_York',
			OK: 'America/Chicago',
			OR: 'America/Los_Angeles', // Also 'America/Boise',
			PA: 'America/New_York',
			RI: 'America/New_York',
			SC: 'America/New_York',
			SD: 'America/Chicago', // Also 'America/Denver',
			TN: 'America/New_York', // Also 'America/Chicago',
			TX: 'America/Chicago', // Also 'America/Denver',
			UT: 'America/Denver',
			VT: 'America/New_York',
			VA: 'America/New_York',
			WA: 'America/Los_Angeles',
			WV: 'America/New_York',
			WI: 'America/Chicago',
			WY: 'America/Denver',
			DC: 'America/New_York',
		},
		list: [
			'America/New_York',
			'America/Detroit',
			'America/Kentucky/Louisville',
			'America/Kentucky/Monticello',
			'America/Indiana/Indianapolis',
			'America/Indiana/Vincennes',
			'America/Indiana/Winamac',
			'America/Indiana/Marengo',
			'America/Indiana/Petersburg',
			'America/Indiana/Vevay',
			'America/Chicago',
			'America/Indiana/Tell_City',
			'America/Indiana/Knox',
			'America/Menominee',
			'America/North_Dakota/Center',
			'America/North_Dakota/New_Salem',
			'America/North_Dakota/Beulah',
			'America/Denver',
			'America/Boise',
			'America/Phoenix',
			'America/Los_Angeles',
			'America/Anchorage',
			'America/Juneau',
			'America/Sitka',
			'America/Metlakatla',
			'America/Yakutat',
			'America/Nome',
			'America/Adak',
			'Pacific/Honolulu',
		],
	},
	UY: {
		// Uruguay
		list: [
			'America/Montevideo',
		],
	},
	UZ: {
		// Uzbekistan
		list: [
			'Asia/Samarkand',
			'Asia/Tashkent',
		],
	},
	VA: {
		// Vatican City
		list: [
			'Europe/Rome',
			'Europe/Vatican',
		],
	},
	VC: {
		// St Vincent
		list: [
			'America/Puerto_Rico',
			'America/St_Vincent',
		],
	},
	VE: {
		// Venezuela
		list: [
			'America/Caracas',
		],
	},
	VG: {
		// Virgin Islands (UK)
		list: [
			'America/Puerto_Rico',
			'America/Tortola',
		],
	},
	VI: {
		// Virgin Islands (US)
		list: [
			'America/Puerto_Rico',
			'America/St_Thomas',
		],
	},
	VN: {
		// Vietnam
		list: [
			'Asia/Bangkok',
			'Asia/Ho_Chi_Minh',
		],
	},
	VU: {
		// Vanuatu
		list: [
			'Pacific/Efate',
		],
	},
	WF: {
		// Wallis & Futuna
		list: [
			'Pacific/Tarawa',
			'Pacific/Wallis',
		],
	},
	WS: {
		// Samoa (western)
		list: [
			'Pacific/Apia',
		],
	},
	YE: {
		// Yemen
		list: [
			'Asia/Riyadh',
			'Asia/Aden',
		],
	},
	YT: {
		// Mayotte
		list: [
			'Africa/Nairobi',
			'Indian/Mayotte',
		],
	},
	ZA: {
		// South Africa
		list: [
			'Africa/Johannesburg',
		],
	},
	ZM: {
		// Zambia
		list: [
			'Africa/Maputo',
			'Africa/Lusaka',
		],
	},
	ZW: {
		// Zimbabwe
		list: [
			'Africa/Maputo',
			'Africa/Harare',
		],
	},
} as Record<string, {
	map?: Record<string, string>;
	list: string[];
}>;

const TIMEZONES_LIST = [
	'Africa/Abidjan',
	'Africa/Accra',
	'Africa/Addis_Ababa',
	'Africa/Algiers',
	'Africa/Asmara',
	'Africa/Bamako',
	'Africa/Bangui',
	'Africa/Banjul',
	'Africa/Bissau',
	'Africa/Blantyre',
	'Africa/Brazzaville',
	'Africa/Bujumbura',
	'Africa/Cairo',
	'Africa/Casablanca',
	'Africa/Ceuta',
	'Africa/Conakry',
	'Africa/Dakar',
	'Africa/Dar_es_Salaam',
	'Africa/Djibouti',
	'Africa/Douala',
	'Africa/El_Aaiun',
	'Africa/Freetown',
	'Africa/Gaborone',
	'Africa/Harare',
	'Africa/Johannesburg',
	'Africa/Juba',
	'Africa/Kampala',
	'Africa/Khartoum',
	'Africa/Kigali',
	'Africa/Kinshasa',
	'Africa/Lagos',
	'Africa/Libreville',
	'Africa/Lome',
	'Africa/Luanda',
	'Africa/Lubumbashi',
	'Africa/Lusaka',
	'Africa/Malabo',
	'Africa/Maputo',
	'Africa/Maseru',
	'Africa/Mbabane',
	'Africa/Mogadishu',
	'Africa/Monrovia',
	'Africa/Nairobi',
	'Africa/Ndjamena',
	'Africa/Niamey',
	'Africa/Nouakchott',
	'Africa/Ouagadougou',
	'Africa/Porto-Novo',
	'Africa/Sao_Tome',
	'Africa/Tripoli',
	'Africa/Tunis',
	'Africa/Windhoek',
	'America/Adak',
	'America/Anchorage',
	'America/Anguilla',
	'America/Antigua',
	'America/Araguaina',
	'America/Argentina/Buenos_Aires',
	'America/Argentina/Catamarca',
	'America/Argentina/Cordoba',
	'America/Argentina/Jujuy',
	'America/Argentina/La_Rioja',
	'America/Argentina/Mendoza',
	'America/Argentina/Rio_Gallegos',
	'America/Argentina/Salta',
	'America/Argentina/San_Juan',
	'America/Argentina/San_Luis',
	'America/Argentina/Tucuman',
	'America/Argentina/Ushuaia',
	'America/Aruba',
	'America/Asuncion',
	'America/Atikokan',
	'America/Bahia',
	'America/Bahia_Banderas',
	'America/Barbados',
	'America/Belem',
	'America/Belize',
	'America/Blanc-Sablon',
	'America/Boa_Vista',
	'America/Bogota',
	'America/Boise',
	'America/Cambridge_Bay',
	'America/Campo_Grande',
	'America/Cancun',
	'America/Caracas',
	'America/Cayenne',
	'America/Cayman',
	'America/Chicago',
	'America/Chihuahua',
	'America/Ciudad_Juarez',
	'America/Costa_Rica',
	'America/Coyhaique',
	'America/Creston',
	'America/Cuiaba',
	'America/Curacao',
	'America/Danmarkshavn',
	'America/Dawson',
	'America/Dawson_Creek',
	'America/Denver',
	'America/Detroit',
	'America/Dominica',
	'America/Edmonton',
	'America/Eirunepe',
	'America/El_Salvador',
	'America/Fort_Nelson',
	'America/Fortaleza',
	'America/Glace_Bay',
	'America/Goose_Bay',
	'America/Grand_Turk',
	'America/Grenada',
	'America/Guadeloupe',
	'America/Guatemala',
	'America/Guayaquil',
	'America/Guyana',
	'America/Halifax',
	'America/Havana',
	'America/Hermosillo',
	'America/Indiana/Indianapolis',
	'America/Indiana/Knox',
	'America/Indiana/Marengo',
	'America/Indiana/Petersburg',
	'America/Indiana/Tell_City',
	'America/Indiana/Vevay',
	'America/Indiana/Vincennes',
	'America/Indiana/Winamac',
	'America/Inuvik',
	'America/Iqaluit',
	'America/Jamaica',
	'America/Juneau',
	'America/Kentucky/Louisville',
	'America/Kentucky/Monticello',
	'America/Kralendijk',
	'America/La_Paz',
	'America/Lima',
	'America/Los_Angeles',
	'America/Lower_Princes',
	'America/Maceio',
	'America/Managua',
	'America/Manaus',
	'America/Marigot',
	'America/Martinique',
	'America/Matamoros',
	'America/Mazatlan',
	'America/Menominee',
	'America/Merida',
	'America/Metlakatla',
	'America/Mexico_City',
	'America/Miquelon',
	'America/Moncton',
	'America/Monterrey',
	'America/Montevideo',
	'America/Montserrat',
	'America/Nassau',
	'America/New_York',
	'America/Nome',
	'America/Noronha',
	'America/North_Dakota/Beulah',
	'America/North_Dakota/Center',
	'America/North_Dakota/New_Salem',
	'America/Nuuk',
	'America/Ojinaga',
	'America/Panama',
	'America/Paramaribo',
	'America/Phoenix',
	'America/Port-au-Prince',
	'America/Port_of_Spain',
	'America/Porto_Velho',
	'America/Puerto_Rico',
	'America/Punta_Arenas',
	'America/Rankin_Inlet',
	'America/Recife',
	'America/Regina',
	'America/Resolute',
	'America/Rio_Branco',
	'America/Santarem',
	'America/Santiago',
	'America/Santo_Domingo',
	'America/Sao_Paulo',
	'America/Scoresbysund',
	'America/Sitka',
	'America/St_Barthelemy',
	'America/St_Johns',
	'America/St_Kitts',
	'America/St_Lucia',
	'America/St_Thomas',
	'America/St_Vincent',
	'America/Swift_Current',
	'America/Tegucigalpa',
	'America/Thule',
	'America/Tijuana',
	'America/Toronto',
	'America/Tortola',
	'America/Vancouver',
	'America/Whitehorse',
	'America/Winnipeg',
	'America/Yakutat',
	'Antarctica/Casey',
	'Antarctica/Davis',
	'Antarctica/DumontDUrville',
	'Antarctica/Macquarie',
	'Antarctica/Mawson',
	'Antarctica/McMurdo',
	'Antarctica/Palmer',
	'Antarctica/Rothera',
	'Antarctica/Syowa',
	'Antarctica/Troll',
	'Antarctica/Vostok',
	'Arctic/Longyearbyen',
	'Asia/Aden',
	'Asia/Almaty',
	'Asia/Amman',
	'Asia/Anadyr',
	'Asia/Aqtau',
	'Asia/Aqtobe',
	'Asia/Ashgabat',
	'Asia/Atyrau',
	'Asia/Baghdad',
	'Asia/Bahrain',
	'Asia/Baku',
	'Asia/Bangkok',
	'Asia/Barnaul',
	'Asia/Beirut',
	'Asia/Bishkek',
	'Asia/Brunei',
	'Asia/Chita',
	'Asia/Colombo',
	'Asia/Damascus',
	'Asia/Dhaka',
	'Asia/Dili',
	'Asia/Dubai',
	'Asia/Dushanbe',
	'Asia/Famagusta',
	'Asia/Gaza',
	'Asia/Hebron',
	'Asia/Ho_Chi_Minh',
	'Asia/Hong_Kong',
	'Asia/Hovd',
	'Asia/Irkutsk',
	'Asia/Jakarta',
	'Asia/Jayapura',
	'Asia/Jerusalem',
	'Asia/Kabul',
	'Asia/Kamchatka',
	'Asia/Karachi',
	'Asia/Kathmandu',
	'Asia/Khandyga',
	'Asia/Kolkata',
	'Asia/Krasnoyarsk',
	'Asia/Kuala_Lumpur',
	'Asia/Kuching',
	'Asia/Kuwait',
	'Asia/Macau',
	'Asia/Magadan',
	'Asia/Makassar',
	'Asia/Manila',
	'Asia/Muscat',
	'Asia/Nicosia',
	'Asia/Novokuznetsk',
	'Asia/Novosibirsk',
	'Asia/Omsk',
	'Asia/Oral',
	'Asia/Phnom_Penh',
	'Asia/Pontianak',
	'Asia/Pyongyang',
	'Asia/Qatar',
	'Asia/Qostanay',
	'Asia/Qyzylorda',
	'Asia/Riyadh',
	'Asia/Sakhalin',
	'Asia/Samarkand',
	'Asia/Seoul',
	'Asia/Shanghai',
	'Asia/Singapore',
	'Asia/Srednekolymsk',
	'Asia/Taipei',
	'Asia/Tashkent',
	'Asia/Tbilisi',
	'Asia/Tehran',
	'Asia/Thimphu',
	'Asia/Tokyo',
	'Asia/Tomsk',
	'Asia/Ulaanbaatar',
	'Asia/Urumqi',
	'Asia/Ust-Nera',
	'Asia/Vientiane',
	'Asia/Vladivostok',
	'Asia/Yakutsk',
	'Asia/Yangon',
	'Asia/Yekaterinburg',
	'Asia/Yerevan',
	'Atlantic/Azores',
	'Atlantic/Bermuda',
	'Atlantic/Canary',
	'Atlantic/Cape_Verde',
	'Atlantic/Faroe',
	'Atlantic/Madeira',
	'Atlantic/Reykjavik',
	'Atlantic/South_Georgia',
	'Atlantic/St_Helena',
	'Atlantic/Stanley',
	'Australia/Adelaide',
	'Australia/Brisbane',
	'Australia/Broken_Hill',
	'Australia/Darwin',
	'Australia/Eucla',
	'Australia/Hobart',
	'Australia/Lindeman',
	'Australia/Lord_Howe',
	'Australia/Melbourne',
	'Australia/Perth',
	'Australia/Sydney',
	'Europe/Amsterdam',
	'Europe/Andorra',
	'Europe/Astrakhan',
	'Europe/Athens',
	'Europe/Belgrade',
	'Europe/Berlin',
	'Europe/Bratislava',
	'Europe/Brussels',
	'Europe/Bucharest',
	'Europe/Budapest',
	'Europe/Busingen',
	'Europe/Chisinau',
	'Europe/Copenhagen',
	'Europe/Dublin',
	'Europe/Gibraltar',
	'Europe/Guernsey',
	'Europe/Helsinki',
	'Europe/Isle_of_Man',
	'Europe/Istanbul',
	'Europe/Jersey',
	'Europe/Kaliningrad',
	'Europe/Kirov',
	'Europe/Kyiv',
	'Europe/Lisbon',
	'Europe/Ljubljana',
	'Europe/London',
	'Europe/Luxembourg',
	'Europe/Madrid',
	'Europe/Malta',
	'Europe/Mariehamn',
	'Europe/Minsk',
	'Europe/Monaco',
	'Europe/Moscow',
	'Europe/Oslo',
	'Europe/Paris',
	'Europe/Podgorica',
	'Europe/Prague',
	'Europe/Riga',
	'Europe/Rome',
	'Europe/Samara',
	'Europe/San_Marino',
	'Europe/Sarajevo',
	'Europe/Saratov',
	'Europe/Simferopol',
	'Europe/Skopje',
	'Europe/Sofia',
	'Europe/Stockholm',
	'Europe/Tallinn',
	'Europe/Tirane',
	'Europe/Ulyanovsk',
	'Europe/Vaduz',
	'Europe/Vatican',
	'Europe/Vienna',
	'Europe/Vilnius',
	'Europe/Volgograd',
	'Europe/Warsaw',
	'Europe/Zagreb',
	'Europe/Zurich',
	'Indian/Antananarivo',
	'Indian/Chagos',
	'Indian/Christmas',
	'Indian/Cocos',
	'Indian/Comoro',
	'Indian/Kerguelen',
	'Indian/Mahe',
	'Indian/Maldives',
	'Indian/Mauritius',
	'Indian/Mayotte',
	'Indian/Reunion',
	'Pacific/Apia',
	'Pacific/Auckland',
	'Pacific/Bougainville',
	'Pacific/Chatham',
	'Pacific/Chuuk',
	'Pacific/Easter',
	'Pacific/Efate',
	'Pacific/Fakaofo',
	'Pacific/Fiji',
	'Pacific/Funafuti',
	'Pacific/Galapagos',
	'Pacific/Gambier',
	'Pacific/Guadalcanal',
	'Pacific/Guam',
	'Pacific/Honolulu',
	'Pacific/Kanton',
	'Pacific/Kiritimati',
	'Pacific/Kosrae',
	'Pacific/Kwajalein',
	'Pacific/Majuro',
	'Pacific/Marquesas',
	'Pacific/Midway',
	'Pacific/Nauru',
	'Pacific/Niue',
	'Pacific/Norfolk',
	'Pacific/Noumea',
	'Pacific/Pago_Pago',
	'Pacific/Palau',
	'Pacific/Pitcairn',
	'Pacific/Pohnpei',
	'Pacific/Port_Moresby',
	'Pacific/Rarotonga',
	'Pacific/Saipan',
	'Pacific/Tahiti',
	'Pacific/Tarawa',
	'Pacific/Tongatapu',
	'Pacific/Wake',
	'Pacific/Wallis',
];

// Object.values(TIMEZONE_DATA).forEach((item) => {
//   console.log(
//     item.abbr + ': {\n' +
//     '// ' + item.name +
//     '\nlist: [' +
//     '\n' +
//     '\'' + item.zones.join('\',\n\'') + '\'\n]' + '\n}' + ',');
// });

// const TIMEZONES_LIST = Object.values(TIMEZONE_DATA).reduce((acc, item) => {
//   const { list } = item;
//   if (list) {
//     acc.push(...list);
//   }
//   return acc;
// }, [] as string[]).filter((item, index, arr) => {
//   return arr.indexOf(item) === index;
// }).sort((a, b) => {
//   if (a < b) {
//     return -1;
//   }
//   if (a > b) {
//     return 1;
//   }
//   return 0;
// });

// console.log(
//   'const TIMEZONES_LIST = [\n' +
//   TIMEZONES_LIST.map((item) => '  \'' + item + '\'').join(',\n') +
//   '\n];'
// );

/**
 * Check if timezone is valid
 * @param tz - Timezone string
 * @returns {boolean} - True if valid, false otherwise
 */

export function isValidTimeZone(tz?: string | null) {
	if (tz && tz.length > 0) {
		// return TIMEZONES_LIST.includes(tz);
		return DateTime.now().setZone(tz).isValid;
	}
	return false;
}

/**
 * Get (approximate) time zone from major address components
 * @param country - Country code (ISO 3166-1 alpha-2)
 * @param state - State or province code (ISO 3166-2)
 * @param _city - City name (optional, not used in current implementation)
 * @returns {string} - Time zone identifier (IANA format)
 * If no specific time zone is found, returns a default time zone.
 */

export function getTimeZone(country: string, state: string, _city?: string) {
	const tzData = TIMEZONE_DATA[country];

	if (!tzData) {
		// Default for all unknown countries
		return DEFAULT_TIMEZONE;
	}

	const { map: tzMap, list: tzList } = tzData;
	if (tzMap) {
		const tzByState = tzMap[state];
		return tzByState || tzList[0];
	}

	return tzList[0];
}

/**
 * Parse date in timezone
 * @param input - Date object or string in "YYYY-MM-DD" format
 * @param tz - Timezone string (IANA format), defaults to DEFAULT_TIMEZONE
 * @param addDay - Number of days to add (can be negative), defaults to 0
 * @returns {Date} - Date object adjusted to the specified timezone
 * If input is a string in "YYYY-MM-DD" format, it will be parsed as the start of that day in the specified timezone.
 * If input is a Date object, it will be converted to the specified timezone.
 * If addDay is provided, it will adjust the date by the specified number of days.
 * If tz is not provided, it defaults to DEFAULT_TIMEZONE.
 * If input is invalid, it will return an invalid Date object.
 */

export function parseDateInTimezone(
	input: Date | string,
	tz?: string | null,
	addDay?: number, // Use this for start/end of day
	isISODate?: boolean, // If true, input is assumed to be ISO Date without any checks
): Date {
	const timeZone = tz || DEFAULT_TIMEZONE;

	let dt: DateTime;

	// If input is a string in "YYYY-MM-DD" format
	if (typeof input === 'string' && (isISODate || /^(?:\d{4}-\d{2}-\d{2}|\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/.test(input))) {
		dt = DateTime.fromISO(input, { zone: timeZone });
	} else if (typeof input === 'string') {
		dt = DateTime.fromJSDate(new Date(input), { zone: timeZone });
	} else {
		dt = DateTime.fromJSDate(input, { zone: timeZone });
	}

	// Add day offset if needed
	if (addDay !== 0) {
		dt = dt.plus({ days: addDay });
	}

	return dt.toJSDate();
}

/**
 * Parse date to start or end of day in time zone
 * @param input - Date object or string in "YYYY-MM-DD" format
 * @param tz - Timezone string (IANA format), defaults to DEFAULT_TIMEZONE
 * @param toEndOfDay - If true, set time to end of day (23:59:59.999), otherwise start of day (00:00:00.000)
 * @returns {Date} - Date object adjusted to the start or end of the day in the specified timezone
 */

export function parseBoundaryDateInTimezone(
	input: Date | string, // "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM" format
	tz?: string | null,
	toEndOfDay?: boolean,
): Date {
	const timeZone = tz || DEFAULT_TIMEZONE;

	let dt: DateTime;

	// If input is a string in "YYYY-MM-DD" format
	if (typeof input === 'string' && /^(?:\d{4}-\d{2}-\d{2}|\d{4}-\d{2}-\d{2}T\d{2}:\d{2})$/.test(input)) {
		dt = DateTime.fromISO(input, { zone: timeZone });
	} else if (typeof input === 'string') {
		dt = DateTime.fromJSDate(new Date(input), { zone: timeZone });
	} else {
		dt = DateTime.fromJSDate(input, { zone: timeZone });
	}

	// Set time to start or end of day
	if (toEndOfDay) {
		dt = dt.endOf('day');
	} else {
		dt = dt.startOf('day');
	}

	return dt.toJSDate();
}

/**
 * Get the index of timzeone from TIMEZONES_LIST
 * @param tz - Timezone string (IANA format)
 * @returns {number | string} - Index of the timezone in TIMEZONES_LIST, or the original timezone string if not found
 */

export function timeZoneToIndex(tz: string): number | string {
	const index = TIMEZONES_LIST.indexOf(tz);
	if (index === -1) {
		return tz;
	}
	return index;
}

/**
 * Get time zone from index
 * @param index - Index of the timezone in TIMEZONES_LIST
 * @returns {string} - Timezone string (IANA format) if index is valid, otherwise return the index itself
 */

export function indexToTimeZone(index?: number | string | null): string | null {
	if (index === null || index === undefined) {
		return null;
	}

	const value = Number(index);
	if (!isNaN(value) && value < TIMEZONES_LIST.length) {
		return TIMEZONES_LIST[value];
	} else if (isValidTimeZone(String(index))) {
		return String(index);
	}

	return null;
}

/**
 * Get timezone abbrevation code from timezone string
 * @param tz - Timezone string (IANA format)
 * @returns {string} - Timezone abbreviation code (e.g., "EST", "
 */

export function getTimeZoneCode(tz?: string | null, useSystem?: boolean): string | null {
	try {
		if (tz) {
			return DateTime.now().setZone(tz).toFormat('ZZZZ');
		} else if (useSystem) {
			// IMPORTANT: If you do this in server, this will always return UTC
			return DateTime.now().toFormat('ZZZZ');
		}
	} catch (e) {
		console.warn('Invalid timezone:', tz, e);
	}
	return null;
}

/**
 * Check if time zone is currently in daylight saving time, and get the time difference
 * @param tz - Timezone string (IANA format)
 * @param d - DateTime object representing the current time in the specified timezone
 * @returns { timeZone: string, isDST: boolean; offset: number, shiftHours: number } | null
 */

export function getDayLightSavingsInfo(tz: string, d?: Date) {
	let now;
	if (d) {
		now = DateTime.fromJSDate(d).setZone(tz);
	} else {
		now = DateTime.now().setZone(tz);
	}

	const jan = DateTime.fromObject({ year: now.year, month: 1, day: 1 }).setZone(tz);
	const offsetShift = (jan.offset - now.offset) / 60;

	return {
		timeZone: tz,
		isDST: now.isInDST, // true if currently observing DST
		offset: now.offset / 60, // offset from UTC in hours
		offsetShift, // hours
	};
}

/**
 * Get time in time zone
 * @param hhmmStr - Time string in "HHMM" format
 * @param date - Date object or date string to extract time from if hhmmStr is not provided
 * @param addAMPM - If true, return time in "HH:MM AM/PM" format, otherwise "HH:MM" format
 * @param timeZone - Timezone string (IANA format), defaults to DEFAULT_TIMEZONE
 * @returns {string} - Formatted time string
 */

export function hhmmFromDateOrTime(
	hhmmStr: string | number | null,
	dVal: Date | string | null,
	addAMPM: boolean,
	timeZone?: string | null,
): string {
	let hhmm: string = '';
	if (hhmmStr && /^[0-9]{3,4}$/.test(String(hhmmStr))) {
		hhmm = String(hhmmStr);
	} else if (dVal) {
		let date;
		if (typeof dVal === 'string') {
			date = new Date(dVal);
		} else {
			date = dVal;
		}

		const luxonDate = DateTime.fromJSDate(date).setZone(timeZone || DEFAULT_TIMEZONE);
		hhmm = String(luxonDate.hour * 100 + luxonDate.minute).padStart(4, '0');
	}

	let hh, mm;
	if (hhmm.length === 4) {
		hh = hhmm.slice(0, 2);
		mm = hhmm.slice(2, 4);
	} else if (hhmm.length === 3) {
		hh = hhmm.slice(0, 1);
		mm = hhmm.slice(1, 3);
	}

	if (hh) {
		if (addAMPM) {
			const hourNum = parseInt(hh, 10);
			const ampm = hourNum >= 12 ? 'PM' : 'AM';
			const hour12 = hourNum % 12 === 0 ? 12 : hourNum % 12;
			return `${hour12}:${mm} ${ampm}`;
		}
		return `${hh}:${mm}`;
	}

	return '';
}
