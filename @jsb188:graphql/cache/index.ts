import { cloneArrayLike, mapArrayLikeObjects } from '@jsb188/app/utils/object';
import { makeVariablesKey } from '@jsb188/app/utils/logic';
import type { UpdateObserversFn } from '../types.d';
import { PARTIALS_MAP, RULES } from './config';

const DO_LOG = [
  false, // [0] Log name
  false, // [1] Log data
];

const QUERIES = new Map();
const FRAGMENTS = new Map();

/**
 * JS Map will sometimes convert nested Array into Array-like Object
 * ie. "{"0": "a", "1": "b"}" etc
 * This will convert Array-like back to Array
 *
 * NOTE: There's a known vulnerability here that sometimes the developer may
 * actually design a Array-like schema; but I don't see a need for that right now.
 */

function enforceArrayType(obj: any): any {
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(enforceArrayType);
    }

    const keys = Object.keys(obj);
    if (keys.every((key, i) => key === i.toString())) {
      return keys.map((key) => obj[key]);
    }

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && typeof obj[key] === 'object') {
        obj[key] = enforceArrayType(obj[key]);
      }
    }
  }
  return obj;
}

/**
 * Merge nested objects together
 */

export function mergeNestedObjects(obj1: any, obj2: any) {
  if (!obj1) {
    return { ...obj2 };
  }

  const newObj = { ...obj1 };
  for (const key in obj2) {
    if (Object.prototype.hasOwnProperty.call(obj2, key)) {
      if (typeof obj2[key] === 'object' && obj2[key] !== null) {
        newObj[key] = mergeNestedObjects(obj1[key], obj2[key]);
      } else {
        newObj[key] = obj2[key];
      }
    }
  }

  return newObj;
}

/**
 * Make Object for fragment, omitting what you don't need
 */

function extractFragment(dataObj: any, innerSelection: any[]) {
  if (innerSelection.length <= 1) {
    return dataObj;
  }

  const fragmentObj = { ...dataObj };
  for (const sel of innerSelection) {
    if (sel.kind === 'Field') {
      delete fragmentObj[sel.name.value];
    }
  }

  return fragmentObj;
}

/**
 * Load query cache
 */

export function loadQuery(queryKey: string, referencesOnly?: boolean) {
  const references = QUERIES.get(queryKey);

  // if (testMode) {
  //   console.log('references>>>>:', references);
  // }

  if (referencesOnly) {
    return references;
  } else if (!references) {
    // This is important, not returning null will cause infinite loop
    return null;
  }

  if (Array.isArray(references)) {
    const mappedCache = references.map((cacheObj) => appendFragmentToCache(cacheObj));
    if (mappedCache.some((c) => !c)) {
      return undefined;
    }

    // let hasInvalidatedCache = false;
    // const mappedCache = references.map((cacheObj) => {
    //   if (!hasInvalidatedCache) {
    //     const singleCache = appendFragmentToCache(cacheObj);

    //     if (singleCache) {
    //       return singleCache;
    //     } else {
    //       hasInvalidatedCache = true;
    //     }
    //   }
    // });
    // if (!hasInvalidatedCache) {
    //   return mappedCache;
    // }

    return mappedCache;
  } else if (references) {
    const singleCacheData = appendFragmentToCache(references);
    return singleCacheData;
  }
}

/**
 * Load fragment cache
 */

export function loadFragment(id: string) {
  // console.log('load fragment:', id, FRAGMENTS.get(id));

  const fragment = enforceArrayType(FRAGMENTS.get(id));
  if (!fragment) {
    return null;
  }

  const spreads = FRAGMENTS.get(`${id}.spreads`);
  if (!spreads) {
    return fragment;
  }

  let fragmentWithSpreads = { ...fragment };
  for (const key in spreads) {

    if (Object.prototype.hasOwnProperty.call(spreads, key)) {
      const spreadValue = spreads[key];

      let spreadData;
      if (typeof spreadValue === 'string') {
        spreadData = enforceArrayType(FRAGMENTS.get(spreadValue));
      } else if (Array.isArray(spreadValue)) {
        spreadData = spreadValue.reduce((acc, value) => {
          if (typeof value === 'string') {
            const fragmentData = enforceArrayType(FRAGMENTS.get(value));
            // console.log('1:', value, fragmentData);

            return {
              ...acc,
              ...fragmentData,
            };
          } else if (Array.isArray(value)) {
            const [namespace, innerValue] = value;
            // console.log('2:', namespace, value);

            return {
              ...acc,
              [namespace]: innerValue,
            };
          }

          return acc;
        }, {});
      }

      if (spreadData) {
        fragmentWithSpreads[key] = spreadData;
      }
    }
  }

  return fragmentWithSpreads;
}

