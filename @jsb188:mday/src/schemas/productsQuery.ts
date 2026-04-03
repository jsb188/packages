import { PRODUCT_TYPES } from '@jsb188/mday/constants/product.ts';
import { z } from 'zod';
import type { ProductTypeEnum } from '../types/product.d.ts';

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
