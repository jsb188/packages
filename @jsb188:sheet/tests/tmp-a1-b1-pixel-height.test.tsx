/*
 * TEMPORARY diagnostic harness (not a permanent test).
 * Renders the real SheetCanvasSurface with a software-rasterized 2D context
 * to measure the painted pixel heights of cell A1 (sticky column) vs cell B1
 * (merged-range anchor) across devicePixelRatio values, reproducing the
 * reported 1px mismatch. Sets up jsdom manually because the vitest jsdom
 * environment is unavailable in this workspace.
 */

import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import type { SheetCanvasCell } from '../src/libs/sheet-utils.ts';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
const g: any = globalThis;
g.window = dom.window;
g.document = dom.window.document;
Object.defineProperty(g, 'navigator', { configurable: true, value: dom.window.navigator });
g.HTMLCanvasElement = dom.window.HTMLCanvasElement;
g.HTMLElement = dom.window.HTMLElement;
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.requestAnimationFrame = dom.window.requestAnimationFrame?.bind(dom.window) || ((cb: any) => setTimeout(cb, 16));
g.cancelAnimationFrame = dom.window.cancelAnimationFrame?.bind(dom.window) || clearTimeout;
g.IS_REACT_ACT_ENVIRONMENT = true;

type ClipRect = { left: number; top: number; right: number; bottom: number };

/*
 * Minimal software rasterizer for the axis-aligned subset of the canvas API
 * used by SheetCanvasSurface. Honors the setTransform(dpr) scale the surface
 * applies and stores fillStyle strings per device pixel.
 */
