import { getENVVariable } from '@jsb188/app';
import { getAuthToken } from '@jsb188/app/utils/api.ts';

type CellSaveBeaconParams = {
	cells: any[];
	organizationId: string | number | bigint | null;
	targetId: string | number | bigint | null;
	targetType: 'dataTable' | 'sheet';
};

/**
 * Return the REST server URL by deriving it from the configured GraphQL server URL.
 */

function getCellSaveRESTServer() {
	const gqlServer = String(getENVVariable('GQL_SERVER') || '');
	return gqlServer.replace(/\/graphql\/?$/, '');
}

/**
 * Return the REST endpoint path for the target cell save resource.
 */

function getCellSaveRESTPath(params: Pick<CellSaveBeaconParams, 'targetId' | 'targetType'>) {
	if (params.targetType === 'sheet') {
		return `/api/sheets/${params.targetId}/cells`;
	}

	return `/api/data-tables/${params.targetId}/cells`;
}

/**
 * Convert bigint values to strings so JSON.stringify can serialize beacon payloads.
 */

function stringifyCellSaveBeaconBody(body: Record<string, any>) {
	return JSON.stringify(body, (_key, value) => typeof value === 'bigint' ? String(value) : value);
}

/**
 * Send one batch of pending cell saves with navigator.sendBeacon.
 */

export function sendCellSaveBeacon(params: CellSaveBeaconParams) {
	if (
		typeof navigator === 'undefined' ||
		typeof navigator.sendBeacon !== 'function' ||
		!params.organizationId ||
		!params.targetId ||
		!params.cells.length
	) {
		return false;
	}

	const body = {
		apiKey: getENVVariable('GQL_API_KEY') || '',
		authorization: getAuthToken() || '',
		organizationId: params.organizationId,
		cells: params.cells,
	};
	const blob = new Blob([stringifyCellSaveBeaconBody(body)], {
		type: 'text/plain;charset=UTF-8',
	});
	const url = getCellSaveRESTServer() + getCellSaveRESTPath(params);

	return navigator.sendBeacon(url, blob);
}
