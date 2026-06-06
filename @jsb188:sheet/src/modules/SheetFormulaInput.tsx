import { cn } from '@jsb188/app/utils/string.ts';
import {
	isSheetFormulaText,
	normalizeSheetFormulaDataTableName,
	parseSheetFormulaDataTableCall,
	tokenizeSheetFormulaReferences,
	type SheetFormulaReferenceToken,
} from '@jsb188/mday/utils/sheet.ts';
import type {
	DataTableDesignCellGQL,
	DataTableGQL,
} from '@jsb188/mday/types/dataTable.d.ts';
import { Icon } from '@jsb188/react-web/svgs/Icon';
import type {
	SheetUIColumn,
	SheetUIEditState,
} from '@jsb188/react-web/ui/SheetUI';
import {
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type CSSProperties,
	type ChangeEvent,
	type FocusEvent,
	type MouseEvent,
	type ReactNode,
	type SyntheticEvent,
} from 'react';
import { SheetFormulaUI } from '../ui/SheetFormulaUI.tsx';

export type SheetFormulaInputProps = {
	canEdit?: boolean;
	className?: string;
	column?: SheetUIColumn | null;
	dataTables?: DataTableGQL[] | null;
	editState?: SheetUIEditState | null;
	error?: string | null;
	onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
	onDraftValue: (draftValue: string) => void;
	onEditStart?: () => void;
	readOnly?: boolean;
	value: string;
};

type SheetFormulaSuggestionMenuPosition = {
	left: number;
	top: number;
};

type SheetFormulaSuggestionOption =
	| {
		description: string;
		kind: 'DATA_TABLE';
		label: string;
		value: string;
	}
	| {
		cell: DataTableDesignCellGQL;
		description: string;
		kind: 'DATA_TABLE_CELL';
		label: string;
		value: string;
	};

type SheetFormulaSuggestionDataTable = {
	dataTable: DataTableGQL;
	formulaName: string;
};

const SHEET_FORMULA_INPUT_PADDING = '6px 8px 6px 6px';
const SHEET_FORMULA_SUGGESTION_MENU_WIDTH = 240;
const SHEET_FORMULA_SHELL_STYLE: CSSProperties = {
	display: 'block',
	minWidth: 0,
};
const SHEET_FORMULA_MIRROR_STYLE: CSSProperties = {
	boxSizing: 'border-box',
	color: 'rgb(var(--color-default))',
	inset: 0,
	overflow: 'hidden',
	padding: SHEET_FORMULA_INPUT_PADDING,
	pointerEvents: 'none',
	position: 'absolute',
	whiteSpace: 'pre',
	zIndex: 1,
};
const SHEET_FORMULA_INPUT_STYLE: CSSProperties = {
	background: 'transparent',
	caretColor: 'rgb(var(--color-default))',
	position: 'relative',
	width: '100%',
	zIndex: 2,
};
const SHEET_FORMULA_HIGHLIGHT_INPUT_STYLE: CSSProperties = {
	...SHEET_FORMULA_INPUT_STYLE,
	color: 'transparent',
};
const SHEET_FORMULA_TOKEN_HIGHLIGHTS = [
	'var(--color-orange-light)',
	'var(--color-amber-light)',
	'var(--color-yellow-light)',
	'var(--color-lime-light)',
	'var(--color-green-light)',
	'var(--color-emerald-light)',
	'var(--color-teal-light)',
	'var(--color-cyan-light)',
	'var(--color-sky-light)',
	'var(--color-blue-light)',
	'var(--color-indigo-light)',
	'var(--color-violet-light)',
	'var(--color-purple-light)',
	'var(--color-fuchsia-light)',
	'var(--color-pink-light)',
	'var(--color-rose-light)',
	'var(--color-slate-light)',
];

/*
 * Schedule a browser paint-frame callback with a timer fallback for tests.
 */
