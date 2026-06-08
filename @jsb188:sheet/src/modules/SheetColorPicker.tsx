import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { TooltipButton } from '@jsb188/react-web/modules/PopOver';
import { memo, type ChangeEvent, type CSSProperties, type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from 'react';
import type { SheetEditorOverlayPosition } from './SheetEditorOverlay.tsx';

const SHEET_COLOR_PICKER_WIDTH = 500;
const DEFAULT_SHEET_COLOR_PICKER_VALUE = '#000000';

type SheetColorPickerDragState = {
	startClientX: number;
	startClientY: number;
	startOffsetX: number;
	startOffsetY: number;
};

type SheetColorPickerOffset = {
	x: number;
	y: number;
};

export type SheetColorPickerProps = {
	className?: string;
	label: string;
	onClose?: () => void;
	onColorValue: (value: string) => void;
	position: SheetEditorOverlayPosition;
	scrollLeft: number;
	scrollTop: number;
	value?: string | null;
};

/*
 * Return whether one color value can be used by the native color input.
 */
function isSheetColorPickerHexValue(value: string) {
	return /^#[0-9a-f]{6}$/i.test(value);
}

/*
 * Return the normalized value for the native color input.
 */
function getSheetColorPickerInputValue(value?: string | null) {
	const nextValue = String(value || '').trim();

	return isSheetColorPickerHexValue(nextValue) ? nextValue : DEFAULT_SHEET_COLOR_PICKER_VALUE;
}

/*
 * Return absolute overlay styles for the sheet color picker.
 */
function getSheetColorPickerStyle(
	position: SheetEditorOverlayPosition,
	scrollLeft: number,
	scrollTop: number,
	offset: SheetColorPickerOffset,
): CSSProperties {
	return {
		left: scrollLeft + position.left + offset.x,
		position: 'absolute',
		top: scrollTop + position.top + position.height + 1 + offset.y,
		width: SHEET_COLOR_PICKER_WIDTH,
		zIndex: 44,
	};
}

/*
 * Render a draggable Sheet color picker overlay for one selected style field.
 */
export const SheetColorPicker = memo((p: SheetColorPickerProps) => {
	const [draftValue, setDraftValue] = useState(getSheetColorPickerInputValue(p.value));
	const [dragOffset, setDragOffset] = useState<SheetColorPickerOffset>({ x: 0, y: 0 });
	const [dragVersion, setDragVersion] = useState(0);
	const dragStateRef = useRef<SheetColorPickerDragState | null>(null);

	/*
	 * Begin dragging the picker from its handle.
	 */
	const handleDragStart = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.button !== 0) {
			return;
		}

		event.preventDefault();
		dragStateRef.current = {
			startClientX: event.clientX,
			startClientY: event.clientY,
			startOffsetX: dragOffset.x,
			startOffsetY: dragOffset.y,
		};
		setDragVersion((current) => current + 1);
	}, [dragOffset.x, dragOffset.y]);

	/*
	 * Store a new color draft from the native color input.
	 */
	const handleColorInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setDraftValue(event.currentTarget.value);
	}, []);

	/*
	 * Store a new color draft from the text input.
	 */
	const handleTextInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
		setDraftValue(event.currentTarget.value);
	}, []);

	/*
	 * Apply the current color draft to the selected cells.
	 */
	const handleApply = useCallback(() => {
		const nextValue = draftValue.trim();

		if (!nextValue) {
			return;
		}

		p.onColorValue(nextValue);
		p.onClose?.();
	}, [draftValue, p.onClose, p.onColorValue]);

	useEffect(() => {
		if (!dragStateRef.current) {
			return;
		}

		/*
		 * Move the color picker by the current pointer delta.
		 */
		const handlePointerMove = (event: PointerEvent) => {
			const dragState = dragStateRef.current;

			if (!dragState) {
				return;
			}

			setDragOffset({
				x: dragState.startOffsetX + event.clientX - dragState.startClientX,
				y: dragState.startOffsetY + event.clientY - dragState.startClientY,
			});
		};

		/*
		 * Stop moving the color picker when the pointer is released.
		 */
		const handlePointerUp = () => {
			dragStateRef.current = null;
			globalThis.window?.removeEventListener('pointermove', handlePointerMove);
			globalThis.window?.removeEventListener('pointerup', handlePointerUp);
			globalThis.window?.removeEventListener('pointercancel', handlePointerUp);
		};

		globalThis.window?.addEventListener('pointermove', handlePointerMove);
		globalThis.window?.addEventListener('pointerup', handlePointerUp);
		globalThis.window?.addEventListener('pointercancel', handlePointerUp);

		return () => {
			globalThis.window?.removeEventListener('pointermove', handlePointerMove);
			globalThis.window?.removeEventListener('pointerup', handlePointerUp);
			globalThis.window?.removeEventListener('pointercancel', handlePointerUp);
		};
	}, [dragVersion]);

	return <div
		className={cn('bg shadow_light ft_xs', p.className)}
		data-sheet-color-picker="true"
		style={getSheetColorPickerStyle(p.position, p.scrollLeft, p.scrollTop, dragOffset)}
	>
		<TooltipButton
			as="div"
			closeWhilePointerDown
      showDelayMs={500}
			message="Click to drag this window"
			position="top"
		>
			<div className="h_10 rel pattern_texture medium_bf bg_fade bg_primary_fd_hv cs_grab" onPointerDown={handleDragStart} />
		</TooltipButton>
		<div className="grid gap_10 p_12">
			<div className="h_spread gap_10">
				<span className="ft_medium">{p.label}</span>
				<span className="cl_md">{draftValue}</span>
			</div>
			<div className="h_spread gap_10">
				<input
					aria-label={p.label}
					className="w_60 h_32 p_0 bd_1 bd_lt r_4 bg"
					onChange={handleColorInputChange}
					type="color"
					value={getSheetColorPickerInputValue(draftValue)}
				/>
				<input
					aria-label={p.label}
					className="f h_32 px_8 bd_1 bd_lt r_4 bg ft_xs"
					onChange={handleTextInputChange}
					value={draftValue}
				/>
				<button className="h_32 px_10 bg_primary cl_white ft_xs r_4" onClick={handleApply} type="button">
					{i18n.t('form.apply')}
				</button>
			</div>
		</div>
	</div>;
});

SheetColorPicker.displayName = 'SheetColorPicker';
