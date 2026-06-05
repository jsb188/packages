import { cn } from '@jsb188/app/utils/string.ts';
import type {
	SheetUIColumn,
	SheetUIEditState,
} from '@jsb188/react-web/ui/SheetUI';
import { memo, type ChangeEvent, type CSSProperties, useCallback, useEffect, useRef } from 'react';

export type SheetEditorOverlayPosition = {
	height: number;
	left: number;
	top: number;
	width: number;
};

export type SheetEditorOverlayProps = {
	autoFocus?: boolean;
	cellClassName?: string;
	column: SheetUIColumn;
	editState: SheetUIEditState;
	onDraftValue: (draftValue: string) => void;
	position: SheetEditorOverlayPosition;
	scrollLeft: number;
	scrollTop: number;
};

/*
 * Return inline styles that keep the DOM editor fixed over its canvas cell.
 */
function getSheetEditorOverlayStyle(p: SheetEditorOverlayProps): CSSProperties {
	return {
		height: p.position.height,
		left: p.scrollLeft + p.position.left + 1,
		position: 'absolute',
		top: p.scrollTop + p.position.top + 1,
		width: p.position.width,
		zIndex: 43,
	};
}

/*
 * Return whether one Sheet editor field should use a multiline editor.
 */
function isSheetEditorMultilineFieldType(fieldType: SheetUIColumn['fieldType']) {
	return fieldType === 'JSON';
}

/*
 * Return the input type that should edit one Sheet column.
 */
function getSheetEditorInputType(fieldType: SheetUIColumn['fieldType']) {
	return fieldType === 'NUMBER' || fieldType === 'PRICE' ? 'number' : 'text';
}

/*
 * Return whether one inline editor supports caret range APIs.
 */
function canSetSheetEditorSelectionRange(editor: HTMLInputElement | HTMLTextAreaElement) {
	return !(editor instanceof HTMLInputElement && editor.type === 'number');
}

/*
 * Render the DOM editor placed over one active canvas cell.
 */
export const SheetEditorOverlay = memo((p: SheetEditorOverlayProps) => {
	const editorRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
	const setEditorRef = useCallback((node: HTMLInputElement | HTMLTextAreaElement | null) => {
		editorRef.current = node;
	}, []);
	const handleChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		p.onDraftValue(event.currentTarget.value);
	}, [p.onDraftValue]);
	const editorClassName = cn('sheet_ui_editor bg stock px_6 ft_xs ft_normal', p.editState.error ? 'error' : '');
	const sharedProps = {
		className: editorClassName,
		'data-cell-key': p.editState.cellKey,
		'data-field-type': p.column.fieldType,
		'data-row-id': p.editState.rowId,
		'data-sheet-editor': 'true',
		onChange: handleChange,
		ref: setEditorRef,
		value: p.editState.draftValue,
	};

	useEffect(() => {
		if (p.autoFocus === false) {
			return;
		}

		const editor = editorRef.current;

		if (!editor) {
			return;
		}

		const shouldSelectAll = p.editState.selectAllOnFocus !== false;

		editor.focus();
		if (!canSetSheetEditorSelectionRange(editor)) {
			return;
		}

		if (shouldSelectAll) {
			editor.select();
		} else if (editor.setSelectionRange && canSetSheetEditorSelectionRange(editor)) {
			const valueLength = editor.value.length;
			editor.setSelectionRange(valueLength, valueLength);
		}
	}, [p.autoFocus, p.editState.cellKey, p.editState.rowId, p.editState.selectAllOnFocus]);

	return <div
		className={cn('sheet_overlay_editor shadow_light', p.cellClassName)}
		data-sheet-editor-overlay='true'
		style={getSheetEditorOverlayStyle(p)}
	>
		{isSheetEditorMultilineFieldType(p.column.fieldType)
			? <textarea {...sharedProps} />
			: <input
				{...sharedProps}
				type={getSheetEditorInputType(p.column.fieldType)}
			/>}
	</div>;
}, (prev, next) => (
	prev.cellClassName === next.cellClassName &&
	prev.autoFocus === next.autoFocus &&
	prev.column.fieldType === next.column.fieldType &&
	prev.column.key === next.column.key &&
	prev.editState.cellKey === next.editState.cellKey &&
	prev.editState.draftValue === next.editState.draftValue &&
	prev.editState.selectAllOnFocus === next.editState.selectAllOnFocus &&
	prev.editState.error === next.editState.error &&
	prev.editState.rowId === next.editState.rowId &&
	prev.onDraftValue === next.onDraftValue &&
	prev.position.height === next.position.height &&
	prev.position.left === next.position.left &&
	prev.position.top === next.position.top &&
	prev.position.width === next.position.width &&
	prev.scrollLeft === next.scrollLeft &&
	prev.scrollTop === next.scrollTop
));

SheetEditorOverlay.displayName = 'SheetEditorOverlay';

export default SheetEditorOverlay;
