import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import {
	getSheetFormulaDataTableCellKeyText,
	isSheetFormulaText,
	normalizeSheetFormulaDataTableName,
	parseSheetFormulaCall,
	parseSheetFormulaStringLiteral,
	tokenizeSheetFormulaReferences,
	type SheetFormulaReferenceToken,
} from '@jsb188/mday/utils/sheet.ts';
import type {
	DataTableDesignCellGQL,
	DataTableGQL,
} from '@jsb188/mday/types/dataTable.d.ts';
import { COMMON_ICON_NAMES, Icon } from '@jsb188/react-web/svgs/Icon';
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
	type CSSProperties,
	type ChangeEvent,
	type FocusEvent,
	type KeyboardEvent,
	type SyntheticEvent,
} from 'react';
import {
	getSheetSemanticInputRenderableParts,
	useSheetSemanticInputHighlightState,
	type SheetSemanticInputPartSpan,
} from '../libs/sheet-semantic-input.ts';
import { SHEET_TEXT_INPUT_LAYOUT_STYLE } from '../libs/sheet-text-input-style.ts';
import { SheetFormulaUI } from '../ui/SheetFormulaUI.tsx';
import {
	SheetSemanticInputOverlay,
	type SheetSemanticInputGuide,
	type SheetSemanticInputGuideOption,
} from '../ui/SheetSemanticInputOverlay.tsx';

