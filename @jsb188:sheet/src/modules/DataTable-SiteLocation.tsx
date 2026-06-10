import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { useEditSiteLocation } from '@jsb188/graphql/hooks/use-organization-mtn';
import { useOrganizationSites } from '@jsb188/graphql/hooks/use-organization-qry';
import type { OrganizationSiteGQL } from '@jsb188/mday/types/organization.d.ts';
import { SheetSaveButton } from '@jsb188/react-web/ui/SheetEditor';
import type { SheetUIEditorClickSource } from '@jsb188/react-web/ui/SheetUI';
import type { OpenModalPopUpFn } from '@jsb188/react/states';
import { useEffect, useState } from 'react';

type SiteLocationDraftValues = {
	name: string;
	note: string;
	region: string;
};

type DataTableSiteLocationEditorProps = {
	clickSource?: SheetUIEditorClickSource;
	displayValue: string;
	onClose: () => void;
	openModalPopUp: OpenModalPopUpFn;
	organizationId: string;
	siteLocationId: string;
};

/*
 * Build one site-location editor draft from queried site data.
 */
function getSiteLocationDraftValues(site: OrganizationSiteGQL | null | undefined, displayValue: string): SiteLocationDraftValues {
	return {
		name: site?.name || displayValue,
		note: site?.note || '',
		region: site?.region || '',
	};
}

/*
 * Return the site matching one GraphQL generic ID from an organization site list.
 */
function getSiteLocationById(sites: OrganizationSiteGQL[] | null | undefined, siteLocationId: string) {
	return (sites || []).find((site) => site.id === siteLocationId || site.readableId === siteLocationId) || null;
}

/*
 * Render the dataTable-local form for editing one site location.
 */
export function DataTableSiteLocationEditor(p: DataTableSiteLocationEditorProps) {
	const { organizationSites, initialLoading } = useOrganizationSites(p.organizationId, p.organizationId) as {
		initialLoading?: boolean;
		organizationSites?: OrganizationSiteGQL[] | null;
	};
	const { editSiteLocation, saving } = useEditSiteLocation({}, p.openModalPopUp);
	const siteLocation = getSiteLocationById(organizationSites, p.siteLocationId);
	const [draftValues, setDraftValues] = useState(() => getSiteLocationDraftValues(siteLocation, p.displayValue));
	const disabled = !!initialLoading;
	const saveDisabled = disabled || saving || !draftValues.name.trim();

	useEffect(() => {
		setDraftValues(getSiteLocationDraftValues(siteLocation, p.displayValue));
	}, [siteLocation, p.displayValue]);

	/*
	 * Update one site location draft field inside the dataTable-local editor.
	 */
	function setDraftField(field: keyof SiteLocationDraftValues, value: string) {
		setDraftValues((currentValues) => ({
			...currentValues,
			[field]: value,
		}));
	}

	/*
	 * Save the site location draft values through the existing GraphQL mutation.
	 */
	async function saveSiteLocation() {
		if (saveDisabled) {
			return;
		}

		const result = await editSiteLocation({
			variables: {
				name: draftValues.name.trim(),
				note: draftValues.note.trim(),
				region: draftValues.region.trim(),
				siteLocationId: p.siteLocationId,
			},
		});

		if (result?.editSiteLocation && !result?.error) {
			p.onClose();
		}
	}

	return <form
		aria-busy={disabled}
		className='bg shadow_light r_2 v_stretch gap_5 sheet_overlay_editor lh_2'
		data-sheet-click-source={p.clickSource}
		data-sheet-site-location-editor='true'
		onSubmit={(event) => {
			event.preventDefault();
			void saveSiteLocation();
		}}
	>
		<div className='pt_12 px_6 v_stretch gap_6'>
			<label className='h_item gap_8'>
				<span className='cl_md w_70 min_w_70 px_4 ellip'>
					{i18n.t('form.location_name')}
				</span>
				<input
					className={cn('f min_w_0 w_f stock r_2 ft_xs px_4 py_2', disabled ? 'cl_md' : 'bg_alt')}
					disabled={disabled}
					name='name'
					onChange={(event) => setDraftField('name', event.currentTarget.value)}
					value={draftValues.name}
				/>
			</label>
			<label className='h_item gap_8'>
				<span className='cl_md w_70 min_w_70 px_4 ellip'>
					{i18n.t('form.region')}
				</span>
				<input
					className={cn('f min_w_0 w_f stock r_2 ft_xs px_4 py_2', disabled ? 'cl_md' : 'bg_alt')}
					disabled={disabled}
					name='region'
					onChange={(event) => setDraftField('region', event.currentTarget.value)}
					value={draftValues.region}
				/>
			</label>
			<label className='ft_xs bd_t_1 bd_lt pt_8 mt_6'>
				<div className='cl_md bl ft_tn mb_6 px_4'>
					{i18n.t('form.note')}
				</div>
				<textarea
					className='min_h_105 max_h_240 bg_alt r_2 resize_v ft_xs mt_5 p_4 w_f stock lh_2'
					disabled={disabled}
					name='note'
					onChange={(event) => setDraftField('note', event.currentTarget.value)}
					value={draftValues.note}
				/>
			</label>
		</div>
		<div className='bd_t_1 bd_lt h_right p_6'>
			<SheetSaveButton
				disabled={saveDisabled}
				saving={saving}
			/>
		</div>
	</form>;
}
