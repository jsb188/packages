import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type MutableRefObject,
	type MouseEvent,
	type SyntheticEvent,
} from 'react';

export type SheetSemanticInputPartSpan = {
	endIndex: number;
	startIndex: number;
};

export type SheetSemanticInputTextChunk = {
	endIndex: number;
	kind: 'text';
	startIndex: number;
	text: string;
};

export type SheetSemanticInputPartChunk<TPart extends SheetSemanticInputPartSpan> = {
	endIndex: number;
	kind: 'part';
	part: TPart;
	partIndex: number;
	startIndex: number;
	text: string;
};

export type SheetSemanticInputTipPosition = {
	left: number;
	top: number;
};

export type SheetSemanticInputHighlightState<TPart extends SheetSemanticInputPartSpan> = {
	activePart: TPart | null;
	activePartIndex: number;
	caretPartIndex: number;
	handleInputActivity: (event: SyntheticEvent<HTMLInputElement>) => void;
	handleInputBlur: () => void;
	handleInputFocus: (event: SyntheticEvent<HTMLInputElement>) => void;
	handleInputMouseLeave: () => void;
	handleInputMouseMove: (event: MouseEvent<HTMLElement>) => void;
	hoverPartIndex: number;
	inputRef: MutableRefObject<HTMLInputElement | null>;
	inputScrollLeft: number;
	resetHighlightState: () => void;
	setInputRef: (node: HTMLInputElement | null) => void;
	setShellRef: (node: HTMLSpanElement | null) => void;
	shellRef: MutableRefObject<HTMLSpanElement | null>;
	syncInputState: (input?: HTMLInputElement | null) => void;
	tipPosition: SheetSemanticInputTipPosition | null;
};

export const SHEET_SEMANTIC_INPUT_PART_INDEX_ATTRIBUTE = 'data-sheet-semantic-input-part-index';

const SHEET_SEMANTIC_INPUT_DEFAULT_TIP_GAP = 8;
const SHEET_SEMANTIC_INPUT_DEFAULT_TIP_LEFT_OFFSET = -5;
const SHEET_SEMANTIC_INPUT_DEFAULT_TIP_WIDTH = 260;

/*
 * Schedule a browser paint-frame callback with a timer fallback for test runtimes.
 */
function requestSheetSemanticInputAnimationFrame(callback: FrameRequestCallback) {
	return globalThis.requestAnimationFrame
		? globalThis.requestAnimationFrame(callback)
		: globalThis.setTimeout(() => {
			callback(globalThis.performance?.now?.() || Date.now());
		}, 0);
}

/*
 * Cancel a scheduled semantic input frame callback.
 */
function cancelSheetSemanticInputAnimationFrame(frameId: number) {
	if (globalThis.cancelAnimationFrame) {
		globalThis.cancelAnimationFrame(frameId);
		return;
	}

	globalThis.clearTimeout(frameId);
}

/*
 * Return the semantic part that contains one zero-based text index.
 */
export function getSheetSemanticInputPartAtIndex<TPart extends SheetSemanticInputPartSpan>(
	parts: TPart[],
	index: number | null | undefined,
	includeEndIndex = false,
) {
	if (index === null || index === undefined || index < 0) {
		return null;
	}

	return parts.find((part) => {
		return index >= part.startIndex && (includeEndIndex ? index <= part.endIndex : index < part.endIndex);
	}) || null;
}

/*
 * Return the index of one semantic input part.
 */
export function getSheetSemanticInputPartIndex<TPart extends SheetSemanticInputPartSpan>(
	parts: TPart[],
	part: TPart | null,
) {
	return part ? parts.indexOf(part) : -1;
}

/*
 * Return ordered plain and highlighted chunks for rendering a mirrored semantic input.
 */
