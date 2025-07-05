import i18n from '../i18n/';

/**
 * Types
 */

type LightModeValue = 'LIGHT' | 'DARK' | 'SYSTEM';
type FriendStatusEnum = 'BLOCKED' | 'DECLINED' | 'PENDING' | 'ACCEPTED';

interface FriendFragment {
  myStatus: FriendStatusEnum;
  otherStatus: FriendStatusEnum;
}

interface FriendOptionsObj {
  friendButtonText: string;
  friendButtonIconName: string;
  friendStatusText: string;
  messageAllowed: boolean;
  options: {
    value: string;
    iconName: string;
    text: string;
  }[];
}

type PlusGroupEnum = 'NORMAL' | 'PERKS' | 'PLUS' | 'PRO';

interface UserSubOutput {
  name: string | null;
  group: PlusGroupEnum;
  cancelled: boolean;
  expired: boolean;
  expireAt: Date | null;
}

/**
 * Get light mode value
 */

export function getLightMode(mode: string, mobileApp: boolean): LightModeValue {
  if (!mode) {
    return 'LIGHT';
  }

  const index = mobileApp ? 1 : 0;
  const value = Number(mode.charAt(index));

  return (['LIGHT', 'SYSTEM', 'DARK'][value] || 'LIGHT') as LightModeValue;
}

/**
 * Update light mode value
 */

export function updateLightMode(mode_: string | undefined, newValue: LightModeValue, mobileApp: boolean): string {
  const mode = mode_ || '00';
  const index = mobileApp ? 1 : 0;

  let value = ['LIGHT', 'SYSTEM', 'DARK'].indexOf(newValue);
  if (value === -1) {
    value = 0;
  }

  return mode.substring(0, index) + value + mode.substring(index + 1);
}

/**
 * Resolve user's online status for chat
 */

export function resolveOnlineStatus(user: object, viewerUserId: number) {
  // console.log('..... RESOLVE ONLINE STATUS .....', user.id, viewerUserId, user.onlineStatus);
  if (
    // This check won't be valid if user is switching logins;
    // So for those cases, use [user.self = true],
    // to validate that this is a self online status
    viewerUserId == user.id ||
    user.self
  ) {
    return user.onlineStatus;
  } else if (!user.lastLoginAt) {
    return 'APPEAR_OFFLINE';
  }

  const now = Date.now();
  const wasOnline = (now - user.lastLoginAt) < 420000; // 7 minutes

  if (wasOnline) {
    return user.onlineStatus;
  }

  return 'APPEAR_OFFLINE';
}

/**
 * Get friend status between 2 users
 */

export function getFriendOptions(friend?: FriendFragment | null): FriendOptionsObj {
  const { myStatus, otherStatus } = friend || {};
  if (myStatus === 'BLOCKED') {
    // Blocked by user

    return {
      friendButtonText: i18n.t('user.blocked'),
      friendStatusText: i18n.t('user.blocked_by_me'),
      friendButtonIconName: 'user-x',
      messageAllowed: false,
      options: [{
        value: 'DECLINED',
        iconName: 'user',
        text: i18n.t('user.unblock'),
      }],
    };
  } else if (otherStatus === 'BLOCKED') {
    // Blocked by "other" user

    return {
      friendButtonText: i18n.t('user.blocked'),
      friendStatusText: i18n.t('user.blocked_by_other'),
      friendButtonIconName: 'user-x',
      messageAllowed: false,
      options: [],
    };
  } else if (myStatus === 'ACCEPTED' && otherStatus === 'ACCEPTED') {
    // Friends

    return {
      friendButtonText: i18n.t('user.friends'),
      friendStatusText: i18n.t('user.friends_msg'),
      friendButtonIconName: 'user-check',
      messageAllowed: true,
      options: [{
        value: 'DECLINED',
        iconName: 'user-cancel',
        text: i18n.t('user.remove_friend'),
      }, {
        value: 'BLOCKED',
        iconName: 'user-x',
        text: i18n.t('user.block'),
      }],
    };
  } else if (myStatus === 'PENDING') {
    // Pending request from other user

    return {
      friendButtonText: i18n.t('user.friend_request'),
      friendStatusText: i18n.t('user.add_friend_msg'),
      friendButtonIconName: 'user-plus',
      messageAllowed: false,
      options: [{
        value: 'ACCEPTED',
        iconName: 'user-check',
        text: i18n.t('user.accept_friend'),
      }, {
        value: 'DECLINED',
        iconName: 'user-cancel',
        text: i18n.t('user.ignore_friend'),
      }, {
        value: 'BLOCKED',
        iconName: 'user-x',
        text: i18n.t('user.block'),
      }],
    };
  } else if (otherStatus === 'PENDING') {
    // Sent a friend request; now waiting

    return {
      friendButtonText: i18n.t('user.friend_requested'),
      friendStatusText: i18n.t('user.sent_friend_msg'),
      friendButtonIconName: 'mail',
      messageAllowed: false,
      options: [{
        value: 'DECLINED',
        iconName: 'user-cancel',
        text: i18n.t('user.cancel_friend'),
      }],
    };
  }

  // No actions taken, user can/should send request
  return {
    friendButtonText: i18n.t('user.add_friend'),
    friendStatusText: i18n.t('user.add_friend_msg'),
    friendButtonIconName: 'user-plus',
    messageAllowed: false,
    options: [{
      value: 'PENDING',
      iconName: 'mail',
      text: i18n.t('user.send_friend'),
    }, {
      value: 'BLOCKED',
      iconName: 'user-x',
      text: i18n.t('user.block'),
    }],
  };
}

/**
 * Get user subscription type
 */

export const getPlusStatus = (plus: any) => {
  if (!plus || plus.expireAt <= Date.now()) {
    return 'NORMAL';
  }

  switch (plus.type) {
    case 'kajiwoto_plus':
    case 'kajiwoto_plus_yearly':
    case 'big_planet_plus':
    case 'big_planet_plus_yearly':
      return 'PLUS';
    case 'kajiwoto_pro':
    case 'kajiwoto_pro_yearly':
    case 'big_planet_pro':
    case 'big_planet_pro_yearly':
      return 'PRO';
    case 'perks':
      return 'PERKS';
    default:
      return 'NORMAL';
  }
};

/**
 * Get user's subscription & status
 */

export const getUserSubscription = (plus: any): UserSubOutput => {
  if (!plus) {
    return {
      name: null,
      group: 'NORMAL',
      cancelled: false,
      expired: false,
      expireAt: null,
    };
  }

  const expired = (new Date(plus.expireAt)).getTime() < Date.now();

  let group: PlusGroupEnum = 'NORMAL';
  if (!expired) {
    switch (plus.type) {
      case 'kajiwoto_plus':
      case 'kajiwoto_plus_yearly':
      case 'big_planet_plus':
      case 'big_planet_plus_yearly':
        group = 'PLUS';
        break;
      case 'kajiwoto_pro':
      case 'kajiwoto_pro_yearly':
      case 'big_planet_pro':
      case 'big_planet_pro_yearly':
        group = 'PRO';
        break;
      case 'perks':
        group = 'PERKS';
        break;
      default:
    }
  }

  return {
    name: plus.type,
    group,
    cancelled: !!plus.cancelled,
    expired,
    expireAt: plus.expireAt,
  };
};
