import { getENVVariable } from '@jsb188/app';
import type { ServerErrorObj, SimpleErrorType } from '@jsb188/app/types/app.d';
import { normalizeServerError } from '@jsb188/app/utils/api';
import { delay, makeVariablesKey } from '@jsb188/app/utils/logic';
import { isServerErrorGQL } from '@jsb188/graphql/utils';
import { useConnectedToServerValue, useFragmentObserverValue, useQueryObserverValue, useScreenIsFocusedValue, useSetFragmentObserver, useSetQueryObserver } from '@jsb188/react/states';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { checkDataCompleteness, clearQueryResetStatus, fetchCachedData, getQueryRefreshTime, loadDataFromCache, loadFragment, removeStaleCache } from '../cache';
import { QUERY_EXPIRE_TIMES } from '../cache/config';
import { graphqlRequest } from '../client/request';
import type { AnyModalPopUpFn, GraphQLHandlers, GraphQLQueryOptions, OnCompletedGQLFn, OnErrorGQLFn, UpdateDataObserverArgs, UpdateObserversFn } from '../types';


/**
 * Types; mutation
 */

export type GraphQLMutationFn = (graphqlOptions?: GraphQLRequestOptions, triedCount?: number) => Promise<any>;

type GraphQLMutationOptions = Partial<{
  checkMountedBeforeCallback: boolean;
  authToken: string;
  retryCount: number;
  variables: Record<string, any> | null;
  cacheMap: any;
  openModalPopUp: AnyModalPopUpFn | null;
  initialError: any;
  onCompleted: OnCompletedGQLFn;
  onError: OnErrorGQLFn;
}>;

type GraphQLMutationResult = {
  data: any | null;
  variables: Record<string, any> | null;
  saving: boolean;
  error: ServerErrorObj | null;
  mutationCount: number;
};

type GraphQLMutation = [
  GraphQLMutationFn,
  GraphQLMutationResult,
  GraphQLHandlers,
  UpdateObserversFn,
  React.MutableRefObject<Record<string, any>>
];

/**
 * Types; query
 */

type GraphQLRequestOptions = {
  variables?: Record<string, any> | null;
};

type GraphQLQueryResult = {
  data: any | null;
  variables?: Record<string, any> | null;
  loading: boolean;
  error: ServerErrorObj | null;
  refetch: () => void;
  fetchMore: (obj: GraphQLRequestOptions) => Promise<any>;
  queryName: string;
  queryKey: string;
  refreshTime: string;
  variablesKey: string;
  updatedCount: number;
  updateObservers: UpdateObserversFn;
  connectedToServer: boolean;
  screenIsFocused: boolean;
};

/**
 * Global variables
 */

const QRY_TRACKER = new Map();

/**
 * Global; unset query tracker
 */

function unsetQueryTracker(queryName: string, unique: string | null) {
  const currentHookId = QRY_TRACKER.get(queryName);
  if (currentHookId === unique) {
    QRY_TRACKER.delete(queryName);
  }
}

/**
 * Helper; get retry delay
 */

function getRetryDelay(triedCount: number): number {
  return 1500 * Math.pow(2, triedCount);
}

/**
 * Update data observer
 */

export function useUpdateObservers(): UpdateObserversFn {
  const setQueryObserver = useSetQueryObserver();
  const setFragmentObserver = useSetFragmentObserver();

  return (args: UpdateDataObserverArgs) => {
    if (args.queryId) {
      setQueryObserver((prev: any) => ({
        count: (prev.name === args.queryId ? prev.count : 0) + 1,
        name: args.queryId as string,
        forceRefetch: !!args.forceRefetch,
      }));
    }

    if (args.fragmentIds?.length) {
      setFragmentObserver((prev: any) => ({
        count: (prev.count || 0) + 1,
        list: args.fragmentIds as string[],
      }));
    }
  };
}

/**
 * Hook for query changes
 */

