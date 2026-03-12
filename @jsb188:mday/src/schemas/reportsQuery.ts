import z from 'zod';
import type { OrganizationOperationEnum } from '../types/organization.d.ts';
import type { ReportsFilterArgs } from '../types/report.d.ts';

/**
 * Zod schema for query params to filter
 */

export const ReportsFilterSchema = z.object({
  preset: z.string()
    .optional()
    .nullable(),
  reportGroupId: z.string()
    .optional()
    .nullable(),
  startPeriod: z.string()
    .optional()
    .nullable(),
  endPeriod: z.string()
    .optional()
    .nullable(),
});

/**
 * Create a filter object for reports() query from the URL search query.
 * @param operationType - The organization operation type
 * @param searchQuery - The search query string from the URL
 * @param otherFiltersObj - Additional filter properties to merge into the result
 * @returns ReportsFilterArgs - The filter object to be used in the productsList() query
 */

export function getReportsFilterFromURL(
  _operationType: OrganizationOperationEnum | null,
  searchQuery: string,
  otherFiltersObj?: {
    withoutPreset?: Partial<ReportsFilterArgs>,
    withPreset?: Partial<ReportsFilterArgs>
  }
) {
  if (!searchQuery && otherFiltersObj?.withPreset) {
    return otherFiltersObj.withPreset;
  } else if (searchQuery === '?preset=none' && otherFiltersObj?.withoutPreset) {
    return otherFiltersObj.withoutPreset;
  }

  const urlParams = new URLSearchParams(searchQuery);

  // let startDate = urlParams.get('sd');
  // let endDate = urlParams.get('ed');
  // if (startDate && !endDate) {
  // 	endDate = startDate;
  // } else if (endDate && !startDate) {
  // 	startDate = endDate;
  // }

  const filter: ReportsFilterArgs = {
    reportGroupId: urlParams.get('t') || '',
    startPeriod: urlParams.get('sd') || urlParams.get('p') || '',
    endPeriod: urlParams.get('ed') || urlParams.get('p') || '',
    ...otherFiltersObj?.withoutPreset,
  };

  const validation = ReportsFilterSchema.safeParse(filter);

  // console.log(otherFiltersObj);
  // console.log('filter', filter);
  // console.log('validation', validation);

  if (!validation.success) {
    // console.log('validation error', validation.error);
    // Return null and force the client to go to a valid page
    return null;
  }

  return filter;
}

/**
 * Test if URL search query is valid against actual filter object
 */

export function reportsSearchQueryIsValid(
  searchQuery: string,
  filter: ReportsFilterArgs | null
) {
  if (!filter) {
    return !searchQuery; // If no filter, searchQuery must be empty to be valid
  } else if (!searchQuery || searchQuery === '?preset=none') {
    return true; // If no searchQuery, any filter is valid
  }

  const urlParams = new URLSearchParams(searchQuery);
  const reportGroupId = urlParams.get('t');
  const startPeriod = urlParams.get('sd') || urlParams.get('p');
  const endPeriod = urlParams.get('ed') || urlParams.get('p');

  return (
    !!filter.reportGroupId === !!reportGroupId &&
    !!filter.startPeriod === !!startPeriod &&
    !!filter.endPeriod === !!endPeriod
  );
}
