const WS_ACTIONS = {
  // Socket connection
  // NOTE: these are reserved names in Socket.IO
  // That means you cannot emit custom events with these names
  connect: 'connect',
  disconnect: 'disconnect',

  // Authentication
  auth: 'auth',

  // App
  data_update: 'du',

  // User
  me: 'me:',
};

export default WS_ACTIONS;