export function useWatchQuery(
  query: any,
  variablesKey: string,
  lastUpdatedCount: number,
  loading: boolean,
) { // [updatedCount, forceRefetch, qryReset]

  const qryObserver = useQueryObserverValue();
  const [qryReset, setQryReset] = useState({
    triggerTime: '',
    refreshTime: '', // This value is fixed and never resets (this should be used as a tracker)
    refreshTimeActive: '', // This value resets when loading starts
  });

  const queryWatcher = useMemo(() => {
    if (qryObserver.name) {
      const queryDefs = query.definitions.filter((d: any) => d.kind === 'OperationDefinition');
      const queryName = queryDefs?.[0]?.name?.value;

      if (queryName) {
        const qryTriggerTime = getQueryRefreshTime(queryName, variablesKey);

        if (qryTriggerTime) {
          clearQueryResetStatus(queryName, variablesKey);
          console.dev(`... (1) Query [${queryName}:${variablesKey}] is being force refetched via observer.`);
          return [lastUpdatedCount + 1, true, qryTriggerTime];
        }
      }

      const matchedQry = queryDefs
        .find((d: any) =>
          qryObserver.name.startsWith('#' + d.name.value) ||
          ('#' + d.name.value + ':') === qryObserver.name
        );

      if (!matchedQry) {
        return [0, false, ''];
      }

      const matchedQueryName = matchedQry.name.value;
      const matchedQueryId = `#${matchedQueryName}:${variablesKey}`;
      const forceRefetch = !!qryObserver.forceRefetch;

      let newUpdatedCount = qryObserver.name === matchedQueryId || forceRefetch ? qryObserver.count : 0;
      if (forceRefetch) {
        newUpdatedCount += 1;
      }

      if (forceRefetch) {
        console.dev(`... (2) Query [${matchedQueryId}] is being force refetched via observer.`);
      }

      return [newUpdatedCount, forceRefetch, ''];
    }

    return [0, false, ''];
  }, [qryObserver]);

  useEffect(() => {
    if (!loading) {
      if (qryReset.triggerTime && qryReset.refreshTimeActive === '') {
        setQryReset((prev) => ({
          ...prev,
          refreshTime: qryReset.triggerTime,
          refreshTimeActive: qryReset.triggerTime,
        }));
      } else if (queryWatcher[2] && queryWatcher[2] !== qryReset.triggerTime) {
        setQryReset((prev) => ({
          ...prev,
          triggerTime: queryWatcher[2],
        }));
      }
    } else if (qryReset.refreshTimeActive) {
      setQryReset((prev) => ({
        ...prev,
        triggerTime: '',
        refreshTimeActive: '',
      }));
    }
  }, [queryWatcher[2], loading]);

  // console.log('refreshTime:', refreshTime + queryWatcher[0]);

  return {
    updatedCount: queryWatcher[0],
    forceRefetch: queryWatcher[1],
    qryReset
  };
}

/**
 * Hook for reactive fragment data
 */

