import z from 'zod';

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
