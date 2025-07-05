import type { SSEOptions, SSEConnectParams, SSEStatus } from './types.d';

/**
 * Helper for adding and removing (Browser) network connection listeners
 */

export function reconnectOnBrowserNetwork(connection: SSE, connectParams: SSEConnectParams) {

  const onOnline = () => {
    connection.connect(connectParams);
  };

  const onOffline = () => {
    connection.close();
  };

  globalThis.addEventListener('online', onOnline);
  globalThis.addEventListener('offline', onOffline);

  return () => {
    globalThis.removeEventListener('online', onOnline);
    globalThis.removeEventListener('offline', onOffline);
  };
}

/**
 * Helper for adding and removing (App) network connection listeners
 */

export function reconnectOnAppNetwork(connection: SSE, connectParams: SSEConnectParams) {
  console.warn('This function is not implemented yet!');
  console.warn(connectParams);
}

/**
 * Server side events
 */

class SSE {
  private eventSource: EventSource | null = null;
  private options: SSEOptions;
  private endpointUrl: string;
  private reconnectTimer: any = null;

  /**
   * SSE constructor
   */

  constructor(options: SSEOptions) {
    const { host, path, allowNull, searchParams } = options;

    this.options = options;
    this.endpointUrl = `${host}/${path}`;

    if (searchParams) {
      const q = new URLSearchParams(
        Object.entries(searchParams).reduce((acc, ent) => {
          const [key, value] = ent;
          if (
            typeof value === 'undefined' ||
            (value === null && !allowNull)
          ) {
            return acc;
          }
          acc[key] = value!;
          return acc;
        },  {} as Record<string, string>)
      );

      const queryStr = q.toString();
      if (queryStr) {
        this.endpointUrl += `?${queryStr}`;
      }
    }
  }

  /**
   * Get current connection status of event source
   */

  getStatus(): SSEStatus {
    const enums: SSEStatus[] = [
      'CONNECTING', // The connection is not yet open.
      'OPEN', // The connection is open and ready to communicate.
      'CLOSED' // The connection is closed or couldn't be opened.
    ]

    if (this.eventSource) {
      return enums[this.eventSource.readyState];
    }

    return enums[2];
  }

  /**
   * Helper
   */

  private isTrusted(e: any) {
    return this.options.allowNotTrusted || e.isTrusted;
  }

  /**
   * Browser connection
   */

  /**
   * Connect to event source
   */

  connect(connectParams: SSEConnectParams) {
    const { onOpen, onMessage, onError } = connectParams;

    clearTimeout(this.reconnectTimer);

    if (this.eventSource) {
      this.eventSource.close();
    }

    this.eventSource = new EventSource(this.endpointUrl);
    this.eventSource.onopen = (e) => {
      // console.log('is trusted open?:', this.isTrusted(e));
      if (this.isTrusted(e)) {
        onOpen?.();
      }
    };

    this.eventSource.onmessage = (e) => {
      // console.log('is trusted message?:', this.isTrusted(e));
      if (this.isTrusted(e)) {
        let data;
        try {
          data = JSON.parse(e.data.trim());
          console.log('SSE:', data);

        } catch (err) {
          data = null;
          console.log('Error parsing JSON:', e);
        }

        if (data && typeof data === 'object') {
          onMessage?.(data);
        }
      }
    };

    this.eventSource.onerror = (err) => {
      // console.log('is trusted error?:', this.isTrusted(err));
      if (this.isTrusted(err)) {
        onError?.(err);

        const status = this.getStatus();
        if (status === 'CLOSED') {
          this.reconnectTimer = setTimeout(() => {
            this.connect(connectParams);
          }, this.options.reconnectWaitMS || 35000);
        }
      }
    };
  }

  // EventSource has add/remove event listener functions,
  // but I'm opting not to use them because they are not garbage collected automatically.
  // It will be much easier to rely on switchCase with onmessage().

  // addEventListener
  // removeEventListener

  /**
   * Close connection
   */

  close() {
    clearTimeout(this.reconnectTimer);
    this.eventSource?.close();
  }
}

export default SSE
