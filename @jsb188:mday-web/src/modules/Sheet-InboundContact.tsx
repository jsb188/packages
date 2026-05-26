import i18n from '@jsb188/app/i18n/index.ts';
import { useEditInboundContact } from '@jsb188/graphql/hooks/use-inboundContact-mtn';
import { useReactiveInboundContactFragment } from '@jsb188/graphql/hooks/use-inboundContact-qry';
import { makeEditInboundContactSchema } from '@jsb188/mday/schemas/inboundContact.ts';
import type { InboundContactGQL } from '@jsb188/mday/types/inboundContact.d.ts';
import { SheetSaveButton } from '@jsb188/react-web/ui/SheetUI';
import type { OpenModalPopUpFn } from '@jsb188/react/states';
import { useEffect, useState } from 'react';

type InboundContactDraftValues = {
	email: string;
	memory: string;
	personName: string;
	phone: string;
};

type SheetInboundContactEditorProps = {
	displayValue: string;
	inboundContactId: string;
	openModalPopUp: OpenModalPopUpFn;
	organizationId: string;
	onClose: () => void;
};

/*
 * Build one inbound contact editor draft from cached contact data and sheet display fallback.
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
 * Render the sheet-local form for editing one inbound contact.
 */

export function SheetInboundContactEditor(p: SheetInboundContactEditorProps) {
	const inboundContact = useReactiveInboundContactFragment(p.inboundContactId) as InboundContactGQL | null;
	const { editInboundContact } = useEditInboundContact({}, p.openModalPopUp);
	const [draftValues, setDraftValues] = useState(() => getInboundContactDraftValues(inboundContact, p.displayValue));
	const schema = makeEditInboundContactSchema('sheet_inbound_contact', '', draftValues);

	useEffect(() => {
		setDraftValues(getInboundContactDraftValues(inboundContact, p.displayValue));
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
		if (!String(draftValues.phone || '').trim() && !String(draftValues.email || '').trim()) {
			p.openModalPopUp(null, {
				message: i18n.t('error.20074'),
			});
			return;
		}

		const result = await editInboundContact({
			variables: {
				organizationId: p.organizationId,
				inboundContactId: p.inboundContactId,
				personName: draftValues.personName,
				email: draftValues.email,
				phone: draftValues.phone,
				memory: draftValues.memory,
			},
		});

		if (!result?.error) {
			p.onClose();
		}
	}

	/*
	 * Render a schema-backed inbound contact field inside the sheet overlay editor.
	 */

	function renderSchemaField(schemaItem: ReturnType<typeof makeEditInboundContactSchema>['listData'][number]) {
		const { __type, item } = schemaItem;
		const { name, label, description, maxLength, placeholder, autoComplete, type } = item;

		if (!isInboundContactDraftField(name)) {
			return null;
		}

		if (__type === 'input') {
			return <label
				className='h_item gap_8'
				key={name}
			>
				<span className='cl_md w_70 min_w_70 ellip'>{label}</span>
				<input
					autoComplete={autoComplete}
					className='f min_w_0 stock bg_alt r_2 ft_xs p_5'
					maxLength={maxLength}
					name={name}
					onChange={(event) => {
						setDraftField(name, event.currentTarget.value);
					}}
					placeholder={placeholder}
					type={type}
					value={draftValues[name]}
				/>
			</label>;
		}

		if (__type === 'textarea') {
			return <label
				className='ft_xs bd_t_1 bd_lt pt_8 mt_6'
				key={name}
			>
				<div className='cl_md bl ft_tn mb_6'>
          <div className='mb_4'>
            {label}
          </div>

          {description && <div className='cl_lt ft_tn lh_2'>
            {description}
          </div>}
        </div>

				<textarea
					autoComplete={autoComplete}
					className='min_h_80 bg_alt r_2 resize_v ft_xs mt_5 p_5 w_f stock'
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

	return <form
		className='bg bd_2 bd_lt r_2 p_10 v_stretch gap_5 sheet_overlay_editor'
		data-sheet-inbound-contact-editor='true'
		onSubmit={(e) => {
			e.preventDefault();
			void saveInboundContact();
		}}
	>
		{schema.listData.map(renderSchemaField)}
		<div className='h_right'>
			<SheetSaveButton />
		</div>
	</form>;
}