function requestSheetFormulaAnimationFrame(callback: FrameRequestCallback) {
	return globalThis.requestAnimationFrame
		? globalThis.requestAnimationFrame(callback)
		: globalThis.setTimeout(() => {
			callback(globalThis.performance?.now?.() || Date.now());
		}, 0);
}

/*
 * Cancel a scheduled formula input frame callback.
 */
function cancelSheetFormulaAnimationFrame(frameId: number) {
	if (globalThis.cancelAnimationFrame) {
		globalThis.cancelAnimationFrame(frameId);
		return;
	}

	globalThis.clearTimeout(frameId);
}

/*
 * Return a small stable hash for assigning reference highlight colors.
 */
function getSheetFormulaTextHash(value: string) {
	let hash = 0;

	for (let index = 0; index < value.length; index += 1) {
		hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
	}

	return Math.abs(hash);
}

/*
 * Return the highlight background for one formula reference token.
 */
function getSheetFormulaTokenHighlight(token: SheetFormulaReferenceToken) {
	const colorIndex = getSheetFormulaTextHash(`${token.kind}:${token.text}`) % SHEET_FORMULA_TOKEN_HIGHLIGHTS.length;

	return SHEET_FORMULA_TOKEN_HIGHLIGHTS[colorIndex];
}

/*
 * Return inline styles for the formula mirror viewport.
 */
function getSheetFormulaMirrorStyle(): CSSProperties {
	return SHEET_FORMULA_MIRROR_STYLE;
}

/*
 * Return inline styles for the horizontally shifted mirror content.
 */
function getSheetFormulaMirrorContentStyle(scrollLeft: number): CSSProperties {
	return {
		display: 'inline-block',
		minWidth: '100%',
		transform: `translateX(${-scrollLeft}px)`,
	};
}

/*
 * Return inline styles for the real native input.
 */
function getSheetFormulaInputStyle(hasHighlights: boolean): CSSProperties {
	return hasHighlights ? SHEET_FORMULA_HIGHLIGHT_INPUT_STYLE : SHEET_FORMULA_INPUT_STYLE;
}

/*
 * Return inline styles for the suggestion menu anchored under the active formula token.
 */
function getSheetFormulaSuggestionMenuStyle(position: SheetFormulaSuggestionMenuPosition): CSSProperties {
	return {
		left: position.left,
		position: 'absolute',
		top: position.top,
		width: SHEET_FORMULA_SUGGESTION_MENU_WIDTH,
		zIndex: 9,
	};
}

/*
 * Return whether a caret offset sits inside one formula token.
 */
function isSheetFormulaTokenActiveAtSelection(token: SheetFormulaReferenceToken, selectionStart: number) {
	return selectionStart >= token.startIndex && selectionStart <= token.endIndex;
}

/*
 * Return the formula token index under the current input caret.
 */
function getSheetFormulaActiveTokenIndex(tokens: SheetFormulaReferenceToken[], selectionStart: number | null) {
	if (selectionStart === null) {
		return -1;
	}

	return tokens.findIndex((token) => isSheetFormulaTokenActiveAtSelection(token, selectionStart));
}

/*
 * Return one DataTable's normalized formula function name.
 */
function getSheetFormulaDataTableFormulaName(dataTable: DataTableGQL) {
	return normalizeSheetFormulaDataTableName(String(dataTable.name || ''));
}

/*
 * Return DataTables that have a valid formula function name.
 */
function getSheetFormulaSuggestionDataTables(dataTables?: DataTableGQL[] | null) {
	return (dataTables || []).reduce((records, dataTable) => {
		const formulaName = getSheetFormulaDataTableFormulaName(dataTable);
		if (formulaName) {
			records.push({
				dataTable,
				formulaName,
			});
		}

		return records;
	}, [] as SheetFormulaSuggestionDataTable[]);
}

/*
 * Return one DataTable that matches a formula data table token.
 */