/**
 * Map each inner selection under a graphql query object
 */

function mapSelections(data: any, innerSelections: any[], updatedKeys: string[] = []) {
  return innerSelections.map((inner) => {

    let fragmentKey;
    if (inner.kind === 'FragmentSpread') {
      // These are fragment spreads
      const frgName = inner.name.value;
      const frgMap = PARTIALS_MAP[frgName];
      fragmentKey = `$${frgMap || frgName}:${data.id || 'none'}`;

      if (DO_LOG[0]) {
        console.log('SETTING (1): ', fragmentKey);
      }
      if (DO_LOG[1]) {
        console.log('SETTING (1): ', extractFragment(data, innerSelections));
      }
    } else if (inner.kind === 'InlineFragment') {
      // This is Union, etc
      const frgNamesJoined = inner.selectionSet.selections.map((sel: any) => PARTIALS_MAP[sel.name.value] || sel.name.value).join('.');
      fragmentKey = `$${frgNamesJoined}:${data.id || 'none'}`;
    }

    if (fragmentKey) {
      // Whether fragment is partial or not, always merge data;
      // Because partials might have data that's not in the main fragment
      const currentData = loadFragment(fragmentKey);
      FRAGMENTS.set(fragmentKey, mergeNestedObjects(currentData, extractFragment(data, innerSelections)));
      updatedKeys.push(fragmentKey);

      return fragmentKey;
    }

    // These are non-fragment fields
    return [
      inner.name.value,
      data?.[inner.name.value]
    ];
    // return {
    //   name: inner.name.value,
    //   value: data[key]?.[inner.name.value]
    // };
  });
}

/**
 * Make cache object from data and selection object
 */

