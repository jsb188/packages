import i18n from '@jsb188/app/i18n/index.ts';
import {
	memo,
	useCallback,
	useMemo,
	useState,
	type ChangeEvent,
	type FocusEvent,
	type SyntheticEvent,
} from 'react';
import {
	getSheetRegionFilterQueryRenderableParts,
	inspectSheetRegionSourceFilterString,
	type SheetRegionFilterQueryDesignCell,
	type SheetRegionFilterQueryHighlightChunk,
	type SheetRegionFilterQueryPart,
} from '../libs/sheet-region-filter-query.ts';
import {
	getSheetRegionSortQueryRenderableParts,
	inspectSheetRegionSourceSortString,
	type SheetRegionSortQueryHighlightChunk,
	type SheetRegionSortQueryPart,
} from '../libs/sheet-region-sort-query.ts';
import { useSheetSemanticInputHighlightState } from '../libs/sheet-semantic-input.ts';
import {
	SheetRegionFiltersInputUI,
	type SheetRegionFiltersInputMode,
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
	const [activeMode, setActiveMode] = useState<SheetRegionFiltersInputMode>('filter');
	const [localValue, setLocalValue] = useState<SheetRegionFiltersInputValue>(() => {
		return getNormalizedSheetRegionFiltersInputValue(inputValue);
	});
	const value = inputValue ? getNormalizedSheetRegionFiltersInputValue(inputValue) : localValue;
	const filterQuery = value.filter || '';
	const filterQueryHasValue = String(filterQuery).trim() !== '';
	const sortQuery = value.sort || '';
	const sortQueryHasValue = String(sortQuery).trim() !== '';
	const canHighlightFilterQuery = activeMode === 'filter' && Boolean(designCells?.length && filterQuery);
	const canHighlightSortQuery = activeMode === 'sort' && Boolean(designCells?.length && sortQuery);
	const filterQueryInspectResult = useMemo(() => {
		return filterQueryHasValue && designCells?.length
			? inspectSheetRegionSourceFilterString(filterQuery, designCells)
			: null;
	}, [designCells, filterQuery, filterQueryHasValue]);
	const sortQueryInspectResult = useMemo(() => {
		return sortQueryHasValue && designCells?.length
			? inspectSheetRegionSourceSortString(sortQuery, designCells)
			: null;
	}, [designCells, sortQuery, sortQueryHasValue]);
	const filterQueryInvalid = Boolean(filterQueryInspectResult?.error);
	const sortQueryInvalid = Boolean(sortQueryInspectResult?.error);
	const filterQueryParts = canHighlightFilterQuery
		? filterQueryInspectResult?.parts || EMPTY_SHEET_REGION_FILTER_QUERY_PARTS
		: EMPTY_SHEET_REGION_FILTER_QUERY_PARTS;
	const sortQueryParts = canHighlightSortQuery
		? sortQueryInspectResult?.parts || EMPTY_SHEET_REGION_SORT_QUERY_PARTS
		: EMPTY_SHEET_REGION_SORT_QUERY_PARTS;
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
	const semanticInput = useSheetSemanticInputHighlightState({
		enabled: canHighlightActiveQuery,
		parts: activeQueryParts,
		tipLeftOffset: SHEET_REGION_FILTER_TIP_LEFT_OFFSET,
		tipWidth: SHEET_REGION_FILTER_TIP_ASSUMED_WIDTH,
	});
	const {
		activePart,
		handleInputActivity: handleSemanticInputActivity,
		handleInputBlur: handleSemanticInputBlur,
		handleInputFocus: handleSemanticInputFocus,
		handleInputMouseLeave,
		handleInputMouseMove,
		inputScrollLeft,
		resetHighlightState,
		setInputRef,
		setShellRef,
		syncInputState,
		tipPosition,
	} = semanticInput;
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
		syncInputState(event.currentTarget);
	}, [activeMode, inputValue, onChange, syncInputState, value]);

	/*
	 * Store the active input mode and clear mode-specific highlight state.
	 */
	const handleModeChange = useCallback((mode: SheetRegionFiltersInputMode) => {
		setActiveMode(mode);
		resetHighlightState();
	}, [resetHighlightState]);

	/*
	 * Mark the native input as focused and refresh caret-driven helper state.
	 */
	const handleInputFocus = useCallback((event: FocusEvent<HTMLInputElement>) => {
		handleSemanticInputFocus(event);
	}, [handleSemanticInputFocus]);

	/*
	 * Clear caret-owned helper state when the native input loses focus.
	 */
	const handleInputBlur = useCallback(() => {
		handleSemanticInputBlur();
	}, [handleSemanticInputBlur]);

	/*
	 * Refresh caret and scroll state from native input activity.
	 */
	const handleInputActivity = useCallback((event: SyntheticEvent<HTMLInputElement>) => {
		handleSemanticInputActivity(event);
	}, [handleSemanticInputActivity]);

	return (
		<SheetRegionFiltersInputUI
			activeMode={activeMode}
			activeHighlightPart={activePart}
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
