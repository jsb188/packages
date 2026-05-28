import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { useEditInboundContact } from '@jsb188/graphql/hooks/use-inboundContact-mtn';
import { useInboundContact } from '@jsb188/graphql/hooks/use-inboundContact-qry';
import { useChildOrganizations } from '@jsb188/graphql/hooks/use-organization-qry';
import { makeEditInboundContactSchema } from '@jsb188/mday/schemas/inboundContact.ts';
import type { InboundContactGQL, InboundContactOrgGQL } from '@jsb188/mday/types/inboundContact.d.ts';
import type { OrganizationChildGQL } from '@jsb188/mday/types/organization.d.ts';
import { MoreBelowScrollArea } from '@jsb188/react-web/modules/Scroll';
import { COMMON_ICON_NAMES, Icon } from '@jsb188/react-web/svgs/Icon';
import { TextWithLinks } from '@jsb188/react-web/ui/Markdown';
import { SheetEditorNav, SheetSaveButton } from '@jsb188/react-web/ui/SheetEditor';
import type { SheetUIEditorClickSource } from '@jsb188/react-web/ui/SheetUI';
import type { OpenModalPopUpFn } from '@jsb188/react/states';
import { type ReactNode, useEffect, useState } from 'react';

type InboundContactDraftValues = {
	email: string;
	memory: string;
	personName: string;
	phone: string;
};

type SheetInboundContactEditorTab = 'CONTACT' | 'ORGANIZATION';

type SheetInboundContactEditorProps = {
	clickSource?: SheetUIEditorClickSource;
	displayValue: string;
	inboundContactId: string;
	openModalPopUp: OpenModalPopUpFn;
	organizationId: string;
	onClose: () => void;
};

type SheetInboundContactSchemaItem = ReturnType<typeof makeEditInboundContactSchema>['listData'][number];

type SheetInboundContactContactTabProps = {
	disabled: boolean;
	renderSchemaField: (schemaItem: SheetInboundContactSchemaItem) => ReactNode;
	saving: boolean;
	schema: ReturnType<typeof makeEditInboundContactSchema>;
};

type SheetInboundContactOrganizationTabProps = {
	associatedOrganizationNameById: Map<string, string>;
	disabled: boolean;
	onChildOrganizationClick: (childOrganization: OrganizationChildGQL) => void;
	organizationId: string;
	saving: boolean;
	selectedOrganizationIds?: string[];
};

type SheetInboundContactEditorContentProps = SheetInboundContactContactTabProps & SheetInboundContactOrganizationTabProps & {
	activeTab: SheetInboundContactEditorTab;
};

const MAX_SELECTED_ASSOCIATED_ORGANIZATIONS = 5;

/*
 * Build one inbound contact editor draft from cached or queried contact data.
 */

function getInboundContactDraftValues(contact: InboundContactGQL | null | undefined, displayValue: string): InboundContactDraftValues {
	return {
		email: contact?.email || '',
		memory: contact?.memory || '',
		personName: contact?.personName || displayValue,
		phone: contact?.phone || '',
	};
}

/*
 * Check whether one schema field name is supported by the inbound contact draft.
 */

function isInboundContactDraftField(field: string): field is keyof InboundContactDraftValues {
	return field === 'email' || field === 'memory' || field === 'personName' || field === 'phone';
}

/*
 * Check whether a contact field should be read-only in the sheet editor.
 */

function isReadOnlyInboundContactDraftField(field: keyof InboundContactDraftValues) {
	return field === 'email' || field === 'phone';
}

/*
 * Return associated organization IDs from one inbound contact.
 */

function getInboundContactAssociatedOrganizationIds(contact: InboundContactGQL | null | undefined) {
	return (contact?.associated || [])
		.map((orgRel: InboundContactOrgGQL) => orgRel.organizationId)
		.filter(Boolean);
}

/*
 * Return associated organization names from one inbound contact.
 */

function getInboundContactAssociatedOrganizationNameById(contact: InboundContactGQL | null | undefined) {
	return new Map((contact?.associated || [])
		.filter((orgRel: InboundContactOrgGQL) => orgRel.organizationId && orgRel.name)
		.map((orgRel: InboundContactOrgGQL) => [orgRel.organizationId, orgRel.name || '']));
}

/*
 * Toggle one child organization ID in a selected IDs list.
 */

