import type { OrganizationACL, OrganizationRoleEnum } from './organization.d.ts';

/**
 * Account; phone
 */

export interface AccountPhoneObj {
	id: number;
	number: string;
	primary: boolean;
	// verified: boolean; // Assume verified when data is fetched
}

/**
 * Account
 */

export interface AccountObj {
	id: number;
	settings: Record<string, any>;
	profile: {
		id: number;
		firstName: string;
		lastName: string;
		storageId: number | null;
		// phone: AccountPhoneObj | null; // ?? This is a coding mistake, I think
	};
}

export interface AccountData extends AccountObj {
	__table: 'accounts';
	phone: {
		id: number;
		number: string;
		primary: boolean;
		verified: boolean;
		banned: boolean;
		editAt: Date;
	};
	email: {
		id: number;
		address: string;
		primary: boolean;
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