function createRasterContext(deviceWidth: number, deviceHeight: number) {
	const px: (string | null)[] = new Array(deviceWidth * deviceHeight).fill(null);

	type State = {
		clip: ClipRect;
		globalAlpha: number;
		rotated: boolean;
		sx: number;
		sy: number;
		tx: number;
		ty: number;
	};

	let state: State = {
		clip: { left: 0, top: 0, right: deviceWidth, bottom: deviceHeight },
		globalAlpha: 1,
		rotated: false,
		sx: 1,
		sy: 1,
		tx: 0,
		ty: 0,
	};
	const stack: State[] = [];

	let pathRects: { x: number; y: number; w: number; h: number }[] = [];
	let pathSegments: { x1: number; y1: number; x2: number; y2: number }[] = [];
	let cursor: { x: number; y: number } | null = null;

	const ctx: any = {
		canvas: null,
		fillStyle: '#000',
		strokeStyle: '#000',
		lineWidth: 1,
		font: '',
		textAlign: 'left',
		textBaseline: 'alphabetic',
		lineCap: 'butt',
		lineJoin: 'miter',
		lineDashOffset: 0,
	};

	// Convert user-space x/y into device space
	const dx = (x: number) => (x + state.tx) * state.sx;
	const dy = (y: number) => (y + state.ty) * state.sy;

	const paint = (x: number, y: number, color: string) => {
		if (x < 0 || y < 0 || x >= deviceWidth || y >= deviceHeight) return;
		const cx = x + 0.5;
		const cy = y + 0.5;
		const c = state.clip;
		if (cx < c.left || cx >= c.right || cy < c.top || cy >= c.bottom) return;
		px[y * deviceWidth + x] = color;
	};

	// Fill every device pixel whose center falls inside the device-space rect.
	// Threshold matches >=50% vertical coverage, approximating canvas AA.
	const fillDeviceRegion = (x0: number, y0: number, x1: number, y1: number, color: string) => {
		for (let y = Math.floor(y0); y < Math.ceil(y1); y++) {
			for (let x = Math.floor(x0); x < Math.ceil(x1); x++) {
				const cx = x + 0.5;
				const cy = y + 0.5;
				if (cx >= x0 && cx < x1 && cy >= y0 && cy < y1) {
					paint(x, y, color);
				}
			}
		}
	};

	const fillUserRect = (x: number, y: number, w: number, h: number, color: string) => {
		fillDeviceRegion(dx(x), dy(y), dx(x + w), dy(y + h), color);
	};

	const strokeSegment = (x1: number, y1: number, x2: number, y2: number) => {
		if (state.rotated) return;
		const lw = ctx.lineWidth;
		const color = `stroke:${ctx.strokeStyle}`;
		if (y1 === y2) {
			fillUserRect(Math.min(x1, x2), y1 - lw / 2, Math.abs(x2 - x1), lw, color);
		} else if (x1 === x2) {
			fillUserRect(x1 - lw / 2, Math.min(y1, y2), lw, Math.abs(y2 - y1), color);
		}
	};

	Object.assign(ctx, {
		setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => {
			state.sx = a;
			state.sy = d;
			state.tx = e / (a || 1);
			state.ty = f / (d || 1);
		},
		scale: () => {},
		translate: (mx: number, my: number) => {
			state.tx += mx;
			state.ty += my;
		},
		rotate: () => {
			state.rotated = true;
		},
		save: () => {
			stack.push({ ...state, clip: { ...state.clip } });
		},
		restore: () => {
			const prev = stack.pop();
			if (prev) state = prev;
		},
		beginPath: () => {
			pathRects = [];
			pathSegments = [];
			cursor = null;
		},
		rect: (x: number, y: number, w: number, h: number) => {
			pathRects.push({ x: dx(x), y: dy(y), w: w * state.sx, h: h * state.sy });
		},
		roundRect: (x: number, y: number, w: number, h: number) => {
			pathRects.push({ x: dx(x), y: dy(y), w: w * state.sx, h: h * state.sy });
		},
		quadraticCurveTo: () => {},
		moveTo: (x: number, y: number) => {
			cursor = { x, y };
		},
		lineTo: (x: number, y: number) => {
			if (cursor) {
				pathSegments.push({ x1: cursor.x, y1: cursor.y, x2: x, y2: y });
			}
			cursor = { x, y };
		},
		clip: () => {
			const r = pathRects[0];
			if (!r) return;
			state.clip = {
				left: Math.max(state.clip.left, r.x),
				top: Math.max(state.clip.top, r.y),
				right: Math.min(state.clip.right, r.x + r.w),
				bottom: Math.min(state.clip.bottom, r.y + r.h),
			};
		},
		clearRect: (x: number, y: number, w: number, h: number) => {
			fillUserRect(x, y, w, h, 'clear');
		},
		fillRect: (x: number, y: number, w: number, h: number) => {
			const color = state.globalAlpha < 1 ? `alpha:${ctx.fillStyle}` : String(ctx.fillStyle);
			fillUserRect(x, y, w, h, color);
		},
		strokeRect: (x: number, y: number, w: number, h: number) => {
			strokeSegment(x, y, x + w, y);
			strokeSegment(x, y + h, x + w, y + h);
			strokeSegment(x, y, x, y + h);
			strokeSegment(x + w, y, x + w, y + h);
		},
		stroke: () => {
			pathSegments.forEach((s) => strokeSegment(s.x1, s.y1, s.x2, s.y2));
		},
		fill: () => {
			pathRects.forEach((r) => fillDeviceRegion(r.x, r.y, r.x + r.w, r.y + r.h, String(ctx.fillStyle)));
		},
		setLineDash: () => {},
		measureText: (text: string) => ({ width: (text || '').length * 6 }),
		fillText: () => {},
	});

	Object.defineProperty(ctx, 'globalAlpha', {
		get: () => state.globalAlpha,
		set: (v: number) => {
			state.globalAlpha = v;
		},
	});

	return {
		ctx,
		colorAt: (x: number, y: number) => px[y * deviceWidth + x],
	};
}

/*
 * Build one SheetCanvasCell carrying only a fill color.
 */
function makeCell(rowKey: string, columnKey: string, fillColor: string): SheetCanvasCell {
	return {
		cellKey: columnKey,
		columnIndex: Number(columnKey),
		displayValue: '',
		draftValue: '',
		formulaLoading: false,
		rowId: rowKey,
		rowIndex: Number(rowKey),
		style: { fillColor } as any,
	};
}

/*
 * Render the surface for one scenario and report color runs per column.
 */
