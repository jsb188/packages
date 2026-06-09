import i18n from '@jsb188/app/i18n/index.ts';
import {
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ChangeEvent,
	type FocusEvent,
	type MouseEvent,
	type SyntheticEvent,
} from 'react';
import {
	getSheetRegionFilterQueryRenderableParts,
	inspectSheetRegionSourceFilterString,
	isSheetRegionSourceFilterStringValid,
	type SheetRegionFilterQueryDesignCell,
	type SheetRegionFilterQueryHighlightChunk,
	type SheetRegionFilterQueryPart,
} from '../libs/sheet-region-filter-query.ts';
import {
	getSheetRegionSortQueryRenderableParts,
	inspectSheetRegionSourceSortString,
	isSheetRegionSourceSortStringValid,
	type SheetRegionSortQueryHighlightChunk,
	type SheetRegionSortQueryPart,
} from '../libs/sheet-region-sort-query.ts';
import {
	SheetRegionFiltersInputUI,
	type SheetRegionFiltersInputMode,
	type SheetRegionFiltersInputUITipPosition,
} from '../ui/SheetRegionFiltersInputUI.tsx';

export type SheetRegionFiltersInputValue = {
	filter: string;
	limit?: number | string | null;
	sort: string;
};

export type SheetRegionFiltersInputProps = {
	className?: string;
	designCells?: SheetRegionFilterQueryDesignCell[] | null;
	disabled?: boolean;
	limitMax?: number;
	limitMin?: number;
	value?: Partial<SheetRegionFiltersInputValue> | null;
	onChange?: (value: SheetRegionFiltersInputValue) => void;
};

type SheetRegionFiltersInputQueryPart = SheetRegionFilterQueryPart | SheetRegionSortQueryPart;
type SheetRegionFiltersInputQueryHighlightChunk = SheetRegionFilterQueryHighlightChunk | SheetRegionSortQueryHighlightChunk;

const EMPTY_SHEET_REGION_FILTER_QUERY_PARTS: SheetRegionFilterQueryPart[] = [];
const EMPTY_SHEET_REGION_FILTER_QUERY_CHUNKS: SheetRegionFilterQueryHighlightChunk[] = [];
const EMPTY_SHEET_REGION_SORT_QUERY_PARTS: SheetRegionSortQueryPart[] = [];
const EMPTY_SHEET_REGION_SORT_QUERY_CHUNKS: SheetRegionSortQueryHighlightChunk[] = [];
const EMPTY_SHEET_REGION_QUERY_PARTS: SheetRegionFiltersInputQueryPart[] = [];
const EMPTY_SHEET_REGION_QUERY_CHUNKS: SheetRegionFiltersInputQueryHighlightChunk[] = [];
const SHEET_REGION_FILTER_TIP_LEFT_OFFSET = -5;
const SHEET_REGION_FILTER_TIP_ASSUMED_WIDTH = 260;

/*
 * Return a complete Sheet region filters input value.
 */
function getNormalizedSheetRegionFiltersInputValue(value?: Partial<SheetRegionFiltersInputValue> | null): SheetRegionFiltersInputValue {
	return {
		filter: value?.filter || '',
		limit: value?.limit === 0 || value?.limit === '0' ? undefined : value?.limit ?? undefined,
		sort: value?.sort || '',
	};
}

/*
 * Return whether one mode has a saved value.
 */
function sheetRegionFiltersInputModeHasValue(value: SheetRegionFiltersInputValue, mode: SheetRegionFiltersInputMode) {
	return String(value[mode] ?? '').trim() !== '';
}

/*
 * Return one region control value normalized for its active input mode.
 */
function getSheetRegionFiltersInputModeValue(mode: SheetRegionFiltersInputMode, value: string) {
	if (mode === 'limit' && (!value || value === '0')) {
		return undefined;
	}

	return value;
}

/*
 * Return the index of one parsed region query part.
 */
function getSheetRegionFiltersInputPartIndex(
	parts: SheetRegionFiltersInputQueryPart[],
	part: SheetRegionFiltersInputQueryPart | null,
) {
	return part ? parts.indexOf(part) : -1;
}

/*
 * Return the semantic region query part that contains one zero-based text index.
 */
