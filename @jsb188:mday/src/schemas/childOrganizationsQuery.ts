import type { ChildOrgsFilterArgs, OrganizationOperationEnum } from '../types/organization.d.ts';

/**
 * Create a filter object for productsList() query from the URL search query.
 * @param operationType - The organization operation type
 * @param searchQuery - The search query string from the URL
 * @param otherFiltersObj - Additional filter properties to merge into the result
 * @returns ProductsFilterArgs - The filter object to be used in the productsList() query
 */

export function getChildOrgsFilterFromURL(
  _operationType: OrganizationOperationEnum | null,
  searchQuery: string,
  otherFiltersObj?: {
    withoutPreset?: Partial<ChildOrgsFilterArgs>;
    withPreset?: Partial<ChildOrgsFilterArgs>;
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

  const filter: ChildOrgsFilterArgs = {
    // startDate,
    // endDate,
    // timeZone: indexToTimeZone(urlParams.get('z')),
    // query: urlParams.get('q') || '',
    ...otherFiltersObj?.withoutPreset,
  };

  return filter;
}
