/**
 * Actions data object
 */

export interface ActionTaskObj {
	id?: number | bigint; // Optional for updates/inserts
	logId: number | bigint;
	queue?: string | null;

	title: string;
	instruction: string;
	message?: string | null;

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
	message: string | null;

	scheduledAt: string; // ISO date string
	delay: number; // seconds
	completed: boolean;

	createdAt?: string; // ISO date string
	updatedAt?: string; // ISO date string
}
