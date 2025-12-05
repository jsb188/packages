import z from 'zod';
import type { OrganizationOperationEnum } from '../types/organization';
import type { ReportsFilterArgs } from '../types/report';
import { convertDigitToProductType } from './productsQueryParam';
import { REPORT_TYPES } from '../constants/report';

/**
 * Zod schema for query params to filter
 */

export const ReportsFilterSchema = z.object({
  preset: z.string()
    .optional()
    .nullable(),
  reportType: z.enum(REPORT_TYPES as [string]),
  query: z.string()
    .nullable(),
});

/**
 * Create a filter object for reports() query from the URL search query.
 * @param operationType - The organization operation type
 * @param searchQuery - The search query string from the URL
 * @param otherFiltersObj - Additional filter properties to merge into the result
 * @returns ReportsFilterArgs - The filter object to be used in the productsList() query
 */

export function createReportsFilterFromURL(
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
    reportType: convertDigitToProductType(urlParams.get('t'))!,
    // startDate,
    // endDate,
    // timeZone: indexToTimeZone(urlParams.get('z')),
    query: urlParams.get('q') || '',
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
  // const operation = urlParams.get('o');
  const reportType = urlParams.get('t');
  // const accountId = urlParams.get('a');
  // const startDate = urlParams.get('sd');
  // const endDate = urlParams.get('ed');
  // const timeZone = urlParams.get('z');
  const query = urlParams.get('q');

  return (
    // operation is allowed to pass through
    // !!filter.operation === !!operation &&
    !!filter.reportType === !!reportType &&
    // !!filter.accountId === !!accountId &&
    // !!filter.startDate === !!startDate &&
    // !!filter.endDate === !!endDate &&
    // !!filter.timeZone === !!timeZone &&
    !!filter.query === !!query
  );
}