async function renderScenario(opts: { dpr: number; mergeA: boolean }) {
	const { act, createElement } = await import('react');
	const { createRoot } = await import('react-dom/client');
	const { SheetCanvasSurface } = await import('../src/modules/SheetCanvasSurface.tsx');

	const VIEW_W = 700;
	const VIEW_H = 300;
	const COL_W = 100;
	const ROW_H = 32;

	const raster = createRasterContext(Math.ceil(VIEW_W * opts.dpr), Math.ceil(VIEW_H * opts.dpr));
	(dom.window.HTMLCanvasElement.prototype as any).getContext = function () {
		raster.ctx.canvas = this;
		return raster.ctx;
	};
	Object.defineProperty(dom.window, 'devicePixelRatio', { value: opts.dpr, configurable: true });

	const columns = ['1', '2', '3', '4'].map((key, columnIndex) => ({
		column: { id: `c${key}`, key, label: String.fromCharCode(65 + columnIndex) },
		columnIndex,
		left: columnIndex * COL_W,
		width: COL_W,
	}));
	const rowMetrics = ['1', '2', '3', '4', '5'].map((rowKey, rowIndex) => ({
		height: ROW_H,
		rowIndex,
		rowKey,
		top: rowIndex * ROW_H,
	}));

	const cellLookup = new Map<string, SheetCanvasCell>();
	cellLookup.set('1:1', makeCell('1', '1', '#0000ff'));
	cellLookup.set('2:1', makeCell('2', '1', '#0000ff'));
	cellLookup.set('1:2', makeCell('1', '2', '#00ff00'));
	cellLookup.set('2:2', makeCell('2', '2', '#00ff00'));
	cellLookup.set('2:3', makeCell('2', '3', '#00ff00'));
	cellLookup.set('2:4', makeCell('2', '4', '#00ff00'));

	const mergedRanges: any[] = [{ startRowIndex: 1, startColumnIndex: 2, endRowIndex: 1, endColumnIndex: 4 }];
	if (opts.mergeA) {
		mergedRanges.unshift({ startRowIndex: 1, startColumnIndex: 1, endRowIndex: 2, endColumnIndex: 1 });
	}

	const container = dom.window.document.createElement('div');
	dom.window.document.body.appendChild(container);
	const root = createRoot(container);

	await act(async () => {
		root.render(
			createElement(SheetCanvasSurface, {
				canvasHeight: 1000,
				canvasWidth: 1000,
				cellLookup,
				columns: columns as any,
				mergedRanges,
				rowMetrics: rowMetrics as any,
				scrollLeft: 0,
				scrollTop: 0,
				stickyColumnCount: 1,
				stickyRowCount: 0,
				viewportHeight: VIEW_H,
				viewportWidth: VIEW_W,
			}),
		);
	});

	await act(async () => {
		root.unmount();
	});
	container.remove();

	// Device-pixel sample columns at the centers of columns A and B
	const xA = Math.floor((38 + 50) * opts.dpr);
	const xB = Math.floor((38 + COL_W + 4 + 50) * opts.dpr);

	const runsAt = (x: number) => {
		const runs: { color: string | null; start: number; end: number }[] = [];
		const yLimit = Math.floor(120 * opts.dpr);
		for (let y = Math.floor(20 * opts.dpr); y < yLimit; y++) {
			const color = raster.colorAt(x, y);
			const last = runs[runs.length - 1];
			if (last && last.color === color) {
				last.end = y;
			} else {
				runs.push({ color, start: y, end: y });
			}
		}
		return runs.map((r) => `${r.color} [${r.start}..${r.end}] h=${r.end - r.start + 1}`).join('\n');
	};

	return `=== dpr=${opts.dpr} mergeA=${opts.mergeA} ===\n--- column A ---\n${runsAt(xA)}\n--- column B ---\n${runsAt(xB)}`;
}

describe('A1 vs B1 painted heights', () => {
	it('measures the visible fill runs across scenarios', async () => {
		const reports: string[] = [];

		for (const mergeA of [false, true]) {
			for (const dpr of [1, 2, 1.5, 2.5]) {
				reports.push(await renderScenario({ dpr, mergeA }));
			}
		}

		// eslint-disable-next-line no-console
		console.log(reports.join('\n\n'));
		expect(reports.length).toBeGreaterThan(0);
	});
});
