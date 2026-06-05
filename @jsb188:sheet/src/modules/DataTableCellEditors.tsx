import i18n from '@jsb188/app/i18n/index.ts';
import { Calendar } from '@jsb188/react-web/modules/Calendar';
import {
	SheetSelectEditor,
	type SheetUIEditState,
	type SheetUIEditorClickSource,
	type SheetUIFieldType,
} from '@jsb188/react-web/ui/SheetUI';
import { type ReactNode, useState } from 'react';
import {
	DATA_TABLE_LOCAL_EDITOR_Z_INDEX,
	DATA_TABLE_READ_ONLY_TAG_Z_INDEX,
	DATA_TABLE_STICKY_LOCAL_EDITOR_Z_INDEX,
	getDataTableCalendarDateValue,
	getDataTableDateEditorDateValue,
	getDataTableDateTimeEditorDraftValue,
	getDataTableDateTimeEditorTimeValue,
	getDataTableTranslatedText,
	getSheetEditorFieldType,
	getSheetSelectEditorOptions,
	type DataTableCellLookup,
	type DataTableLocalEditorPosition,
} from '../libs/dataTable-cell-editing.tsx';

/*
 * Anchor a dataTable-local editor to stable dataTable-canvas coordinates.
 */
export function DataTableLocalEditorContainer(p: { children: ReactNode; position: DataTableLocalEditorPosition }) {
	const editorTop = p.position.top;

	if (p.position.isStickyLeft) {
		return (
			<div
				className="abs"
				data-sheet-local-editor-anchor="true"
				style={{
					left: 0,
					top: editorTop,
					width: p.position.rowWidth,
					zIndex: DATA_TABLE_STICKY_LOCAL_EDITOR_Z_INDEX,
				}}
			>
				<div
					className="sticky"
					style={{
						left: p.position.left,
						position: 'sticky',
						width: p.position.width,
						zIndex: DATA_TABLE_STICKY_LOCAL_EDITOR_Z_INDEX,
					}}
				>
					{p.children}
				</div>
			</div>
		);
	}

	return (
		<div
			className="abs"
			data-sheet-local-editor-anchor="true"
			style={{
				left: p.position.left,
				top: editorTop,
				width: p.position.width,
				zIndex: DATA_TABLE_LOCAL_EDITOR_Z_INDEX,
			}}
		>
			{p.children}
		</div>
	);
}

/*
 * Render the read-only tag above a selected cell while preserving sticky-column positioning.
 */
export function DataTableReadOnlyTag(p: { position: DataTableLocalEditorPosition }) {
	const tag = (
		<div
			className="abs noclick nowrap px_5 py_4 ft_tn ft_medium lh_1 bg_contrast"
			data-sheet-read-only-cell-tag="true"
			style={{
				left: -1,
				top: -1,
				width: 'max-content',
				zIndex: DATA_TABLE_READ_ONLY_TAG_Z_INDEX,
			}}
		>
			{i18n.t('form.not_editable')}
		</div>
	);

	if (p.position.isStickyLeft) {
		return (
			<div
				className="abs"
				data-sheet-read-only-cell-tag-anchor="true"
				style={{
					left: 0,
					top: p.position.top,
					width: p.position.rowWidth,
					zIndex: DATA_TABLE_READ_ONLY_TAG_Z_INDEX,
				}}
			>
				<div
					className="sticky"
					style={{
						left: p.position.left,
						position: 'sticky',
						width: p.position.width,
						zIndex: DATA_TABLE_READ_ONLY_TAG_Z_INDEX,
					}}
				>
					{tag}
				</div>
			</div>
		);
	}

	return (
		<div
			className="abs"
			data-sheet-read-only-cell-tag-anchor="true"
			style={{
				left: p.position.left,
				top: p.position.top,
				width: p.position.width,
				zIndex: DATA_TABLE_READ_ONLY_TAG_Z_INDEX,
			}}
		>
			{tag}
		</div>
	);
}

