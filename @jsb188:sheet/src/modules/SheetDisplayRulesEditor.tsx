import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { SHEET_DISPLAY_RULE_MAX_BRANCHES } from '@jsb188/mday/constants/sheet.ts';
import type { SheetCellValueTypeEnum, SheetDisplayRuleOperatorEnum, SheetDisplayRulesForTypeObj } from '@jsb188/mday/types/sheet.d.ts';
import { normalizeSheetDisplayRules } from '@jsb188/mday/utils/sheet.ts';
import { TooltipButton } from '@jsb188/react-web/modules/PopOver';
import { COMMON_ICON_NAMES, Icon } from '@jsb188/react-web/svgs/Icon';
import { memo, useCallback, useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { getSheetCellValueTypeLabel } from '../libs/SheetContextMenu.tsx';
import type { SheetEditorOverlayPosition } from './SheetEditorOverlay.tsx';

/* Pseudo-operators the editor adds on top of the stored operator enum; both
 * persist as eq/neq branches with a null "is empty" comparison value */
const SHEET_DISPLAY_RULES_EDITOR_EMPTY_OP = 'empty';
const SHEET_DISPLAY_RULES_EDITOR_NOT_EMPTY_OP = 'not_empty';

const SHEET_DISPLAY_RULES_EDITOR_INPUT_CLASS = 'h_30 px_8 bd_1 bd_lt r_4 bg ft_xs';
const SHEET_DISPLAY_RULES_EDITOR_DATE_FORMAT_PLACEHOLDER = "MMM d ''yy";

type SheetDisplayRulesEditorOutputMode = 'text' | 'format';

type SheetDisplayRulesEditorBranchDraft = {
	id: number;
	op: string;
	then: string;
	thenFormat: string;
	thenMode: SheetDisplayRulesEditorOutputMode;
	value: string;
};

type SheetDisplayRulesEditorDragState = {
	startClientX: number;
	startClientY: number;
	startOffsetX: number;
	startOffsetY: number;
};

type SheetDisplayRulesEditorOffset = {
	x: number;
	y: number;
};

export type SheetDisplayRulesEditorProps = {
	className?: string;
	onClose: () => void;
	onSave: (rules: SheetDisplayRulesForTypeObj | null) => void;
	position: SheetEditorOverlayPosition;
	scrollLeft: number;
	scrollTop: number;
	value?: SheetDisplayRulesForTypeObj | null;
	valueType: SheetCellValueTypeEnum;
};

/*
 * Return whether one value type supports ordered comparison operators.
 */
function sheetDisplayRulesEditorTypeHasComparisons(valueType: SheetCellValueTypeEnum) {
	return valueType === 'CELL_INT' || valueType === 'CELL_FLOAT' || valueType === 'CELL_DATE';
}

/*
 * Return whether one value type supports output formatting in display rules.
 */
function sheetDisplayRulesEditorTypeHasOutputFormat(valueType: SheetCellValueTypeEnum) {
	return valueType === 'CELL_DATE';
}

/*
 * Return the operator dropdown options for one value type.
 */
function getSheetDisplayRulesEditorOperatorOptions(valueType: SheetCellValueTypeEnum) {
	return [
		{ label: i18n.t('sheet.display_rule_op_eq'), value: 'eq' },
		{ label: i18n.t('sheet.display_rule_op_neq'), value: 'neq' },
		...(sheetDisplayRulesEditorTypeHasComparisons(valueType)
			? [
				{ label: i18n.t('sheet.display_rule_op_gt'), value: 'gt' },
				{ label: i18n.t('sheet.display_rule_op_gte'), value: 'gte' },
				{ label: i18n.t('sheet.display_rule_op_lt'), value: 'lt' },
				{ label: i18n.t('sheet.display_rule_op_lte'), value: 'lte' },
			]
			: []),
		{ label: i18n.t('sheet.display_rule_op_is_empty'), value: SHEET_DISPLAY_RULES_EDITOR_EMPTY_OP },
		{ label: i18n.t('sheet.display_rule_op_is_not_empty'), value: SHEET_DISPLAY_RULES_EDITOR_NOT_EMPTY_OP },
	];
}

/*
 * Return the default comparison input value for one value type.
 */
function getSheetDisplayRulesEditorDefaultValue(valueType: SheetCellValueTypeEnum) {
	return valueType === 'CELL_BOOLEAN' ? 'TRUE' : '';
}

/*
 * Return the output mode for one saved branch, defaulting existing rules to
 * literal text and using format mode only when a supported format is saved.
 */
function getSheetDisplayRulesEditorBranchOutputMode(
	valueType: SheetCellValueTypeEnum,
	branch: { thenFormat?: string | null },
): SheetDisplayRulesEditorOutputMode {
	return sheetDisplayRulesEditorTypeHasOutputFormat(valueType) && branch.thenFormat ? 'format' : 'text';
}

/*
 * Return the input placeholder for one display-rule output field.
 */
function getSheetDisplayRulesEditorOutputPlaceholder(
	valueType: SheetCellValueTypeEnum,
	mode: SheetDisplayRulesEditorOutputMode,
) {
	return sheetDisplayRulesEditorTypeHasOutputFormat(valueType) && mode === 'format'
		? SHEET_DISPLAY_RULES_EDITOR_DATE_FORMAT_PLACEHOLDER
		: undefined;
}

/*
 * Return editable branch drafts from saved display rules, mapping null "is
 * empty" comparison values back to the editor's pseudo-operators.
 */
function getSheetDisplayRulesEditorBranchDrafts(
	valueType: SheetCellValueTypeEnum,
	value?: SheetDisplayRulesForTypeObj | null,
): SheetDisplayRulesEditorBranchDraft[] {
	const drafts = (value?.if || []).map((branch, index) => ({
		id: index + 1,
		op: branch.value === null
			? (branch.op === 'neq' ? SHEET_DISPLAY_RULES_EDITOR_NOT_EMPTY_OP : SHEET_DISPLAY_RULES_EDITOR_EMPTY_OP)
			: branch.op,
		then: branch.then ?? '',
		thenFormat: branch.thenFormat ?? '',
		thenMode: getSheetDisplayRulesEditorBranchOutputMode(valueType, branch),
		value: branch.value === null
			? ''
			: typeof branch.value === 'boolean'
			? (branch.value ? 'TRUE' : 'FALSE')
			: String(branch.value),
	}));

	return drafts.length ? drafts : [{
		id: 1,
		op: 'eq',
		then: '',
		thenFormat: '',
		thenMode: 'text',
		value: getSheetDisplayRulesEditorDefaultValue(valueType),
	}];
}

/*
 * Return the persisted rules shape for the current editor drafts. Values stay
 * strings here; normalizeSheetDisplayRules coerces them per value type.
 */
function getSheetDisplayRulesEditorDraftRules(
	branches: SheetDisplayRulesEditorBranchDraft[],
	elseText: string,
	elseFormat: string,
	elseMode: SheetDisplayRulesEditorOutputMode,
	valueType: SheetCellValueTypeEnum,
): SheetDisplayRulesForTypeObj {
	const fallbackFormatBranch = branches.find((branch) => (
		sheetDisplayRulesEditorTypeHasOutputFormat(valueType) &&
		branch.thenMode === 'format' &&
		branch.op === 'eq' &&
		branch.value.trim() === '' &&
		branch.thenFormat !== ''
	));
	const normalizedElseFormat = sheetDisplayRulesEditorTypeHasOutputFormat(valueType) && elseMode === 'format'
		? elseFormat
		: fallbackFormatBranch?.thenFormat || '';

	return {
		if: branches.map((branch) => {
			if (branch === fallbackFormatBranch) {
				return null;
			}

			const output = sheetDisplayRulesEditorTypeHasOutputFormat(valueType) && branch.thenMode === 'format'
				? { then: branch.then, thenFormat: branch.thenFormat }
				: { then: branch.then };

			if (branch.op === SHEET_DISPLAY_RULES_EDITOR_EMPTY_OP) {
				return { op: 'eq' as SheetDisplayRuleOperatorEnum, value: null, ...output };
			}

			if (branch.op === SHEET_DISPLAY_RULES_EDITOR_NOT_EMPTY_OP) {
				return { op: 'neq' as SheetDisplayRuleOperatorEnum, value: null, ...output };
			}

			return { op: branch.op as SheetDisplayRuleOperatorEnum, value: branch.value, ...output };
		}).filter((branch): branch is SheetDisplayRulesForTypeObj['if'][number] => Boolean(branch)),
		...(elseText.trim() !== '' ? { else: elseText } : {}),
		...(normalizedElseFormat !== ''
			? { elseFormat: normalizedElseFormat }
			: {}),
	};
}

/*
 * Return absolute overlay styles for the sheet display rules editor.
 */
function getSheetDisplayRulesEditorStyle(
	position: SheetEditorOverlayPosition,
	scrollLeft: number,
	scrollTop: number,
	offset: SheetDisplayRulesEditorOffset,
): CSSProperties {
	return {
		left: scrollLeft + position.left + offset.x,
		position: 'absolute',
		top: scrollTop + position.top + position.height + 1 + offset.y,
		zIndex: 44,
	};
}

/*
 * Render the comparison value input for one branch row, typed per value type.
 */
function SheetDisplayRulesEditorValueInput(p: {
	branch: SheetDisplayRulesEditorBranchDraft;
	onChange: (id: number, value: string) => void;
	valueType: SheetCellValueTypeEnum;
}) {
	const ariaLabel = i18n.t('sheet.display_rules_if');

	if (p.valueType === 'CELL_BOOLEAN') {
		return <select
			aria-label={ariaLabel}
			className={cn('no_shrink', SHEET_DISPLAY_RULES_EDITOR_INPUT_CLASS)}
			onChange={(event) => p.onChange(p.branch.id, event.currentTarget.value)}
			value={p.branch.value}
		>
			<option value="TRUE">{i18n.t('sheet.display_rule_value_true')}</option>
			<option value="FALSE">{i18n.t('sheet.display_rule_value_false')}</option>
		</select>;
	}

	return <input
		aria-label={ariaLabel}
		className={cn('f', SHEET_DISPLAY_RULES_EDITOR_INPUT_CLASS)}
		onChange={(event) => p.onChange(p.branch.id, event.currentTarget.value)}
		size={1}
		step={p.valueType === 'CELL_FLOAT' ? 'any' : undefined}
		type={p.valueType === 'CELL_DATE' ? 'date' : p.valueType === 'CELL_TEXT' ? 'text' : 'number'}
		value={p.branch.value}
	/>;
}

/*
 * Render the output-mode selector for value types that can format the original
 * typed cell value.
 */
function SheetDisplayRulesEditorOutputModeInput(p: {
	id: number;
	mode: SheetDisplayRulesEditorOutputMode;
	onChange: (id: number, mode: SheetDisplayRulesEditorOutputMode) => void;
	valueType: SheetCellValueTypeEnum;
}) {
	if (!sheetDisplayRulesEditorTypeHasOutputFormat(p.valueType)) {
		return null;
	}

	return <select
		aria-label={i18n.t('sheet.display_rules_output_mode')}
		className={cn('no_shrink', SHEET_DISPLAY_RULES_EDITOR_INPUT_CLASS)}
		onChange={(event) => p.onChange(p.id, event.currentTarget.value as SheetDisplayRulesEditorOutputMode)}
		value={p.mode}
	>
		<option value="text">{i18n.t('sheet.display_rules_output_text')}</option>
		<option value="format">{i18n.t('sheet.display_rules_output_date_format')}</option>
	</select>;
}

/*
 * Render a draggable Sheet display rules editor overlay anchored on the
 * selected cell. Saving emits the normalized rules for the target value type;
 * saving null clears that value type's rules.
 */
export const SheetDisplayRulesEditor = memo((p: SheetDisplayRulesEditorProps) => {
	const [branches, setBranches] = useState<SheetDisplayRulesEditorBranchDraft[]>(
		() => getSheetDisplayRulesEditorBranchDrafts(p.valueType, p.value),
	);
	const [elseText, setElseText] = useState(typeof p.value?.else === 'string' ? p.value.else : '');
	const [elseFormat, setElseFormat] = useState(typeof p.value?.elseFormat === 'string' ? p.value.elseFormat : '');
	const [elseMode, setElseMode] = useState<SheetDisplayRulesEditorOutputMode>(
		sheetDisplayRulesEditorTypeHasOutputFormat(p.valueType) && p.value?.elseFormat ? 'format' : 'text',
	);
	const [dragOffset, setDragOffset] = useState<SheetDisplayRulesEditorOffset>({ x: 0, y: 0 });
	const [dragVersion, setDragVersion] = useState(0);
	const dragStateRef = useRef<SheetDisplayRulesEditorDragState | null>(null);
	const nextBranchIdRef = useRef(branches.length + 1);
	const operatorOptions = getSheetDisplayRulesEditorOperatorOptions(p.valueType);
	const valueSignature = JSON.stringify(p.value || null);

	/*
	 * Refresh local editor drafts when the resolved saved rules arrive or switch
	 * while the overlay instance is already mounted.
	 */
	useEffect(() => {
		const nextBranches = getSheetDisplayRulesEditorBranchDrafts(p.valueType, p.value);

		setBranches(nextBranches);
		setElseText(typeof p.value?.else === 'string' ? p.value.else : '');
		setElseFormat(typeof p.value?.elseFormat === 'string' ? p.value.elseFormat : '');
		setElseMode(sheetDisplayRulesEditorTypeHasOutputFormat(p.valueType) && p.value?.elseFormat ? 'format' : 'text');
		nextBranchIdRef.current = nextBranches.length + 1;
	}, [p.valueType, valueSignature]);

	/*
	 * Begin dragging the editor from its handle.
	 */
	const handleDragStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) {
			return;
		}

		event.preventDefault();
		dragStateRef.current = {
			startClientX: event.clientX,
			startClientY: event.clientY,
			startOffsetX: dragOffset.x,
			startOffsetY: dragOffset.y,
		};
		setDragVersion((current) => current + 1);
	}, [dragOffset.x, dragOffset.y]);

	/*
	 * Keep editor control interactions from reaching the Sheet grid pointer handler.
	 */
	const handleEditorPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		event.stopPropagation();
	}, []);

	/*
	 * Keep double-clicks inside editor controls from opening a Sheet cell editor.
	 */
	const handleEditorDoubleClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
		event.stopPropagation();
	}, []);

	/*
	 * Store a new operator for one branch row.
	 */
	const handleBranchOpChange = useCallback((id: number, event: ChangeEvent<HTMLSelectElement>) => {
		const op = event.currentTarget.value;
		setBranches((current) => current.map((branch) => branch.id === id ? { ...branch, op } : branch));
	}, []);

	/*
	 * Store a new comparison value for one branch row.
	 */
	const handleBranchValueChange = useCallback((id: number, value: string) => {
		setBranches((current) => current.map((branch) => branch.id === id ? { ...branch, value } : branch));
	}, []);

	/*
	 * Store a new display text for one branch row.
	 */
	const handleBranchThenChange = useCallback((id: number, event: ChangeEvent<HTMLInputElement>) => {
		const then = event.currentTarget.value;
		setBranches((current) => current.map((branch) => branch.id === id ? { ...branch, then } : branch));
	}, []);

	/*
	 * Store a new output format for one branch row.
	 */
	const handleBranchThenFormatChange = useCallback((id: number, event: ChangeEvent<HTMLInputElement>) => {
		const thenFormat = event.currentTarget.value;
		setBranches((current) => current.map((branch) => branch.id === id ? { ...branch, thenFormat } : branch));
	}, []);

	/*
	 * Store a new output mode for one branch row.
	 */
	const handleBranchThenModeChange = useCallback((id: number, mode: SheetDisplayRulesEditorOutputMode) => {
		setBranches((current) => current.map((branch) => branch.id === id ? { ...branch, thenMode: mode } : branch));
	}, []);

	/*
	 * Append one empty branch row.
	 */
	const handleAddBranch = useCallback(() => {
		setBranches((current) => {
			if (current.length >= SHEET_DISPLAY_RULE_MAX_BRANCHES) {
				return current;
			}

			return [...current, {
				id: nextBranchIdRef.current++,
				op: 'eq',
				then: '',
				thenFormat: '',
				thenMode: 'text',
				value: getSheetDisplayRulesEditorDefaultValue(p.valueType),
			}];
		});
	}, [p.valueType]);

	/*
	 * Remove one branch row.
	 */
	const handleRemoveBranch = useCallback((id: number) => {
		setBranches((current) => current.filter((branch) => branch.id !== id));
	}, []);

	/*
	 * Save the normalized draft rules for the target value type.
	 */
	const handleApply = useCallback(() => {
		const draftRules = getSheetDisplayRulesEditorDraftRules(branches, elseText, elseFormat, elseMode, p.valueType);
		const normalized = normalizeSheetDisplayRules({ [p.valueType]: draftRules })?.[p.valueType] || null;

		p.onSave(normalized);
		p.onClose();
	}, [branches, elseFormat, elseMode, elseText, p.onClose, p.onSave, p.valueType]);

	/*
	 * Clear the saved rules for the target value type.
	 */
	const handleClear = useCallback(() => {
		p.onSave(null);
		p.onClose();
	}, [p.onClose, p.onSave]);

	useEffect(() => {
		if (!dragStateRef.current) {
			return;
		}

		/*
		 * Move the editor by the current pointer delta.
		 */
		const handlePointerMove = (event: PointerEvent) => {
			const dragState = dragStateRef.current;

			if (!dragState) {
				return;
			}

			setDragOffset({
				x: dragState.startOffsetX + event.clientX - dragState.startClientX,
				y: dragState.startOffsetY + event.clientY - dragState.startClientY,
			});
		};

		/*
		 * Stop moving the editor when the pointer is released.
		 */
		const handlePointerUp = () => {
			dragStateRef.current = null;
			globalThis.window?.removeEventListener('pointermove', handlePointerMove);
			globalThis.window?.removeEventListener('pointerup', handlePointerUp);
			globalThis.window?.removeEventListener('pointercancel', handlePointerUp);
		};

		globalThis.window?.addEventListener('pointermove', handlePointerMove);
		globalThis.window?.addEventListener('pointerup', handlePointerUp);
		globalThis.window?.addEventListener('pointercancel', handlePointerUp);

		return () => {
			globalThis.window?.removeEventListener('pointermove', handlePointerMove);
			globalThis.window?.removeEventListener('pointerup', handlePointerUp);
			globalThis.window?.removeEventListener('pointercancel', handlePointerUp);
		};
	}, [dragVersion]);

	return <div
		className={cn('bg shadow_light ft_xs', p.className)}
		data-sheet-display-rules-editor="true"
		onDoubleClick={handleEditorDoubleClick}
		onPointerDown={handleEditorPointerDown}
		style={{ ...getSheetDisplayRulesEditorStyle(p.position, p.scrollLeft, p.scrollTop, dragOffset), width: 620 }}
	>
		<TooltipButton
			as="div"
			closeWhilePointerDown
			showDelayMs={500}
			message={i18n.t('form.click_to_drag_window')}
			position="top"
		>
			<div className="h_10 rel pattern_texture medium_bf bg_fade bg_primary_fd_hv cs_grab" onPointerDown={handleDragStart} />
		</TooltipButton>
		<div className="grid gap_10 p_15">
			<div className="h_spread gap_8">
				<div className="ft_medium">
					{i18n.t('sheet.display_rules')}
				</div>
				<div className="cl_md">
					{getSheetCellValueTypeLabel(p.valueType)}
				</div>
			</div>

			{branches.map((branch) => {
				const hasValueInput = branch.op !== SHEET_DISPLAY_RULES_EDITOR_EMPTY_OP &&
					branch.op !== SHEET_DISPLAY_RULES_EDITOR_NOT_EMPTY_OP;

				return <div className="h_item gap_8" key={branch.id}>
					<span className="cl_md no_shrink">
						{i18n.t('sheet.display_rules_if')}
					</span>

					<select
						aria-label={i18n.t('sheet.display_rules_if')}
						className={cn('no_shrink', SHEET_DISPLAY_RULES_EDITOR_INPUT_CLASS)}
						onChange={(event) => handleBranchOpChange(branch.id, event)}
						value={branch.op}
					>
						{operatorOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>

					{hasValueInput && (
						<SheetDisplayRulesEditorValueInput
							branch={branch}
							onChange={handleBranchValueChange}
							valueType={p.valueType}
						/>
					)}

					<span className="cl_md no_shrink">
						{i18n.t('sheet.display_rules_then')}
					</span>

					<SheetDisplayRulesEditorOutputModeInput
						id={branch.id}
						mode={branch.thenMode}
						onChange={handleBranchThenModeChange}
						valueType={p.valueType}
					/>

					<input
						aria-label={i18n.t('sheet.display_rules_then')}
						className={cn('f', SHEET_DISPLAY_RULES_EDITOR_INPUT_CLASS)}
						onChange={(event) => branch.thenMode === 'format'
							? handleBranchThenFormatChange(branch.id, event)
							: handleBranchThenChange(branch.id, event)}
						placeholder={getSheetDisplayRulesEditorOutputPlaceholder(p.valueType, branch.thenMode)}
						size={1}
						type="text"
						value={branch.thenMode === 'format' ? branch.thenFormat : branch.then}
					/>

					<button
						aria-label={i18n.t('form.remove')}
						className="ic_sm no_shrink p_0 cl_md"
						disabled={branches.length <= 1}
						onClick={() => handleRemoveBranch(branch.id)}
						type="button"
					>
						<Icon name={COMMON_ICON_NAMES.close} />
					</button>
				</div>;
			})}

			<div className="h_item gap_8">
				<span className="cl_md no_shrink">
					{i18n.t('sheet.display_rules_else')}
				</span>

				<SheetDisplayRulesEditorOutputModeInput
					id={0}
					mode={elseMode}
					onChange={(_id, mode) => setElseMode(mode)}
					valueType={p.valueType}
				/>

				<input
					aria-label={i18n.t('sheet.display_rules_else')}
					className={cn('f', SHEET_DISPLAY_RULES_EDITOR_INPUT_CLASS)}
					onChange={(event) => elseMode === 'format'
						? setElseFormat(event.currentTarget.value)
						: setElseText(event.currentTarget.value)}
					placeholder={getSheetDisplayRulesEditorOutputPlaceholder(p.valueType, elseMode)}
					size={1}
					type="text"
					value={elseMode === 'format' ? elseFormat : elseText}
				/>
			</div>

			<div className="h_spread gap_8">
				<button
					className="h_30 px_8 bd_1 bd_lt r_4 bg ft_tn"
					disabled={branches.length >= SHEET_DISPLAY_RULE_MAX_BRANCHES}
					onClick={handleAddBranch}
					type="button"
				>
					{i18n.t('sheet.display_rules_add_branch')}
				</button>

				<div className="h_item gap_8">
					{p.value && (
						<button
							className="h_30 px_8 bd_1 bd_lt r_4 bg ft_tn cl_err_hv"
							onClick={handleClear}
							type="button"
						>
							{i18n.t('sheet.display_rules_clear')}
						</button>
					)}

					<button
						className="h_30 px_12 pb_1 a_c bg_primary cl_white ft_tn r_4"
						onClick={handleApply}
						type="button"
					>
						{i18n.t('form.apply')}
					</button>
				</div>
			</div>
		</div>
	</div>;
});

SheetDisplayRulesEditor.displayName = 'SheetDisplayRulesEditor';
