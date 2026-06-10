import {
	getSheetSemanticInputPartAtIndex,
	getSheetSemanticInputRenderableParts,
	type SheetSemanticInputPartChunk,
	type SheetSemanticInputPartSpan,
	type SheetSemanticInputTextChunk,
} from './sheet-semantic-input.ts';

export type SheetRegionQueryPartSpan = {
	endIndex: number;
	startIndex: number;
};

export type SheetRegionQueryTextChunk = SheetSemanticInputTextChunk;

export type SheetRegionQueryPartChunk<TPart extends SheetRegionQueryPartSpan> = SheetSemanticInputPartChunk<TPart>;

/*
 * Escape one string for double-quoted region query text.
 */
export function escapeSheetRegionQueryString(value: string) {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n');
}

/*
 * Return the region query part that contains one zero-based text index.
 */
export function getSheetRegionQueryPartAtIndex<TPart extends SheetSemanticInputPartSpan>(
	parts: TPart[],
	index: number | null | undefined,
) {
	return getSheetSemanticInputPartAtIndex(parts, index);
}

/*
 * Return ordered plain and highlighted chunks for rendering a mirrored region query input.
 */
export function getSheetRegionQueryRenderableParts<TPart extends SheetSemanticInputPartSpan>(
	query: string,
	parts: TPart[],
	indexParts: TPart[] = parts,
): Array<SheetRegionQueryTextChunk | SheetRegionQueryPartChunk<TPart>> {
	return getSheetSemanticInputRenderableParts(query, parts, indexParts);
}
