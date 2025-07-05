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

  // Chats list
  chats_list: 'cl:',

  // Chat
  chat_join: 'cj:',
  chat_leave_all: 'cla',
  chat_typing: 'ct',
  chat_message: 'cm',
  chat_read: 'cr',
  chat_moderate: 'cmd',

  // Live chats
  live_list: 'll:',
  live_list_stop: 'lls',
  live_start: 'lsr',
  live_stop: 'lsp',
  live_join: 'uslj',
  live_leave: 'usll',
  live_users_list: 'lul',

  // Peer
  peer_call: 'pc:',
  peer_accept: 'pa:',
  peer_decline: 'pd:',
  peer_leave: 'pl',
  peer_join: 'pj',
  peer_speaking: 'ps',
  peer_user_id: 'pui',
  peer_users_sync: 'pus',
  peer_users_list: 'pul',
};

export default WS_ACTIONS;
