import type { OrganizationACL, OrganizationRoleEnum } from './organization.d.ts';

/**
 * Account; phone
 */

export interface AccountPhoneObj {
	id: number;
	number: string;
	verified: boolean;
}

/**
 * Account
 */

export interface AccountObj {
	id: number | bigint;
	readableId?: string | null;
	settings: Record<string, any>;
	profile: Partial<{
		firstName: string;
		lastName: string;
		storageId: number | null;
		// phone: AccountPhoneObj | null; // ?? This is a coding mistake, I think
	}>;
}

export interface AccountData {
	__table: 'accounts';

	id: number | bigint;
	readableId?: string | null;
	settings: Record<string, any>;

	profile: {
		__table: 'account_profiles';
		id: number | bigint;
		firstName: string;
		lastName: string;
		storageId: number | bigint | null;
	};
	phone: {
		__table: 'account_phones';
		id: number;
		number: string;
		verified: boolean;
		banned: boolean;
		editAt: Date;
	};
	email: {
		__table: 'account_emails';
		id: number;
		address: string;
		verified: boolean;
		banned: boolean;
		editAt: Date;
	};
	createdAt: Date;
	updatedAt: Date;
}

/**
 * Account with membership
 */

export interface AccountMembershipData {
	id: number;
	accountId: number;
	organizationId: number;
	role: OrganizationRoleEnum;
	acl: OrganizationACL;
	notes?: string;
	primary: boolean;
	createdAt: Date;
	updatedAt: Date;
	account: AccountData;
}
