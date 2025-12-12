import { PRODUCT_TYPES } from '@jsb188/mday/constants/product';
import type { OrganizationOperationEnum } from '../types/organization.d';
import { z } from 'zod';
import type { ProductsFilterArgs, ProductTypeEnum } from '../types/product.d';

/**
 * Zod schema for query params to filter
 */

export const ProductsFilterSchema = z.object({
  preset: z.string()
    .optional()
    .nullable(),
	productType: z.enum(PRODUCT_TYPES as [string]),
	// startDate: z.string()
	// 	.refine((sd) => isValidCalDate(sd), { message: 'START_DATE_INVALID' })
	// 	.refine((sd) => !isFutureCalDate(sd, 1), { message: 'START_DATE_FUTURE_NOT_ALLOWED' })
	// 	.nullable(),
	// endDate: z.string()
	// 	.refine((ed) => isValidCalDate(ed), { message: 'END_DATE_INVALID' })
	// 	.nullable(),
	// timeZone: z.string()
	// 	.refine((tz) => isValidTimeZone(tz), { message: 'INVALID_TIMEZONE' })
	// 	.nullable(),
	query: z.string()
		.nullable(),
});
// }).refine((data) => {
// 	if (!data.endDate) {
// 		// No need to validate if endDate is not provided
// 		return true;
// 	} else if (!data.startDate) {
// 		// If endDate is provided, startDate is required
// 		return false;
// 	}
// 	// End date must be after or equal to start date
// 	return data.endDate >= data.startDate;
// }, {
// 	message: 'END_DATE_MUST_BE_AFTER_START_DATE',
// 	path: ['endDate'], // where to attach the error
// });

/**
 * Convert list of digits to product type enums
 * @param digit - Index digit string from URL param
 * @returns Array of product type enums or null
 */

export function convertDigitToProductType(digit?: string | null): ProductTypeEnum | null {
	if (!digit) {
		return null;
	}
  return PRODUCT_TYPES[Number(digit)] || null;
}

/**
 * Create a filter object for productsList() query from the URL search query.
 * @param operationType - The organization operation type
 * @param searchQuery - The search query string from the URL
 * @param otherFiltersObj - Additional filter properties to merge into the result
 * @returns ProductsFilterArgs - The filter object to be used in the productsList() query
 */

export function getProductsFilterFromURL(
  _operationType: OrganizationOperationEnum | null,
	searchQuery: string,
  otherFiltersObj?: {
    withoutPreset?: Partial<ProductsFilterArgs>,
    withPreset?: Partial<ProductsFilterArgs>
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

	const filter: ProductsFilterArgs = {
		productType: convertDigitToProductType(urlParams.get('t'))!,
		// startDate,
		// endDate,
		// timeZone: indexToTimeZone(urlParams.get('z')),
		query: urlParams.get('q') || '',
    ...otherFiltersObj?.withoutPreset,
	};

	const validation = ProductsFilterSchema.safeParse(filter);

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

export function productsSearchQueryIsValid(
  searchQuery: string,
  filter: ProductsFilterArgs | null
) {
  if (!filter) {
    return !searchQuery; // If no filter, searchQuery must be empty to be valid
  } else if (!searchQuery || searchQuery === '?preset=none') {
    return true; // If no searchQuery, any filter is valid
  }

  const urlParams = new URLSearchParams(searchQuery);
  // const operation = urlParams.get('o');
  const productType = urlParams.get('t');
  // const accountId = urlParams.get('a');
  // const startDate = urlParams.get('sd');
  // const endDate = urlParams.get('ed');
  // const timeZone = urlParams.get('z');
  const query = urlParams.get('q');

  return (
    // operation is allowed to pass through
    // !!filter.operation === !!operation &&
    !!filter.productType === !!productType &&
    // !!filter.accountId === !!accountId &&
    // !!filter.startDate === !!startDate &&
    // !!filter.endDate === !!endDate &&
    // !!filter.timeZone === !!timeZone &&
    !!filter.query === !!query
  );
}
