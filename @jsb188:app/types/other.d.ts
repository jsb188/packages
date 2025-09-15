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
	values: string[] | null;
}
