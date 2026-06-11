import { getENVVariable } from '@jsb188/app';
import type { ServerErrorObj, SimpleErrorType } from '@jsb188/app/types/app.d.ts';
import { normalizeServerError } from '@jsb188/app/utils/api.ts';
import { delay, makeVariablesKey } from '@jsb188/app/utils/logic.ts';
import { isServerErrorGQL } from '@jsb188/graphql/utils';
import { useConnectedToServerValue, useQueryObserverValue, useScreenIsFocusedValue, useSetFragmentObserver, useSetQueryObserver } from '@jsb188/react/states';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QUERY_EXPIRE_TIMES } from '../cache/config.ts';
import { checkDataCompleteness, clearQueryResetStatus, fetchCachedData, getQueryRefreshTime, loadDataFromCache, loadFragment, removeStaleCache } from '../cache/index.ts';
import { graphqlRequest } from '../client/request.ts';
import type { AnyModalPopUpFn, GraphQLHandlers, GraphQLQueryOptions, OnCompletedGQLFn, OnErrorGQLFn, UpdateDataObserverArgs, UpdateObserversFn } from '../types.d.ts';


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
  resetOnlyTime: string;
  variablesKey: string;
  updatedCount: number;
  updateObservers: UpdateObserversFn;
  connectedToServer: boolean;
  screenIsFocused: boolean;
};

type GraphQLQueryValues = {
  data: any;
  variables?: Record<string, any> | null;
  loading: boolean;
  error: ServerErrorObj | null;
  lastUpdatedCount: number;
  lastRefreshTriggerTime: string;
};

/**
 * Global variables
 */

const QRY_TRACKER = new Map();
const QRY_PROMISES = new Map<string, Promise<any>>();
const FRAGMENT_OBSERVER_LISTENERS = new Map<string, Set<(fragmentIds: string[]) => void>>();

/**
 * Return a unique id for one mounted query hook instance.
 */
function makeQueryHookId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Return GraphQL result data wrapped under its operation name.
 */
function getQueryDataFromAPIResult(queryName: string, apiResult: any) {
  if (!apiResult || apiResult.aborted || apiResult.error || apiResult[queryName] === undefined) {
    return null;
  }

  return {
    [queryName]: apiResult[queryName],
  };
}

/**
 * Convert reactive fragment observe entries into exact fragment observer keys.
 */

function getReactiveFragmentObserveKeys(observe: Array<string | [string, string | null]>) {
  return observe.map((key) => {
    return Array.isArray(key) ? key[0] : key;
  }).filter(Boolean);
}

/**
 * Subscribe to exact fragment observer keys.
 */

function subscribeFragmentObserverKeys(
  fragmentIds: string[],
  listener: (fragmentIds: string[]) => void,
) {
  for (const fragmentId of fragmentIds) {
    const listeners = FRAGMENT_OBSERVER_LISTENERS.get(fragmentId) || new Set();
    listeners.add(listener);
    FRAGMENT_OBSERVER_LISTENERS.set(fragmentId, listeners);
  }

  return () => {
    for (const fragmentId of fragmentIds) {
      const listeners = FRAGMENT_OBSERVER_LISTENERS.get(fragmentId);
      listeners?.delete(listener);

      if (!listeners?.size) {
        FRAGMENT_OBSERVER_LISTENERS.delete(fragmentId);
      }
    }
  };
}

/**
 * Notify keyed reactive fragment subscribers for only the changed fragment ids.
 */

function notifyFragmentObserverListeners(fragmentIds: string[]) {
  const notifiedListeners = new Set<(fragmentIds: string[]) => void>();

  for (const fragmentId of fragmentIds) {
    const listeners = FRAGMENT_OBSERVER_LISTENERS.get(fragmentId);

    listeners?.forEach((listener) => {
      if (!notifiedListeners.has(listener)) {
        notifiedListeners.add(listener);
        listener(fragmentIds);
      }
    });
  }
}

/**
 * Observe only the exact fragment keys needed by one reactive fragment hook.
 */