function getSheetRegionFiltersInputPartAtIndex(
	parts: SheetRegionFiltersInputQueryPart[],
	index: number | null | undefined,
) {
	if (index === null || index === undefined || index < 0) {
		return null;
	}

	return parts.find((part) => index >= part.startIndex && index < part.endIndex) || null;
}

/*
 * Return the highlighted query part currently under a pointer coordinate.
 */
function getSheetRegionFiltersInputHoveredPartIndex(shell: HTMLElement, clientX: number, clientY: number) {
	const elements = shell.querySelectorAll<HTMLElement>('[data-sheet-region-filter-part-index]');

	for (const element of elements) {
		const rect = element.getBoundingClientRect();
		if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
			return Number(element.dataset.sheetRegionFilterPartIndex);
		}
	}

	return -1;
}

/*
 * Return an absolute tip position under one highlighted filter query part.
 */
function getSheetRegionFiltersInputTipPosition(
	shell: HTMLElement,
	input: HTMLInputElement,
	partIndex: number,
): SheetRegionFiltersInputUITipPosition | null {
	const partElement = shell.querySelector<HTMLElement>(`[data-sheet-region-filter-part-index="${partIndex}"]`);
	if (!partElement) {
		return null;
	}

	const shellRect = shell.getBoundingClientRect();
	const partRect = partElement.getBoundingClientRect();
	if (partRect.right < shellRect.left || partRect.left > shellRect.right) {
		return null;
	}

	const maxLeft = Math.max(0, shellRect.width - SHEET_REGION_FILTER_TIP_ASSUMED_WIDTH);
	const left = Math.min(Math.max(0, partRect.left - shellRect.left + SHEET_REGION_FILTER_TIP_LEFT_OFFSET), maxLeft);

	return {
		left,
		top: input.offsetTop + input.offsetHeight + 8,
	};
}

/*
 * Render local Sheet region filter, sort, and limit controls.
 */
