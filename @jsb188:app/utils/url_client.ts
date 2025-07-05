
type LinkType = 'USER' | 'KAJI' | 'DATASET' | 'VOICE' | 'FEED' | 'ROOM' | 'THREAD' | 'OTHER';

// links to consider for User cards
// instagram
// tiktok
// youtube
// pinterest
// twitch
// linkedin
// facebook
// twiitter (x)

/**
 * Uploaded assets
 */

export function makeUploadsUrl(
  urlPath?: string | null,
  size?: string,
  animateGifs?: boolean,
): string {
  if (!urlPath) {
    return '';
  }

  let uriPrefix;
  if (
    urlPath.substring(urlPath.lastIndexOf('.')).toLowerCase() === '.gif' &&
    animateGifs
  ) {
    uriPrefix = 'original/';
  } else {
    switch (size) {
      case 'original':
        uriPrefix = 'original/';
        break;
      case 'large':
      case 'medium':
        uriPrefix = 'medium/';
        break;
      case 'small':
      case 'tiny':
        uriPrefix = 'small/';
        break;
      default:
        uriPrefix = 'small/';
    }
  }
  return 'https://static.chiefhappiness.co/' + uriPrefix + urlPath;
}

/**
 * Make chat URL
 */

export function makeChatUrl(
  firstChatId?: string | null,
  secondChatId?: string | null,
  nextFirstChatId?: string | null,
  nextSecondChatId?: string | null,
) {
  const path = 'chat';

  if (
    nextFirstChatId &&
    nextFirstChatId === secondChatId
  ) {
    return `/${path}/${firstChatId}/${secondChatId}`;
  }

  const first = nextFirstChatId || firstChatId || 'none';
  const second = nextSecondChatId || secondChatId;

  if (first === second) {
    return `/${path}/${first}`;
  }

  return `/${path}/${first}${second ? `/${second}` : ''}`;
}

/**
 * Get default text for URL type
 */

export function getUrlType(type: LinkType) {
  switch (type) {
    case 'USER':
      return 'User';
    case 'KAJI':
      return 'AI';
    case 'DATASET':
      return 'Dataset';
    case 'VOICE':
      return 'Voice';
    case 'FEED':
      return 'Feed post';
    case 'ROOM':
      return 'Room';
    case 'THREAD':
      return 'Forum thread';
    default:
      return 'Link';
  }
}

/**
 * Convert location search string to object
 */

export function locationSearchToObject(searchParams?: string) {
  if (!searchParams) {
    return {};
  }

  const search = searchParams.substring(1);
  const searchParamsArray = search.split('&');
  const searchParamsObject: Record<string, string> = {};

  searchParamsArray.forEach((param) => {
    const [key, value] = param.split('=');
    searchParamsObject[key] = value;
  });

  return searchParamsObject;
}

/**
 * Check if current page is a chat page
 */

export function isChatPage() {
  const pathname = globalThis?.location?.pathname?.toLowerCase();
  if (pathname) {
    return /^\/(?:chat|dm)\//i.test(pathname);
  }
  return false;
}
