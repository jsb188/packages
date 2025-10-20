const WS_ACTIONS = {
  // Socket connection
  connect: 'connect',
  disconnect: 'disconnect',
  auth: 'auth',

  // App
  alert: 'alrt',
  data_update: 'du',

  // User
  me: 'me:',
  user_status: 'us:',
};

export default WS_ACTIONS;