function getSheetFormulaTokenDataTable(dataTables: SheetFormulaSuggestionDataTable[], token: SheetFormulaReferenceToken | null) {
	if (!token || token.kind !== 'DATA_TABLE_CELL') {
		return null;
	}

	return dataTables.find((dataTable) => dataTable.formulaName === token.dataTableName)?.dataTable || null;
}

/*
 * Return visible design cells in the stored display order.
 */
function getSheetFormulaOrderedDesignCells(dataTable: DataTableGQL | null) {
	const cells = dataTable?.design?.cells || [];
	const cellsByKey = new Map(cells.map((cell) => [cell.key, cell]));
	const orderedCells = (dataTable?.design?.cellsOrder || [])
		.map((key) => cellsByKey.get(key))
		.filter((cell) => cell && !cell.hidden) as DataTableDesignCellGQL[];
	const orderedKeys = new Set(orderedCells.map((cell) => cell.key));
	const remainingCells = cells.filter((cell) => !cell.hidden && !orderedKeys.has(cell.key));

	return orderedCells.concat(remainingCells);
}

/*
 * Return the readable label for one formula data table suggestion.
 */
function getSheetFormulaDataTableSuggestionLabel(dataTable: DataTableGQL, formulaName: string) {
	return String(dataTable.title || dataTable.name || formulaName);
}

/*
 * Return the readable label for one formula data table cell suggestion.
 */
function getSheetFormulaCellSuggestionLabel(cell: DataTableDesignCellGQL) {
	return String(cell.label || cell.humanLabel || cell.key);
}

/*
 * Return suggestion options for the active formula data table token.
 */
function getSheetFormulaSuggestionOptions(formulaDataTables: SheetFormulaSuggestionDataTable[], token?: SheetFormulaReferenceToken | null): SheetFormulaSuggestionOption[] {
	if (!token || token.kind !== 'DATA_TABLE_CELL') {
		return [];
	}

	const activeDataTable = getSheetFormulaTokenDataTable(formulaDataTables, token);
	const dataTableOptions = formulaDataTables.map(({ dataTable, formulaName }) => {
		return {
			description: formulaName,
			kind: 'DATA_TABLE' as const,
			label: getSheetFormulaDataTableSuggestionLabel(dataTable, formulaName),
			value: formulaName,
		};
	});
	const cellOptions = getSheetFormulaOrderedDesignCells(activeDataTable).map((cell) => {
		return {
			cell,
			description: cell.key,
			kind: 'DATA_TABLE_CELL' as const,
			label: getSheetFormulaCellSuggestionLabel(cell),
			value: cell.key,
		};
	});

	return [
		...dataTableOptions,
		...cellOptions,
	];
}

/*
 * Return a formula string with one reference token replaced.
 */
function replaceSheetFormulaTokenValue(value: string, token: SheetFormulaReferenceToken, replacement: string) {
	return value.slice(0, token.startIndex) + replacement + value.slice(token.endIndex);
}

/*
 * Return a data table call token with its table name replaced.
 */
function getSheetFormulaDataTableReplacement(token: SheetFormulaReferenceToken, formulaName: string) {
	if (token.kind !== 'DATA_TABLE_CELL') {
		return token.text;
	}

	const openParenIndex = token.text.indexOf('(');
	const prefix = token.text.trimStart().startsWith('@') ? '@' : '';

	return openParenIndex >= 0 ? `${prefix}${formulaName}${token.text.slice(openParenIndex)}` : token.text;
}

/*
 * Return a data table call token with its target cell key replaced.
 */
function getSheetFormulaDataTableCellReplacement(token: SheetFormulaReferenceToken, cell: DataTableDesignCellGQL) {
	if (token.kind !== 'DATA_TABLE_CELL') {
		return token.text;
	}

	const call = parseSheetFormulaDataTableCall(token.text);
	if (!call) {
		return token.text;
	}

	const prefix = token.text.trimStart().startsWith('@') ? '@' : '';

	return `${prefix}${call.dataTableName}(${call.rowIdentifierExpression}, ${JSON.stringify(cell.key)})`;
}

