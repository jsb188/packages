/**
 * Customer contact method for one customer memory record.
 */
export interface CustomerContactData {
	__table: 'customer_contacts';
	id: bigint;
	customerId: bigint;
	personName: string | null;
	email: string | null;
	phone: string | null;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Customer memory record owned by one organization.
 */
export interface CustomerData {
	__table: 'customers';
	id: bigint;
	organizationId: bigint;
	name: string | null;
	context: string | null;
	userInstructions: string | null;
	contacts?: CustomerContactData[] | null;
	createdAt: Date;
	updatedAt: Date;
}
