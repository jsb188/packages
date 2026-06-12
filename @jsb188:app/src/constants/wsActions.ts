const WS_ACTIONS = {
	// Socket connection
	// NOTE: these are reserved names in Socket.IO
	// That means you cannot emit custom events with these names
	connect: 'connect',
	disconnect: 'disconnect',

	// Authentication
	auth: 'auth',
	auth_reset: 'auth_reset',

	// App
	alert: 'alert',
	data_update: 'du',
	app_context_update: 'acu',

	// Account
	me: 'me:',
	organization: 'org:',

	// Sheet collaboration
	sheet: 'sheet:',
	sheet_join: 'sh_j',
	sheet_leave: 'sh_l',
	sheet_presence: 'sh_p',
	sheet_selection: 'sh_s',
	sheet_change: 'sh_c',
};

export default WS_ACTIONS;
