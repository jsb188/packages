
export type SSEStatus = 'CONNECTING' | 'OPEN' | 'CLOSED';

export interface SSEOptions {
  host: string;
  path: string;
  searchParams?: Record<string, string | undefined | null>;

  // A lot of API's often have trouble with null values, so null is removed by default
  // But if null is needed, set this to true
  allowNull?: boolean;

  // Very low level check to see if event is trusted before dispatching event handlers
  allowNotTrusted?: boolean;

  // Every browser handles their own auto-reconnect when server is down,
  // but every browser handles the reconnect logic differently with different rates.
  // Eventually the browser will give up and close the connection.
  // When this happens, this is the time waited before trying to connect again.
  // ie. 1... 2... 3... 4... 5... -> "connecting" becomes "closed" -> wait for # time -> do connect() again
  keepAlive?: boolean;
  reconnectWaitMS?: number; // defaults to 35000
}

export interface SSEConnectParams {
  onOpen?: () => void;
  onMessage?: (data: any) => void;
  onError?: (err: Event) => void;
}