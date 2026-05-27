import type {
	EMAIL_STATUS_ENUMS,
	INBOUND_EMAIL_BODY_FORMAT_ENUMS,
	INBOUND_EMAIL_SORT_ENUMS,
} from '../constants/email.ts';

/**
 * Email handling lifecycle status.
 */
export type EmailStatusEnum = typeof EMAIL_STATUS_ENUMS[number];

/**
 * Inbound email list sort.
 */
export type InboundEmailsSortEnum = typeof INBOUND_EMAIL_SORT_ENUMS[number];

/**
 * Inbound email display body source.
 */
export type InboundEmailBodyFormatEnum = typeof INBOUND_EMAIL_BODY_FORMAT_ENUMS[number];

/**
 * Safe attachment metadata from one inbound email payload.
 */
export interface InboundEmailAttachmentGQL {
	name: string | null;
	contentType: string | null;
	contentLength: number | null;
}

/**
 * Saved inbound email database row.
 */
export interface InboundEmailData {
	__table?: 'emails';
	id: bigint;
	organizationId: bigint;
	recipientEmail: string;
	senderEmail: string | null;
	subject: string | null;
	postmarkMessageId: string | null;
	payload: Record<string, any>;
	status: EmailStatusEnum;
	statusSummary: string | null;
	processingStartedAt: Date | null;
	processingCompletedAt: Date | null;
	receivedAt: Date;
}

/**
 * GraphQL inbound email record.
 */
export interface InboundEmailGQL {
	__deleted?: boolean;
	id: string;
	cursor: string;
	organizationId: string;
	recipientEmail: string;
	senderEmail: string | null;
	subject: string | null;
	postmarkMessageId: string | null;
	status: EmailStatusEnum;
	statusSummary: string | null;
	previewText: string;
	bodyFormat: InboundEmailBodyFormatEnum | null;
	bodyText: string;
	attachments: InboundEmailAttachmentGQL[];
	receivedAt: string;
	processingStartedAt: string | null;
	processingCompletedAt: string | null;
}