export function useReactiveFragment(
  data: any,
  observe: Array<string | [string, string | null]>,
  qryObsCount?: number | boolean,
  otherCheck?: (latestData: any, updatedKeys: any[]) => boolean,
  ignoreIDWarning?: boolean,
  isTest?: boolean
) {

  const fragmentObserver = useFragmentObserverValue();
  const frgObsCount = fragmentObserver.count;
  const dataId = data?.id;

  const [changedData, setChangedData] = useState<any>(() => {
    // This allows initial data to *not* be null even when data param is null
    let initialData = data;

    observe.forEach((key) => {
      const isMapped = Array.isArray(key);
      const fragmentData = loadFragment(isMapped ? key[0] : key);

      if (fragmentData) {
        if (isMapped) {
          if (key[1]) {
            initialData = {
              ...initialData!,
              [key[1]]: fragmentData,
            };
          }
        } else {
          initialData = {
            ...initialData!,
            ...fragmentData,
          };
        }
      }
    });

    return {
      fragmentUpdatedCount: frgObsCount,
      queryUpdatedCount: qryObsCount,
      data: initialData
    };
  });

  if (getENVVariable('NODE_ENV') === 'development' && !ignoreIDWarning) {
    // this is fine because it will only run in development and never truly be conditional
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (
        // getENVVariable('NODE_ENV') === 'development' &&
        dataId && changedData.data?.id &&
        dataId !== changedData.data?.id
      ) {
        console.warn(`WARNING: useReactiveFragment() data.id changed from ${dataId} to ${changedData.data?.id}`);
        console.warn('This can result in invalid merged data. Use key={id} to avoid this error.');
      }
    }, [changedData.data?.id]);
  }

  useEffect(() => {

    // NOTE: I tried this with Preact's effect()
    // But that caused the render to happen 3 times more, I don't know why.
    // I only solved it by using useEffect()
    const idsChanged = (
      !dataId ||
      changedData.data?.id !== dataId ||
      (
        // This is absolutely needed for the chat clientId system to work properly;
        // Otherwise messages will be stuck in "not sent" state.
        changedData.data?.clientId &&
        changedData.data?.clientId !== data.clientId
      )
    );

    const forceReactive = otherCheck && otherCheck(changedData.data, fragmentObserver.list);

    if (
      idsChanged ||
      forceReactive || (
        (changedData.data || data) &&
        (
          frgObsCount !== changedData.fragmentUpdatedCount ||
          qryObsCount !== changedData.queryUpdatedCount
        )
      )
    ) {

      const dataUpdated = (
        idsChanged ||
        forceReactive ||
        observe.some((key) => {
          const isMapped = Array.isArray(key);
          return isMapped ? fragmentObserver.list.includes(key[0]) : fragmentObserver.list.includes(key);
        })
      )

      let newData;
      if (dataUpdated) {
        for (const key of observe) {
          const isMapped = Array.isArray(key);

          if (key) {
            if (!newData) {
              if (idsChanged) {
                newData = data;
              } else if (data) {
                newData = {
                  ...data,
                  ...changedData.data,
                };
              } else {
                newData = changedData.data;
              }
            }

            const fragmentData = loadFragment(isMapped ? key[0] : key);

            // if (isTest) {
            //   console.log('fragmentKey', key);
            //   console.log('fragmentData', fragmentData);
            // }

            if (fragmentData) {
              if (isMapped) {
                if (key[1]) {
                  newData = {
                    ...newData,
                    [key[1]]: fragmentData,
                  };
                }
              } else {
                newData = {
                  ...newData,
                  ...fragmentData,
                };
              }
            }
          }
        }
      }

      if (newData) {
        setChangedData({
          data: newData,
          fragmentUpdatedCount: frgObsCount,
          queryUpdatedCount: qryObsCount,
        });
      }
    }
  }, [dataId, qryObsCount, frgObsCount]);

  // This is not needed now, I think
  // useEffect(() => {
  //   if (updateQueryCount && queryKey) {
  //     const updatedQueryData = loadQuery(queryKey);
  //     setChangedData({
  //       ...changedData,
  //       data: {
  //         ...changedData.data,
  //         ...updatedQueryData,
  //       },
  //     });
  //   }
  // }, [updateQueryCount]);

  // if (isTest) {
  //   console.log('dataId', dataId);
  //   console.log('1', changedData);
  //   console.log('2', data);
  // }

  return changedData.data ?? null;
}

/**
 * Observe query changes; but for Arrays
 */

export function useReactiveFragmentMap(
  data: any[] | null,
  fragmentName_: string,
) {
  const fragmentName = `$${fragmentName_}`;
  const observe = data?.map((d) => fragmentName + ':' + d.id);
  const fragmentObserver = useFragmentObserverValue();

  const [changedData, setChangedData] = useState({
    count: fragmentObserver.count,
    lastObserve: observe,
    data
  });

  useEffect(() => {
    // NOTE: I tried this with effect()
    // But that caused the render to happen 3 times more, I don't know why.
    // I only solved it by using useEffect()

    const dataToUpdate = changedData.data || data;
    if (
      dataToUpdate &&
      observe &&
      fragmentObserver.count !== changedData.count
    ) {
      let newData;
      for (let i = 0; i < observe.length; i++) {
        const key = observe[i];

        if (fragmentObserver.list.includes(key)) {
          if (!newData) {
            newData = dataToUpdate;
          }

          if (newData[i]) {
            const fragmentData = loadFragment(key);
            if (fragmentData) {
              newData[i] = {
                ...newData[i],
                ...fragmentData,
              };
            }
          }
        }
      }

      if (newData) {
        setChangedData({
          ...changedData,
          count: fragmentObserver.count,
          data: newData.slice(0)
        });
      }
    }
  }, [fragmentObserver.list]);

  const observeStr = observe?.join(',');
  useEffect(() => {
    if (changedData.lastObserve?.join(',') !== observeStr) {
      setChangedData({
        ...changedData,
        data,
        lastObserve: observe,
      });
    }
  }, [observeStr]);

  return changedData.data;
}

/**
 * Use mutation
 */

