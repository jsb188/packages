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
	data_update: 'du',
  app_context_update: 'acu',

	// Account
	me: 'me:',
	organization: 'org:',
};

export default WS_ACTIONS;
