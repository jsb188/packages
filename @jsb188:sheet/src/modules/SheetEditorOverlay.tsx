import { cn } from '@jsb188/app/utils/string.ts';
import { getRGBColor } from '@jsb188/app/utils/color.ts';
import { isSheetFormulaText } from '@jsb188/mday/utils/sheet.ts';
import type {
	SheetUIColumn,
	SheetUIEditState,
} from '@jsb188/react-web/ui/SheetUI';
import { useIsomorphicLayoutEffect } from '@jsb188/react-web/utils/dom';
import { memo, type ChangeEvent, type CSSProperties, type ReactNode, useCallback, useRef } from 'react';
import type { SheetCanvasCellStyle } from '../libs/sheet-utils.ts';

const SHEET_EDITOR_BORDER_WIDTH = 2;
const SHEET_EDITOR_BORDER_COMPENSATION_STYLE: CSSProperties = {
	height: `calc(100% + ${SHEET_EDITOR_BORDER_WIDTH * 2}px)`,
	left: -SHEET_EDITOR_BORDER_WIDTH,
	position: 'relative',
	top: -SHEET_EDITOR_BORDER_WIDTH,
	width: `calc(100% + ${SHEET_EDITOR_BORDER_WIDTH * 2}px)`,
};
const SHEET_EDITOR_FORMULA_FIELD_STYLE: CSSProperties = {
	backgroundColor: 'rgb(var(--color-bg))',
};

export type SheetEditorOverlayPosition = {
	fontSize?: number | null;
	height: number;
	left: number;
	top: number;
	width: number;
};

export type SheetEditorOverlayFormulaInputProps = {
	autoFocus?: boolean;
	column: SheetUIColumn;
	editState: SheetUIEditState;
	onDraftValue: (draftValue: string) => void;
	selectAllOnFocus?: boolean;
	shellClassName: string;
	shellStyle: CSSProperties;
};

export type SheetEditorOverlayProps = {
	autoFocus?: boolean;
	cellClassName?: string;
	/* Resolved (pending-aware) style of the cell being edited */
	cellStyle?: SheetCanvasCellStyle | null;
	column: SheetUIColumn;
	editState: SheetUIEditState;
	onDraftValue: (draftValue: string) => void;
	position: SheetEditorOverlayPosition;
	renderFormulaInput?: (props: SheetEditorOverlayFormulaInputProps) => ReactNode;
	scrollLeft: number;
	scrollTop: number;
};

/*
 * Return a DOM-safe CSS color for one Sheet style color token or hex value.
 */
function getSheetEditorDomColor(color?: string | null) {
	if (!color) {
		return undefined;
	}

	const rgb = getRGBColor(color);
	return rgb ? `rgb(${rgb.red}, ${rgb.green}, ${rgb.blue})` : color;
}

/*
 * Return inline styles that keep the DOM editor fixed over its canvas cell.
 */
function getSheetEditorOverlayStyle(p: SheetEditorOverlayProps): CSSProperties {
	return {
		height: p.position.height + 1,
		left: p.scrollLeft + p.position.left,
		position: 'absolute',
		top: p.scrollTop + p.position.top,
		width: p.position.width + 1,
		zIndex: 43,
	};
}

/*
 * Return inline styles for the editor field itself: font size plus the
 * cell's current text/fill colors and text styles, so the editor matches the
 * canvas cell instantly (including unsaved pending style edits).
 */
function getSheetEditorFieldStyle(p: SheetEditorOverlayProps): CSSProperties | undefined {
	const fontSize = Number(p.position.fontSize || 0);
	const textColor = getSheetEditorDomColor(p.cellStyle?.textColor);
	const fillColor = getSheetEditorDomColor(p.cellStyle?.fillColor);
	const style: CSSProperties = {};

	if (Number.isFinite(fontSize) && fontSize > 0) {
		style.fontSize = fontSize;
	}
	if (textColor) {
		style.color = textColor;
	}
	if (fillColor) {
		style.backgroundColor = fillColor;
	}
	if (p.cellStyle?.bold) {
		style.fontWeight = 600;
	}
	if (p.cellStyle?.italic) {
		style.fontStyle = 'italic';
	}
	if (p.cellStyle?.underline || p.cellStyle?.strikethrough) {
		style.textDecoration = [
			p.cellStyle.underline ? 'underline' : '',
			p.cellStyle.strikethrough ? 'line-through' : '',
		].filter(Boolean).join(' ');
	}

	return Object.keys(style).length ? style : undefined;
}

