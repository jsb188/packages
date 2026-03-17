import { makeVariablesKey } from '@jsb188/app/utils/logic.ts';
import {
	clearGraphQLClientCache,
	loadDataFromCache,
	loadFragment,
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
 * Create a minimal GraphQL operation document for cache tests.
 */

function makeQuery(queryName: string, selections: any[]) {
	return {
		definitions: [{
			kind: 'OperationDefinition',
			selectionSet: {
				selections: [{
					name: { value: queryName },
					selectionSet: { selections },
				}],
			},
		}],
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