/*
 * Render mirrored formula text with colored reference spans.
 */
function renderSheetFormulaHighlightedText(value: string, tokens: SheetFormulaReferenceToken[]) {
	const children: ReactNode[] = [];
	let cursor = 0;

	tokens.forEach((token, index) => {
		if (token.startIndex > cursor) {
			children.push(
				<span key={`text_${cursor}_${token.startIndex}`}>
					{value.slice(cursor, token.startIndex)}
				</span>,
			);
		}

		children.push(
			<span
				className="sheet_formula_token"
				data-sheet-formula-token-index={index}
				key={`token_${token.startIndex}_${token.endIndex}`}
				style={{
					'--sheet-formula-token-highlight': getSheetFormulaTokenHighlight(token),
				} as CSSProperties}
			>
				{value.slice(token.startIndex, token.endIndex)}
			</span>,
		);
		cursor = token.endIndex;
	});

	if (cursor < value.length) {
		children.push(
			<span key={`text_${cursor}_${value.length}`}>
				{value.slice(cursor)}
			</span>,
		);
	}

	return children;
}

/*
 * Render the small formula suggestion menu anchored below the active token.
 */
function renderSheetFormulaSuggestionMenu(params: {
	onMouseDown: (event: MouseEvent<HTMLElement>) => void;
	onOptionClick: (option: SheetFormulaSuggestionOption) => void;
	options: SheetFormulaSuggestionOption[];
	position: SheetFormulaSuggestionMenuPosition | null;
}) {
	if (!params.position || !params.options.length) {
		return null;
	}

	return (
		<div
			className="bg shadow_light r_4 ft_xs of"
			data-sheet-formula-suggestion-menu="true"
			onMouseDown={params.onMouseDown}
			style={getSheetFormulaSuggestionMenuStyle(params.position)}
		>
			{params.options.slice(0, 8).map((option) => (
				<button
					className="btn bl w_f h_spread gap_8 px_8 py_6 bg_active_hv"
					key={`${option.kind}_${option.value}`}
					onClick={() => {
						params.onOptionClick(option);
					}}
					type="button"
				>
					<span className="ellip ft_medium">{option.label}</span>
					<span className="no_shrink cl_darker_3">{option.description}</span>
				</button>
			))}
		</div>
	);
}

/*
 * Render the top-of-sheet input that owns plain cell text editing.
 */
