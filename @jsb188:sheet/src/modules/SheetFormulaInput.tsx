import { cn } from '@jsb188/app/utils/string.ts';
import { Icon } from '@jsb188/react-web/svgs/Icon';
import type {
	SheetUIColumn,
	SheetUIEditState,
} from '@jsb188/react-web/ui/SheetUI';
import { memo, useCallback, type ChangeEvent, type FocusEvent } from 'react';
import { SheetFormulaUI } from '../ui/SheetFormulaUI.tsx';

export type SheetFormulaInputProps = {
	canEdit?: boolean;
	className?: string;
	column?: SheetUIColumn | null;
	editState?: SheetUIEditState | null;
	error?: string | null;
	onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
	onDraftValue: (draftValue: string) => void;
	onEditStart?: () => void;
	readOnly?: boolean;
	value: string;
};

/*
 * Return the input type that should edit one Sheet column in the formula bar.
 */
function getSheetFormulaInputType(fieldType: SheetUIColumn['fieldType']) {
	return fieldType === 'NUMBER' || fieldType === 'PRICE' ? 'number' : 'text';
}

/*
 * Render the top-of-sheet input that owns plain cell text editing.
 */
export const SheetFormulaInput = memo((p: SheetFormulaInputProps) => {
	const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		if (p.readOnly || !p.editState) {
			return;
		}

		p.onDraftValue(event.currentTarget.value);
	}, [p.editState, p.onDraftValue, p.readOnly]);
	const handleFocus = useCallback(() => {
		if (!p.canEdit || p.readOnly) {
			return;
		}

		p.onEditStart?.();
	}, [p.canEdit, p.onEditStart, p.readOnly]);
	const fieldType = p.column?.fieldType || 'TEXT';
	const canUseInput = Boolean(p.canEdit || p.editState);

	return <SheetFormulaUI
		className={p.className}
		error={p.error || p.editState?.error}
	>
		<div className='bg w_f'>
      <label className='h_item ft_xs'>
        <span className='ic_sm no_shrink ml_8 cl_darker_4' aria-hidden='true'>
          <Icon name='layer-style' />
        </span>
        <input
          className={cn('sheet_formula_input stock pl_6 pr_8 py_6 ft_normal ft_xs f bd_0')}
          data-cell-key={p.editState?.cellKey}
          data-field-type={fieldType}
          data-row-id={p.editState?.rowId}
          data-sheet-editor={p.editState && !p.readOnly ? 'true' : undefined}
          readOnly={p.readOnly || !canUseInput}
          value={p.value}
          onBlur={p.editState && !p.readOnly ? p.onBlur : undefined}
          onChange={handleChange}
          onFocus={handleFocus}
          type={getSheetFormulaInputType(fieldType)}
        />
      </label>
		</div>
	</SheetFormulaUI>;
});

SheetFormulaInput.displayName = 'SheetFormulaInput';

export default SheetFormulaInput;
