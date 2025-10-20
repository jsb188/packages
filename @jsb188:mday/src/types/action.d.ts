/**
 * Actions data object
 */

export interface ActionTaskObj {
	id?: number; // Optional for updates/inserts
	logId: number;
  queue?: string | null;

	title: string;
	instruction: string;

	scheduledAt: Date | null;
	delay: number | null; // seconds
	completed: boolean;

	createdAt?: Date;
	updatedAt?: Date;
}

/**
 * Actions GraphQL data
 */

export interface ActionTaskGQL {
	__deleted?: boolean;

	id: string;
	logId: string;

	title: string;
	instruction: string;

	scheduledAt: string; // ISO date string
	delay: number; // seconds
	completed: boolean;

	createdAt?: string; // ISO date string
	updatedAt?: string; // ISO date string
}
