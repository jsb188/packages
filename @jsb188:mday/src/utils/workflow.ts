import { hhmmFromDateOrTime } from '@jsb188/app/utils/timeZone.ts';
import cronParser from 'cron-parser';

const DEFAULT_SCHEDULE_WINDOW_MS = 24 * 60 * 60 * 1000; // once per day

/**
 * Replace workflow template values in text using {{key}} placeholders
 */

export function replaceWorkflowTemplateValues(
	text: string,
	values?: Record<string, any> | null,
  timeZone: string | null = null,
) {
	if (!text || !values || typeof values !== 'object' || Array.isArray(values)) {
		return text;
	}

	return text.replace(/{{(.*?)}}/g, (_match, rawKey) => {
		const key = String(rawKey).trim();
		const value = values[key];

		switch (key) {
			case 'endTime': {
				if (!value) {
					break;
				}

				const normalized = String(value).replace(':', '');
				if (!/^[0-9]{3,4}$/.test(normalized)) {
					break;
				}

				return hhmmFromDateOrTime(normalized, null, true, timeZone, true) || String(value);
			}
		}

		if (value === undefined || value === null || String(value) === '') {
			return `{{${key}}}`;
		}

		return String(value);
	});
}

/**
 * Get window for workflow schedule
 */

function getScheduleWindowMs(schedule: string | null | undefined, nextAt: Date) {
	if (!schedule) {
		return DEFAULT_SCHEDULE_WINDOW_MS;
	}

	try {
		const nextMs = cronParser
			.parse(schedule, { currentDate: nextAt })
			.next()
			.toDate()
			.getTime();
		const diffMs = nextMs - nextAt.getTime();

		return Number.isFinite(diffMs) && diffMs > 0
			? diffMs
			: DEFAULT_SCHEDULE_WINDOW_MS;
	} catch {
		return DEFAULT_SCHEDULE_WINDOW_MS;
	}
}

/**
 * Check if current date is within workflow's schedule window
 */

export function isWithinScheduleWindow(
	nextAt: Date | string | null | undefined,
	schedule?: string | null,
	now = new Date(),
) {
	const nextAtDate = nextAt ? new Date(nextAt) : null;
	if (!nextAtDate) {
		return false;
	}

	const nextAtMs = nextAtDate.getTime();
	if (!Number.isFinite(nextAtMs)) {
		return false;
	}

	const nowMs = now.getTime();
	if (!Number.isFinite(nowMs)) {
		return false;
	}

	const windowMs = getScheduleWindowMs(schedule, nextAtDate);
	const windowEndMs = nextAtMs + windowMs;

	return nowMs >= nextAtMs && nowMs <= windowEndMs;
}