/*
 * Return a stable comparison key for the editor-relevant style fields.
 */
function getSheetEditorCellStyleComparisonKey(cellStyle?: SheetCanvasCellStyle | null) {
	if (!cellStyle) {
		return '';
	}

	return [
		cellStyle.textColor || '',
		cellStyle.fillColor || '',
		cellStyle.bold ? '1' : '',
		cellStyle.italic ? '1' : '',
		cellStyle.underline ? '1' : '',
		cellStyle.strikethrough ? '1' : '',
	].join('|');
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
	const isFormulaEditor = isSheetFormulaText(p.editState.draftValue);
	const editorClassName = cn('sheet_ui_editor bg stock pb_2 px_8 ft_xs ft_normal bd_2 bd_contrast', p.editState.error ? 'error' : '');
	const formulaEditorClassName = cn('sheet_ui_editor bg stock ft_normal bd_2 bd_contrast', p.editState.error ? 'error' : '');
	const editorStyle: CSSProperties = {
		...SHEET_EDITOR_BORDER_COMPENSATION_STYLE,
		...(isFormulaEditor ? SHEET_EDITOR_FORMULA_FIELD_STYLE : getSheetEditorFieldStyle(p) || {}),
	};
	const sharedProps = {
		className: editorClassName,
		'data-cell-key': p.editState.cellKey,
		'data-field-type': p.column.fieldType,
		'data-row-id': p.editState.rowId,
		'data-sheet-editor': 'true',
		onChange: handleChange,
		ref: setEditorRef,
		style: editorStyle,
		value: p.editState.draftValue,
	};

	useIsomorphicLayoutEffect(() => {
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
		{isFormulaEditor && p.renderFormulaInput
			? p.renderFormulaInput({
				autoFocus: p.autoFocus,
				column: p.column,
				editState: p.editState,
				onDraftValue: p.onDraftValue,
				selectAllOnFocus: p.editState.selectAllOnFocus,
				shellClassName: formulaEditorClassName,
				shellStyle: editorStyle,
			})
			: isSheetEditorMultilineFieldType(p.column.fieldType)
			? <textarea {...sharedProps} />
			: <input
				{...sharedProps}
				type={getSheetEditorInputType(p.column.fieldType)}
			/>}
	</div>;
}, (prev, next) => (
	prev.cellClassName === next.cellClassName &&
	prev.autoFocus === next.autoFocus &&
	getSheetEditorCellStyleComparisonKey(prev.cellStyle) === getSheetEditorCellStyleComparisonKey(next.cellStyle) &&
	prev.column.fieldType === next.column.fieldType &&
	prev.column.key === next.column.key &&
	prev.editState.cellKey === next.editState.cellKey &&
	prev.editState.draftValue === next.editState.draftValue &&
	prev.editState.selectAllOnFocus === next.editState.selectAllOnFocus &&
	prev.editState.error === next.editState.error &&
	prev.editState.rowId === next.editState.rowId &&
	prev.onDraftValue === next.onDraftValue &&
	prev.position.height === next.position.height &&
	prev.position.fontSize === next.position.fontSize &&
	prev.position.left === next.position.left &&
	prev.position.top === next.position.top &&
	prev.position.width === next.position.width &&
	prev.renderFormulaInput === next.renderFormulaInput &&
	prev.scrollLeft === next.scrollLeft &&
	prev.scrollTop === next.scrollTop
));

SheetEditorOverlay.displayName = 'SheetEditorOverlay';

export default SheetEditorOverlay;
