import { STORAGE_INTENT_ENUMS } from '../constants/storage.ts';

/**
 * Enums
 */

export type StorageIntentEnum = typeof STORAGE_INTENT_ENUMS[number];

/**
 * Storage
 */

export interface StorageData {
	__table: 'storage';
	id: number;
	oaiFileId: string | null;
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
  __deleted?: boolean;

	id: string;
	organizationId: string | null;
	accountId: string | null;
	uri: string;
	size: number;
	checked: boolean;
	at: string; // ISO Date string
	contentType: string;

  // client-side only
  uploadStatus?: 'ERROR' | 'UPLOADING' | null;

	// metadata
	name: string | null;
	description?: string | null;
	aiNote?: string | null;
}

export type StorageUploadObj = Partial<{
	oaiFileId: string;
	uploaderAccountId: number | bigint | string;
	values: Partial<{
		name: string;
		description: string;
		aiNote: string;

    // For PDF only
    pageCount: number;
    isEncrypted: boolean;
    pdfVersion: string;
	}>;
	uploadIntent: {
		intent: StorageIntentEnum;
		entries: [string, string][];
	};
	upsertQuery?: RelatedDocumentUpsertQuery;
  realTimeUpdate?: string; // JSON.stringified object; "{{storageId}}" will be replaced with actual storage ID after upload
}>;

/**
 * Post-upload related document query execution object
 */

export interface RelatedDocumentUpsertQuery {
	__table: string;
	conflictKeys: string[];
	data: Record<string, any>;
}
