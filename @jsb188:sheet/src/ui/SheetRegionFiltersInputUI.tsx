import { cn } from '@jsb188/app/utils/string.ts';
import { Icon } from '@jsb188/react-web/svgs/Icon';
import {
	memo,
	type CSSProperties,
	type ChangeEventHandler,
	type FocusEventHandler,
	type MouseEventHandler,
	type ReactNode,
	type RefCallback,
	type SyntheticEvent,
} from 'react';
import type {
	SheetRegionFilterQueryHighlightChunk,
	SheetRegionFilterQueryPart,
} from '../libs/sheet-region-filter-query.ts';
import type {
	SheetRegionSortQueryHighlightChunk,
	SheetRegionSortQueryPart,
} from '../libs/sheet-region-sort-query.ts';

export type SheetRegionFiltersInputMode = 'filter' | 'sort' | 'limit';

export type SheetRegionFiltersInputHighlightPart = SheetRegionFilterQueryPart | SheetRegionSortQueryPart;
export type SheetRegionFiltersInputHighlightChunk = SheetRegionFilterQueryHighlightChunk | SheetRegionSortQueryHighlightChunk;

export type SheetRegionFiltersInputUITab = {
	hasValue: boolean;
	invalid?: boolean;
	label: string;
	mode: SheetRegionFiltersInputMode;
};

export type SheetRegionFiltersInputUITipPosition = {
	left: number;
	top: number;
};

export type SheetRegionFiltersInputUIProps = {
	activeMode: SheetRegionFiltersInputMode;
	activeHighlightPart?: SheetRegionFiltersInputHighlightPart | null;
	className?: string;
	disabled?: boolean;
	highlightChunks?: SheetRegionFiltersInputHighlightChunk[];
	inputMax?: number;
	inputMin?: number;
	inputPlaceholder?: string;
	inputRef?: RefCallback<HTMLInputElement>;
	inputScrollLeft?: number;
	inputShellRef?: RefCallback<HTMLSpanElement>;
	inputType?: string;
	inputValue?: number | string | null;
	tabs: SheetRegionFiltersInputUITab[];
	tipPosition?: SheetRegionFiltersInputUITipPosition | null;
	onInputActivity?: (event: SyntheticEvent<HTMLInputElement>) => void;
	onInputBlur?: FocusEventHandler<HTMLInputElement>;
	onInputChange: ChangeEventHandler<HTMLInputElement>;
	onInputFocus?: FocusEventHandler<HTMLInputElement>;
	onInputMouseLeave?: MouseEventHandler<HTMLElement>;
	onInputMouseMove?: MouseEventHandler<HTMLElement>;
	onModeChange: (mode: SheetRegionFiltersInputMode) => void;
};

const SHEET_REGION_FILTER_INPUT_PADDING = '0 8px';
const SHEET_REGION_FILTER_TEXT_LAYOUT_STYLE: CSSProperties = {
	fontFeatureSettings: '"liga" 0, "clig" 0, "calt" 0',
	fontKerning: 'none',
	fontVariantLigatures: 'none',
	letterSpacing: 0,
	textRendering: 'geometricPrecision',
};
const SHEET_REGION_FILTER_MIRROR_STYLE: CSSProperties = {
	...SHEET_REGION_FILTER_TEXT_LAYOUT_STYLE,
	border: '1px solid transparent',
	boxSizing: 'border-box',
	color: 'rgb(var(--color-default))',
	inset: 0,
	lineHeight: '34px',
	overflow: 'hidden',
	padding: SHEET_REGION_FILTER_INPUT_PADDING,
	pointerEvents: 'none',
	position: 'absolute',
	whiteSpace: 'pre',
	zIndex: 1,
};
const SHEET_REGION_FILTER_INPUT_STYLE: CSSProperties = {
	...SHEET_REGION_FILTER_TEXT_LAYOUT_STYLE,
	position: 'relative',
	width: '100%',
	zIndex: 2,
};
const SHEET_REGION_FILTER_HIGHLIGHT_INPUT_STYLE: CSSProperties = {
	...SHEET_REGION_FILTER_INPUT_STYLE,
	background: 'transparent',
	caretColor: 'rgb(var(--color-default))',
	color: 'rgb(var(--color-default))',
	WebkitTextFillColor: 'transparent',
};
const SHEET_REGION_FILTER_PART_HIGHLIGHTS: Record<SheetRegionFiltersInputHighlightPart['kind'], string> = {
	column: 'var(--color-sky-light)',
	combinator: 'var(--color-amber-light)',
	condition: 'var(--color-lime-light)',
	direction: 'var(--color-lime-light)',
	error: 'var(--color-rose-light)',
	group: 'var(--color-violet-light)',
	separator: 'var(--color-amber-light)',
};

