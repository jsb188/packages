import { getENVVariable } from '@jsb188/app';
import type { ServerErrorObj } from '@jsb188/app/types/app.d';
import { getAuthToken, normalizeServerError } from '@jsb188/app/utils/api';
import { delay } from '@jsb188/app/utils/logic';
import { setDataToCache } from '../cache/';
import type { OnCompletedGQLFn, OnErrorGQLFn, UpdateObserversFn } from '../types.d';
import { apiRequestHeaders, isServerErrorGQL } from '../utils';

/**
 * Types
 */

type GraphQLMutationOptions = Partial<{
  authToken: string;
  ipAddress: string | null; // Only used if SSR
  retryCount: number;
  variables: any;
  cacheMap: any;
  openModalPopUp: any;
  initialError: any;
  onCompleted: OnCompletedGQLFn;
  onError: OnErrorGQLFn;
}>;

/**
 * Helper: Get name of query
 */

// function getQueryName(query: any) {
//   return query.definitions.filter((d: any) => d.kind === 'OperationDefinition').map(d => d.name.value).join(', ');
// }

/**
 * Helper; Log if conditions are met
 */

// function doLog(query: any, logStr: string) {
//   const queryName = getQueryName(query);
//   if (queryName === 'friend') {
//     console.log(logStr.replace(/\$0/gi, queryName));
//   }
// }

/**
 * Default params for graphql requests
 */

const defaultRequestParams = {
  // onCompleted: (data: any) => {
  //   if (getENVVariable('NODE_ENV') === 'development') {
  //     console.log('onCompleted:', data);
  //   }
  // },
  onError: (error: ServerErrorObj | null) => {
    if (getENVVariable('NODE_ENV') === 'development') {
      console.log('DEVELOPMENT onError():', error);
    }
  },
};

/**
 * GraphQL request with retry support
 */

export async function graphqlRequestWithRetry(
  gqlQuery: any,
  graphqlOptions: GraphQLMutationOptions = defaultRequestParams,
  triedCount: number = 0,
): Promise<any> {

  const retryCount = graphqlOptions?.retryCount || 0;
  const retryDelay = 1500 * Math.pow(2, triedCount);
  const { onCompleted, onError, openModalPopUp } = graphqlOptions;

  const apiResult = await graphqlRequest(
    gqlQuery,
    graphqlOptions?.variables,
    {
      openModalPopUp: retryCount >= triedCount ? openModalPopUp : undefined,
      onCompleted: (data: any | null, error: ServerErrorObj | null) => {
        if (onCompleted && data.data) {
          onCompleted(data.data, error, graphqlOptions?.variables);
        }
      },
      onError: (error: ServerErrorObj | null) => {
        if (onError && retryCount <= triedCount) {
          onError(error, graphqlOptions?.variables);
        } else if (!onError) {
          console.warn(error);
        }
      },
    }
  );

  if (!apiResult.data && isServerErrorGQL(apiResult)) {
    if (retryCount > triedCount) {
      await delay(retryDelay);
      if (getENVVariable('NODE_ENV') === 'development') {
        console.log(`retrying mutation... ${triedCount + 1} / ${retryCount}`);
      }

      return graphqlRequestWithRetry(gqlQuery, graphqlOptions, triedCount + 1);
    } else if (getENVVariable('NODE_ENV') === 'development') {
      console.log(
        `mutation failed; exhausted all retry attempts... ${triedCount} / ${retryCount}`,
      );
    }
  }

  return apiResult.data || apiResult;
}

/**
 * GraphQL query
 */

export async function graphqlRequest(
  gqlQuery: any,
  variables?: any,
  params?: GraphQLMutationOptions,
  controllerSignal?: AbortSignal | null,
  updateObservers?: UpdateObserversFn,
): Promise<any> {

  const { openModalPopUp, onCompleted, onError, authToken, cacheMap, ipAddress } = params || {};

  if (!gqlQuery?.definitions) {
    console.log(gqlQuery);
  }

  const operationName = gqlQuery?.definitions?.find((def: any) => def.kind === 'OperationDefinition')?.name?.value;
  const headers = apiRequestHeaders(getENVVariable('IS_BROWSER') ? getAuthToken() : authToken, ipAddress);

  // Use this to check queries that are getting double-requested
  // doLog(gqlQuery, 'QUERYING... $0');

  return fetch(getENVVariable('GQL_SERVER') as string, {
    signal: controllerSignal,
    method: 'POST',
    // credentials: 'same-origin',
    // headers: new Headers({
    headers,
    // headers,
    body: JSON.stringify({
      query: gqlQuery?.loc?.source.body,
      variables,
      operationName,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      let gqlError: ServerErrorObj | null = null;
      if (data.errors?.length) {
        gqlError = normalizeServerError(data);

        if (openModalPopUp) {
          openModalPopUp(null, gqlError);
        }

        if (onError) {
          onError(gqlError, variables);
        }
      }

      if (onCompleted) {
        onCompleted(data, gqlError, variables);
      }

      setDataToCache(data.data, gqlQuery, variables, cacheMap, updateObservers);

      return {
        ...data.data,
        error: gqlError,
      };
    })
    .catch((err) => {
      if (getENVVariable('NODE_ENV') === 'development') {
        console.log(err);
      }

      if (err.name === 'AbortError') {
        return { aborted: true };
      }

      const gqlError = normalizeServerError(err);
      if (openModalPopUp) {
        openModalPopUp(null, gqlError);
      }

      if (onError) {
        onError(gqlError, variables);
      }
      return { error: gqlError };
    });
}
