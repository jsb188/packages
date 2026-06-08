export const SHEET_TEXT_EDITOR_SELECTOR = '[data-sheet-editor="true"]';
export const SHEET_GRID_EDITOR_SELECTOR = '[data-sheet-editor="true"], [data-sheet-select-editor="true"], [data-sheet-date-editor="true"], [data-sheet-inbound-contact-editor="true"]';
export const SHEET_COLOR_PICKER_SELECTOR = '[data-sheet-color-picker="true"]';
export const SHEET_CONTEXT_MENU_OVERLAY_SELECTOR = [
	SHEET_GRID_EDITOR_SELECTOR,
	SHEET_COLOR_PICKER_SELECTOR,
	'[data-sheet-editor-overlay="true"]',
	'[data-sheet-local-editor-anchor="true"]',
	'[data-sheet-read-only-cell-tag-anchor="true"]',
].join(', ');

/*
 * Return the Element target for one DOM event target.
 */
export function getSheetEventElementTarget(target: EventTarget | null) {
	return target instanceof Element ? target : null;
}

/*
 * Return whether one event target is inside the Sheet color picker overlay.
 */
export function isSheetColorPickerEventTarget(target: EventTarget | null) {
	return Boolean(getSheetEventElementTarget(target)?.closest(SHEET_COLOR_PICKER_SELECTOR));
}

/*
 * Return whether one event target is inside an overlay that owns native right-click behavior.
 */
export function isSheetContextMenuOverlayEventTarget(target: EventTarget | null) {
	return Boolean(getSheetEventElementTarget(target)?.closest(SHEET_CONTEXT_MENU_OVERLAY_SELECTOR));
}