function toggleSelectedOrganizationId(selectedOrganizationIds: string[], organizationId: string) {
	if (selectedOrganizationIds.includes(organizationId)) {
		return selectedOrganizationIds.filter((id) => id !== organizationId);
	}

	if (selectedOrganizationIds.length >= MAX_SELECTED_ASSOCIATED_ORGANIZATIONS) {
		return selectedOrganizationIds;
	}

	return [...selectedOrganizationIds, organizationId];
}

/*
 * Return organization names for the currently selected organization IDs.
 */

function getSelectedOrganizationNames(
	selectedOrganizationIds: string[],
	organizationNameById: Map<string, string>,
) {
	return selectedOrganizationIds
		.map((organizationId) => organizationNameById.get(organizationId) || '')
		.filter(Boolean);
}

/*
 * Escape text before placing it inside HTML markup rendered by TextWithLinks.
 */

function escapeInlineHTML(text: string) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/*
 * Render the contact tab fields and its pinned save action.
 */

function SheetInboundContactContactTab(p: SheetInboundContactContactTabProps) {
	return <>
		<div className='pt_12 px_6 v_stretch gap_5'>
			{p.schema.listData.map(p.renderSchemaField)}
		</div>
		<div className='bd_t_1 bd_lt h_right p_6'>
			<SheetSaveButton
				disabled={p.disabled || p.saving}
				saving={p.saving}
				/>
		</div>
	</>;
}

/*
 * Render one selectable child organization row for the organization tab.
 */

function SheetInboundContactOrganizationItem(p: {
	childOrganization: OrganizationChildGQL;
	onClick: (childOrganization: OrganizationChildGQL) => void;
	selected: boolean;
}) {
	const org = p.childOrganization.organization;
	const name = org?.name || i18n.t('form.unknown');

	return <button
    aria-pressed={p.selected}
    className={cn('h_spread px_5 h_24 bd_1 bd_lt no_shrink', p.selected ? 'bg_primary_fd' : 'bg_alt_hv')}
    data-sheet-inbound-contact-child-organization={org?.id || p.childOrganization.id}
    onClick={() => {
      p.onClick(p.childOrganization);
  }}
  type='button'
  >
    <span className='ellip'>{name}</span>
    {p.selected ? <Icon name='check' /> : null}
  </button>;
}

/*
 * Render the organization tab child organization list and its pinned save action.
 */

function SheetInboundContactOrganizationTab(p: SheetInboundContactOrganizationTabProps) {
	const { childOrganizations } = useChildOrganizations({
		organizationId: p.organizationId,
		limit: 250,
	});

  const isEmpty = !!childOrganizations && !childOrganizations.length;
	const mockChildOrganizations = Array.from({ length: 3 });
	const organizationNameById = new Map(p.associatedOrganizationNameById);
	const selectedOrganizationIds = p.selectedOrganizationIds || [];

	(childOrganizations || []).forEach((childOrganization: OrganizationChildGQL) => {
		const childOrganizationId = childOrganization.organization?.id;
		const childOrganizationName = childOrganization.organization?.name;

		if (childOrganizationId && childOrganizationName) {
			organizationNameById.set(childOrganizationId, childOrganizationName);
		}
	});

	const selectedOrganizationNames = getSelectedOrganizationNames(
		selectedOrganizationIds,
		organizationNameById,
	);
		const selectedOrganizationNamesText = selectedOrganizationNames
			.map((organizationName) => `<u>${escapeInlineHTML(organizationName)}</u>`)
			.join(', ');
		const associatedOrganizationText = selectedOrganizationNames.length
			? i18n.t('org.contact_associated_with', {
				organizationNames: selectedOrganizationNamesText,
			})
			: i18n.t('org.contact_choose_associated_orgs');

	return <>
		<TextWithLinks
			as='div'
			className='px_12 pt_8 pb_4 ft_xs cl_md lh_2'
		>
			{associatedOrganizationText}
		</TextWithLinks>
		<MoreBelowScrollArea
      className={cn('px_6 grid gap_4 max_h_300', isEmpty ? 'pt_4' : 'pt_12')}
      scrollClassName='y_scr flat'
    >
			{childOrganizations == null ? mockChildOrganizations.map((_, index) => (
			// {childOrganizations ? mockChildOrganizations.map((_, index) => (
	        <div className='h_spread px_5 h_24 bd_1 bd_lt no_shrink' key={index}>
          <span className='mock alt'>
	            {'... ... '.repeat([7, 6, 5][index % 3]).trim()}
          </span>
        </div>
			)) : childOrganizations.map((childOrganization: OrganizationChildGQL) => (
				<SheetInboundContactOrganizationItem
						childOrganization={childOrganization}
						key={childOrganization.id}
						onClick={p.onChildOrganizationClick}
						selected={selectedOrganizationIds.includes(childOrganization.organization?.id || '')}
					/>
			))}

      <p className={cn('mx_6 pb_6 cl_lt', isEmpty ? 'bd_t_1 bd_lt pt_14' : '')}>
        {i18n.t('agent.inbound_contact_associated_orgs_auto_create_msg')}
      </p>

		</MoreBelowScrollArea>
				<div className='bd_t_1 bd_lt h_spread p_6 gap_8'>
					<span className='ft_xs cl_md'>
            {selectedOrganizationIds.length ? `${selectedOrganizationIds.length}/${MAX_SELECTED_ASSOCIATED_ORGANIZATIONS}` : null}
					</span>
				<SheetSaveButton
					disabled={p.disabled || p.saving}
					saving={p.saving}
			/>
		</div>
	</>;
}

