import type { ServerErrorObj, SimpleErrorType } from '@jsb188/app/types/app.d.ts';

/**
 * GraphQL API requests
 */

export interface APIRequestOutput {
  aborted?: boolean;
  error: ServerErrorObj | null;
  [apiName: string]: any; // Different name & data; it depends on API
}

export interface GraphQLHandlers {
  resetErrors: () => void;
  setError: (error: SimpleErrorType) => void;
  setSaving: (nextSaving: boolean, resetInMS?: number) => void;
  refetch: () => void;
}

export interface UpdateDataObserverArgs {
  queryId?: string | null;
  fragmentIds?: (string | null)[];
  forceRefetch?: boolean;
}

/**
 * GraphQL client handlers
 */

export type AnyModalPopUpFn = (data: any, err?: ServerErrorObj) => void;
export type UpdateObserversFn = (args: UpdateDataObserverArgs) => void;
export type OnCompletedGQLFn = (data: any, error: ServerErrorObj | null, variables?: any) => void;
export type OnErrorGQLFn = (error: ServerErrorObj | null, variables: any) => void;

/**
 * GraphQL query hook params
 */

export interface GraphQLQueryOptions {
  name?: string;
  eagerFragmentKeyMap?: any;
  retryCount?: number;
  variables?: Record<string, any> | null;
  cacheMap?: any;
  skip?: boolean;
  testMode?: boolean;
  openModalPopUp?: AnyModalPopUpFn | null;
  onCompleted?: OnCompletedGQLFn
  onError?: OnErrorGQLFn;
}

// Params for most GraphQL (query) hooks
export type UseQueryParams = Omit<GraphQLQueryOptions, 'name' | 'retryCount' | 'cacheMap'>;

// Params for most GraphQL (mutation) hooks
export type UseMutationParams = Partial<{
  onCompleted: OnCompletedGQLFn;
  onError: OnErrorGQLFn;
}>;

// Params for most GraphQL hooks with these options
export type UseMutationParamsExtra = Partial<{
  checkMountedBeforeCallback?: boolean;
}> & UseMutationParams;

/**
 * Common query patterns
 */

export type PaginationArgs = Partial<{
	cursor: [number | null, number | null];
	after: boolean;
	limit: number;
	doNotThrowError: boolean;
}>;
