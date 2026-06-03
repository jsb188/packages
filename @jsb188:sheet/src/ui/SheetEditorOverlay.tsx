import { cn } from '@jsb188/app/utils/string.ts';
import type {
	SheetUIColumn,
	SheetUIEditState,
} from '@jsb188/react-web/ui/SheetUI';
import { memo, type CSSProperties, useCallback, useEffect, useRef } from 'react';

export type SheetEditorOverlayPosition = {
	height: number;
	left: number;
	top: number;
	width: number;
};

export type SheetEditorOverlayProps = {
	cellClassName?: string;
	column: SheetUIColumn;
	editState: SheetUIEditState;
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
		left: p.scrollLeft + p.position.left,
		position: 'absolute',
		top: p.scrollTop + p.position.top,
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
 * Render the DOM editor placed over one active canvas cell.
 */
export const SheetEditorOverlay = memo((p: SheetEditorOverlayProps) => {
	const editorRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
	const setEditorRef = useCallback((node: HTMLInputElement | HTMLTextAreaElement | null) => {
		editorRef.current = node;
	}, []);
	const editorClassName = cn('sheet_ui_editor bg stock px_6 ft_xs ft_normal', p.editState.error ? 'error' : '');
	const sharedProps = {
		className: editorClassName,
		'data-cell-key': p.editState.cellKey,
		'data-field-type': p.column.fieldType,
		'data-row-id': p.editState.rowId,
		'data-sheet-editor': 'true',
		defaultValue: p.editState.draftValue,
		ref: setEditorRef,
	};

	useEffect(() => {
		const editor = editorRef.current;

		if (!editor) {
			return;
		}

		editor.focus();
		editor.select?.();
	}, [p.editState.cellKey, p.editState.rowId]);

	return <div
		className={cn('sheet_overlay_editor', p.cellClassName)}
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
	prev.column.fieldType === next.column.fieldType &&
	prev.column.key === next.column.key &&
	prev.editState.cellKey === next.editState.cellKey &&
	prev.editState.draftValue === next.editState.draftValue &&
	prev.editState.error === next.editState.error &&
	prev.editState.rowId === next.editState.rowId &&
	prev.position.height === next.position.height &&
	prev.position.left === next.position.left &&
	prev.position.top === next.position.top &&
	prev.position.width === next.position.width &&
	prev.scrollLeft === next.scrollLeft &&
	prev.scrollTop === next.scrollTop
));

SheetEditorOverlay.displayName = 'SheetEditorOverlay';

export default SheetEditorOverlay;