/*
 * Render the active inbound contact editor tab content.
 */

function SheetInboundContactEditorContent(p: SheetInboundContactEditorContentProps) {
	switch (p.activeTab) {
		case 'CONTACT':
			return <SheetInboundContactContactTab
				disabled={p.disabled}
				renderSchemaField={p.renderSchemaField}
				saving={p.saving}
				schema={p.schema}
			/>;
		case 'ORGANIZATION':
			return <SheetInboundContactOrganizationTab
				associatedOrganizationNameById={p.associatedOrganizationNameById}
				disabled={p.disabled}
				onChildOrganizationClick={p.onChildOrganizationClick}
				organizationId={p.organizationId}
				saving={p.saving}
				selectedOrganizationIds={p.selectedOrganizationIds}
			/>;
		default:
			return null;
	}
}

/*
 * Render the sheet-local form for editing one inbound contact.
 */

export function SheetInboundContactEditor(p: SheetInboundContactEditorProps) {
	const { inboundContact, initialLoading } = useInboundContact({
		organizationId: p.organizationId,
		inboundContactId: p.inboundContactId,
	}) as { inboundContact: InboundContactGQL | null; initialLoading?: boolean };
	const { editInboundContact, saving } = useEditInboundContact({}, p.openModalPopUp);
	const [draftValues, setDraftValues] = useState(() => getInboundContactDraftValues(inboundContact, p.displayValue));
	const [selectedOrganizationIds, setSelectedOrganizationIds] = useState(() => getInboundContactAssociatedOrganizationIds(inboundContact));
	const [activeTab, setActiveTab] = useState<SheetInboundContactEditorTab>('CONTACT');
	const schema = makeEditInboundContactSchema('sheet_inbound_contact', '', draftValues);
	const disabled = !!initialLoading;
	const saveDisabled = disabled || saving;
	const associatedOrganizationNameById = getInboundContactAssociatedOrganizationNameById(inboundContact);

	useEffect(() => {
		setDraftValues(getInboundContactDraftValues(inboundContact, p.displayValue));
		setSelectedOrganizationIds(getInboundContactAssociatedOrganizationIds(inboundContact));
	}, [inboundContact, p.displayValue]);

	/*
	 * Update one inbound contact draft field inside the sheet-local editor.
	 */

	function setDraftField(field: keyof InboundContactDraftValues, value: string) {
		setDraftValues((currentValues) => ({
			...currentValues,
			[field]: value,
		}));
	}

	/*
	 * Save the inbound contact draft values through the existing GraphQL mutation.
	 */

	async function saveInboundContact() {
		if (saveDisabled) {
			return;
		}

		const result = await editInboundContact({
			variables: {
				organizationId: p.organizationId,
				inboundContactId: p.inboundContactId,
				personName: draftValues.personName,
				memory: draftValues.memory,
			},
		});

		if (result?.editInboundContact && !result?.error) {
			p.onClose();
		}
	}

	/*
	 * Save the selected child organization associations through the existing GraphQL mutation.
	 */

	async function saveInboundContactOrganization() {
		if (saveDisabled) {
			return;
		}

		const result = await editInboundContact({
			variables: {
				organizationId: p.organizationId,
				inboundContactId: p.inboundContactId,
				associatedOrganizationIds: selectedOrganizationIds,
			},
		});

		if (result?.editInboundContact && !result?.error) {
			p.onClose();
		}
	}

	/*
	 * Toggle one child organization selection inside the organization tab.
	 */

	function handleChildOrganizationClick(childOrganization: OrganizationChildGQL) {
		const childOrganizationId = childOrganization.organization?.id;

		if (!childOrganizationId) {
			return;
		}

		setSelectedOrganizationIds((currentIds) => toggleSelectedOrganizationId(currentIds, childOrganizationId));
	}

	/*
	 * Render a schema-backed inbound contact field inside the sheet overlay editor.
	 */

	function renderSchemaField(schemaItem: SheetInboundContactSchemaItem) {
		const { __type, item } = schemaItem;
		const { name, label, description, maxLength, placeholder, autoComplete, type } = item;

		if (!isInboundContactDraftField(name)) {
			return null;
		}

		if (__type === 'input') {
			const isReadOnly = isReadOnlyInboundContactDraftField(name);
			const notEditable = disabled || isReadOnly;

			return <label
				className='h_item gap_8'
				key={name}
			>
				<span className='cl_md w_70 min_w_70 px_4 ellip'>
					{label}
				</span>
				<span className={cn('rel f bg_alt', notEditable ? 'pattern_stripes medium_bf' : '')}>
					<input
						autoComplete={autoComplete}
						className={cn('f min_w_0 w_f stock r_2 ft_xs px_4 py_2 rel', notEditable ? 'cl_md pr_24' : 'bg_alt')}
						disabled={notEditable}
						maxLength={maxLength}
						name={name}
						onChange={isReadOnly ? undefined : (event) => {
							setDraftField(name, event.currentTarget.value);
						}}
						placeholder={placeholder}
						readOnly={isReadOnly}
						type={type}
						value={draftValues[name]}
					/>
					{notEditable && <span className='abs_r_center mr_5 ic_sm cl_md noclick'>
						<Icon name={COMMON_ICON_NAMES.lock} />
					</span>}
				</span>
			</label>;
		}

		if (__type === 'textarea') {
			return <label
				className='ft_xs bd_t_1 bd_lt pt_8 mt_6'
				key={name}
			>
				<div className='cl_md bl ft_tn mb_6 px_4'>
          <div className='mb_4'>
            {label}
          </div>

          {description && <div className='cl_lt ft_tn lh_2'>
            {description}
          </div>}
        </div>

				<textarea
					autoComplete={autoComplete}
					className='min_h_105 max_h_240 bg_alt r_2 resize_v ft_xs mt_5 p_4 w_f stock lh_2'
					disabled={disabled}
					maxLength={maxLength}
					name={name}
					onChange={(event) => {
						setDraftField(name, event.currentTarget.value);
					}}
					placeholder={placeholder}
					value={draftValues[name]}
				/>
			</label>;
		}

		return null;
	}

	/*
	 * Save the currently active inbound contact editor tab.
	 */

	function saveActiveTab() {
		if (activeTab === 'ORGANIZATION') {
			saveInboundContactOrganization();
			return;
		}

		void saveInboundContact();
	}

	return <form
		aria-busy={disabled}
		className='bg bd_2 bd_lt r_2 v_stretch gap_5 sheet_overlay_editor lh_2'
		data-sheet-click-source={p.clickSource}
		data-sheet-inbound-contact-editor='true'
		onSubmit={(e) => {
			e.preventDefault();
			saveActiveTab();
		}}
	>
		<SheetEditorNav
			activeValue={activeTab}
			onChange={setActiveTab}
			items={[
				{
					label: i18n.t('form.contact'),
					value: 'CONTACT',
				},
				{
					label: i18n.t('org.organizations'),
					value: 'ORGANIZATION',
				},
			]}
		/>

		<SheetInboundContactEditorContent
			activeTab={activeTab}
			associatedOrganizationNameById={associatedOrganizationNameById}
			disabled={disabled}
			onChildOrganizationClick={handleChildOrganizationClick}
			organizationId={p.organizationId}
			renderSchemaField={renderSchemaField}
			saving={saving}
			schema={schema}
			selectedOrganizationIds={selectedOrganizationIds}
		/>
	</form>;
}