export const SheetFormulaInput = memo((p: SheetFormulaInputProps) => {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const shellRef = useRef<HTMLSpanElement | null>(null);
	const syncFrameRef = useRef<number | null>(null);
	const pendingSelectionRef = useRef<number | null>(null);
	const [scrollLeft, setScrollLeft] = useState(0);
	const [activeTokenIndex, setActiveTokenIndex] = useState(-1);
	const [suggestionMenuPosition, setSuggestionMenuPosition] = useState<SheetFormulaSuggestionMenuPosition | null>(null);
	const fieldType = p.column?.fieldType || 'TEXT';
	const canUseInput = Boolean(p.canEdit || p.editState);
	const formulaTokens = useMemo(() => {
		return isSheetFormulaText(p.value) ? tokenizeSheetFormulaReferences(p.value) : [];
	}, [p.value]);
	const formulaDataTables = useMemo(() => {
		return getSheetFormulaSuggestionDataTables(p.dataTables);
	}, [p.dataTables]);
	const activeToken = activeTokenIndex >= 0 ? formulaTokens[activeTokenIndex] || null : null;
	const suggestionOptions = useMemo(() => {
		return getSheetFormulaSuggestionOptions(formulaDataTables, activeToken);
	}, [activeToken, formulaDataTables]);
	const hasHighlights = formulaTokens.length > 0;
	const canShowSuggestions = Boolean(p.editState && !p.readOnly && suggestionOptions.length);

	/*
	 * Store the native input DOM node for scroll and caret measurements.
	 */
	const setInputRef = useCallback((node: HTMLInputElement | null) => {
		inputRef.current = node;
	}, []);

	/*
	 * Store the formula shell DOM node used to position suggestions.
	 */
	const setShellRef = useCallback((node: HTMLSpanElement | null) => {
		shellRef.current = node;
	}, []);

	/*
	 * Sync mirror scroll and active token state from the native input.
	 */
	const syncFormulaInputState = useCallback((input?: HTMLInputElement | null) => {
		const target = input || inputRef.current;

		if (syncFrameRef.current !== null) {
			cancelSheetFormulaAnimationFrame(syncFrameRef.current);
		}

		syncFrameRef.current = requestSheetFormulaAnimationFrame(() => {
			syncFrameRef.current = null;

			if (!target) {
				return;
			}

			setScrollLeft(target.scrollLeft);
			setActiveTokenIndex(getSheetFormulaActiveTokenIndex(formulaTokens, target.selectionStart));
		});
	}, [formulaTokens]);

	/*
	 * Store formula input edits in the active Sheet editor state.
	 */
	const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		if (p.readOnly || !p.editState) {
			return;
		}

		p.onDraftValue(event.currentTarget.value);
		syncFormulaInputState(event.currentTarget);
	}, [p.editState, p.onDraftValue, p.readOnly, syncFormulaInputState]);

	/*
	 * Start editing from focus and refresh caret-driven UI state.
	 */
	const handleFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
		if (!p.canEdit || p.readOnly) {
			return;
		}

		p.onEditStart?.();
		syncFormulaInputState(event.currentTarget);
	}, [p.canEdit, p.onEditStart, p.readOnly, syncFormulaInputState]);

	/*
	 * Refresh mirror scroll and active token state after native input activity.
	 */
	const handleInputActivity = useCallback((event: SyntheticEvent<HTMLInputElement>) => {
		syncFormulaInputState(event.currentTarget);
	}, [syncFormulaInputState]);

	/*
	 * Keep suggestion clicks from blurring and committing the formula input.
	 */
	const handleSuggestionMouseDown = useCallback((event: MouseEvent<HTMLElement>) => {
		event.preventDefault();
	}, []);

	/*
	 * Apply one suggestion option to the active formula token.
	 */
	const handleSuggestionOptionClick = useCallback((option: SheetFormulaSuggestionOption) => {
		if (p.readOnly || !p.editState || !activeToken) {
			return;
		}

		const replacement = option.kind === 'DATA_TABLE'
			? getSheetFormulaDataTableReplacement(activeToken, option.value)
			: getSheetFormulaDataTableCellReplacement(activeToken, option.cell);
		const nextValue = replaceSheetFormulaTokenValue(p.value, activeToken, replacement);
		const nextSelectionStart = activeToken.startIndex + replacement.length;

		pendingSelectionRef.current = nextSelectionStart;
		p.onDraftValue(nextValue);
	}, [activeToken, p.editState, p.onDraftValue, p.readOnly, p.value]);

	useEffect(() => {
		syncFormulaInputState();
	}, [syncFormulaInputState]);

	useEffect(() => {
		return () => {
			if (syncFrameRef.current !== null) {
				cancelSheetFormulaAnimationFrame(syncFrameRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (typeof document === 'undefined') {
			return;
		}

		/*
		 * Sync active token state when browser selection changes without an input event.
		 */
		function handleDocumentSelectionChange() {
			if (document.activeElement === inputRef.current) {
				syncFormulaInputState();
			}
		}

		document.addEventListener('selectionchange', handleDocumentSelectionChange);

		return () => {
			document.removeEventListener('selectionchange', handleDocumentSelectionChange);
		};
	}, [syncFormulaInputState]);

	useEffect(() => {
		const input = inputRef.current;
		const selectionStart = pendingSelectionRef.current;

		if (!input || selectionStart === null) {
			return;
		}

		pendingSelectionRef.current = null;
		input.focus();
		input.setSelectionRange(selectionStart, selectionStart);
		syncFormulaInputState(input);
	}, [p.value, syncFormulaInputState]);

	useEffect(() => {
		const shell = shellRef.current;
		const input = inputRef.current;

		if (!canShowSuggestions || !shell || !input || activeTokenIndex < 0) {
			setSuggestionMenuPosition(null);
			return;
		}

		const tokenElement = shell.querySelector(`[data-sheet-formula-token-index="${activeTokenIndex}"]`);
		if (!(tokenElement instanceof HTMLElement)) {
			setSuggestionMenuPosition(null);
			return;
		}

		const shellRect = shell.getBoundingClientRect();
		const tokenRect = tokenElement.getBoundingClientRect();
		if (tokenRect.right < shellRect.left || tokenRect.left > shellRect.right) {
			setSuggestionMenuPosition(null);
			return;
		}

		const maxLeft = Math.max(0, shellRect.width - SHEET_FORMULA_SUGGESTION_MENU_WIDTH);
		const left = Math.min(Math.max(0, tokenRect.left - shellRect.left), maxLeft);
		const top = input.offsetTop + input.offsetHeight + 4;

		setSuggestionMenuPosition((current) => {
			if (current?.left === left && current.top === top) {
				return current;
			}

			return {
				left,
				top,
			};
		});
	}, [activeTokenIndex, canShowSuggestions, formulaTokens, scrollLeft, suggestionOptions.length]);

	return <SheetFormulaUI
		className={p.className}
		error={p.error || p.editState?.error}
	>
		<div className='bg w_f'>
			<div className='h_item ft_xs'>
				<span className='ic_sm no_shrink ml_8 cl_darker_4' aria-hidden='true'>
					<Icon name='layer-style' />
				</span>
				<span
					className="rel f"
					ref={setShellRef}
					style={SHEET_FORMULA_SHELL_STYLE}
				>
					{hasHighlights ? (
						<span
							aria-hidden="true"
							className="ft_normal ft_xs"
							data-sheet-formula-highlight="true"
							style={getSheetFormulaMirrorStyle()}
						>
							<span style={getSheetFormulaMirrorContentStyle(scrollLeft)}>
								{renderSheetFormulaHighlightedText(p.value, formulaTokens)}
							</span>
						</span>
					) : null}
					<input
						className={cn('sheet_formula_input stock pl_6 pr_8 py_6 ft_normal ft_xs f bd_0')}
						data-cell-key={p.editState?.cellKey}
						data-field-type={fieldType}
						data-row-id={p.editState?.rowId}
						data-sheet-editor={p.editState && !p.readOnly ? 'true' : undefined}
						readOnly={p.readOnly || !canUseInput}
						ref={setInputRef}
						style={getSheetFormulaInputStyle(hasHighlights)}
						value={p.value}
						onBlur={p.editState && !p.readOnly ? p.onBlur : undefined}
						onChange={handleChange}
						onClick={handleInputActivity}
						onFocus={handleFocus}
						onKeyUp={handleInputActivity}
						onScroll={handleInputActivity}
						onSelect={handleInputActivity}
						type="text"
					/>
					{renderSheetFormulaSuggestionMenu({
						onMouseDown: handleSuggestionMouseDown,
						onOptionClick: handleSuggestionOptionClick,
						options: canShowSuggestions ? suggestionOptions : [],
						position: suggestionMenuPosition,
					})}
				</span>
			</div>
		</div>
	</SheetFormulaUI>;
});

SheetFormulaInput.displayName = 'SheetFormulaInput';

export default SheetFormulaInput;