export function useMutation(
  mutation: any,
  options?: GraphQLMutationOptions,
): GraphQLMutation {

  const { onCompleted, onError, openModalPopUp, initialError, checkMountedBeforeCallback } = options || {};
  const updateObservers = useUpdateObservers();

  // No need to abort mutations
  // But bring it back if you want ability to "cancel"
  // const controller = useRef();

  const tracker = useRef({
    mounted: true,
    timer: null as NodeJS.Timeout | null,
  });

  const [mtnValues, setMtnValues] = useState({
    variables: null as Record<string, any> | null,
    saving: false,
    data: null,
    error: initialError || null as ServerErrorObj | null,
    mutationCount: 0,
  });

  // Mounted hook

  useEffect(() => {
    return () => {
      tracker.current.mounted = false;
      if (tracker.current.timer) {
        clearTimeout(tracker.current.timer);
      }
    };
  }, []);

  //  Mutate function for the client

  const doMutate = async (
    graphqlOptions?: GraphQLRequestOptions,
    triedCount: number = 0,
  ) => {
    // No need to abort mutations
    // if (controller.current) {
    //   controller.current.abort();
    // }

    // No need to abort mutations
    // controller.current = new AbortController();

    setMtnValues({
      ...mtnValues,
      variables: graphqlOptions?.variables || null,
      saving: true,
    });

    const retryCount = options?.retryCount || 0;
    const retryDelay = getRetryDelay(triedCount);

    const apiResult = await graphqlRequest(
      mutation,
      graphqlOptions?.variables,
      {
        openModalPopUp: retryCount >= triedCount ? openModalPopUp : null,
        onCompleted: (data: any | null, error: ServerErrorObj | null) => {
          if (tracker.current.mounted) {
            setMtnValues({
              ...mtnValues,
              mutationCount: mtnValues.mutationCount + 1,
              saving: false,
              data: data.data || null,
              error,
            });
          }

          if (data.data) {
            if (onCompleted && (tracker.current.mounted || !checkMountedBeforeCallback)) {
              // Do separate {mounted.current} check from outside
              onCompleted(data.data, error, graphqlOptions?.variables);
            }
          }
        },
        onError: (error: ServerErrorObj | null) => {
          if (tracker.current.mounted) {
            setMtnValues({
              ...mtnValues,
              saving: retryCount > triedCount,
              error,
            });
          }

          if (onError && retryCount <= triedCount && (tracker.current.mounted || !checkMountedBeforeCallback)) {
            onError(error, graphqlOptions?.variables);
          }
        },
      },
      null, // abort controller is not needed for mutations
      updateObservers
    );

    if (apiResult.aborted) {
      return apiResult;
    }

    if (!apiResult.data && isServerErrorGQL(apiResult)) {
      if (retryCount > triedCount) {
        await delay(retryDelay);
        if (getENVVariable('NODE_ENV') === 'development') {
          console.log(`retrying mutation... ${triedCount + 1} / ${retryCount}`);
        }

        return doMutate(graphqlOptions, triedCount + 1);
      } else if (getENVVariable('NODE_ENV') === 'development') {
        console.log(
          `mutation failed; exhausted all retry attempts... ${triedCount} / ${retryCount}`,
        );
      }
    }

    return apiResult;
  };

  const mtnHandlers: GraphQLHandlers = {
    resetErrors: () => {
      setMtnValues({
        ...mtnValues,
        error: null,
      });
    },
    setError: (errorObj: SimpleErrorType) => {
      setMtnValues({
        ...mtnValues,
        error: {
          statusCode: 200,
          errorCode: 'custom_error',
          ...errorObj,
        },
      });
    },
    refetch: () => {
      const lastVariables = mtnValues.variables;
      return doMutate(lastVariables ? { variables: lastVariables } : undefined);
    },
    setSaving: (nextSaving: boolean, resetInMS?: number) => {
      setMtnValues({
        ...mtnValues,
        saving: nextSaving,
      });

      if (nextSaving && resetInMS) {
        if (tracker.current.timer) {
          clearTimeout(tracker.current.timer);
        }

        tracker.current.timer = setTimeout(() => {
          setMtnValues({
            ...mtnValues,
            saving: false,
          });
        }, resetInMS);
      }
    }
  };

  return [doMutate, mtnValues, mtnHandlers, updateObservers, tracker];
}

/**
 * Use query
 */