/*
 * Return inline styles for the horizontally shifted filter query mirror content.
 */
function getSheetRegionFilterMirrorContentStyle(scrollLeft: number): CSSProperties {
	return {
		display: 'inline-block',
		minWidth: '100%',
		transform: `translateX(${-scrollLeft}px)`,
	};
}

/*
 * Return inline styles for one highlighted filter query part.
 */
function getSheetRegionFilterHighlightStyle(part: SheetRegionFiltersInputHighlightPart): CSSProperties {
	const background = SHEET_REGION_FILTER_PART_HIGHLIGHTS[part.kind];

	return {
		background,
		borderRadius: 3,
		boxShadow: `0 0 0 2px ${background}`,
	};
}

/*
 * Return inline styles for the native region filter input.
 */
function getSheetRegionFilterInputStyle(hasHighlights: boolean): CSSProperties {
	return hasHighlights ? SHEET_REGION_FILTER_HIGHLIGHT_INPUT_STYLE : SHEET_REGION_FILTER_INPUT_STYLE;
}

/*
 * Render mirrored filter query text with highlighted semantic spans.
 */
function renderSheetRegionFilterHighlightedText(chunks: SheetRegionFiltersInputHighlightChunk[]) {
	const children: ReactNode[] = [];

	chunks.forEach((chunk, index) => {
		if (chunk.kind === 'text') {
			children.push(
				<span key={`text_${chunk.startIndex}_${chunk.endIndex}_${index}`}>
					{chunk.text}
				</span>,
			);
			return;
		}

		children.push(
			<span
				data-sheet-region-filter-part-index={chunk.partIndex}
				key={`part_${chunk.partIndex}_${chunk.startIndex}_${chunk.endIndex}`}
				style={getSheetRegionFilterHighlightStyle(chunk.part)}
			>
				{chunk.text}
			</span>,
		);
	});

	return children;
}

/*
 * Return the readable guide heading for one highlighted filter query part.
 */
function getSheetRegionFilterTipTitle(part: SheetRegionFiltersInputHighlightPart) {
	const titleByKind: Record<SheetRegionFiltersInputHighlightPart['kind'], string> = {
		column: 'Column',
		combinator: 'Combinator',
		condition: 'Condition',
		direction: 'Direction',
		error: 'Error',
		group: 'Group',
		separator: 'Separator',
	};

	return titleByKind[part.kind];
}

/*
 * Return helpful guide body text for one highlighted filter query part.
 */
function getSheetRegionFilterTipDescription(part: SheetRegionFiltersInputHighlightPart) {
	if (part.kind === 'column') {
		return part.explanation || 'The data table column used by this query part.';
	}

	if (part.kind === 'condition') {
		return `The comparison applied to this column. ${part.explanation}.`;
	}

	if (part.kind === 'combinator') {
		return `Controls how the filters around it are combined. ${part.explanation}.`;
	}

	if (part.kind === 'group') {
		return `Groups filters so they are evaluated together. ${part.explanation}.`;
	}

	if (part.kind === 'direction') {
		return `Controls the order for this sort column. ${part.explanation}`;
	}

	if (part.kind === 'separator') {
		return part.explanation;
	}

	return part.explanation;
}

/*
 * Render the small tip popover for one active highlighted query part.
 */
function renderSheetRegionFilterTip(part?: SheetRegionFiltersInputHighlightPart | null, position?: SheetRegionFiltersInputUITipPosition | null) {
	if (!part || !position) {
		return null;
	}

	return (
		<div
			className='abs z9 bg bd_1 shadow r_sm ft_xs px_10 py_10 pb_12 max_w_250'
			data-sheet-region-filter-tip='true'
			onMouseDown={(event) => event.preventDefault()}
			style={{
				left: position.left,
				pointerEvents: 'auto',
				top: position.top,
			}}
		>
			<div className='ft_medium mb_3'>
				{getSheetRegionFilterTipTitle(part)}
			</div>
			<div className='cl_md'>
				{getSheetRegionFilterTipDescription(part)}
			</div>
		</div>
	);
}