export function getSheetSemanticInputRenderableParts<TPart extends SheetSemanticInputPartSpan>(
	value: string,
	parts: TPart[],
	indexParts: TPart[] = parts,
): Array<SheetSemanticInputTextChunk | SheetSemanticInputPartChunk<TPart>> {
	const chunks: Array<SheetSemanticInputTextChunk | SheetSemanticInputPartChunk<TPart>> = [];
	let cursor = 0;

	parts.forEach((part) => {
		const partIndex = indexParts.indexOf(part);
		if (part.endIndex <= cursor || part.endIndex <= part.startIndex) {
			return;
		}

		if (part.startIndex > cursor) {
			chunks.push({
				endIndex: part.startIndex,
				kind: 'text',
				startIndex: cursor,
				text: value.slice(cursor, part.startIndex),
			});
		}

		const startIndex = Math.max(cursor, part.startIndex);
		chunks.push({
			endIndex: part.endIndex,
			kind: 'part',
			part,
			partIndex,
			startIndex,
			text: value.slice(startIndex, part.endIndex),
		});
		cursor = part.endIndex;
	});

	if (cursor < value.length) {
		chunks.push({
			endIndex: value.length,
			kind: 'text',
			startIndex: cursor,
			text: value.slice(cursor),
		});
	}

	return chunks;
}

/*
 * Return the highlighted semantic part currently under a pointer coordinate.
 */
export function getSheetSemanticInputHoveredPartIndex(shell: HTMLElement, clientX: number, clientY: number) {
	const elements = shell.querySelectorAll<HTMLElement>(`[${SHEET_SEMANTIC_INPUT_PART_INDEX_ATTRIBUTE}]`);

	for (const element of elements) {
		const rect = element.getBoundingClientRect();
		if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
			return Number(element.getAttribute(SHEET_SEMANTIC_INPUT_PART_INDEX_ATTRIBUTE));
		}
	}

	return -1;
}

/*
 * Return an absolute helper tip position under one highlighted semantic input part.
 */
export function getSheetSemanticInputTipPosition(params: {
	input: HTMLInputElement;
	partIndex: number;
	shell: HTMLElement;
	tipGap?: number;
	tipLeftOffset?: number;
	tipWidth?: number;
}): SheetSemanticInputTipPosition | null {
	const partElement = params.shell.querySelector<HTMLElement>(`[${SHEET_SEMANTIC_INPUT_PART_INDEX_ATTRIBUTE}="${params.partIndex}"]`);
	if (!partElement) {
		return null;
	}

	const shellRect = params.shell.getBoundingClientRect();
	const partRect = partElement.getBoundingClientRect();
	if (partRect.right < shellRect.left || partRect.left > shellRect.right) {
		return null;
	}

	const tipWidth = params.tipWidth ?? SHEET_SEMANTIC_INPUT_DEFAULT_TIP_WIDTH;
	const leftOffset = params.tipLeftOffset ?? SHEET_SEMANTIC_INPUT_DEFAULT_TIP_LEFT_OFFSET;
	const tipGap = params.tipGap ?? SHEET_SEMANTIC_INPUT_DEFAULT_TIP_GAP;
	const maxLeft = Math.max(0, shellRect.width - tipWidth);
	const left = Math.min(Math.max(0, partRect.left - shellRect.left + leftOffset), maxLeft);

	return {
		left,
		top: params.input.offsetTop + params.input.offsetHeight + tipGap,
	};
}

/*
 * Return shared caret, hover, scroll, and tip state for one highlighted semantic input.
 */
