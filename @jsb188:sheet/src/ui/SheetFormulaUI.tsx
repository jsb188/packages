import { cn } from '@jsb188/app/utils/string.ts';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';

export type SheetFormulaUIProps = {
	children: ReactNode;
	className?: string;
	error?: string | null;
};

/*
 * Return inline styles that keep the formula input in normal Sheet layout flow.
 */
function getSheetFormulaUIStyle(): CSSProperties {
	return {
		position: 'relative',
		width: '100%',
		zIndex: 2,
	};
}

/*
 * Stop formula input pointer gestures from reopening canvas cell edit mode.
 */
function stopSheetFormulaUIDoubleClick(event: MouseEvent<HTMLDivElement>) {
	event.stopPropagation();
}

/*
 * Render the full-width formula editor layer above the canvas Sheet.
 */
export function SheetFormulaUI(p: SheetFormulaUIProps) {
	return <div
		className={cn('sheet_formula_ui no_shrink bg', p.error ? 'error' : '', p.className)}
		data-sheet-formula-ui='true'
		onDoubleClick={stopSheetFormulaUIDoubleClick}
		style={getSheetFormulaUIStyle()}
	>
		{p.children}
	</div>;
}

export default SheetFormulaUI;
