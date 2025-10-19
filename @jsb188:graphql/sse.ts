import { addFragmentToCache, updateFragment, updateQuery } from './cache/';
import type { UpdateObserversFn } from './types.d';

/**
 * Types
 */

type ValidSSEType = (
  // Default SSE events
  'CONNECTED' |
  // Query handlers
  'QUERY_APPEND' | 'QUERY_PREPEND' |
  // Fragment handlers
  'DATA_APPEND' | 'DATA_PREPEND' | 'DATA_UPDATE'
);

export interface PublishPayload {
	__type: ValidSSEType;
	fragmentKey: string;
	fragmentNamespace?: string;
  dataFragmentKey?: string;
	data: Record<string, any>;
  otherData?: Record<string, any>;
}

/**
 * Append or prepend data to a query
 */

function handleQueryConcat(payload: PublishPayload, updateObservers?: UpdateObserversFn) {

  const { __type, fragmentKey, fragmentNamespace, dataFragmentKey, data, otherData } = payload;

  if (fragmentKey && fragmentNamespace && dataFragmentKey && data) {
    const isAppend = __type === 'QUERY_APPEND';
    const updateData = (currentData: any) => {
      const currentList = currentData?.[fragmentNamespace]?.data;
      if (
        currentData?.[fragmentNamespace]?.__list &&
        Array.isArray(currentList) &&
        !currentList.find(a => a[0] === dataFragmentKey)
      ) {
        addFragmentToCache(dataFragmentKey, data);
        const updatedList = isAppend ? [...currentList, [dataFragmentKey]] : [[dataFragmentKey], ...currentList];

        // console.log('UPDATED !!!!')
        // console.log('UPDATED !!!!')
        // console.log('UPDATED !!!!')
        // console.log('UPDATED !!!!')
        // console.log(fragmentNamespace, {
        //   ...currentData?.[fragmentNamespace],
        //   data: updatedList
        // });

        return {
          ...currentData,
          ...otherData,
          [fragmentNamespace]: {
            ...currentData?.[fragmentNamespace],
            data: updatedList
          }
        };
      }
      return currentData;
    }

    updateQuery(
      fragmentKey,
      updateData,
      false,
      updateObservers
    );
  }

  return null;
}

/**
 * Append or prepend data to a fragment
 */

function handleFragmentConcat(payload: PublishPayload, updateObservers?: UpdateObserversFn) {
  const { __type, fragmentKey, fragmentNamespace, data, otherData } = payload;
  const isAppend = __type === 'DATA_APPEND';

  if (fragmentKey && fragmentNamespace && data) {
    const namespaceType = typeof fragmentNamespace;
    const updateData = (currentData: any) => {
      if (typeof currentData[fragmentNamespace] === namespaceType) {
        let nextValue;
        if (namespaceType === 'string') {
          nextValue = isAppend ? `${currentData[fragmentNamespace]}${data}` : `${data}${currentData[fragmentNamespace]}`;
        } else if (Array.isArray(currentData[fragmentNamespace])) {
          nextValue = isAppend ? [...currentData[fragmentNamespace], data] : [data, ...currentData[fragmentNamespace]];
        }
        return {
          ...currentData,
          ...otherData,
          [fragmentNamespace]: nextValue
        }
      }
      return currentData;
    };

    updateFragment(fragmentKey, updateData, null, false, updateObservers);
  }

}

/**
 * Update data in a fragment
 */

function handleFragmentUpdate(payload: PublishPayload, updateObservers?: UpdateObserversFn) {
  const { fragmentKey, dataFragmentKey, data } = payload;
  updateFragment(dataFragmentKey || fragmentKey, data, null, false, updateObservers);
}

/**
 * Data handler for SSE
 */

function handleSSEData(payload: PublishPayload, updateObservers?: UpdateObserversFn) {

  switch (payload.__type) {
    case 'CONNECTED':
      // Do nothing
      break;
    case 'QUERY_APPEND':
    case 'QUERY_PREPEND':
      return handleQueryConcat(payload, updateObservers)
    case 'DATA_APPEND':
    case 'DATA_PREPEND':
      return handleFragmentConcat(payload, updateObservers)
    case 'DATA_UPDATE':
      return handleFragmentUpdate(payload, updateObservers)
    default:
      console.log('Unknown {__type} in handleSSEData():', payload.__type);
      break;
  }
}

export default handleSSEData;
