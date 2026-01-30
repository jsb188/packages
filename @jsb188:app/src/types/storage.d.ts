/**
 * Storage
 */

export interface StorageData {
	__table: 'storage';
	id: number;
	organizationId: number | null;
	accountId: number | null;
	uri: string;
	size: number;
	checked: boolean;
	at: Date;
	contentType: string;
	values: Record<string, any> | null;
}

export interface StorageGQL {
	id: string;
	organizationId: string | null;
	accountId: string | null;
	uri: string;
	size: number;
	checked: boolean;
	at: Date;
	contentType: string;

	// metadata
	name: string | null;
	description: string | null;
	aiNote: string | null;
}

export type StorageUploadValues = Partial<{
	uploaderAccountId: number;
	values: Partial<{
		name: string;
		description: string;
		aiNote: string;
	}>;
}>;