function makeCacheObject(data: any, selections: any[], variables?: any, cacheMap?: any) {
  const cacheObj: Record<string, any> = {};
  const updatedKeys: string[] = [];

  for (const sel of selections) {
    const key = sel.name.value;
    if (!data[key] && sel.kind !== 'FragmentSpread') {
      // console.log('~~~', key, sel.kind);
      continue;
    }

    // if (DO_LOG[2]) {
    //   console.log(sel);
    // }

    switch (sel.kind) {
      case 'Field':
        {
          const innerSelections = sel.selectionSet?.selections;
          if (innerSelections) {
            if (Array.isArray(data[key])) {
              cacheObj[key] = {
                __cache: true,
                __list: true,
                data: data[key].map((item) => mapSelections(item, innerSelections, updatedKeys)),
              };
            } else {
              cacheObj[key] = {
                __cache: true,
                data: mapSelections(data[key], innerSelections, updatedKeys),
              };
            }
          } else {
            cacheObj[key] = data[key];
          }
        }
        break;
      case 'FragmentSpread':
        {
          const frgName = sel.name.value;
          const frgMap = PARTIALS_MAP[frgName];
          const fragmentKey = `$${frgMap || frgName}:${data.id || 'none'}`;

          if (RULES[frgName] !== false) {
            if (DO_LOG[0]) {
              console.log('SETTING (2): ', fragmentKey);
            }
            if (DO_LOG[1]) {
              console.log('SETTING (2): ', extractFragment(data, selections));
            }

            // if (testMode) {
            //   console.log('Array.isArray(data)');
            //   console.log(Array.isArray(data));
            //   console.log(data);
            //   console.log(extractFragment(data, selections));
            // }

            // Whether fragment is partial or not, always merge data;
            // Because partials might have data that's not in the main fragment
            const currentData = loadFragment(fragmentKey);

            FRAGMENTS.set(fragmentKey, mergeNestedObjects(currentData, extractFragment(data, selections)));
            updatedKeys.push(fragmentKey);
          }

          cacheObj.__flat = {
            __cache: true,
            data: [fragmentKey],
          };
        }
        break;
      default:
    }

    // If there's a cache map, return a custom value
    // This will make the cache object NOT get set into the query cache
    // This means that cache IS handled but the values will be invalid
    // so cacheMap has to handle the cache object itself

    if (cacheMap?.[key]) {
      const customCacheData = cacheMap[key](data[key], cacheObj[key], sel, variables);
      cacheObj[key] = typeof customCacheData === 'undefined' ? null : customCacheData;
      continue;
    }
  }

  if (cacheObj.__flat?.data?.[0]) {
    const spreadsFragmentKey = `${cacheObj.__flat.data[0]}.spreads`;

    let spreads: Record<string, any> | undefined;
    for (const cKey in cacheObj) {
      if (
        cKey !== '__flat' &&
        Object.prototype.hasOwnProperty.call(cacheObj, cKey)
      ) {
        if (!spreads) {
          spreads = {};
        }

        // Spreads here

        if (cacheObj[cKey]?.data?.length === 1 && typeof cacheObj[cKey]?.data?.[0] === 'string') {
          // Single spread with single fragment
          spreads[cKey] = cacheObj[cKey].data[0];
        } else if (cacheObj[cKey].__list === true) {
          // List of spreads
          spreads[cKey] = {
            __list: true,
            data: cacheObj[cKey].data
          };
        } else if (Array.isArray(cacheObj[cKey]?.data)) {
          // Spread with more spreads inside
          spreads[cKey] = cacheObj[cKey].data;
        }
      }
    }

    if (spreads) {
      FRAGMENTS.set(spreadsFragmentKey, spreads);
    }
  }

  return [cacheObj, updatedKeys];
}

/**
 * Save query cache
 */

function saveQueryToMemory(
  requestData: any,
  selection: any,
  variables: any,
  variablesKey: string,
  cacheMap?: any,
  saveQueryToCache?: boolean,
  updateObservers?: UpdateObserversFn,
) {
  const qryName = selection.name.value;
  if (!requestData) {
    return;
  }

  // IMPORTANT NOTE:
  // Queries are never cached unless they are manually set in [./config.ts]

  const data = requestData[qryName];
  const queryId = `#${qryName}:${variablesKey}`;
  const selections = selection?.selectionSet?.selections;

  if (!selections) {
    return;
  }

  if (data) {
    // console.log('=====');
    // console.log(requestData);
    // console.log(queryId);
    // console.log(data);
    // console.log('=====');

    const cacheMapObj = typeof cacheMap === 'function' ? null : cacheMap;

    let cacheData;
    let updatedFragmentIds;
    if (Array.isArray(data)) {
      const result = data.map((dataObj) => makeCacheObject(dataObj, selections, variables, cacheMapObj));
      cacheData = result.map((r) => r[0]);
      updatedFragmentIds = result.reduce((acc, r) => acc.concat(r[1]), []);
    } else {
      [cacheData, updatedFragmentIds] = makeCacheObject(data, selections, variables, cacheMapObj);
    }

    // console.log(updatedFragmentIds);
    // console.log(cacheData);

    if (typeof cacheMap === 'function') {
      // cacheMap[key](data[key], cacheObj[key], sel, variables);
      if (saveQueryToCache) {
        const customCacheData = cacheMap(data, cacheData, selections, variables);
        // console.log('1--->', queryId);
        QUERIES.set(queryId, typeof customCacheData === 'undefined' ? null : customCacheData);

        if (updateObservers) {
          updateObservers({
            queryId
          });
        }
      }
    } else {
      if (saveQueryToCache) {
        // console.log('2--->', queryId);
        // console.log('2--->', cacheData);
        QUERIES.set(queryId, cacheData);
      }

      if (updateObservers) {
        updateObservers({
          queryId: saveQueryToCache ? queryId : null,
          fragmentIds: updatedFragmentIds as string[],
        });
      }

      // I don't think observer is needed for custom cache maps, but if it does, bring it up
      // FRAGMENT_OBSERVER.value = {
      //   count: FRAGMENT_OBSERVER.value.count + 1,
      //   list: updatedFragmentIds,
      // };
    }

    return updatedFragmentIds;
  }
}