/*
 * Render one filter header button for choosing which value the input edits.
 */
const SheetRegionFiltersInputUIButton = memo((p: {
	active: boolean;
	disabled?: boolean;
	hasValue: boolean;
	invalid?: boolean;
	label: string;
	mode: SheetRegionFiltersInputMode;
	onModeChange: (mode: SheetRegionFiltersInputMode) => void;
}) => {
	return (
		<button
			className={cn(
				'btn h_item gap_2 p_6 ft_xs no_shrink ic_sm',
				p.active ? 'cl_df' : p.invalid ? 'cl_err' : 'cl_md',
			)}
			disabled={p.disabled}
			type='button'
			onClick={() => p.onModeChange(p.mode)}
		>
			<span>{p.label}</span>
			{p.invalid ? <Icon name='exclamation-circle-filled' /> : p.hasValue ? <Icon name='circle-check-filled' /> : null}
		</button>
	);
});

SheetRegionFiltersInputUIButton.displayName = 'SheetRegionFiltersInputUIButton';

/*
 * Render one active text input with filter, sort, and limit mode buttons.
 */
export const SheetRegionFiltersInputUI = memo((p: SheetRegionFiltersInputUIProps) => {
	const highlightChunks = p.highlightChunks || [];
	const inputValue = p.inputValue ?? '';
	const hasHighlights = Boolean(highlightChunks.length && String(inputValue));

	return (
		<div className={cn('v_stretch no_shrink rel', p.className)}>
			{/* <div className='bg_active h_left gap_3 no_shrink px_3 pt_2 pb_3 bd_t_1 bd_l_1 bd_r_1 bd_lt rt_sm'> */}
			<div className='bg_active h_left gap_3 no_shrink px_3 pt_2 pb_3 rt_sm'>
				{p.tabs.map((tab) => (
					<SheetRegionFiltersInputUIButton
						key={tab.mode}
						active={tab.mode === p.activeMode}
						disabled={p.disabled}
						hasValue={tab.hasValue}
						invalid={tab.invalid}
						label={tab.label}
						mode={tab.mode}
						onModeChange={p.onModeChange}
					/>
				))}
			</div>

			<div className='h_48 px_6 h_item bg no_shrink'>
				<label className='h_item gap_6 f'>
					<span
						className='rel f h_36'
						ref={p.inputShellRef}
						onMouseLeave={p.onInputMouseLeave}
						onMouseMove={p.onInputMouseMove}
					>
						{hasHighlights ? (
							<span
								aria-hidden='true'
								data-sheet-region-filter-highlight='true'
								style={SHEET_REGION_FILTER_MIRROR_STYLE}
							>
								<span style={getSheetRegionFilterMirrorContentStyle(p.inputScrollLeft || 0)}>
									{renderSheetRegionFilterHighlightedText(highlightChunks)}
								</span>
							</span>
						) : null}
						<input
							className='h_36 px_8 bg bd_1 bd_lt r_xs cl_df f'
							disabled={p.disabled}
							max={p.inputMax}
							min={p.inputMin}
							placeholder={p.inputPlaceholder}
							ref={p.inputRef}
							style={getSheetRegionFilterInputStyle(hasHighlights)}
							type={p.inputType || 'text'}
							value={inputValue}
							onBlur={p.onInputBlur}
							onChange={p.onInputChange}
							onClick={p.onInputActivity}
							onFocus={p.onInputFocus}
							onKeyUp={p.onInputActivity}
							onScroll={p.onInputActivity}
							onSelect={p.onInputActivity}
						/>
						{renderSheetRegionFilterTip(p.activeHighlightPart, p.tipPosition)}
					</span>
				</label>
			</div>
		</div>
	);
});

SheetRegionFiltersInputUI.displayName = 'SheetRegionFiltersInputUI';

export default SheetRegionFiltersInputUI;