export type SheetFormulaInputProps = {
	canEdit?: boolean;
	className?: string;
	column?: SheetUIColumn | null;
	dataTables?: DataTableGQL[] | null;
	editState?: SheetUIEditState | null;
	error?: string | null;
	/* Renders the display-rules button highlighted when the selected cell already has rules */
	hasDisplayRules?: boolean;
	onBlur?: (event: FocusEvent<HTMLInputElement>) => void;
	onCommit?: (input: HTMLInputElement) => void;
	onDraftValue: (draftValue: string) => void;
	onEditStart?: () => void;
	onOpenDisplayRules?: () => void;
	readOnly?: boolean;
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
const SHEET_FORMULA_TIP_ASSUMED_WIDTH = 260;
const SHEET_FORMULA_COLUMN_PART_KINDS: SheetFormulaInputHighlightKind[] = [
	'DATA_TABLE_CONDITION_COLUMN',
	'DATA_TABLE_RESULT_COLUMN',
];
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
 * Return one DataTable that matches a formula data table or query token.
 */
function getSheetFormulaTokenDataTable(dataTables: SheetFormulaSuggestionDataTable[], token: SheetFormulaReferenceToken | null) {
	if (!token || (token.kind !== 'DATA_TABLE_CELL' && token.kind !== 'DATA_TABLE_QUERY_CELL')) {
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
 * Return the field key referenced by one column formula part, unwrapping any
 * surrounding quotes so it can be matched against a data table field key.
 */
function getSheetFormulaPartColumnKey(part: SheetFormulaInputHighlightPart) {
	const text = part.text.trim();
	const literal = parseSheetFormulaStringLiteral(text);

	return literal !== null ? literal : text;
}

/*
 * Return the normalized data table function name referenced by one data table
 * name formula part.
 */
function getSheetFormulaPartDataTableName(part: SheetFormulaInputHighlightPart) {
	return normalizeSheetFormulaDataTableName(part.text.trim().replace(/^@/, ''));
}

/*
 * Return clickable guide options for one highlighted formula part: the list of
 * available data tables on a data table name part, and the active table's fields
 * on a result or condition column part. All other part kinds have no options.
 */
function getSheetFormulaPartGuideOptions(
	formulaDataTables: SheetFormulaSuggestionDataTable[],
	part: SheetFormulaInputHighlightPart,
): SheetSemanticInputGuideOption[] {
	if (part.kind === 'DATA_TABLE_NAME') {
		const activeName = getSheetFormulaPartDataTableName(part);

		return formulaDataTables.map(({ dataTable, formulaName }) => ({
			description: formulaName,
			key: formulaName,
			label: getSheetFormulaDataTableSuggestionLabel(dataTable, formulaName),
			selected: formulaName === activeName,
		}));
	}

	if (SHEET_FORMULA_COLUMN_PART_KINDS.includes(part.kind)) {
		const dataTable = getSheetFormulaTokenDataTable(formulaDataTables, part.token || null);
		const activeKey = getSheetFormulaPartColumnKey(part);

		return getSheetFormulaOrderedDesignCells(dataTable).map((cell) => ({
			description: cell.key,
			key: cell.key,
			label: getSheetFormulaCellSuggestionLabel(cell),
			selected: cell.key === activeKey,
		}));
	}

	return [];
}

/*
 * Return the formula text inserted in place of one part when a guide option is
 * chosen. Data table names keep their leading "@" and field keys are quoted only
 * when required. Returns null for parts that cannot be replaced this way.
 */
function getSheetFormulaPartGuideReplacement(part: SheetFormulaInputHighlightPart, optionKey: string) {
	if (part.kind === 'DATA_TABLE_NAME') {
		const prefix = part.text.trimStart().startsWith('@') ? '@' : '';

		return `${prefix}${optionKey}`;
	}

	if (SHEET_FORMULA_COLUMN_PART_KINDS.includes(part.kind)) {
		return getSheetFormulaDataTableCellKeyText(optionKey);
	}

	return null;
}

/*
 * Render the top-of-sheet input that owns plain cell text editing.
 */
export const SheetFormulaInput = memo((p: SheetFormulaInputProps) => {
	const pendingSelectionRef = useRef<number | null>(null);
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

	const semanticInput = useSheetSemanticInputHighlightState({
		enabled: formulaParts.length > 0,
		includeEndIndex: true,
		parts: formulaParts,
		syncWithAnimationFrame: true,
		tipWidth: SHEET_FORMULA_TIP_ASSUMED_WIDTH,
	});
	const {
		activePart,
		caretPartIndex,
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
	const hasHighlights = formulaParts.length > 0;
	// Only the caret-owned part offers clickable picker options, so the options
	// stay put while the pointer moves onto the guide to click one.
	const caretPart = caretPartIndex >= 0 ? formulaParts[caretPartIndex] || null : null;
	const canSelectOptions = Boolean(p.editState && !p.readOnly);

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
	 * Replace one highlighted formula part with a chosen guide option (a data
	 * table name or a field key) and place the caret after the inserted text.
	 */
	const handleSelectGuideOption = useCallback((part: SheetFormulaInputHighlightPart, optionKey: string) => {
		if (p.readOnly || !p.editState) {
			return;
		}

		const replacement = getSheetFormulaPartGuideReplacement(part, optionKey);
		if (replacement === null) {
			return;
		}

		pendingSelectionRef.current = part.startIndex + replacement.length;
		p.onDraftValue(p.value.slice(0, part.startIndex) + replacement + p.value.slice(part.endIndex));
	}, [p.editState, p.onDraftValue, p.readOnly, p.value]);

	/*
	 * Build the guide shown for one highlighted part: its title and description,
	 * plus clickable data table / field options for the caret-owned part.
	 */
	const getPartGuide = useCallback((part: SheetFormulaInputHighlightPart): SheetSemanticInputGuide => {
		const options = canSelectOptions && part === caretPart
			? getSheetFormulaPartGuideOptions(formulaDataTables, part)
			: [];

		return {
			description: getSheetFormulaPartGuideDescription(part),
			onSelectOption: (optionKey) => handleSelectGuideOption(part, optionKey),
			options,
			title: getSheetFormulaPartGuideTitle(part),
		};
	}, [canSelectOptions, caretPart, formulaDataTables, handleSelectGuideOption]);

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

	return <SheetFormulaUI
		className={p.className}
		error={p.error || p.editState?.error}
	>
		<div className='bg w_f'>
			<div className='h_item ft_xs'>
				{p.onOpenDisplayRules
					? (
						<button
							aria-label={i18n.t('sheet.display_rules')}
							className={cn('ic_sm no_shrink ml_8 r_4 p_0', p.hasDisplayRules ? 'bg_primary_fd cl_primary' : 'cl_darker_4')}
							onClick={p.onOpenDisplayRules}
							onPointerDown={(event) => event.stopPropagation()}
							title={i18n.t('sheet.display_rules')}
							type='button'
						>
							<Icon name={COMMON_ICON_NAMES.format_selected_cells} />
						</button>
					)
					: null}
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
							getPartGuide={getPartGuide}
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
				</span>
			</div>
		</div>
	</SheetFormulaUI>;
});

SheetFormulaInput.displayName = 'SheetFormulaInput';

export default SheetFormulaInput;
