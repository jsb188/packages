import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { TableDesignColumn } from '../../ui/TableUI';
import {
	applyGridTableLayout,
	clampTableColumnWidth,
	getResolvedTableColumnWidths,
	getSafeTableColumnPixelWidth,
	getTableContainerWidth,
	getTableDividerLeftFromGrid,
	getTableGridTemplateColumns,
	getTableMinWidthStyle,
	getTableWidthStyle,
	getTableWidthValue,
	hideResizeGuide,
	lockColumnResizeCursor,
	setResizeGuidePosition,
	syncHeaderGridLayoutFromBody,
} from './layout';
import type { TableColumnResizeState, TableDividerResizeTarget } from './types';

/**
 * Return true when two column width maps contain the same widths.
 */
function areColumnWidthsEqual(left: Record<string, number>, right: Record<string, number>) {
	const leftKeys = Object.keys(left);
	const rightKeys = Object.keys(right);

	if (leftKeys.length !== rightKeys.length) {
		return false;
	}

	return leftKeys.every((key) => left[key] === right[key]);
}

/**
 * Manage grid sizing, horizontal scroll syncing, and column resize interactions.
 */
export function useTableGridController(p: {
	columnWidths?: Record<string, number>;
	columns: TableDesignColumn[];
	headers?: unknown;
	listData?: unknown;
	onColumnResizeCommit?: (columnWidths: Record<string, number>) => void;
}) {
	const { columnWidths, columns, headers, listData, onColumnResizeCommit } = p;
	const bodyScrollerRef = useRef<HTMLDivElement | null>(null);
	const containerRef = useRef<HTMLDivElement | null>(null);
	const headerScrollerRef = useRef<HTMLDivElement | null>(null);
	const headerTableRef = useRef<HTMLDivElement | null>(null);
	const resizeFrameRef = useRef<number | null>(null);
	const resizeStateRef = useRef<TableColumnResizeState | null>(null);
	const scrollSyncingRef = useRef(false);
	const tableRef = useRef<HTMLDivElement | null>(null);
	const guideRef = useRef<HTMLDivElement | null>(null);
	const columnWidthsRef = useRef<Record<string, number>>(getResolvedTableColumnWidths(columns, columnWidths || {}));
	const containerWidthRef = useRef(0);
	const hasLocalColumnWidthRef = useRef(false);
	const tableWidthRef = useRef(getTableWidthValue(columns, columnWidthsRef.current));
	const [containerWidth, setContainerWidth] = useState(0);
	const [renderColumnWidths, setRenderColumnWidths] = useState(columnWidthsRef.current);
	const columnKeys = columns.map((column) => column.key).join('\0');
	const tableGridTemplateColumns = getTableGridTemplateColumns(columns, renderColumnWidths);
	const tableWidthStyle = getTableWidthStyle(columns, renderColumnWidths, containerWidth);
	const tableMinWidthStyle = getTableMinWidthStyle(containerWidth);

	const applyCommittedColumnWidths = useCallback((nextColumnWidths: Record<string, number>) => {
		columnWidthsRef.current = nextColumnWidths;
		tableWidthRef.current = Math.max(containerWidthRef.current, getTableWidthValue(columns, nextColumnWidths));
		applyGridTableLayout([tableRef.current], columns, nextColumnWidths, tableWidthRef.current);
		syncHeaderGridLayoutFromBody(headerTableRef.current, tableRef.current);
		setRenderColumnWidths((currentWidths) => (
			areColumnWidthsEqual(currentWidths, nextColumnWidths) ? currentWidths : nextColumnWidths
		));
	}, [columns]);

	const syncHorizontalScroll = useCallback((source: HTMLDivElement | null, target: HTMLDivElement | null) => {
		if (!source || !target || scrollSyncingRef.current) {
			return;
		}

		scrollSyncingRef.current = true;
		target.scrollLeft = source.scrollLeft;

		if (resizeStateRef.current) {
			setResizeGuidePosition(guideRef.current, resizeStateRef.current.guideLeft, source.scrollLeft);
		}

		requestAnimationFrame(() => {
			scrollSyncingRef.current = false;
		});
	}, []);

	useLayoutEffect(() => {
		syncHeaderGridLayoutFromBody(headerTableRef.current, tableRef.current);
	}, [headers, listData, tableGridTemplateColumns, tableWidthStyle]);

	useLayoutEffect(() => {
		const nextColumnWidths = getResolvedTableColumnWidths(columns, columnWidths || {});
		hasLocalColumnWidthRef.current = false;
		applyCommittedColumnWidths(nextColumnWidths);
	}, [columnKeys]);

	useLayoutEffect(() => {
		if (hasLocalColumnWidthRef.current) {
			return;
		}

		const nextColumnWidths = getResolvedTableColumnWidths(columns, columnWidths || {});
		applyCommittedColumnWidths(nextColumnWidths);
	}, [columnWidths, columns, applyCommittedColumnWidths]);

	useLayoutEffect(() => {
		const containerElement = containerRef.current;
		let resizeFrame: number | null = null;

		/*
		 * Applies the latest measured container width to the table grid and synced header.
		 */
		const applyContainerWidth = (nextContainerWidth: number) => {
			containerWidthRef.current = nextContainerWidth;
			tableWidthRef.current = Math.max(nextContainerWidth, getTableWidthValue(columns, columnWidthsRef.current));
			applyGridTableLayout([tableRef.current], columns, columnWidthsRef.current, tableWidthRef.current);
			syncHeaderGridLayoutFromBody(headerTableRef.current, tableRef.current);
			setContainerWidth((currentContainerWidth) => (
				currentContainerWidth === nextContainerWidth ? currentContainerWidth : nextContainerWidth
			));
		};

		/*
		 * Defers container size updates into the next animation frame.
		 */
		const scheduleContainerWidthMeasure = (nextContainerWidth?: number) => {
			if (resizeFrame !== null) {
				cancelAnimationFrame(resizeFrame);
			}

			resizeFrame = requestAnimationFrame(() => {
				resizeFrame = null;
				applyContainerWidth(nextContainerWidth ?? getTableContainerWidth(containerRef.current));
			});
		};

		scheduleContainerWidthMeasure(getTableContainerWidth(containerElement));

		if (!containerElement || typeof ResizeObserver === 'undefined') {
			return () => {
				if (resizeFrame !== null) {
					cancelAnimationFrame(resizeFrame);
				}
			};
		}

		const resizeObserver = new ResizeObserver((entries) => {
			const entry = entries[0];
			const nextContainerWidth = Math.ceil(entry?.contentRect.width || getTableContainerWidth(containerElement));

			scheduleContainerWidthMeasure(nextContainerWidth);
		});

		resizeObserver.observe(containerElement);

		return () => {
			if (resizeFrame !== null) {
				cancelAnimationFrame(resizeFrame);
			}

			resizeObserver.disconnect();
		};
	}, [columnKeys, columns]);

	const finishColumnResize = useCallback((clientX?: number) => {
		const resizeState = resizeStateRef.current;

		if (resizeFrameRef.current !== null) {
			cancelAnimationFrame(resizeFrameRef.current);
			resizeFrameRef.current = null;
		}

		if (resizeState) {
			const fallbackWidth = (
				Number.isFinite(clientX)
					? clampTableColumnWidth(resizeState.startWidth + ((Number(clientX) - resizeState.startClientX) * resizeState.widthDirection))
					: resizeState.startWidth
			);
			const latestWidth = resizeState.latestWidth ?? fallbackWidth;
			const nextColumnWidths = {
				...columnWidthsRef.current,
				[resizeState.columnKey]: latestWidth,
			};

			hasLocalColumnWidthRef.current = true;
			resizeState.cleanupBodyStyle?.();
			resizeStateRef.current = null;
			hideResizeGuide(guideRef.current);
			applyCommittedColumnWidths(nextColumnWidths);
			onColumnResizeCommit?.(nextColumnWidths);
			return;
		}

		resizeStateRef.current = null;
		hideResizeGuide(guideRef.current);
	}, [applyCommittedColumnWidths, onColumnResizeCommit]);

	const onColumnResizePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>, resizeTarget: TableDividerResizeTarget) => {
		if (!columns.length || event.button !== 0) {
			return;
		}

		const { column, widthDirection } = resizeTarget;
		const tableElements = [tableRef.current].filter(Boolean) as HTMLDivElement[];
		const currentColumnWidths = columnWidthsRef.current;
		const startWidth = currentColumnWidths[column.key] || getSafeTableColumnPixelWidth(column.width);
		const startTableWidth = tableWidthRef.current || getTableWidthValue(columns, currentColumnWidths);

		if (!tableElements.length || !startWidth) {
			return;
		}

		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		resizeStateRef.current?.cleanupBodyStyle?.();
		applyGridTableLayout(tableElements, columns, currentColumnWidths, startTableWidth);
		syncHeaderGridLayoutFromBody(headerTableRef.current, tableRef.current);
		const startGuideLeft = getTableDividerLeftFromGrid(tableRef.current, resizeTarget.dividerIndex);
		setResizeGuidePosition(guideRef.current, startGuideLeft, bodyScrollerRef.current?.scrollLeft || 0);
		resizeStateRef.current = {
			cleanupBodyStyle: lockColumnResizeCursor(),
			columnKey: column.key,
			guideLeft: startGuideLeft,
			startClientX: event.clientX,
			startColumnWidths: currentColumnWidths,
			startGuideLeft,
			startWidth,
			tableElements,
			widthDirection,
		};
	}, [columns]);

	const onColumnResizePointerMove = useCallback((moveEvent: ReactPointerEvent<HTMLDivElement>) => {
		const resizeState = resizeStateRef.current;
		if (!resizeState) {
			return;
		}

		if (moveEvent.buttons !== 1) {
			finishColumnResize(moveEvent.clientX);
			return;
		}

		moveEvent.preventDefault();

		const delta = moveEvent.clientX - resizeState.startClientX;
		const nextWidth = clampTableColumnWidth(resizeState.startWidth + (delta * resizeState.widthDirection));
		const widthChange = nextWidth - resizeState.startWidth;
		const guideLeft = resizeState.startGuideLeft + (widthChange * resizeState.widthDirection);
		const nextColumnWidths = {
			...resizeState.startColumnWidths,
			[resizeState.columnKey]: nextWidth,
		};
		const nextTableWidth = Math.max(containerWidthRef.current, getTableWidthValue(columns, nextColumnWidths));
		resizeState.latestWidth = nextWidth;
		resizeState.guideLeft = guideLeft;

		if (resizeFrameRef.current !== null) {
			cancelAnimationFrame(resizeFrameRef.current);
		}

		resizeFrameRef.current = requestAnimationFrame(() => {
			resizeFrameRef.current = null;
			applyGridTableLayout(resizeState.tableElements, columns, nextColumnWidths, nextTableWidth);
			syncHeaderGridLayoutFromBody(headerTableRef.current, tableRef.current);
			setResizeGuidePosition(guideRef.current, guideLeft, bodyScrollerRef.current?.scrollLeft || 0);
		});
	}, [columns, finishColumnResize]);

	const onColumnResizePointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}

		finishColumnResize(event.clientX);
	}, [finishColumnResize]);

	const onColumnResizePointerCancel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}

		finishColumnResize();
	}, [finishColumnResize]);

	useEffect(() => {
		return () => {
			if (resizeFrameRef.current !== null) {
				cancelAnimationFrame(resizeFrameRef.current);
			}

			resizeStateRef.current?.cleanupBodyStyle?.();
		};
	}, []);

	return {
		bodyScrollerRef,
		containerRef,
		guideRef,
		headerScrollerRef,
		headerTableRef,
		onColumnResizePointerCancel,
		onColumnResizePointerDown,
		onColumnResizePointerMove,
		onColumnResizePointerUp,
		renderColumnWidths,
		syncHorizontalScroll,
		tableGridTemplateColumns,
		tableMinWidthStyle,
		tableRef,
		tableWidthStyle,
	};
}
