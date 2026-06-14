import i18n from '@jsb188/app/i18n/index.ts';
import { isHexColorValue } from '@jsb188/app/utils/color.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { TooltipButton } from '@jsb188/react-web/modules/PopOver';
import { memo, useCallback, useEffect, useRef, useState, type ChangeEvent, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import type { SheetEditorOverlayPosition } from './SheetEditorOverlay.tsx';

const DEFAULT_SHEET_COLOR_PICKER_VALUE = '#000000';
const SHEET_COLOR_PICKER_PRESET_COLORS = [
	'#000000',
	'#434343',
	'#666666',
	'#999999',
	'#b7b7b7',
	'#cccccc',
	'#d9d9d9',
	'#efefef',
	'#f3f3f3',
	'#ffffff',
	'#8b1a10',
	'#ea3223',
	'#f19e39',
	'#ffff55',
	'#75fb4c',
	'#74fbfd',
	'#5885e1',
	'#0004f5',
	'#8b1cf6',
	'#ea34f7',
	'#dfbab1',
	'#eececd',
	'#f8e6d0',
	'#fdf3d0',
	'#dcead5',
	'#d3e0e3',
	'#ccdaf5',
	'#d3e2f1',
	'#d8d2e7',
	'#e6d2dc',
	'#d08370',
	'#df9d9b',
	'#f2cda2',
	'#fbe6a3',
	'#bdd6ac',
	'#a9c3c8',
	'#aac1f0',
	'#a7c4e5',
	'#b2a8d3',
	'#cea8bc',
	'#bd4c31',
	'#d16d6a',
	'#ecb576',
	'#f9db78',
	'#9dc384',
	'#80a4ae',
	'#779de5',
	'#7ca7d8',
	'#8b7dbe',
	'#b87e9f',
	'#992b15',
	'#bb271a',
	'#da954b',
	'#eac452',
	'#78a75a',
	'#54808c',
	'#4a77d1',
	'#4f84c1',
	'#634fa2',
	'#9b5278',
	'#7a2917',
	'#8c1a10',
	'#a96424',
	'#b89230',
	'#48752c',
	'#264e5b',
	'#2754c5',
	'#245290',
	'#321d71',
	'#6b2346',
	'#531607',
	'#5d0e07',
	'#714216',
	'#7a611d',
	'#314d1c',
	'#18333c',
	'#274483',
	'#173660',
	'#1e124a',
	'#46152f',
];

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
 * Return the normalized value for the native color input.
 */
function getSheetColorPickerInputValue(value?: string | null) {
	const nextValue = String(value || '').trim();

	return isHexColorValue(nextValue) ? nextValue : DEFAULT_SHEET_COLOR_PICKER_VALUE;
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
	const canApplyDraftValue = isHexColorValue(draftValue);

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
	 * Keep picker control interactions from reaching the Sheet grid pointer handler.
	 */
	const handlePickerPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		event.stopPropagation();
	}, []);

	/*
	 * Keep double-clicks inside picker controls from opening a Sheet cell editor.
	 */
	const handlePickerDoubleClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
		event.stopPropagation();
	}, []);

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
		const nextValue = event.currentTarget.value.trim();

		if (isHexColorValue(nextValue, true)) {
			setDraftValue(nextValue);
		}
	}, []);

	/*
	 * Apply one preset palette color to the selected cells.
	 */
	const handlePresetColor = useCallback((color: string) => {
		setDraftValue(color);
		p.onColorValue(color);
		p.onClose?.();
	}, [p.onClose, p.onColorValue]);

	/*
	 * Apply the current color draft to the selected cells.
	 */
	const handleApply = useCallback(() => {
		const nextValue = draftValue.trim();

		if (!isHexColorValue(nextValue)) {
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
		className={cn('bg shadow_light ft_xs w_500', p.className)}
		data-sheet-color-picker="true"
		onDoubleClick={handlePickerDoubleClick}
		onPointerDown={handlePickerPointerDown}
		style={getSheetColorPickerStyle(p.position, p.scrollLeft, p.scrollTop, dragOffset)}
	>
		<TooltipButton
			as="div"
			closeWhilePointerDown
      showDelayMs={500}
			message={i18n.t('form.click_to_drag_window')}
			position="top"
		>
			<div className="h_10 rel pattern_texture medium_bf bg_fade bg_primary_fd_hv cs_grab" onPointerDown={handleDragStart} />
		</TooltipButton>
		<div className="h_top gap_15 p_15">
			<div className="grid gap_4" style={{ flex: '0 0 auto', gridTemplateColumns: 'repeat(10, 20px)' }}>
				{SHEET_COLOR_PICKER_PRESET_COLORS.map((color) => (
					<button
						aria-label={color}
						className="w_20 h_20 bd_1 bd_lt r_4 p_0"
						key={color}
						onClick={() => handlePresetColor(color)}
						style={{ backgroundColor: color }}
						title={color}
						type="button"
					/>
				))}
			</div>

			<div className="grid gap_10 f p_8">
        <div className="ft_medium">
          {p.label}
        </div>

				<div className="h_spread gap_8">
          <input
            aria-label={p.label}
            className="f h_30 p_0 bd_0"
            onChange={handleColorInputChange}
            type="color"
            value={getSheetColorPickerInputValue(draftValue)}
          />

					<input
						aria-label={p.label}
						aria-invalid={!canApplyDraftValue}
						className="w_80 h_30 px_8 bd_1 bd_lt r_4 bg ft_xs"
						onChange={handleTextInputChange}
						pattern="#[0-9a-fA-F]{6}"
						value={draftValue}
					/>

					<button className="f h_30 pb_1 a_c bg_primary cl_white ft_tn r_4" disabled={!canApplyDraftValue} onClick={handleApply} type="button">
						{i18n.t('form.apply')}
					</button>
				</div>
			</div>
		</div>
	</div>;
});

SheetColorPicker.displayName = 'SheetColorPicker';
