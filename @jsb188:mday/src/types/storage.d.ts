import {
  FILE_STATUS_ENUMS,
  STORAGE_INTENT_ENUMS,
} from "../constants/storage.ts";
import type { OrganizationData } from "./organization.d.ts";

/**
 * Enums
 */

export type StorageIntentEnum = typeof STORAGE_INTENT_ENUMS[number];
export type FileStatusEnum = typeof FILE_STATUS_ENUMS[number];

export type CSVColumnFormat =
  | "NUMBER"
  | "NUMBER_ROUND"
  | "DECIMAL_1"
  | "DECIMAL_2"
  | "CURRENCY"
  | "PERCENT"
  | "STRING";

export type CSVFooterSummaryExpression =
  | "SUM"
  | "AVG"
  | "MIN"
  | "MAX"
  | "COUNT"
  | "CUSTOM";

export interface CSVColumnRequest {
  label: string;
  format: CSVColumnFormat;
  hint: string;
}

export interface CSVFooterSummaryRowRequest {
  label: string;
  expression: CSVFooterSummaryExpression;
  format: CSVColumnFormat;
  formula?: string;
}

export interface CSVFileCreationRequest {
  fileName: string;
  fileDescription?: string;
  maxRowsLength: number;
  dataStartDate: string;
  dataEndDate: string;
  dataSearchQuery: string[];
  descriptionOfDataToSearch: string;
  columns: CSVColumnRequest[];
  footerSummaryRows?: CSVFooterSummaryRowRequest[];
  sentFromSMS?: boolean;
  [key: string]: unknown;
}

/**
 * Storage
 */

export interface StorageData {
  __table: "storage";
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

export interface StorageGeneratedData {
  __table: "storage_generated";

  code: string;
  fileName: string;
  fileDescription: string;
  summaryReport: string | null;
  payload: CSVFileCreationRequest | Record<string, any>;
  accountId: number | bigint;
  organizationId: number | bigint;
  organization?: OrganizationData;
  storageId: number | bigint | null;
  status: FileStatusEnum;
  generatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
  uploadStatus?: "ERROR" | "UPLOADING" | null;

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