function useFragmentKeyObserver(observe: Array<string | [string, string | null]>) {
  const observeStr = getReactiveFragmentObserveKeys(observe).join(',');
  const observeKeys = useMemo(() => observeStr.split(',').filter(Boolean), [observeStr]);
  const [fragmentObserver, setFragmentObserver] = useState({
    count: 0,
    list: [] as string[],
  });

  useEffect(() => {
    return subscribeFragmentObserverKeys(observeKeys, (fragmentIds) => {
      setFragmentObserver((prev) => ({
        count: prev.count + 1,
        list: fragmentIds,
      }));
    });
  }, [observeKeys]);

  return fragmentObserver;
}

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
        resetOnly: !!args.resetOnly,
      }));
    }

    if (args.fragmentIds?.length) {
      setFragmentObserver((prev: any) => ({
        count: (prev.count || 0) + 1,
        list: args.fragmentIds as string[],
      }));
      notifyFragmentObserverListeners(args.fragmentIds as string[]);
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
) {

  const qryObserver = useQueryObserverValue();
  const [qryReset, setQryReset] = useState({
    triggerTime: '',
    refreshTime: '', // This value is fixed and never resets (this should be used as a tracker)
    refreshTimeActive: '', // This value resets when loading starts
  });

  const queryWatcher = useMemo<[number, boolean, string, string]>(() => {
    if (qryObserver.name) {
      const queryDefs = query.definitions.filter((d: any) => d.kind === 'OperationDefinition');
      const queryName = queryDefs?.[0]?.name?.value;

      if (queryName) {
        const qryTriggerTime = getQueryRefreshTime(queryName, variablesKey);

        if (qryTriggerTime) {
          clearQueryResetStatus(queryName, variablesKey);
          console.dev(`... (1) Query [${queryName}:${variablesKey}] is being force refetched via observer.`);
          return [lastUpdatedCount + 1, true, qryTriggerTime, ''];
        }
      }

      const matchedQry = queryDefs
        .find((d: any) => {
          const queryName = d.name.value;
          const fullQueryKey = `#${queryName}:${variablesKey}`;
          const queryNameKey = `#${queryName}:`;

          if (qryObserver.name.startsWith('^')) {
            try {
              return new RegExp(qryObserver.name).test(fullQueryKey);
            } catch (_err) {
              return false;
            }
          }

          return (
            qryObserver.name === fullQueryKey ||
            qryObserver.name === queryNameKey ||
            fullQueryKey.startsWith(qryObserver.name)
          );
        });

      if (!matchedQry) {
        return [lastUpdatedCount, false, '', ''];
      }

      const matchedQueryName = matchedQry.name.value;
      const matchedQueryId = `#${matchedQueryName}:${variablesKey}`;
      const forceRefetch = !!qryObserver.forceRefetch;
      const resetOnlyTime = qryObserver.resetOnly ? `${Date.now()}:${qryObserver.count}` : '';

      let newUpdatedCount = qryObserver.name === matchedQueryId || forceRefetch ? qryObserver.count : 0;
      if (forceRefetch) {
        newUpdatedCount += 1;
      }

      if (forceRefetch) {
        console.dev(`... (2) Query [${matchedQueryId}] is being force refetched via observer.`);
      }

      return [newUpdatedCount, forceRefetch, '', resetOnlyTime];
    }

    return [lastUpdatedCount, false, '', ''];
  }, [lastUpdatedCount, qryObserver]);

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
    resetOnlyTime: queryWatcher[3],
    qryReset
  };
}

/**
 * Hook for reactive fragment data
 * This function will return the cached data if it exists, even if the `data` param is null.
 */

