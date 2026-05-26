import i18n from '@jsb188/app/i18n/index.ts';
import { useEditInboundContact } from '@jsb188/graphql/hooks/use-inboundContact-mtn';
import { useReactiveInboundContactFragment } from '@jsb188/graphql/hooks/use-inboundContact-qry';
import type { InboundContactGQL } from '@jsb188/mday/types/inboundContact.d.ts';
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
 * Render the sheet-local form for editing one inbound contact.
 */

export function SheetInboundContactEditor(p: SheetInboundContactEditorProps) {
	const inboundContact = useReactiveInboundContactFragment(p.inboundContactId) as InboundContactGQL | null;
	const { editInboundContact } = useEditInboundContact({}, p.openModalPopUp);
	const [draftValues, setDraftValues] = useState(() => getInboundContactDraftValues(inboundContact, p.displayValue));

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

	return <form
		className='bg shadow_line_alt bd_1 bd_lt r_2 p_10 ft_xs v gap_8'
		data-sheet-inbound-contact-editor='true'
		onSubmit={(event) => {
			event.preventDefault();
			void saveInboundContact();
		}}
	>
		<div className='h_item gap_8'>
			<div className='g_fill min_w_0'>
				<div className='ft_sm ft_medium ellip'>{p.displayValue || i18n.t('form.contact')}</div>
				<div className='mt_3 cl_md ellip'>{p.inboundContactId}</div>
			</div>
			<button
				className='h_28 px_8 bg_alt bg_hv cl_md'
				onClick={p.onClose}
				type='button'
			>
				{i18n.t('form.close')}
			</button>
		</div>
		<label className='v gap_3'>
			<span className='cl_md'>{i18n.t('form.name')}</span>
			<input
				className='h_32 px_8 bg_alt bd_1 bd_lt r_2'
				name='personName'
				onChange={(event) => {
					setDraftField('personName', event.currentTarget.value);
				}}
				value={draftValues.personName}
			/>
		</label>
		<label className='v gap_3'>
			<span className='cl_md'>{i18n.t('form.email')}</span>
			<input
				className='h_32 px_8 bg_alt bd_1 bd_lt r_2'
				name='email'
				onChange={(event) => {
					setDraftField('email', event.currentTarget.value);
				}}
				type='email'
				value={draftValues.email}
			/>
		</label>
		<label className='v gap_3'>
			<span className='cl_md'>{i18n.t('form.phone')}</span>
			<input
				className='h_32 px_8 bg_alt bd_1 bd_lt r_2'
				name='phone'
				onChange={(event) => {
					setDraftField('phone', event.currentTarget.value);
				}}
				type='tel'
				value={draftValues.phone}
			/>
		</label>
		<label className='v gap_3'>
			<span className='cl_md'>{i18n.t('form.note')}</span>
			<textarea
				className='min_h_80 p_8 bg_alt bd_1 bd_lt r_2 resize_v'
				name='memory'
				onChange={(event) => {
					setDraftField('memory', event.currentTarget.value);
				}}
				value={draftValues.memory}
			/>
		</label>
		<div className='h_right'>
			<button
				className='h_30 px_10 bg_primary cl_white ft_xs'
				type='submit'
			>
				{i18n.t('form.save')}
			</button>
		</div>
	</form>;
}