export const SheetRegionFiltersInput = memo((p: SheetRegionFiltersInputProps) => {
	const {
		className,
		designCells,
		disabled,
		limitMax,
		limitMin,
		onChange,
		value: inputValue,
	} = p;
	const inputRef = useRef<HTMLInputElement | null>(null);
	const shellRef = useRef<HTMLSpanElement | null>(null);
	const [activeMode, setActiveMode] = useState<SheetRegionFiltersInputMode>('filter');
	const [caretPartIndex, setCaretPartIndex] = useState(-1);
	const [hoverPartIndex, setHoverPartIndex] = useState(-1);
	const [inputFocused, setInputFocused] = useState(false);
	const [inputScrollLeft, setInputScrollLeft] = useState(0);
	const [localValue, setLocalValue] = useState<SheetRegionFiltersInputValue>(() => {
		return getNormalizedSheetRegionFiltersInputValue(inputValue);
	});
	const [tipPosition, setTipPosition] = useState<SheetRegionFiltersInputUITipPosition | null>(null);
	const value = inputValue ? getNormalizedSheetRegionFiltersInputValue(inputValue) : localValue;
	const filterQuery = value.filter || '';
	const filterQueryHasValue = String(filterQuery).trim() !== '';
	const sortQuery = value.sort || '';
	const sortQueryHasValue = String(sortQuery).trim() !== '';
	const filterQueryInvalid = useMemo(() => {
		return Boolean(
			filterQueryHasValue &&
			designCells?.length &&
			!isSheetRegionSourceFilterStringValid(filterQuery, designCells),
		);
	}, [designCells, filterQuery, filterQueryHasValue]);
	const sortQueryInvalid = useMemo(() => {
		return Boolean(
			sortQueryHasValue &&
			designCells?.length &&
			!isSheetRegionSourceSortStringValid(sortQuery, designCells),
		);
	}, [designCells, sortQuery, sortQueryHasValue]);
	const canHighlightFilterQuery = activeMode === 'filter' && Boolean(designCells?.length && filterQuery);
	const canHighlightSortQuery = activeMode === 'sort' && Boolean(designCells?.length && sortQuery);
	const filterQueryInspectResult = useMemo(() => {
		return canHighlightFilterQuery && designCells
			? inspectSheetRegionSourceFilterString(filterQuery, designCells)
			: null;
	}, [canHighlightFilterQuery, designCells, filterQuery]);
	const sortQueryInspectResult = useMemo(() => {
		return canHighlightSortQuery && designCells
			? inspectSheetRegionSourceSortString(sortQuery, designCells)
			: null;
	}, [canHighlightSortQuery, designCells, sortQuery]);
	const filterQueryParts = filterQueryInspectResult?.parts || EMPTY_SHEET_REGION_FILTER_QUERY_PARTS;
	const sortQueryParts = sortQueryInspectResult?.parts || EMPTY_SHEET_REGION_SORT_QUERY_PARTS;
	const filterQueryChunks = useMemo(() => {
		return canHighlightFilterQuery
			? getSheetRegionFilterQueryRenderableParts(filterQuery, filterQueryParts)
			: EMPTY_SHEET_REGION_FILTER_QUERY_CHUNKS;
	}, [canHighlightFilterQuery, filterQuery, filterQueryParts]);
	const sortQueryChunks = useMemo(() => {
		return canHighlightSortQuery
			? getSheetRegionSortQueryRenderableParts(sortQuery, sortQueryParts)
			: EMPTY_SHEET_REGION_SORT_QUERY_CHUNKS;
	}, [canHighlightSortQuery, sortQuery, sortQueryParts]);
	const canHighlightActiveQuery = canHighlightFilterQuery || canHighlightSortQuery;
	const activeQueryParts = activeMode === 'sort'
		? sortQueryParts
		: activeMode === 'filter'
			? filterQueryParts
			: EMPTY_SHEET_REGION_QUERY_PARTS;
	const activeQueryChunks = activeMode === 'sort'
		? sortQueryChunks
		: activeMode === 'filter'
			? filterQueryChunks
			: EMPTY_SHEET_REGION_QUERY_CHUNKS;
	const activeHighlightPartIndex = inputFocused && caretPartIndex >= 0 ? caretPartIndex : hoverPartIndex;
	const activeHighlightPart = activeHighlightPartIndex >= 0 ? activeQueryParts[activeHighlightPartIndex] || null : null;
	const tabs = useMemo(() => [
		{
			hasValue: sheetRegionFiltersInputModeHasValue(value, 'filter'),
			invalid: filterQueryInvalid,
			label: i18n.t('sheet.region_filter'),
			mode: 'filter' as const,
		},
		{
			hasValue: sheetRegionFiltersInputModeHasValue(value, 'sort'),
			invalid: sortQueryInvalid,
			label: i18n.t('sheet.region_sort'),
			mode: 'sort' as const,
		},
		{
			hasValue: sheetRegionFiltersInputModeHasValue(value, 'limit'),
			label: i18n.t('sheet.region_limit'),
			mode: 'limit' as const,
		},
	], [filterQueryInvalid, sortQueryInvalid, value]);
	const activeTab = tabs.find((tab) => tab.mode === activeMode) || tabs[0];

	/*
	 * Store the native input element used for caret and scroll measurements.
	 */
	const setInputRef = useCallback((node: HTMLInputElement | null) => {
		inputRef.current = node;
	}, []);

	/*
	 * Store the filter input shell used for highlight and tip measurements.
	 */
	const setShellRef = useCallback((node: HTMLSpanElement | null) => {
		shellRef.current = node;
	}, []);

	/*
	 * Sync mirror scroll and active caret query part from the native input.
	 */
	const syncRegionFilterInputState = useCallback((input?: HTMLInputElement | null) => {
		const target = input || inputRef.current;
		if (!target) {
			return;
		}

		setInputScrollLeft(target.scrollLeft);

		if (!canHighlightActiveQuery) {
			setCaretPartIndex(-1);
			return;
		}

		const part = getSheetRegionFiltersInputPartAtIndex(activeQueryParts, target.selectionStart);
		setCaretPartIndex(getSheetRegionFiltersInputPartIndex(activeQueryParts, part));
	}, [activeQueryParts, canHighlightActiveQuery]);

	/*
	 * Update whichever region control value is currently active.
	 */
	const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		const nextValue = {
			...value,
			[activeMode]: getSheetRegionFiltersInputModeValue(activeMode, event.target.value),
		};

		if (!inputValue) {
			setLocalValue(nextValue);
		}

		onChange?.(nextValue);
		syncRegionFilterInputState(event.currentTarget);
	}, [activeMode, inputValue, onChange, syncRegionFilterInputState, value]);

	/*
	 * Store the active input mode and clear mode-specific highlight state.
	 */
	const handleModeChange = useCallback((mode: SheetRegionFiltersInputMode) => {
		setActiveMode(mode);
		setCaretPartIndex(-1);
		setHoverPartIndex(-1);
		setTipPosition(null);
	}, []);

	/*
	 * Mark the native input as focused and refresh caret-driven helper state.
	 */
	const handleInputFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
		setInputFocused(true);
		syncRegionFilterInputState(event.currentTarget);
	}, [syncRegionFilterInputState]);

	/*
	 * Clear caret-owned helper state when the native input loses focus.
	 */
	const handleInputBlur = useCallback(() => {
		setInputFocused(false);
		setCaretPartIndex(-1);
	}, []);

	/*
	 * Refresh caret and scroll state from native input activity.
	 */
	const handleInputActivity = useCallback((event: SyntheticEvent<HTMLInputElement>) => {
		syncRegionFilterInputState(event.currentTarget);
	}, [syncRegionFilterInputState]);

	/*
	 * Store the highlighted query part currently under the pointer.
	 */
	const handleInputMouseMove = useCallback((event: MouseEvent<HTMLElement>) => {
		const shell = shellRef.current;
		if (!canHighlightActiveQuery || !shell) {
			setHoverPartIndex(-1);
			return;
		}

		setHoverPartIndex(getSheetRegionFiltersInputHoveredPartIndex(shell, event.clientX, event.clientY));
	}, [canHighlightActiveQuery]);

	/*
	 * Clear the hover-owned helper target when the pointer leaves the input shell.
	 */
	const handleInputMouseLeave = useCallback(() => {
		setHoverPartIndex(-1);
	}, []);

	useEffect(() => {
		syncRegionFilterInputState();
	}, [syncRegionFilterInputState]);

	useEffect(() => {
		if (typeof document === 'undefined') {
			return;
		}

		/*
		 * Sync the active part when browser selection changes without an input event.
		 */
		function handleDocumentSelectionChange() {
			if (document.activeElement === inputRef.current) {
				syncRegionFilterInputState();
			}
		}

		document.addEventListener('selectionchange', handleDocumentSelectionChange);

		return () => {
			document.removeEventListener('selectionchange', handleDocumentSelectionChange);
		};
	}, [syncRegionFilterInputState]);

	useEffect(() => {
		const shell = shellRef.current;
		const input = inputRef.current;

		if (!canHighlightActiveQuery || !shell || !input || activeHighlightPartIndex < 0) {
			setTipPosition(null);
			return;
		}

		const nextPosition = getSheetRegionFiltersInputTipPosition(shell, input, activeHighlightPartIndex);
		setTipPosition((current) => {
			if (current?.left === nextPosition?.left && current?.top === nextPosition?.top) {
				return current;
			}

			return nextPosition;
		});
	}, [activeHighlightPartIndex, activeQueryChunks, canHighlightActiveQuery, inputScrollLeft]);

	return (
		<SheetRegionFiltersInputUI
			activeMode={activeMode}
			activeHighlightPart={activeHighlightPart}
			className={className}
			disabled={disabled}
			highlightChunks={activeQueryChunks}
			inputMax={activeMode === 'limit' ? limitMax : undefined}
			inputMin={activeMode === 'limit' ? limitMin : undefined}
			inputPlaceholder={activeTab.label}
			inputRef={setInputRef}
			inputScrollLeft={inputScrollLeft}
			inputShellRef={setShellRef}
			inputType={activeMode === 'limit' ? 'number' : 'text'}
			inputValue={value[activeMode]}
			tipPosition={tipPosition}
			tabs={tabs}
			onInputActivity={handleInputActivity}
			onInputBlur={handleInputBlur}
			onInputChange={handleInputChange}
			onInputFocus={handleInputFocus}
			onInputMouseLeave={handleInputMouseLeave}
			onInputMouseMove={handleInputMouseMove}
			onModeChange={handleModeChange}
		/>
	);
});

SheetRegionFiltersInput.displayName = 'SheetRegionFiltersInput';

export default SheetRegionFiltersInput;
