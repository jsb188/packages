import { ACTION_CATEGORY_ENUMS, ACTION_STATUS_ENUMS } from '../constants/action';

/**
 * Enums
 */

export type ActionStatusEnum = (typeof ACTION_STATUS_ENUMS)[number];
export type ActionCategoryEnum = (typeof ACTION_CATEGORY_ENUMS)[number];

/**
 * Actions; metadata
 */

export interface ActionTask {
	instructions: string;
	response: string | null;
	at: Date | null;
}

export interface ActionMetadata {
	tasks: ActionTask[];
}

/**
 * Actions data object
 */

export interface ActionObj {
	id?: number; // Optional for updates/inserts
	referenceNumber: string;
	status: ActionStatusEnum;
	metadata: ActionMetadata;

	scheduledAt: Date;
	lastActionAt: Date;
}

/**
 * Actions GraphQL data
 */

export interface ActionGQL {
  __deleted: boolean;

	id: string;
	referenceNumber: string;
	actionFor: string;
	status: ActionStatusEnum;
	cursor: string;

	tasks: ActionTask[];

	scheduledAt: string; // ISO date
	lastActionAt: string; // ISO date
}