export function useReactiveFragment(
  data: any,
  observe: Array<string | [string, string | null]>,
  qryObsCount?: number | boolean,
  otherCheck?: (latestData: any, updatedKeys: any[]) => boolean,
  mainPrioritizedFields?: string[],
  ignoreIDWarning?: boolean,
  isTest?: boolean
) {

  const fragmentObserver = useFragmentKeyObserver(observe);
  const frgObsCount = fragmentObserver.count;
  const dataId = data?.id;

  const [changedData, setChangedData] = useState<any>(() => {
    // This allows initial data to *not* be null even when data param is null
    let initialData = data;

    observe.forEach((key) => {
      const isMapped = Array.isArray(key);
      const fragmentData = loadFragment(isMapped ? key[0] : key, mainPrioritizedFields);

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

            const fragmentData = loadFragment(isMapped ? key[0] : key, mainPrioritizedFields);

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
 * Merge mapped array data with the latest fragment cache values.
 */

function getReactiveFragmentMapData(
  data: any[] | null,
  observe?: string[] | null,
) {
  if (!data || !observe?.length) {
    return data;
  }

  return data.map((item, i) => {
    const key = observe[i];
    if (!key) {
      return item;
    }

    const fragmentData = loadFragment(key);
    if (!fragmentData) {
      return item;
    }

    return {
      ...item,
      ...fragmentData,
    };
  });
}

/**
 * Observe query changes; but for Arrays
 */

export function useReactiveFragmentMap(
  data: any[] | null,
  fragmentName_: string,
) {
  const fragmentName = `$${fragmentName_}`;
  const observeStr = useMemo<string>(() => data?.map((d) => fragmentName + ':' + d.id).join(',') || '', [data, fragmentName]);
  const observe = useMemo<string[]>(() => observeStr.split(',').filter(Boolean), [observeStr]);
  const observeIndex = useMemo<Map<string, number>>(() => {
    const indexMap = new Map<string, number>();

    observe.forEach((key: string, index: number) => {
      indexMap.set(key, index);
    });

    return indexMap;
  }, [observe]);
  const fragmentObserver = useFragmentKeyObserver(observe);

  const [changedData, setChangedData] = useState({
    count: fragmentObserver.count,
    lastObserveStr: observeStr,
    data: getReactiveFragmentMapData(data, observe)
  });

  useEffect(() => {
    // NOTE: I tried this with effect()
    // But that caused the render to happen 3 times more, I don't know why.
    // I only solved it by using useEffect()

    if (fragmentObserver.count !== changedData.count) {
      const dataToUpdate = changedData.data || data;
      let newData;

      for (const key of fragmentObserver.list) {
        const index = observeIndex.get(key);
        if (index === undefined || !dataToUpdate?.[index]) {
          continue;
        }

        const fragmentData = loadFragment(key);
        if (!fragmentData) {
          continue;
        }

        if (!newData) {
          newData = dataToUpdate.slice(0);
        }

        newData[index] = {
          ...newData[index],
          ...fragmentData,
        };
      }

      if (newData) {
        setChangedData({
          ...changedData,
          count: fragmentObserver.count,
          data: newData,
        });
      } else {
        setChangedData({
          ...changedData,
          count: fragmentObserver.count,
        });
      }
    }
  }, [fragmentObserver.count]);

  useEffect(() => {
    if (changedData.lastObserveStr !== observeStr) {
      setChangedData({
        ...changedData,
        data: getReactiveFragmentMapData(data, observe),
        lastObserveStr: observeStr,
      });
    }
  }, [observeStr]);

  if (changedData.lastObserveStr !== observeStr) {
    return getReactiveFragmentMapData(data, observe);
  }

  return changedData.data || data;
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
  const { authToken, onCompleted, onError, openModalPopUp, variables, cacheMap, skip, eagerFragmentKeyMap } = options || {};
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
    unique: makeQueryHookId(),
    abortCtrl: null as AbortController | null,
    activeQueryKey: null as string | null,
    ownQueryObserverCount: 0,
    reconnectedAt: null as number | null,
    json: '',
    init: false
  });
  const trackedUpdateObservers = useCallback((args: UpdateDataObserverArgs) => {
    if (
      args.queryId &&
      args.queryId === tracker.current.activeQueryKey &&
      !args.forceRefetch &&
      !args.resetOnly
    ) {
      tracker.current.ownQueryObserverCount += 1;
    }

    updateObservers(args);
  }, [updateObservers]);

  // check if p.updatedCount is needed

  const [qryValues, setQryValues] = useState<GraphQLQueryValues>({
    data: null as any,
    variables,
    loading: false,
    error: null as ServerErrorObj | null,
    lastUpdatedCount: 0,
    lastRefreshTriggerTime: '',
  });
  const qryValuesVariablesKey = makeVariablesKey(qryValues.variables);

  const { updatedCount, forceRefetch, resetOnlyTime, qryReset: { triggerTime, refreshTime } } = useWatchQuery(
    query,
    variablesKey,
    qryValues.lastUpdatedCount,
    qryValues.loading
  );

  const [queryOutput, setQueryOutput] = useState({ queryKey, refreshTime, data: null });

  // Query function for the client
  // NOTE: useQuery() assumes {query} and {options} will *never* change, except for {options.variables}

  const doQuery = async (queryVariables?: any, triedCount: number = 0) => {
    const qryVariables = queryVariables || variables;
    const qryVariablesKey = makeVariablesKey(qryVariables);
    const qryQueryKey = `#${queryName}:${qryVariablesKey}`;
    const pendingQuery = QRY_PROMISES.get(qryQueryKey);

    if (pendingQuery) {
      setQryValues((currentValues: GraphQLQueryValues) => ({
        ...currentValues,
        loading: true,
      }));

      return pendingQuery.then((apiResult) => {
        if (apiResult?.aborted) {
          return apiResult;
        }

        const cachedResult = fetchCachedData(query, qryVariablesKey);
        const data = cachedResult || getQueryDataFromAPIResult(queryName, apiResult);

        setQryValues((currentValues: GraphQLQueryValues) => ({
          ...currentValues,
          variables: qryVariables,
          data: data || currentValues.data,
          loading: false,
          error: apiResult?.error || null,
        }));

        return apiResult;
      });
    }

    const currentHookId = QRY_TRACKER.get(qryQueryKey);
    if (!currentHookId) {
      QRY_TRACKER.set(qryQueryKey, tracker.current.unique);
    } else if (currentHookId) {
      // This query is being fetched already, so do nothing
      // This can happen in 2 ways;
      // 1. This hook is used to doQuery() while doQuery() is alerady in progress (loading)
      // 2. useWatchQuery() caused 2 hooks with same query to be called at once
      return { loading: true, skipped: true };
    }

    if (tracker.current.abortCtrl && qryValues.loading) {
      // doLog(query, 'Query component [$0] is being aborted before being refetched.');
      // console.log('ABORT:', queryKey, tracker.current.unique);
      tracker.current.abortCtrl.abort({
        name: 'AbortError',
        message: `Hook for ${qryQueryKey} has aborted because the [query refetched before the previous one ended].`
      });
    }

    tracker.current.abortCtrl = new AbortController();
    tracker.current.activeQueryKey = qryQueryKey;
    tracker.current.ownQueryObserverCount = 0;

    setQryValues((currentValues: GraphQLQueryValues) => ({
      ...currentValues,
      loading: true,
    }));

    const retryCount = options?.retryCount || 0;
    const retryDelay = getRetryDelay(triedCount);
    // const qryName = query.definitions?.[0]?.name?.value;

    // doLog(query, 'Query component [$0] is being refetched.');

    const queryPromise = graphqlRequest(
      query,
      qryVariables,
      {
        authToken: authToken || undefined,
        openModalPopUp: retryCount >= triedCount ? openModalPopUp : null,
        cacheMap,
        onCompleted: (data: any | null, error: ServerErrorObj | null) => {
          if (data.data) {
            const ownQueryObserverCount = tracker.current.ownQueryObserverCount;
            tracker.current.ownQueryObserverCount = 0;

            setQryValues((currentValues: GraphQLQueryValues) => ({
              ...currentValues,
              variables: qryVariables,
              data: data.data,
              loading: false,
              error,
              lastUpdatedCount: ownQueryObserverCount
                ? Math.max(currentValues.lastUpdatedCount, updatedCount + ownQueryObserverCount)
                : currentValues.lastUpdatedCount,
              lastRefreshTriggerTime: triggerTime || currentValues.lastRefreshTriggerTime,
            }));

            if (onCompleted) {
              onCompleted(data.data, error, qryVariables);
            }

            removeStaleCache();
            tracker.current.reconnectedAt = Date.now();
          }

          tracker.current.activeQueryKey = null;
          unsetQueryTracker(qryQueryKey, tracker.current.unique);
        },
        onError: (error: ServerErrorObj | null) => {
          tracker.current.activeQueryKey = null;
          tracker.current.ownQueryObserverCount = 0;

          setQryValues((currentValues: GraphQLQueryValues) => ({
            ...currentValues,
            variables: qryVariables,
            loading: retryCount > triedCount,
            error,
          }));

          if (onError && retryCount <= triedCount) {
            onError(error, qryVariables);
          }

          unsetQueryTracker(qryQueryKey, tracker.current.unique);
        },
      },
      tracker.current.abortCtrl.signal,
      trackedUpdateObservers
    );
    QRY_PROMISES.set(qryQueryKey, queryPromise);

    let apiResult;
    try {
      apiResult = await queryPromise;
    } finally {
      if (QRY_PROMISES.get(qryQueryKey) === queryPromise) {
        QRY_PROMISES.delete(qryQueryKey);
      }
    }

    if (apiResult.aborted) {
      tracker.current.activeQueryKey = null;
      tracker.current.ownQueryObserverCount = 0;
      unsetQueryTracker(qryQueryKey, tracker.current.unique);
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
        variablesKey !== qryValuesVariablesKey ||
        (!qryValues.error && !checkDataCompleteness(qryValues.data, query))
      )
    ) {
      const currentDataMatchesVariables = variablesKey === qryValuesVariablesKey &&
        checkDataCompleteness(qryValues.data, query);
      const canAcknowledgeCurrentData = currentDataMatchesVariables &&
        !forceRefetch &&
        !resetOnlyTime &&
        !triggerTime;

      if (canAcknowledgeCurrentData) {
        setQryValues((currentValues: GraphQLQueryValues) => ({
          ...currentValues,
          variables,
          lastUpdatedCount: updatedCount || 0,
        }));
        return;
      }

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
          // doLog(query, 'forceRefetchhing query at: $0|' + variablesKey + skip + updatedCount);
          doQuery();
          // isTest && console.log('FORCE REFETCH AT:', query.definitions[0].name.value);
          // console.log('::', variablesKey, skip, updatedCount);
        }

      } else if (!qryValues.loading) {
        // isTest && console.log(query, '>>>>> $0|' + variablesKey + skip + updatedCount + '|');
        // doLog(query, '!qryValues.loading, doing query at: $0|' + variablesKey + skip + updatedCount);
        // doLog(query, '1: ' + (triggerTime && triggerTime !== qryValues.lastRefreshTriggerTime));
        // doLog(query, '2: ' + (updatedCount !== qryValues.lastUpdatedCount));
        // doLog(query, '3: ' + (variablesKey !== qryValuesVariablesKey));
        // doLog(query, '4: ' + (!qryValues.error && !checkDataCompleteness(qryValues.data, query)));
        // doLog(query, 'variablesKey 1: ' + variablesKey);
        // doLog(query, 'variablesKey 2: ' + qryValuesVariablesKey);

        doQuery();
      }
    }
  }, [variablesKey, qryValuesVariablesKey, qryValues.loading, skip, updatedCount, triggerTime]);

  // Refetch when the app reconnects and has no data

  const withoutData = qryValues.data === null;
  const reconnectedWithoutData = !skip && !qryValues.error && withoutData && !qryValues.loading && connectedToServer;

  useEffect(() => {
    if (connectedToServer && screenIsFocused && !skip && !qryValues.error) {
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

  const qryValuesMatchVariables = variablesKey === qryValuesVariablesKey;
  const queryData = loadDataFromCache(
    qryValuesMatchVariables ? qryValues.data : null,
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
  }, [queryKey, refreshTime, queryData[queryName]]);

  return {
    ...qryValues,
    queryName,
    queryKey: queryOutput.queryKey,
    data: queryOutput.data || queryData,
    refreshTime: queryOutput.refreshTime,
    resetOnlyTime,
    variablesKey,
    refetch,
    fetchMore,
    updatedCount,
    updateObservers,
    connectedToServer,
    screenIsFocused,
  };
}

/**
 * Helper: For development purposes; do not remove.
 */

// function getQueryName(query: any) {
//   return query.definitions.filter((d: any) => d.kind === 'OperationDefinition').map(d => d.name.value).join(', ');
// }

// function doLog(query: any, logStr: string) {
//   const queryName = getQueryName(query);
//   if (queryName === 'dataTableRowsForSheetRegions') {
//     console.log(logStr.replace(/\$0/gi, queryName));
//   }
// }