export function useQuery(
  query: any,
  options?: GraphQLQueryOptions,
): GraphQLQueryResult {
  const { onCompleted, onError, openModalPopUp, variables, cacheMap, skip, eagerFragmentKeyMap, doTest } = options || {};
  const variablesKey = makeVariablesKey(variables);
  const connectedToServer = useConnectedToServerValue();
  const screenIsFocused = useScreenIsFocusedValue();
  const updateObservers = useUpdateObservers();

  // useQuery() assumes query is a single graphql query (and not a multi/chain)
  // Multiple queries can be chained using this hook,
  // but only the first query is used for tracking reactivity.
  const queryName = query.definitions?.[0]?.name?.value;
  const queryKey = `#${queryName}:${variablesKey}`;

  const tracker = useRef({
    unique: null as string | null,
    abortCtrl: null as AbortController | null,
    reconnectedAt: null as number | null,
    json: '',
    init: false
  });

  // check if p.updatedCount is needed

  const [qryValues, setQryValues] = useState({
    data: null as any,
    variables,
    loading: false,
    error: null as ServerErrorObj | null,
    lastUpdatedCount: 0,
    lastRefreshTriggerTime: '',
  });

  const { updatedCount, forceRefetch, qryReset: { triggerTime, refreshTime } } = useWatchQuery(
    query,
    variablesKey,
    qryValues.lastUpdatedCount,
    qryValues.loading
  );

  const [queryOutput, setQueryOutput] = useState({ queryKey, refreshTime, data: null });

  // Query function for the client
  // NOTE: useQuery() assumes {query} and {options} will *never* change, except for {options.variables}

  const doQuery = async (queryVariables?: any, triedCount: number = 0) => {

    const currentHookId = QRY_TRACKER.get(queryKey);
    if (!currentHookId) {
      QRY_TRACKER.set(queryKey, tracker.current.unique);
    } else if (currentHookId) {
      // This query is being fetched already, so do nothing
      // This can happen in 2 ways;
      // 1. This hook is used to doQuery() while doQuery() is alerady in progress (loading)
      // 2. useWatchQuery() caused 2 hooks with same query to be called at once
      return;
    }

    if (tracker.current.abortCtrl && qryValues.loading) {
      // doLog(query, 'Query component [$0] is being aborted before being refetched.');
      // console.log('ABORT:', queryKey, tracker.current.unique);
      tracker.current.abortCtrl.abort({
        name: 'AbortError',
        message: `Hook for ${queryKey} has aborted because the [query refetched before the previous one ended].`
      });
    }

    tracker.current.abortCtrl = new AbortController();

    setQryValues({
      ...qryValues,
      loading: true,
    });

    const retryCount = options?.retryCount || 0;
    const retryDelay = getRetryDelay(triedCount);
    const qryVariables = queryVariables || variables;
    // const qryName = query.definitions?.[0]?.name?.value;

    // doLog(query, 'Query component [$0] is being refetched.');

    const apiResult = await graphqlRequest(
      query,
      qryVariables,
      {
        openModalPopUp: retryCount >= triedCount ? openModalPopUp : null,
        cacheMap,
        onCompleted: (data: any | null, error: ServerErrorObj | null) => {
          if (data.data) {
            setQryValues({
              ...qryValues,
              variables: qryVariables,
              data: data.data,
              loading: false,
              error,
            });

            if (onCompleted) {
              onCompleted(data.data, error, qryVariables);
            }

            removeStaleCache();
            tracker.current.reconnectedAt = Date.now();
          }

          unsetQueryTracker(queryKey, tracker.current.unique);
        },
        onError: (error: ServerErrorObj | null) => {
          setQryValues({
            ...qryValues,
            variables: qryVariables,
            loading: retryCount > triedCount,
            error,
          });

          if (onError && retryCount <= triedCount) {
            onError(error, qryVariables);
          }

          unsetQueryTracker(queryKey, tracker.current.unique);
        },
      },
      tracker.current.abortCtrl.signal,
      updateObservers
    );

    if (apiResult.aborted) {
      return apiResult;
    }

    if (!apiResult.data && isServerErrorGQL(apiResult)) {
      if (retryCount > triedCount) {
        await delay(retryDelay);
        if (getENVVariable('NODE_ENV') === 'development') {
          console.log(`retrying query... ${triedCount + 1} / ${retryCount}`);
        }

        return doQuery(queryVariables, triedCount + 1);
      } else if (getENVVariable('NODE_ENV') === 'development') {
        console.log(
          `query failed; exhausted all retry attempts... ${triedCount} / ${retryCount}`,
        );
      }
    }

    return apiResult;
  };

  // Mount & unmount

  useEffect(() => {
    if (!tracker.current.unique) {
      tracker.current.unique = Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    return () => {
      unsetQueryTracker(queryKey, tracker.current.unique);
    };
  }, [queryKey]);


  useEffect(() => {
    return () => {
      if (tracker.current.abortCtrl) {
        // console.log('UMOUNTED:', queryKey, tracker.current.unique);
        tracker.current.abortCtrl.abort({
          name: 'AbortError',
          message: `Hook for ${queryKey} has aborted because [the component unmounted].`
        });
      }
    };
  }, []);

  // Refetch when variables, skip status or query observer changes

  // const isTest = queryName === 'logEntries';

  useEffect(() => {
    // isTest && console.log('useQuery check:', refreshTime, updatedCount, qryValues.lastUpdatedCount);

    if (
      !skip && (
        (triggerTime && triggerTime !== qryValues.lastRefreshTriggerTime) ||
        updatedCount !== qryValues.lastUpdatedCount ||
        variablesKey !== makeVariablesKey(qryValues.variables) ||
        !checkDataCompleteness(qryValues.data, query)
      )
    ) {
      const cachedResult = fetchCachedData(query, variablesKey, updateObservers);
      if (cachedResult) {
        setQryValues({
          ...qryValues,
          variables,
          data: cachedResult,
          error: null,
          loading: false, // IMPORTANT: must be false here
          lastRefreshTriggerTime: triggerTime,
          lastUpdatedCount: updatedCount || 0,
        });

        if (forceRefetch && !qryValues.loading) {
          doQuery();
          // isTest && console.log('FORCE REFETCH AT:', query.definitions[0].name.value);
          // console.log('::', variablesKey, skip, updatedCount);
        }

      } else if (!qryValues.loading) {
        // isTest && console.log(query, '>>>>> $0|' + variablesKey + skip + updatedCount + '|');
        doQuery();
      }
    }
  }, [variablesKey, skip, updatedCount, triggerTime]);

  // Refetch when the app reconnects and has no data

  const withoutData = qryValues.data === null;
  const reconnectedWithoutData = !skip && withoutData && !qryValues.loading && connectedToServer;

  useEffect(() => {
    if (connectedToServer && screenIsFocused && !skip) {
      const now = Date.now();

      let timeDiff, timeThresh;
      if (reconnectedWithoutData) {
        timeDiff = tracker.current.reconnectedAt ? now - tracker.current.reconnectedAt : Infinity;
        timeThresh = 5000;
      } else {
        timeDiff = tracker.current.reconnectedAt ? now - tracker.current.reconnectedAt : -Infinity;
        timeThresh = QUERY_EXPIRE_TIMES[queryName] || QUERY_EXPIRE_TIMES.__default;
      }

      // console.log('>>', queryName, timeDiff, timeThresh, timeDiff > timeThresh);

      if (
        tracker.current.init &&
        timeDiff > timeThresh
      ) {
        // console.log('query again:', queryName, timeDiff);
        // doLog(query, reconnectedWithoutData + ' / ' + skip + ' / ' + withoutData + ' / ' + !qryValues.loading);
        tracker.current.reconnectedAt = now;
        doQuery();
      } else {
        tracker.current.init = true;
      }
    }
  }, [reconnectedWithoutData, screenIsFocused]);

  const refetch = useCallback(() => {
    return doQuery();
  }, [doQuery]);

  const fetchMore = useCallback(async(obj: GraphQLRequestOptions): Promise<any> => {
    const result = await doQuery(obj?.variables);

    if (result.error) {
      return {
        ...result,
        error: normalizeServerError(result.error),
      };
    }

    return result;
  }, [doQuery, skip]);

  const queryData = loadDataFromCache(
    qryValues.data,
    query,
    variablesKey,
    cacheMap,
    eagerFragmentKeyMap,
  );

  useEffect(() => {
    const jsonStr = queryKey + '|' + JSON.stringify(queryData[queryName]);
    if (tracker.current.json === jsonStr) {
      return;
    }

    tracker.current.json = jsonStr;

    // This makes queryKey and data always in sync
    setQueryOutput({
      queryKey,
      refreshTime,
      data: queryData,
    });
  }, [queryData[queryName]]);

  return {
    ...qryValues,
    queryName,
    queryKey: queryOutput.queryKey,
    data: queryOutput.data || queryData,
    refreshTime: queryOutput.refreshTime,
    variablesKey,
    refetch,
    fetchMore,
    updatedCount,
    updateObservers,
    connectedToServer,
    screenIsFocused,
  };
}