/**
 * Recursively update fragments after a mutation/query
 */

/**
 * Save cache
 */

export function setDataToCache(
  requestData: any,
  gqlQuery: any,
  variables?: any,
  cacheMap?: any,
  updateObservers?: UpdateObserversFn,
) {
  // query[variablesKey] = cache;
  const definitions = gqlQuery.definitions;
  const variablesKey = makeVariablesKey(variables);

  for (const def of definitions) {
    if (def.kind === 'OperationDefinition') {
      def?.selectionSet?.selections.forEach((selection: any) => {
        const qryName = selection.name?.value;
        saveQueryToMemory(
          requestData,
          selection,
          variables,
          variablesKey,
          cacheMap,
          !!RULES[qryName],
          updateObservers
        );
      });
    }
  }
}

/**
 * Append fragment to cache
 */

export function appendFragmentToCache(cacheData: any, testMode?: boolean) {
  let newObj = cloneArrayLike(cacheData);

  // if (testMode) {
  //   console.log('appendFragmentToCache:', newObj);
  // }

  for (const key in newObj) {
    if (newObj[key] && typeof newObj[key] === 'object') {
      const isFlat = key === '__flat';
      const isCache = newObj[key].__cache && newObj[key].data;

      if (isCache) {

        let cachedObj = {};
        let cacheIsValid = true;

        if (newObj[key].__list) {

          cachedObj = newObj[key].data.map((di: any[]) => {

            let item = {};
            di.forEach((d) => {
              if (Array.isArray(d)) {
                item[d[0]] = d[1];
              } else if (typeof d === 'string') {
                const frgIndex = d.indexOf(':');
                const frgName = d.substring(1, frgIndex);
                const frgMap = PARTIALS_MAP[frgName];

                let fragmentKey;
                if (frgMap) {
                  fragmentKey = `$${frgMap}:${d.substring(frgIndex + 1)}`;
                } else {
                  fragmentKey = d;
                }

                const cachedFragment = loadFragment(fragmentKey);
                if (DO_LOG[0]) {
                  console.log('LOAD (1): ', d);
                }
                if (DO_LOG[1]) {
                  console.log('LOAD (1): ', cachedFragment);
                }

                if (cachedFragment) {
                  item = {
                    ...item,
                    ...cachedFragment,
                  };
                } else {
                  // Cache was invalidated
                  cacheIsValid = false;
                }
              }
            });

            return item;
          });
        } else {
          newObj[key].data.forEach((d: any) => {

            // if (testMode) {
            //   console.log('cachedObj', cachedObj);
            //   console.log('key', key);
            //   console.log('d', d);
            //   console.log('d', typeof d);
            // }

            if (Array.isArray(d)) {
              cachedObj[d[0]] = d[1];
            } else if (typeof d === 'string') {
              const frgIndex = d.indexOf(':');
              const frgName = d.substring(1, frgIndex);
              const frgMap = PARTIALS_MAP[frgName];

              let fragmentKey;
              if (frgMap) {
                fragmentKey = `$${frgMap}:${d.substring(frgIndex + 1)}`;
              } else {
                fragmentKey = d;
              }

              const cachedFragment = loadFragment(fragmentKey);
              if (DO_LOG[0]) {
                console.log('LOAD (2): ', d);
              }
              if (DO_LOG[1]) {
                console.log('LOAD (2): ', cachedFragment);
              }

              if (cachedFragment) {
                if (isFlat) {
                  newObj = {
                    ...newObj,
                    ...cachedFragment,
                  };
                  delete newObj.__flat;
                } else {
                  cachedObj = {
                    ...cachedObj,
                    ...cachedFragment,
                  };
                }
              } else {
                // Cache was invalidated
                cacheIsValid = false;
              }
            }
          });
        }

        if (!cacheIsValid) {
          return null;
        }

        if (!isFlat) {
          newObj[key] = cachedObj;
        }
      } else {

        // Fragment spreads recursively loads the fragment data
        // So we have to get the non-spread fields from query cache

        const cacheInfo = cacheData[key];
        if (newObj[key] && typeof newObj[key] === 'object' && cacheInfo?.__cache && cacheInfo.data) {
          cacheInfo.data.forEach((di: any) => {
            if (
              Array.isArray(di) &&
              di.length === 2 &&
              !di?.[0]?.startsWith('$')
            ) {
              newObj[key][di[0]] = di[1];
            }
          });
        }
      }
    }
  }

  return newObj;
}