/*
 * Render the dataTable-owned calendar editor for DATE and DATETIME cells.
 */
export function DataTableDateEditor(p: {
	clickSource?: SheetUIEditorClickSource;
	editState: SheetUIEditState;
	lookup: DataTableCellLookup;
	onDateValue: (lookup: DataTableCellLookup, draftValue: string) => void;
	onDateTimeSave: (lookup: DataTableCellLookup, draftValue: string) => void;
}) {
	const initialDateValue = getDataTableDateEditorDateValue(p.editState.draftValue);
	const initialTimeValue = getDataTableDateTimeEditorTimeValue(p.editState.draftValue);
	const [dateValue, setDateValue] = useState(initialDateValue);
	const [timeValue, setTimeValue] = useState(initialTimeValue);
	const isDateTime = getSheetEditorFieldType(p.lookup.designCell) === 'DATETIME';
	const calendarValue = dateValue || null;

	return (
		<div
			className="bg shadow_light r_4 ft_xs"
			data-sheet-click-source={p.clickSource}
			data-sheet-date-editor="true"
			style={{
				width: '100%',
			}}
		>
			<Calendar
				className="p_8"
				hideNextMonthDays
				initialCalendarViewDate={calendarValue || new Date()}
				name={`sheet_date_editor_${p.lookup.row.id}_${p.lookup.designCell.key}`}
				rowPaddingClassName="py_1"
				value={calendarValue}
				weekdayRowPaddingClassName="py_4"
				onChange={(nextValue) => {
					if (!nextValue) {
						return;
					}

					const nextDateValue = getDataTableCalendarDateValue(nextValue);
					if (isDateTime) {
						setDateValue(nextDateValue);
						return;
					}

					p.onDateValue(p.lookup, nextDateValue);
				}}
			/>

			{isDateTime ? (
				<form
					className="h_item gap_6 px_8 py_8 bd_t_1 bd_lt"
					data-sheet-date-time-editor-form="true"
					onSubmit={(event) => {
						event.preventDefault();
						p.onDateTimeSave(p.lookup, getDataTableDateTimeEditorDraftValue(dateValue, timeValue));
					}}
				>
					<input
						className="f h_28 bg_alt stock px_6 ft_xs"
						data-sheet-date-time-editor-time="true"
						onChange={(event) => {
							setTimeValue(event.currentTarget.value);
						}}
						type="time"
						value={timeValue}
					/>
					<button className="h_28 px_8 bg_primary cl_white ft_xs" type="submit">
						{getDataTableTranslatedText('form.save', 'Save')}
					</button>
				</form>
			) : null}
		</div>
	);
}

/*
 * Render the shared select editor with the standard dataTable option click wiring.
 */
export function DataTableSelectEditor(p: {
	clickSource?: SheetUIEditorClickSource;
	editState: SheetUIEditState;
	fieldType: SheetUIFieldType;
	lookup: DataTableCellLookup;
	onCustomTextSave: (lookup: DataTableCellLookup, draftValue: string) => void;
	onOptionValue: (lookup: DataTableCellLookup, value: string) => void;
}) {
	return (
		<div
			onClick={(event) => {
				const optionElement = event.target instanceof Element
					? event.target.closest('[data-sheet-select-editor-option]')
					: null;
				const value = optionElement?.getAttribute('data-sheet-select-editor-option');

				if (value === undefined || value === null) {
					return;
				}

				p.onOptionValue(p.lookup, value);
			}}
			onSubmit={(event) => {
				event.preventDefault();

				if (!(event.target instanceof HTMLFormElement) || !event.target.matches('[data-sheet-select-editor-custom]')) {
					return;
				}

				const formData = new FormData(event.target);
				p.onCustomTextSave(p.lookup, String(formData.get('customValue') || ''));
			}}
		>
			<SheetSelectEditor
				clickSource={p.clickSource}
				editState={p.editState}
				fieldType={p.fieldType}
				options={getSheetSelectEditorOptions(p.lookup.designCell)}
			/>
		</div>
	);
}
