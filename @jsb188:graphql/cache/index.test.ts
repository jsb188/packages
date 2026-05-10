import { makeVariablesKey } from '@jsb188/app/utils/logic.ts';
import {
	clearGraphQLClientCache,
	fetchCachedData,
	loadDataFromCache,
	loadFragment,
	resetQuery,
	setDataToCache,
} from './index.ts';

/**
 * Create a GraphQL field selection node for cache tests.
 */

function makeField(name: string, selections?: any[]) {
	return {
		kind: 'Field',
		name: { value: name },
		...(selections ? {
			selectionSet: { selections },
		} : {}),
	};
}

/**
 * Create a GraphQL fragment spread node for cache tests.
 */

function makeFragmentSpread(name: string) {
	return {
		kind: 'FragmentSpread',
		name: { value: name },
	};
}

/**
 * Create a GraphQL inline fragment node for cache tests.
 */

function makeInlineFragment(typeName: string, selections: any[]) {
	return {
		kind: 'InlineFragment',
		typeCondition: {
			name: { value: typeName },
		},
		selectionSet: { selections },
	};
}

/**
 * Create a GraphQL fragment definition node for cache tests.
 */

function makeFragmentDefinition(name: string, selections: any[]) {
	return {
		kind: 'FragmentDefinition',
		name: { value: name },
		selectionSet: { selections },
	};
}

/**
 * Create a minimal GraphQL operation document for cache tests.
 */

function makeQuery(queryName: string, selections: any[], extraDefinitions: any[] = []) {
	return {
		definitions: [{
			kind: 'OperationDefinition',
			selectionSet: {
				selections: [{
					kind: 'Field',
					name: { value: queryName },
					selectionSet: { selections },
				}],
			},
		}, ...extraDefinitions],
	};
}

/**
 * Normalize nested values into a stable structure for comparisons.
 */

function normalizeValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(normalizeValue);
	}

	if (value && typeof value === 'object') {
		return Object.keys(value as Record<string, unknown>)
			.sort()
			.reduce((acc, key) => {
				acc[key] = normalizeValue((value as Record<string, unknown>)[key]);
				return acc;
			}, {} as Record<string, unknown>);
	}

	return value;
}

/**
 * Assert that two values are deeply equal.
 */

function assertDeepEqual(actual: unknown, expected: unknown, label: string) {
	const actualJson = JSON.stringify(normalizeValue(actual));
	const expectedJson = JSON.stringify(normalizeValue(expected));

	if (actualJson !== expectedJson) {
		throw new Error(
			`${label}\nExpected: ${expectedJson}\nActual: ${actualJson}`,
		);
	}
}

/**
 * Reset the shared cache state before each test run.
 */

function resetCacheState() {
	clearGraphQLClientCache();
}

Deno.test('loadFragment rebuilds nested list items without inner fragments', () => {
	resetCacheState();

	const gqlQuery = makeQuery('report', [
		makeFragmentSpread('reportFragment'),
		makeField('sections', [
			makeField('id'),
			makeField('title'),
		]),
	]);

	const requestData = {
		report: {
			id: 'report-1',
			title: 'Daily Report',
			sections: [{
				id: 'section-1',
				title: 'Overview',
			}, {
				id: 'section-2',
				title: 'Tasks',
			}],
		},
	};

	setDataToCache(requestData, gqlQuery);

	const cachedFragment = loadFragment('$reportFragment:report-1');

	assertDeepEqual(cachedFragment, requestData.report, 'fragment cache should rebuild plain nested list items');
});

Deno.test('loadDataFromCache preserves mixed list items with fragment refs and inline fields', () => {
	resetCacheState();

	const gqlQuery = makeQuery('report', [
		makeFragmentSpread('reportFragment'),
		makeField('sections', [
			makeFragmentSpread('reportSectionFragment'),
			makeField('files', [
				makeField('uri'),
			]),
		]),
	]);

	const requestData = {
		report: {
			id: 'report-2',
			title: 'Inspection',
			sections: [{
				id: 'section-a',
				title: 'Photos',
				files: [{
					uri: '/files/a.jpg',
				}],
			}],
		},
	};

	setDataToCache(requestData, gqlQuery);

	const cachedData = loadDataFromCache(
		{},
		gqlQuery,
		makeVariablesKey(undefined),
	);

	assertDeepEqual(cachedData, requestData, 'query cache should rebuild mixed list items from fragment and inline cache data');
});

Deno.test('fetchCachedData rejects cached query data missing newly selected nested fields', () => {
	resetCacheState();

	const oldQuery = makeQuery('myOrganizations', [
		makeField('id'),
		makeField('organization', [
			makeField('id'),
			makeField('name'),
		]),
	]);
	const newQuery = makeQuery('myOrganizations', [
		makeField('id'),
		makeField('organization', [
			makeField('id'),
			makeField('name'),
			makeField('integrations', [
				makeField('id'),
				makeField('provider'),
			]),
		]),
	]);
	const requestData = {
		myOrganizations: [{
			id: 'rel-1',
			organization: {
				id: 'org-1',
				name: 'Marketday',
			},
		}],
	};

	setDataToCache(requestData, oldQuery);

	const cachedData = fetchCachedData(
		newQuery,
		makeVariablesKey(undefined),
		() => {},
	);

	assertDeepEqual(cachedData, null, 'cached query data should be invalidated when the current query asks for missing fields');
});

Deno.test('fetchCachedData ignores nonmatching inline fragments for union data', () => {
	resetCacheState();

	const gqlQuery = makeQuery('logEntries', [
		makeField('id'),
		makeField('details', [
			makeInlineFragment('LogArable', [
				makeFragmentSpread('logArableFragment'),
			]),
			makeInlineFragment('LogLivestock', [
				makeFragmentSpread('logLivestockFragment'),
			]),
		]),
	], [
		makeFragmentDefinition('logArableFragment', [
			makeField('__typename'),
			makeField('id'),
			makeField('activity'),
		]),
		makeFragmentDefinition('logLivestockFragment', [
			makeField('__typename'),
			makeField('id'),
			makeField('livestock'),
		]),
	]);
	const requestData = {
		logEntries: [{
			id: 'log-1',
			details: {
				__typename: 'LogArable',
				id: 'log-1',
				activity: 'SEEDING',
			},
		}],
	};

	setDataToCache(requestData, gqlQuery);

	const cachedData = fetchCachedData(
		gqlQuery,
		makeVariablesKey(undefined),
		() => {},
	);

	assertDeepEqual(cachedData, requestData, 'cached union data should only require fields for the matching inline fragment type');
});

Deno.test('resetQuery reset-only clears matching query cache and notifies observers without force refetch', () => {
	resetCacheState();

	const gqlQuery = makeQuery('logEntries', [
		makeField('id'),
		makeField('status'),
	]);
	const variablesKey = makeVariablesKey({
		organizationId: 'org-1',
	});
	const requestData = {
		logEntries: [{
			id: 'log-1',
			status: 'COMPLETED',
		}],
	};
	const observerArgs: any[] = [];

	setDataToCache(requestData, gqlQuery, variablesKey);
	resetQuery('#logEntries:', false, (args) => {
		observerArgs.push(args);
	}, true);

	const cachedData = fetchCachedData(
		gqlQuery,
		variablesKey,
		() => {},
	);

	assertDeepEqual(observerArgs, [{
		queryId: '#logEntries:',
		forceRefetch: false,
		resetOnly: true,
	}], 'reset-only should notify mounted query observers without force refetch');
	assertDeepEqual(cachedData, null, 'reset-only should remove matching cached query data');
});