/**
 * Get cache
 */

export function loadDataFromCache(
  requestData: any | null,
  gqlQuery: any,
  variablesKey: string,
  cacheMap?: any,
  eagerFragmentKeyMap?: any,
  testMode?: boolean,
) {
  // return query[variablesKey];
  const data = { ...requestData };
  const definitions = gqlQuery.definitions;

  for (const def of definitions) {
    if (def.kind === 'OperationDefinition') {
      def?.selectionSet?.selections.forEach((selection: any) => {
        const qryName = selection.name?.value;
        if (!data[qryName]) {
          const cacheKey = `#${qryName}:${variablesKey}`;
          const cachedData = loadQuery(cacheKey);

          if (cachedData) {
            data[qryName] = cachedData;
          }

          // const cacheData = QUERIES.get(cacheKey);

          // if (Array.isArray(cacheData)) {
          //   let hasInvalidatedCache = false;
          //   const mappedCache = cacheData.map((cacheObj, i) => {
          //     if (!hasInvalidatedCache) {
          //       const singleCache = appendFragmentToCache(cacheObj);

          //       if (singleCache) {
          //         return singleCache;
          //       } else {
          //         hasInvalidatedCache = true;
          //       }
          //     }
          //   });

          //   if (!hasInvalidatedCache) {
          //     data[qryName] = mappedCache;
          //   }
          // } else if (cacheData) {
          //   const singleCacheData = appendFragmentToCache(cacheData);

          //   if (singleCacheData) {
          //     data[qryName] = singleCacheData;
          //   }
          // }
        }

        // Set value to "true" because this is meant to be handled by a cacheMap and its standalone logic

        if (data[qryName]) {
          if (typeof cacheMap === 'function') {
            data[qryName] = true;
          } else if (cacheMap) {
            for (const key in cacheMap) {
              if (cacheMap?.[key] && data[qryName]?.[key] !== undefined) {
                data[qryName][key] = true;
              }
            }
          }
        } else if (eagerFragmentKeyMap?.[qryName]) {
          const fragmentKey = eagerFragmentKeyMap[qryName];
          const cachedFragment = loadFragment(fragmentKey);

          if (cachedFragment) {
            data[qryName] = cachedFragment;
          }
        }
      });
    }
  }

  return data;
}

/**
 * Check if request data is complete
 */

