import {
	memo,
	type CSSProperties,
	type ReactNode,
} from 'react';
import {
	SHEET_SEMANTIC_INPUT_PART_INDEX_ATTRIBUTE,
	type SheetSemanticInputPartChunk,
	type SheetSemanticInputPartSpan,
	type SheetSemanticInputTextChunk,
	type SheetSemanticInputTipPosition,
} from '../libs/sheet-semantic-input.ts';

export type SheetSemanticInputGuide = {
	description?: ReactNode;
	title: ReactNode;
};

type SheetSemanticInputPartDataAttributes = {
	[key: `data-${string}`]: number | string | undefined;
};

export type SheetSemanticInputOverlayProps<TPart extends SheetSemanticInputPartSpan> = {
	activePart?: TPart | null;
	chunks?: Array<SheetSemanticInputTextChunk | SheetSemanticInputPartChunk<TPart>>;
	getPartDataAttributes?: (part: TPart, partIndex: number) => SheetSemanticInputPartDataAttributes;
	getPartGuide?: (part: TPart) => SheetSemanticInputGuide | null;
	getPartHighlightStyle: (part: TPart) => CSSProperties;
	inputScrollLeft?: number;
	mirrorClassName?: string;
	mirrorStyle: CSSProperties;
	tipPosition?: SheetSemanticInputTipPosition | null;
};

/*
 * Return inline styles for horizontally shifted semantic input mirror content.
 */
function getSheetSemanticInputMirrorContentStyle(scrollLeft: number): CSSProperties {
	return {
		display: 'inline-block',
		minWidth: '100%',
		transform: `translateX(${-scrollLeft}px)`,
	};
}

/*
 * Return the React key for one highlighted semantic input part span.
 */
function getSheetSemanticInputPartSpanKey<TPart extends SheetSemanticInputPartSpan>(
	chunk: SheetSemanticInputPartChunk<TPart>,
) {
	return `part_${chunk.partIndex}_${chunk.startIndex}_${chunk.endIndex}`;
}

/*
 * Return props for one highlighted semantic input part span.
 */
function getSheetSemanticInputPartSpanProps<TPart extends SheetSemanticInputPartSpan>(
	props: SheetSemanticInputOverlayProps<TPart>,
	chunk: SheetSemanticInputPartChunk<TPart>,
) {
	return {
		...props.getPartDataAttributes?.(chunk.part, chunk.partIndex),
		[SHEET_SEMANTIC_INPUT_PART_INDEX_ATTRIBUTE]: chunk.partIndex,
		style: props.getPartHighlightStyle(chunk.part),
	};
}

/*
 * Render mirrored semantic input text with highlighted part spans.
 */
function renderSheetSemanticInputHighlightedText<TPart extends SheetSemanticInputPartSpan>(
	props: SheetSemanticInputOverlayProps<TPart>,
) {
	const children: ReactNode[] = [];

	(props.chunks || []).forEach((chunk, index) => {
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
				key={getSheetSemanticInputPartSpanKey(chunk)}
				{...getSheetSemanticInputPartSpanProps(props, chunk)}
			>
				{chunk.text}
			</span>,
		);
	});

	return children;
}

/*
 * Render the shared helper guide for one active semantic input part.
 */
function renderSheetSemanticInputGuide<TPart extends SheetSemanticInputPartSpan>(
	props: SheetSemanticInputOverlayProps<TPart>,
) {
	if (!props.activePart || !props.tipPosition || !props.getPartGuide) {
		return null;
	}

	const guide = props.getPartGuide(props.activePart);
	if (!guide) {
		return null;
	}

	return (
		<div
			className='abs z9 bg bd_1 shadow r_sm ft_xs px_10 py_10 pb_12 max_w_250'
			data-sheet-semantic-input-guide='true'
			onMouseDown={(event) => event.preventDefault()}
			style={{
				left: props.tipPosition.left,
				pointerEvents: 'auto',
				top: props.tipPosition.top,
			}}
		>
			<div className='ft_medium mb_3'>
				{guide.title}
			</div>
			{guide.description ? (
				<div className='cl_md'>
					{guide.description}
				</div>
			) : null}
		</div>
	);
}

/*
 * Render a mirrored semantic input overlay and its active helper guide.
 */
function SheetSemanticInputOverlayBase<TPart extends SheetSemanticInputPartSpan>(
	props: SheetSemanticInputOverlayProps<TPart>,
) {
	const hasChunks = Boolean(props.chunks?.length);

	return <>
		{hasChunks ? (
			<span
				aria-hidden='true'
				className={props.mirrorClassName}
				data-sheet-semantic-input-highlight='true'
				style={props.mirrorStyle}
			>
				<span style={getSheetSemanticInputMirrorContentStyle(props.inputScrollLeft || 0)}>
					{renderSheetSemanticInputHighlightedText(props)}
				</span>
			</span>
		) : null}
		{renderSheetSemanticInputGuide(props)}
	</>;
}

export const SheetSemanticInputOverlay = Object.assign(
	memo(SheetSemanticInputOverlayBase) as typeof SheetSemanticInputOverlayBase,
	{ displayName: 'SheetSemanticInputOverlay' },
);

export default SheetSemanticInputOverlay;
