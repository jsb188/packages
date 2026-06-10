import { cn } from '@jsb188/app/utils/string.ts';
import {
	isSheetFormulaText,
	normalizeSheetFormulaDataTableName,
	parseSheetFormulaCall,
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
	type KeyboardEvent,
	type MouseEvent,
	type SyntheticEvent,
} from 'react';
import {
	getSheetSemanticInputRenderableParts,
	useSheetSemanticInputHighlightState,
	type SheetSemanticInputPartSpan,
} from '../libs/sheet-semantic-input.ts';
import { SHEET_TEXT_INPUT_LAYOUT_STYLE } from '../libs/sheet-text-input-style.ts';
import { SheetFormulaUI } from '../ui/SheetFormulaUI.tsx';
import { SheetSemanticInputOverlay } from '../ui/SheetSemanticInputOverlay.tsx';

export type SheetFormulaInputProps = {
	canEdit?: boolean;
	className?: string;
	column?: SheetUIColumn | null;
	dataTables?: DataTableGQL[] | null;
	editState?: SheetUIEditState | null;
	error?: string | null;
	onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
	onCommit?: (input: HTMLInputElement) => void;
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

type SheetFormulaInputHighlightKind =
	| 'DATA_TABLE_CONDITION_COLUMN'
	| 'DATA_TABLE_CONDITION_COMBINATOR'
	| 'DATA_TABLE_CONDITION_OPERATOR'
	| 'DATA_TABLE_CONDITION_VALUE'
	| 'DATA_TABLE_NAME'
	| 'DATA_TABLE_RESULT_COLUMN'
	| 'DATA_TABLE_ROW_IDENTIFIER'
	| 'DATA_TABLE_WHERE'
	| 'SHEET_CELL'
	| 'SHEET_RANGE';

type SheetFormulaInputHighlightPart = SheetSemanticInputPartSpan & {
	kind: SheetFormulaInputHighlightKind;
	text: string;
	token?: SheetFormulaReferenceToken;
	tokenIndex: number;
};

const SHEET_FORMULA_INPUT_PADDING = '6px 8px 6px 6px';
const SHEET_FORMULA_SUGGESTION_MENU_WIDTH = 240;
const SHEET_FORMULA_SUGGESTION_MENU_GUIDE_OFFSET = 78;
const SHEET_FORMULA_TIP_ASSUMED_WIDTH = 260;
const SHEET_FORMULA_SHELL_STYLE: CSSProperties = {
	display: 'block',
	minWidth: 0,
};
const SHEET_FORMULA_MIRROR_STYLE: CSSProperties = {
	...SHEET_TEXT_INPUT_LAYOUT_STYLE,
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
	...SHEET_TEXT_INPUT_LAYOUT_STYLE,
	background: 'transparent',
	caretColor: 'rgb(var(--color-default))',
	position: 'relative',
	width: '100%',
	zIndex: 2,
};
const SHEET_FORMULA_HIGHLIGHT_INPUT_STYLE: CSSProperties = {
	...SHEET_FORMULA_INPUT_STYLE,
	color: 'rgb(var(--color-default))',
	WebkitTextFillColor: 'transparent',
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
const SHEET_FORMULA_PART_HIGHLIGHTS: Record<SheetFormulaInputHighlightKind, string> = {
	DATA_TABLE_CONDITION_COLUMN: 'var(--color-teal-light)',
	DATA_TABLE_CONDITION_COMBINATOR: 'var(--color-amber-light)',
	DATA_TABLE_CONDITION_OPERATOR: 'var(--color-rose-light)',
	DATA_TABLE_CONDITION_VALUE: 'var(--color-lime-light)',
	DATA_TABLE_NAME: 'var(--color-sky-light)',
	DATA_TABLE_RESULT_COLUMN: 'var(--color-violet-light)',
	DATA_TABLE_ROW_IDENTIFIER: 'var(--color-yellow-light)',
	DATA_TABLE_WHERE: 'var(--color-slate-light)',
	SHEET_CELL: 'var(--color-blue-light)',
	SHEET_RANGE: 'var(--color-purple-light)',
};

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
 * Return the highlight background for one semantic formula part.
 */
function getSheetFormulaPartHighlight(part: SheetFormulaInputHighlightPart) {
	if (part.kind === 'SHEET_CELL' || part.kind === 'SHEET_RANGE') {
		return part.token ? getSheetFormulaTokenHighlight(part.token) : SHEET_FORMULA_PART_HIGHLIGHTS[part.kind];
	}

	return SHEET_FORMULA_PART_HIGHLIGHTS[part.kind];
}

/*
 * Return inline styles for one highlighted formula part.
 */
function getSheetFormulaPartHighlightStyle(part: SheetFormulaInputHighlightPart): CSSProperties {
	const background = getSheetFormulaPartHighlight(part);

	return {
		background,
		borderRadius: 3,
		boxShadow: `0 0 0 2px ${background}`,
	};
}

/*
 * Return inline styles for the formula mirror viewport.
 */
function getSheetFormulaMirrorStyle(): CSSProperties {
	return SHEET_FORMULA_MIRROR_STYLE;
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
function getSheetFormulaSuggestionMenuStyle(position: SheetFormulaSuggestionMenuPosition, offsetTop = 0): CSSProperties {
	return {
		left: position.left,
		position: 'absolute',
		top: position.top + offsetTop,
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
 * Return the local end index of a formula call while respecting quoted strings.
 */
function getSheetFormulaInputCallEndIndex(value: string) {
	const openParenIndex = value.indexOf('(');
	if (openParenIndex < 0) {
		return null;
	}

	let depth = 0;
	let escaped = false;
	let quoted = false;

	for (let index = openParenIndex; index < value.length; index += 1) {
		const char = value[index];

		if (escaped) {
			escaped = false;
			continue;
		}

		if (quoted && char === '\\') {
			escaped = true;
			continue;
		}

		if (char === '"') {
			quoted = !quoted;
			continue;
		}

		if (quoted) {
			continue;
		}

		if (char === '(') {
			depth += 1;
			continue;
		}

		if (char === ')') {
			depth -= 1;
			if (depth === 0) {
				return index + 1;
			}
		}
	}

	return null;
}

/*
 * Return one keyword match after a local index with identifier boundaries.
 */
function getSheetFormulaInputKeywordMatch(value: string, keyword: string, startIndex: number) {
	const pattern = new RegExp(`\\b${keyword}\\b`, 'i');
	const match = pattern.exec(value.slice(startIndex));

	return match
		? {
			index: startIndex + match.index,
			text: match[0],
		}
		: null;
}

/*
 * Return the first unquoted operator position inside one condition text.
 */
function getSheetFormulaInputConditionOperatorIndex(conditionText: string, operator: string) {
	let escaped = false;
	let quoted = false;

	for (let index = 0; index < conditionText.length; index += 1) {
		const char = conditionText[index];

		if (escaped) {
			escaped = false;
			continue;
		}

		if (quoted && char === '\\') {
			escaped = true;
			continue;
		}

		if (char === '"') {
			quoted = !quoted;
			continue;
		}

		if (!quoted && conditionText.startsWith(operator, index)) {
			return index;
		}
	}

	return -1;
}

/*
 * Return one trimmed local span inside a larger formula token string.
 */
function getSheetFormulaTrimmedLocalSpan(value: string, startIndex: number, endIndex: number) {
	const text = value.slice(startIndex, endIndex);
	const leadingLength = text.length - text.trimStart().length;
	const trailingLength = text.length - text.trimEnd().length;

	return {
		endIndex: endIndex - trailingLength,
		startIndex: startIndex + leadingLength,
	};
}

/*
 * Add one formula highlight part when its local token span contains visible text.
 */
function pushSheetFormulaInputHighlightPart(
	parts: SheetFormulaInputHighlightPart[],
	params: {
		kind: SheetFormulaInputHighlightKind;
		localEndIndex: number;
		localStartIndex: number;
		token: SheetFormulaReferenceToken;
		tokenIndex: number;
	},
) {
	const startIndex = params.token.startIndex + params.localStartIndex;
	const endIndex = params.token.startIndex + params.localEndIndex;
	if (endIndex <= startIndex) {
		return;
	}

	parts.push({
		endIndex,
		kind: params.kind,
		startIndex,
		text: params.token.text.slice(params.localStartIndex, params.localEndIndex),
		token: params.token,
		tokenIndex: params.tokenIndex,
	});
}

/*
 * Add one formula highlight part from a trimmed local token span.
 */
function pushSheetFormulaInputTrimmedHighlightPart(
	parts: SheetFormulaInputHighlightPart[],
	params: {
		kind: SheetFormulaInputHighlightKind;
		localEndIndex: number;
		localStartIndex: number;
		token: SheetFormulaReferenceToken;
		tokenIndex: number;
	},
) {
	const span = getSheetFormulaTrimmedLocalSpan(params.token.text, params.localStartIndex, params.localEndIndex);
	pushSheetFormulaInputHighlightPart(parts, {
		...params,
		localEndIndex: span.endIndex,
		localStartIndex: span.startIndex,
	});
}

/*
 * Add formula highlight parts for one parsed data table-like function call.
 */
function pushSheetFormulaInputCallParts(
	parts: SheetFormulaInputHighlightPart[],
	params: {
		argKinds: SheetFormulaInputHighlightKind[];
		localCallStartIndex?: number;
		text: string;
		token: SheetFormulaReferenceToken;
		tokenIndex: number;
	},
) {
	const localCallStartIndex = params.localCallStartIndex || 0;
	const call = parseSheetFormulaCall(params.text);
	if (!call) {
		return;
	}

	const nameMatch = params.text.match(/^\s*@?[A-Za-z_][A-Za-z0-9_]*/);
	if (nameMatch?.[0]) {
		pushSheetFormulaInputTrimmedHighlightPart(parts, {
			kind: 'DATA_TABLE_NAME',
			localEndIndex: localCallStartIndex + nameMatch[0].length,
			localStartIndex: localCallStartIndex,
			token: params.token,
			tokenIndex: params.tokenIndex,
		});
	}

	const openParenIndex = params.text.indexOf('(');
	let argSearchIndex = openParenIndex >= 0 ? openParenIndex + 1 : 0;
	call.args.forEach((arg, argIndex) => {
		const localStartIndex = params.text.indexOf(arg, argSearchIndex);
		if (localStartIndex < 0) {
			return;
		}

		const kind = params.argKinds[argIndex];
		if (!kind) {
			argSearchIndex = localStartIndex + arg.length;
			return;
		}

		pushSheetFormulaInputTrimmedHighlightPart(parts, {
			kind,
			localEndIndex: localCallStartIndex + localStartIndex + arg.length,
			localStartIndex: localCallStartIndex + localStartIndex,
			token: params.token,
			tokenIndex: params.tokenIndex,
		});
		argSearchIndex = localStartIndex + arg.length;
	});
}

/*
 * Add formula highlight parts for one parsed data table function call.
 */
function pushSheetFormulaInputDataTableCallParts(
	parts: SheetFormulaInputHighlightPart[],
	token: SheetFormulaReferenceToken,
	tokenIndex: number,
) {
	if (token.kind !== 'DATA_TABLE_CELL') {
		return;
	}

	pushSheetFormulaInputCallParts(parts, {
		argKinds: ['DATA_TABLE_ROW_IDENTIFIER', 'DATA_TABLE_RESULT_COLUMN'],
		text: token.text,
		token,
		tokenIndex,
	});
}

/*
 * Add formula highlight parts for one data table query condition.
 */
function pushSheetFormulaInputDataTableQueryConditionParts(
	parts: SheetFormulaInputHighlightPart[],
	params: {
		condition: Extract<SheetFormulaReferenceToken, { kind: 'DATA_TABLE_QUERY_CELL' }>['conditions'][number];
		localConditionStartIndex: number;
		token: Extract<SheetFormulaReferenceToken, { kind: 'DATA_TABLE_QUERY_CELL' }>;
		tokenIndex: number;
	},
) {
	const operatorIndex = getSheetFormulaInputConditionOperatorIndex(params.condition.text, params.condition.operator);
	if (operatorIndex < 0) {
		return;
	}

	const valueStartIndex = operatorIndex + params.condition.operator.length;
	pushSheetFormulaInputTrimmedHighlightPart(parts, {
		kind: 'DATA_TABLE_CONDITION_COLUMN',
		localEndIndex: params.localConditionStartIndex + operatorIndex,
		localStartIndex: params.localConditionStartIndex,
		token: params.token,
		tokenIndex: params.tokenIndex,
	});
	pushSheetFormulaInputHighlightPart(parts, {
		kind: 'DATA_TABLE_CONDITION_OPERATOR',
		localEndIndex: params.localConditionStartIndex + operatorIndex + params.condition.operator.length,
		localStartIndex: params.localConditionStartIndex + operatorIndex,
		token: params.token,
		tokenIndex: params.tokenIndex,
	});
	pushSheetFormulaInputTrimmedHighlightPart(parts, {
		kind: 'DATA_TABLE_CONDITION_VALUE',
		localEndIndex: params.localConditionStartIndex + params.condition.text.length,
		localStartIndex: params.localConditionStartIndex + valueStartIndex,
		token: params.token,
		tokenIndex: params.tokenIndex,
	});
}

/*
 * Add formula highlight parts for one parsed data table query formula token.
 */
function pushSheetFormulaInputDataTableQueryParts(
	parts: SheetFormulaInputHighlightPart[],
	token: SheetFormulaReferenceToken,
	tokenIndex: number,
) {
	if (token.kind !== 'DATA_TABLE_QUERY_CELL') {
		return;
	}

	const callEndIndex = getSheetFormulaInputCallEndIndex(token.text);
	const whereMatch = callEndIndex === null ? null : getSheetFormulaInputKeywordMatch(token.text, 'WHERE', callEndIndex);
	const callText = callEndIndex === null ? token.text : token.text.slice(0, callEndIndex);
	pushSheetFormulaInputCallParts(parts, {
		argKinds: ['DATA_TABLE_RESULT_COLUMN'],
		text: callText,
		token,
		tokenIndex,
	});

	if (!whereMatch) {
		return;
	}

	pushSheetFormulaInputHighlightPart(parts, {
		kind: 'DATA_TABLE_WHERE',
		localEndIndex: whereMatch.index + whereMatch.text.length,
		localStartIndex: whereMatch.index,
		token,
		tokenIndex,
	});

	let searchIndex = whereMatch.index + whereMatch.text.length;
	token.conditions.forEach((condition, conditionIndex) => {
		const conditionStartIndex = token.text.indexOf(condition.text, searchIndex);
		if (conditionStartIndex < 0) {
			return;
		}

		if (conditionIndex > 0) {
			const betweenText = token.text.slice(searchIndex, conditionStartIndex);
			const andMatch = /\bAND\b/i.exec(betweenText);
			if (andMatch) {
				pushSheetFormulaInputHighlightPart(parts, {
					kind: 'DATA_TABLE_CONDITION_COMBINATOR',
					localEndIndex: searchIndex + andMatch.index + andMatch[0].length,
					localStartIndex: searchIndex + andMatch.index,
					token,
					tokenIndex,
				});
			}
		}

		pushSheetFormulaInputDataTableQueryConditionParts(parts, {
			condition,
			localConditionStartIndex: conditionStartIndex,
			token,
			tokenIndex,
		});
		searchIndex = conditionStartIndex + condition.text.length;
	});
}

/*
 * Return semantic formula parts for mirror highlighting and helper guides.
 */
function getSheetFormulaInputHighlightParts(value: string, tokens: SheetFormulaReferenceToken[]) {
	const parts: SheetFormulaInputHighlightPart[] = [];

	tokens.forEach((token, tokenIndex) => {
		if (token.kind === 'DATA_TABLE_QUERY_CELL') {
			pushSheetFormulaInputDataTableQueryParts(parts, token, tokenIndex);
			return;
		}

		if (token.kind === 'DATA_TABLE_CELL') {
			pushSheetFormulaInputDataTableCallParts(parts, token, tokenIndex);
			return;
		}

		pushSheetFormulaInputHighlightPart(parts, {
			kind: token.kind === 'SHEET_RANGE' ? 'SHEET_RANGE' : 'SHEET_CELL',
			localEndIndex: token.endIndex - token.startIndex,
			localStartIndex: 0,
			token,
			tokenIndex,
		});
	});

	return parts
		.filter((part) => value.slice(part.startIndex, part.endIndex).trim())
		.sort((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex);
}

/*
 * Add one loose formula highlight part from absolute input indexes.
 */
function pushSheetFormulaInputLooseHighlightPart(
	parts: SheetFormulaInputHighlightPart[],
	params: {
		endIndex: number;
		kind: SheetFormulaInputHighlightKind;
		startIndex: number;
		value: string;
	},
) {
	const text = params.value.slice(params.startIndex, params.endIndex);
	const leadingLength = text.length - text.trimStart().length;
	const trailingLength = text.length - text.trimEnd().length;
	const startIndex = params.startIndex + leadingLength;
	const endIndex = params.endIndex - trailingLength;
	if (endIndex <= startIndex) {
		return;
	}

	parts.push({
		endIndex,
		kind: params.kind,
		startIndex,
		text: params.value.slice(startIndex, endIndex),
		tokenIndex: -1,
	});
}

/*
 * Return whether one absolute character index can start a loose dataTable formula call.
 */
function canStartLooseSheetFormulaDataTableCall(value: string, index: number) {
	return value[index] === '@' && !/[A-Za-z0-9_@]/.test(value[index - 1] || '');
}

/*
 * Return the first operator match for one loose dataTable query condition.
 */
function getLooseSheetFormulaConditionOperatorMatch(conditionText: string) {
	const operators = ['<=', '>=', '<>', '!=', '=', '<', '>'];

	for (const operator of operators) {
		const index = getSheetFormulaInputConditionOperatorIndex(conditionText, operator);
		if (index >= 0) {
			return {
				index,
				operator,
			};
		}
	}

	return null;
}

/*
 * Add loose highlight parts for one dataTable query condition string.
 */
function pushLooseSheetFormulaDataTableConditionParts(
	parts: SheetFormulaInputHighlightPart[],
	params: {
		conditionStartIndex: number;
		conditionText: string;
		value: string;
	},
) {
	const operatorMatch = getLooseSheetFormulaConditionOperatorMatch(params.conditionText);
	if (!operatorMatch) {
		return;
	}

	pushSheetFormulaInputLooseHighlightPart(parts, {
		endIndex: params.conditionStartIndex + operatorMatch.index,
		kind: 'DATA_TABLE_CONDITION_COLUMN',
		startIndex: params.conditionStartIndex,
		value: params.value,
	});
	pushSheetFormulaInputLooseHighlightPart(parts, {
		endIndex: params.conditionStartIndex + operatorMatch.index + operatorMatch.operator.length,
		kind: 'DATA_TABLE_CONDITION_OPERATOR',
		startIndex: params.conditionStartIndex + operatorMatch.index,
		value: params.value,
	});
	pushSheetFormulaInputLooseHighlightPart(parts, {
		endIndex: params.conditionStartIndex + params.conditionText.length,
		kind: 'DATA_TABLE_CONDITION_VALUE',
		startIndex: params.conditionStartIndex + operatorMatch.index + operatorMatch.operator.length,
		value: params.value,
	});
}

/*
 * Add loose highlight parts for the WHERE clause after one dataTable query call.
 */
function pushLooseSheetFormulaDataTableWhereParts(
	parts: SheetFormulaInputHighlightPart[],
	params: {
		searchStartIndex: number;
		value: string;
	},
) {
	const whereMatch = getSheetFormulaInputKeywordMatch(params.value, 'WHERE', params.searchStartIndex);
	if (!whereMatch) {
		return;
	}

	pushSheetFormulaInputLooseHighlightPart(parts, {
		endIndex: whereMatch.index + whereMatch.text.length,
		kind: 'DATA_TABLE_WHERE',
		startIndex: whereMatch.index,
		value: params.value,
	});

	const conditionText = params.value.slice(whereMatch.index + whereMatch.text.length);
	const conditionPattern = /\bAND\b/gi;
	let conditionStartIndex = whereMatch.index + whereMatch.text.length;
	let match: RegExpExecArray | null;

	while ((match = conditionPattern.exec(conditionText))) {
		const nextConditionStartIndex = whereMatch.index + whereMatch.text.length + match.index;
		pushLooseSheetFormulaDataTableConditionParts(parts, {
			conditionStartIndex,
			conditionText: params.value.slice(conditionStartIndex, nextConditionStartIndex),
			value: params.value,
		});
		pushSheetFormulaInputLooseHighlightPart(parts, {
			endIndex: nextConditionStartIndex + match[0].length,
			kind: 'DATA_TABLE_CONDITION_COMBINATOR',
			startIndex: nextConditionStartIndex,
			value: params.value,
		});
		conditionStartIndex = nextConditionStartIndex + match[0].length;
	}

	pushLooseSheetFormulaDataTableConditionParts(parts, {
		conditionStartIndex,
		conditionText: params.value.slice(conditionStartIndex),
		value: params.value,
	});
}

/*
 * Return loose dataTable query highlight parts for formulas that are not strict reference tokens yet.
 */
function getLooseSheetFormulaDataTableQueryHighlightParts(value: string) {
	const parts: SheetFormulaInputHighlightPart[] = [];
	let index = 0;

	while (index < value.length) {
		if (!canStartLooseSheetFormulaDataTableCall(value, index)) {
			index += 1;
			continue;
		}

		const localCallEndIndex = getSheetFormulaInputCallEndIndex(value.slice(index));
		if (!localCallEndIndex) {
			index += 1;
			continue;
		}

		const callStartIndex = index;
		const callEndIndex = index + localCallEndIndex;
		const callText = value.slice(callStartIndex, callEndIndex);
		const call = parseSheetFormulaCall(callText);
		if (!call || !call.name.startsWith('@') || !call.args.length) {
			index = callEndIndex;
			continue;
		}

		const nameMatch = callText.match(/^\s*@?[A-Za-z_][A-Za-z0-9_]*/);
		if (nameMatch?.[0]) {
			pushSheetFormulaInputLooseHighlightPart(parts, {
				endIndex: callStartIndex + nameMatch[0].length,
				kind: 'DATA_TABLE_NAME',
				startIndex: callStartIndex,
				value,
			});
		}

		const firstArg = call.args[0] || '';
		const openParenIndex = callText.indexOf('(');
		const firstArgIndex = openParenIndex >= 0 ? callText.indexOf(firstArg, openParenIndex + 1) : -1;
		if (firstArgIndex >= 0) {
			pushSheetFormulaInputLooseHighlightPart(parts, {
				endIndex: callStartIndex + firstArgIndex + firstArg.length,
				kind: 'DATA_TABLE_RESULT_COLUMN',
				startIndex: callStartIndex + firstArgIndex,
				value,
			});
		}

		pushLooseSheetFormulaDataTableWhereParts(parts, {
			searchStartIndex: callEndIndex,
			value,
		});
		index = callEndIndex;
	}

	return parts;
}

/*
 * Return whether two formula highlight parts overlap in the input string.
 */
function doSheetFormulaInputHighlightPartsOverlap(a: SheetFormulaInputHighlightPart, b: SheetFormulaInputHighlightPart) {
	return a.startIndex < b.endIndex && b.startIndex < a.endIndex;
}

/*
 * Merge strict and loose formula highlights, preserving strict token highlights on overlap.
 */
function getMergedSheetFormulaInputHighlightParts(
	strictParts: SheetFormulaInputHighlightPart[],
	looseParts: SheetFormulaInputHighlightPart[],
) {
	if (!looseParts.length) {
		return strictParts;
	}

	return [
		...strictParts,
		...looseParts.filter((loosePart) => !strictParts.some((strictPart) => doSheetFormulaInputHighlightPartsOverlap(strictPart, loosePart))),
	].sort((a, b) => a.startIndex - b.startIndex || a.endIndex - b.endIndex);
}

/*
 * Return the readable guide heading for one highlighted formula part.
 */
function getSheetFormulaPartGuideTitle(part: SheetFormulaInputHighlightPart) {
	const titleByKind: Record<SheetFormulaInputHighlightKind, string> = {
		DATA_TABLE_CONDITION_COLUMN: 'Condition column',
		DATA_TABLE_CONDITION_COMBINATOR: 'Condition join',
		DATA_TABLE_CONDITION_OPERATOR: 'Condition operator',
		DATA_TABLE_CONDITION_VALUE: 'Condition value',
		DATA_TABLE_NAME: 'Data table',
		DATA_TABLE_RESULT_COLUMN: 'Result column',
		DATA_TABLE_ROW_IDENTIFIER: 'Row identifier',
		DATA_TABLE_WHERE: 'Query filter',
		SHEET_CELL: 'Sheet cell',
		SHEET_RANGE: 'Sheet range',
	};

	return titleByKind[part.kind];
}

/*
 * Return helpful guide body text for one highlighted formula part.
 */
function getSheetFormulaPartGuideDescription(part: SheetFormulaInputHighlightPart) {
	if (part.kind === 'SHEET_CELL') {
		return `Reads the value from ${part.text}.`;
	}

	if (part.kind === 'SHEET_RANGE') {
		return `Reads values from the ${part.text} range.`;
	}

	if (part.kind === 'DATA_TABLE_NAME') {
		return 'The data table used by this lookup.';
	}

	if (part.kind === 'DATA_TABLE_ROW_IDENTIFIER') {
		return 'The row identifier used to find one data table row.';
	}

	if (part.kind === 'DATA_TABLE_RESULT_COLUMN') {
		return 'The data table column returned by this formula.';
	}

	if (part.kind === 'DATA_TABLE_WHERE') {
		return 'Starts the conditions used to find a matching data table row.';
	}

	if (part.kind === 'DATA_TABLE_CONDITION_COLUMN') {
		return 'The data table column checked by this condition.';
	}

	if (part.kind === 'DATA_TABLE_CONDITION_OPERATOR') {
		return 'The comparison used by this condition.';
	}

	if (part.kind === 'DATA_TABLE_CONDITION_VALUE') {
		return 'The literal, shorthand, or sheet cell value compared against this column.';
	}

	return 'Requires both surrounding conditions to match.';
}

/*
 * Return guide content for one highlighted formula part.
 */
function getSheetFormulaPartGuide(part: SheetFormulaInputHighlightPart) {
	return {
		description: getSheetFormulaPartGuideDescription(part),
		title: getSheetFormulaPartGuideTitle(part),
	};
}

/*
 * Return extra mirrored span attributes used by formula-specific overlays.
 */
function getSheetFormulaPartDataAttributes(part: SheetFormulaInputHighlightPart) {
	if (part.tokenIndex < 0) {
		return {};
	}

	return {
		'data-sheet-formula-token-index': part.tokenIndex,
	};
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
 * Render the small formula suggestion menu anchored below the active token.
 */
function renderSheetFormulaSuggestionMenu(params: {
	guideVisible?: boolean;
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
			style={getSheetFormulaSuggestionMenuStyle(
				params.position,
				params.guideVisible ? SHEET_FORMULA_SUGGESTION_MENU_GUIDE_OFFSET : 0,
			)}
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
	const pendingSelectionRef = useRef<number | null>(null);
	const [activeTokenIndex, setActiveTokenIndex] = useState(-1);
	const [suggestionMenuPosition, setSuggestionMenuPosition] = useState<SheetFormulaSuggestionMenuPosition | null>(null);
	const fieldType = p.column?.fieldType || 'TEXT';
	const canUseInput = Boolean(p.canEdit || p.editState);
	const formulaTokens = useMemo(() => {
		return isSheetFormulaText(p.value) ? tokenizeSheetFormulaReferences(p.value) : [];
	}, [p.value]);
	const formulaParts = useMemo(() => {
		return getMergedSheetFormulaInputHighlightParts(
			getSheetFormulaInputHighlightParts(p.value, formulaTokens),
			getLooseSheetFormulaDataTableQueryHighlightParts(p.value),
		);
	}, [formulaTokens, p.value]);
	const formulaChunks = useMemo(() => {
		return getSheetSemanticInputRenderableParts(p.value, formulaParts);
	}, [formulaParts, p.value]);

	/*
	 * Sync the formula suggestion token whenever shared input state is refreshed.
	 */
	const handleFormulaInputStateSync = useCallback((input: HTMLInputElement) => {
		setActiveTokenIndex(getSheetFormulaActiveTokenIndex(formulaTokens, input.selectionStart));
	}, [formulaTokens]);

	const semanticInput = useSheetSemanticInputHighlightState({
		enabled: formulaParts.length > 0,
		includeEndIndex: true,
		onInputStateSync: handleFormulaInputStateSync,
		parts: formulaParts,
		syncWithAnimationFrame: true,
		tipWidth: SHEET_FORMULA_TIP_ASSUMED_WIDTH,
	});
	const {
		activePart,
		handleInputBlur: handleSemanticInputBlur,
		handleInputFocus: handleSemanticInputFocus,
		handleInputMouseLeave,
		handleInputMouseMove,
		inputRef,
		inputScrollLeft,
		setInputRef,
		setShellRef,
		shellRef,
		syncInputState,
		tipPosition,
	} = semanticInput;
	const formulaDataTables = useMemo(() => {
		return getSheetFormulaSuggestionDataTables(p.dataTables);
	}, [p.dataTables]);
	const activeToken = activeTokenIndex >= 0 ? formulaTokens[activeTokenIndex] || null : null;
	const suggestionOptions = useMemo(() => {
		return getSheetFormulaSuggestionOptions(formulaDataTables, activeToken);
	}, [activeToken, formulaDataTables]);
	const hasHighlights = formulaParts.length > 0;
	const guideVisible = Boolean(activePart && tipPosition);
	const canShowSuggestions = Boolean(p.editState && !p.readOnly && suggestionOptions.length);

	/*
	 * Sync shared semantic highlight state from the native formula input.
	 */
	const syncFormulaInputState = useCallback((input?: HTMLInputElement | null) => {
		syncInputState(input || inputRef.current);
	}, [inputRef, syncInputState]);

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
		handleSemanticInputFocus(event);
		syncFormulaInputState(event.currentTarget);
	}, [handleSemanticInputFocus, p.canEdit, p.onEditStart, p.readOnly, syncFormulaInputState]);

	/*
	 * Clear guide state and forward editable blur events to the owning Sheet controller.
	 */
	const handleBlur = useCallback((event: FocusEvent<HTMLInputElement>) => {
		handleSemanticInputBlur();

		if (p.editState && !p.readOnly) {
			p.onBlur?.(event);
		}
	}, [handleSemanticInputBlur, p.editState, p.onBlur, p.readOnly]);

	/*
	 * Refresh mirror scroll and active token state after native input activity.
	 */
	const handleInputActivity = useCallback((event: SyntheticEvent<HTMLInputElement>) => {
		syncFormulaInputState(event.currentTarget);
	}, [syncFormulaInputState]);

	/*
	 * Commit formula input edits from native Enter when grid capture has not claimed the key.
	 */
	const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== 'Enter' || event.shiftKey || p.readOnly || !p.editState) {
			return;
		}

		event.preventDefault();
		p.onCommit?.(event.currentTarget);
	}, [p.editState, p.onCommit, p.readOnly]);

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
	}, [activeTokenIndex, canShowSuggestions, formulaTokens, inputRef, inputScrollLeft, shellRef, suggestionOptions.length]);

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
					onMouseLeave={handleInputMouseLeave}
					onMouseMove={handleInputMouseMove}
				>
					{hasHighlights ? (
						<SheetSemanticInputOverlay<SheetFormulaInputHighlightPart>
							activePart={activePart}
							chunks={formulaChunks}
							getPartDataAttributes={getSheetFormulaPartDataAttributes}
							getPartGuide={getSheetFormulaPartGuide}
							getPartHighlightStyle={getSheetFormulaPartHighlightStyle}
							inputScrollLeft={inputScrollLeft}
							mirrorClassName="ft_normal ft_sm"
							mirrorStyle={getSheetFormulaMirrorStyle()}
							tipPosition={tipPosition}
						/>
					) : null}
					<input
						className={cn('sheet_formula_input stock pl_6 pr_8 py_6 ft_normal ft_sm f bd_0')}
						data-cell-key={p.editState?.cellKey}
						data-field-type={fieldType}
						data-row-id={p.editState?.rowId}
						data-sheet-formula-input="true"
						data-sheet-editor={p.editState && !p.readOnly ? 'true' : undefined}
						readOnly={p.readOnly || !canUseInput}
						ref={setInputRef}
						style={getSheetFormulaInputStyle(hasHighlights)}
						value={p.value}
						onBlur={handleBlur}
						onChange={handleChange}
						onClick={handleInputActivity}
						onFocus={handleFocus}
						onKeyDown={handleKeyDown}
						onKeyUp={handleInputActivity}
						onScroll={handleInputActivity}
						onSelect={handleInputActivity}
						type="text"
					/>
					{renderSheetFormulaSuggestionMenu({
						guideVisible,
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