export function useSheetSemanticInputHighlightState<TPart extends SheetSemanticInputPartSpan>(params: {
	enabled: boolean;
	includeEndIndex?: boolean;
	onInputStateSync?: (input: HTMLInputElement) => void;
	parts: TPart[];
	syncWithAnimationFrame?: boolean;
	tipGap?: number;
	tipLeftOffset?: number;
	tipWidth?: number;
}): SheetSemanticInputHighlightState<TPart> {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const shellRef = useRef<HTMLSpanElement | null>(null);
	const syncFrameRef = useRef<number | null>(null);
	const [caretPartIndex, setCaretPartIndex] = useState(-1);
	const [hoverPartIndex, setHoverPartIndex] = useState(-1);
	const [inputFocused, setInputFocused] = useState(false);
	const [inputScrollLeft, setInputScrollLeft] = useState(0);
	const [tipPosition, setTipPosition] = useState<SheetSemanticInputTipPosition | null>(null);
	const activePartIndex = inputFocused && caretPartIndex >= 0 ? caretPartIndex : hoverPartIndex;
	const activePart = activePartIndex >= 0 ? params.parts[activePartIndex] || null : null;

	/*
	 * Store the native input node used for caret and scroll measurements.
	 */
	const setInputRef = useCallback((node: HTMLInputElement | null) => {
		inputRef.current = node;
	}, []);

	/*
	 * Store the input shell node used for highlighted part measurements.
	 */
	const setShellRef = useCallback((node: HTMLSpanElement | null) => {
		shellRef.current = node;
	}, []);

	/*
	 * Clear hover, caret, and helper tip state for the active input.
	 */
	const resetHighlightState = useCallback(() => {
		setCaretPartIndex(-1);
		setHoverPartIndex(-1);
		setTipPosition(null);
	}, []);

	/*
	 * Sync mirror scroll and caret-owned semantic part state from the native input.
	 */
	const syncInputState = useCallback((input?: HTMLInputElement | null) => {
		const target = input || inputRef.current;

		if (syncFrameRef.current !== null) {
			cancelSheetSemanticInputAnimationFrame(syncFrameRef.current);
			syncFrameRef.current = null;
		}

		const sync = () => {
			syncFrameRef.current = null;

			if (!target) {
				return;
			}

			setInputScrollLeft(target.scrollLeft);
			params.onInputStateSync?.(target);

			if (!params.enabled) {
				setCaretPartIndex(-1);
				return;
			}

			const part = getSheetSemanticInputPartAtIndex(params.parts, target.selectionStart, params.includeEndIndex);
			setCaretPartIndex(getSheetSemanticInputPartIndex(params.parts, part));
		};

		if (params.syncWithAnimationFrame) {
			syncFrameRef.current = requestSheetSemanticInputAnimationFrame(sync);
			return;
		}

		sync();
	}, [params.enabled, params.includeEndIndex, params.onInputStateSync, params.parts, params.syncWithAnimationFrame]);

	/*
	 * Mark the native input as focused and refresh caret-driven helper state.
	 */
	const handleInputFocus = useCallback((event: SyntheticEvent<HTMLInputElement>) => {
		setInputFocused(true);
		syncInputState(event.currentTarget);
	}, [syncInputState]);

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
		syncInputState(event.currentTarget);
	}, [syncInputState]);

	/*
	 * Store the highlighted semantic part currently under the pointer.
	 */
	const handleInputMouseMove = useCallback((event: MouseEvent<HTMLElement>) => {
		const shell = shellRef.current;
		if (!params.enabled || !shell) {
			setHoverPartIndex(-1);
			return;
		}

		setHoverPartIndex(getSheetSemanticInputHoveredPartIndex(shell, event.clientX, event.clientY));
	}, [params.enabled]);

	/*
	 * Clear the hover-owned helper target when the pointer leaves the input shell.
	 */
	const handleInputMouseLeave = useCallback(() => {
		setHoverPartIndex(-1);
	}, []);

	useEffect(() => {
		syncInputState();
	}, [syncInputState]);

	useEffect(() => {
		return () => {
			if (syncFrameRef.current !== null) {
				cancelSheetSemanticInputAnimationFrame(syncFrameRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (typeof document === 'undefined') {
			return;
		}

		/*
		 * Sync the active part when browser selection changes without an input event.
		 */
		function handleDocumentSelectionChange() {
			if (document.activeElement === inputRef.current) {
				syncInputState();
			}
		}

		document.addEventListener('selectionchange', handleDocumentSelectionChange);

		return () => {
			document.removeEventListener('selectionchange', handleDocumentSelectionChange);
		};
	}, [syncInputState]);

	useEffect(() => {
		const shell = shellRef.current;
		const input = inputRef.current;

		if (!params.enabled || !shell || !input || activePartIndex < 0) {
			setTipPosition(null);
			return;
		}

		const nextPosition = getSheetSemanticInputTipPosition({
			input,
			partIndex: activePartIndex,
			shell,
			tipGap: params.tipGap,
			tipLeftOffset: params.tipLeftOffset,
			tipWidth: params.tipWidth,
		});
		setTipPosition((current) => {
			if (current?.left === nextPosition?.left && current?.top === nextPosition?.top) {
				return current;
			}

			return nextPosition;
		});
	}, [activePartIndex, inputScrollLeft, params.enabled, params.parts, params.tipGap, params.tipLeftOffset, params.tipWidth]);

	return {
		activePart,
		activePartIndex,
		caretPartIndex,
		handleInputActivity,
		handleInputBlur,
		handleInputFocus,
		handleInputMouseLeave,
		handleInputMouseMove,
		hoverPartIndex,
		inputRef,
		inputScrollLeft,
		resetHighlightState,
		setInputRef,
		setShellRef,
		shellRef,
		syncInputState,
		tipPosition,
	};
}