export function checkDataCompleteness(requestData: any, gqlQuery: any) {
  if (!requestData) {
    return false;
  }

  const definitions = gqlQuery.definitions;
  for (const def of definitions) {
    if (def.kind === 'OperationDefinition') {
      const selections = def?.selectionSet?.selections;
      for (const selection of selections) {
        const qryName = selection.name?.value;
        const value = requestData[qryName];
        if (!value && value !== false && value !== 0) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Invalidate stale cache
 */

export function removeStaleCache() {
  // function getByteSize(oMap){
  //   function replacer(key, value) {
  //     if(value instanceof Map) {
  //       return {
  //         dataType: 'Map',
  //         value: [...value],
  //       };
  //     } else {
  //       return value;
  //     }
  //   }
  //   return JSON.stringify(oMap, replacer).length;
  // }

  // console.log('  Queries cache size (count):', QUERIES.size);
  // console.log('  Queries cache size (bytes):', getByteSize(QUERIES));
  // console.log('Fragments cache size (count):', FRAGMENTS.size);
  // console.log('Fragments cache size (bytes):', getByteSize(FRAGMENTS));

  if (FRAGMENTS.size > RULES.__limit) {
    const keys = Array.from(FRAGMENTS.keys());
    const numToEvict = keys.length - RULES.__limit;

    if (numToEvict > 0) {
      const keysToEvict = keys.slice(0, numToEvict);

      for (const key of keysToEvict) {
        FRAGMENTS.delete(key);
        FRAGMENTS.delete(`${key}.spreads`);
      }
    }
  }
}

/**
 * Check if there is cache
 */

export function fetchCachedData(gqlQuery: any, variablesKey: string, updateObservers: UpdateObserversFn) {
  const definitions = gqlQuery.definitions;

  for (const def of definitions) {
    if (def.kind === 'OperationDefinition') {
      const selections = def?.selectionSet?.selections;
      for (const selection of selections) {
        const qryName = selection.name?.value;
        const queryId = `#${qryName}:${variablesKey}`;

        const cachedData = loadQuery(queryId);
        if (cachedData === null) {
          return null;
        }

        if (!cachedData) {
          QUERIES.delete(queryId);

          updateObservers({
            queryId
          });

          return null;
        }
        return { [qryName]: cachedData };
      }
    }
  }

  return null;
}

/**
 * Clear all cache
 */

export function clearGraphQLClientCache() {
  QUERIES.clear();
  FRAGMENTS.clear();
}

/**
 * Clear query cache
 */

export function resetQuery(queryId: string, forceRefetch?: boolean, updateObservers?: UpdateObserversFn) {
  // if (forceRefetch) {
  //   QUERIES.delete(queryId);
  // }

  if (updateObservers) {
    updateObservers({
      queryId,
      forceRefetch,
    });
  }
}

/**
 * Update cache
 */

export function updateFragment(
  updateFragmentKey: string,
  update: any | ((cache: any) => any),
  replaceId?: string | null,
  doNotTriggerObserver?: boolean,
  updateObservers?: UpdateObserversFn,
) {
  const cache = loadFragment(updateFragmentKey);

  if (cache && update) {
    let updateObj;
    if (typeof update === 'function') {
      updateObj = update(mapArrayLikeObjects(cache));
    } else {
      updateObj = update;
    }

    const updatedObj = { ...cache, ...updateObj };

    FRAGMENTS.set(updateFragmentKey, updatedObj);

    if (replaceId && replaceId !== updateFragmentKey) {
      FRAGMENTS.set(replaceId, updatedObj);
    }

    if (!doNotTriggerObserver && updateObservers) {
      updateObservers({
        fragmentIds: [updateFragmentKey],
      });

      // FRAGMENT_OBSERVER.value = {
      //   count: FRAGMENT_OBSERVER.value.count + 1,
      //   list: [updateFragmentKey],
      // };
    }
    return updateFragmentKey || null;
  }
  return null;
}

/**
 * Update query cache
 */

export function updateQuery(
  queryId: string,
  update: any | ((cache: any) => any),
  doNotTriggerObserver?: boolean,
  updateObservers?: UpdateObserversFn,
) {
  const cache = loadQuery(queryId, true);
  if (cache && update) {
    let updateObj;
    if (typeof update === 'function') {
      updateObj = update(mapArrayLikeObjects(cache));
    } else {
      updateObj = update;
    }

    const updatedObj = Array.isArray(updateObj) ? updateObj : { ...cache, ...updateObj };
    QUERIES.set(queryId, updatedObj);

    if (!doNotTriggerObserver && updateObservers) {
      updateObservers({
        queryId,
      });
    }
    return updateObj || null;
  }
  return null;
}

/**
 * Bulk update cache
 * NOTE: When you do updateFragment() twice, second call will override the first call;
 * This will make observer NOT work.
 */

export function triggerObserver(ids: (string | null)[], updateObservers?: UpdateObserversFn) {
  if (updateObservers) {
    const observerListIds = ids.filter((id) => id);
    if (observerListIds.length) {
      updateObservers({
        fragmentIds: observerListIds,
      });
    }
  } else {
    console.warn('trigerObserver() was called without updateObservers(); This does nothing.');
  }
}

/**
 * Add to cache (be careful because this should always sync with server somehow)
 */

export function addFragmentToCache(id: string, obj: any) {
  FRAGMENTS.set(id, obj);
}
