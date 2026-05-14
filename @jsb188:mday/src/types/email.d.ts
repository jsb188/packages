import type { EMAIL_STATUS_ENUMS } from '../constants/email.ts';

/**
 * Email handling lifecycle status.
 */
export type EmailStatusEnum = typeof EMAIL_STATUS_ENUMS[number];
