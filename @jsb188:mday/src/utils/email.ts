import type { InboundEmailBodyFormatEnum } from '../types/email.d.ts';

type PostmarkAttachmentLike = {
	Name?: string | null;
	ContentType?: string | null;
	ContentLength?: number | null;
};

type PostmarkInboundPayloadLike = {
	TextBody?: string | null;
	StrippedTextReply?: string | null;
	HtmlBody?: string | null;
	Attachments?: PostmarkAttachmentLike[] | null;
};

/**
 * Limit optional Postmark text fields before displaying them.
 */
export function limitInboundEmailTextValue(value: string | null | undefined, maxLength: number): string | null {
	return value ? value.substring(0, maxLength) : null;
}

/**
 * Strip HTML tags from an inbound email HTML body for plain-text display.
 */
export function stripInboundEmailHtmlBody(value: string | null | undefined): string | null {
	return value ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : null;
}

/**
 * Return the preferred raw text source from a saved inbound email payload.
 */
export function getInboundEmailPayloadTextBody(
	payload?: PostmarkInboundPayloadLike | null,
	maxBodyLength = 12000,
): string | null {
	const textBody = limitInboundEmailTextValue(
		typeof payload?.TextBody === 'string' ? payload.TextBody : null,
		maxBodyLength,
	);

	return textBody ||
		limitInboundEmailTextValue(
			typeof payload?.StrippedTextReply === 'string' ? payload.StrippedTextReply : null,
			maxBodyLength,
		);
}

/**
 * Return the fallback HTML-derived text from a saved inbound email payload.
 */
export function getInboundEmailPayloadHtmlText(
	payload?: PostmarkInboundPayloadLike | null,
	maxBodyLength = 12000,
): string | null {
	return limitInboundEmailTextValue(
		typeof payload?.HtmlBody === 'string'
			? stripInboundEmailHtmlBody(payload.HtmlBody)
			: null,
		maxBodyLength,
	);
}

/**
 * Return the display body format derived from a saved inbound email payload.
 */
export function getInboundEmailBodyFormat(
	payload?: PostmarkInboundPayloadLike | null,
): InboundEmailBodyFormatEnum | null {
	if (getInboundEmailPayloadTextBody(payload)) {
		return 'TEXT';
	}

	if (getInboundEmailPayloadHtmlText(payload)) {
		return 'HTML_TEXT';
	}

	return null;
}

/**
 * Return the display body text derived from a saved inbound email payload.
 */
export function getInboundEmailBodyText(
	payload?: PostmarkInboundPayloadLike | null,
	maxBodyLength = 12000,
): string {
	return getInboundEmailPayloadTextBody(payload, maxBodyLength) ||
		getInboundEmailPayloadHtmlText(payload, maxBodyLength) ||
		'';
}

/**
 * Return a compact preview text derived from a saved inbound email payload.
 */
export function getInboundEmailPreviewText(
	payload?: PostmarkInboundPayloadLike | null,
): string {
	return getInboundEmailBodyText(payload, 240).replace(/\s+/g, ' ').trim();
}

/**
 * Return safe attachment metadata from a saved inbound email payload.
 */
export function getInboundEmailAttachments(payload?: PostmarkInboundPayloadLike | null) {
	return Array.isArray(payload?.Attachments)
		? payload.Attachments.map((attachment) => ({
			name: attachment?.Name || null,
			contentType: attachment?.ContentType || null,
			contentLength: attachment?.ContentLength || null,
		}))
		: [];
}
