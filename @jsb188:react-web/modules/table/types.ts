import type { ServerErrorObj } from '@jsb188/app/types/app.d.ts';
import type { OpenModalPopUpFn } from '@jsb188/react/states';
import type {
	ElementType,
	MutableRefObject,
	ReactElement,
	ReactNode,
	Ref,
} from 'react';
import type { ReactDivElement, ReactSpanElement } from '../../types/dom.d';
import type { HeaderBorderStyle, TableDesign, TableDesignColumn, TableHeaderObj } from '../../ui/TableUI';

/**
 * Store the virtual cursor and the DOM row used for scroll restoration.
 */
export type CursorPositionObj = [
	string | null,
	string | null,
	number,
	boolean,
	number,
];

/**
 * Fetch one page before or after a cursor.
 */
export type FetchMoreFn = (after: boolean, cursor: string | null, limit: number) => Promise<{
	data?: any[];
	error?: ServerErrorObj;
}>;

/**
 * Return reactive fragment data for one table row.
 */
export type ReactiveFragmentFn = (id: string, node: any) => any;

/**
 * Represent one mapped table cell.
 */
export type TableColumnElement = string | ReactSpanElement | ReactNode | null;

/**
 * Represent keyed mapped table cells.
 */
export type TableColumnCells = Record<string, TableColumnElement>;

/**
 * Represent one mapped table row group.
 */
export interface MapTableListOutput {
	__deleted: boolean;
	actions?: any[] | null;
	RowHeaderComponent?: ReactNode;
	rowHeaders?: Partial<TableHeaderObj>[] | null;
	to?: string;
	onClickProps?: any;
	cellClassNames?: string | (string | undefined)[];
	cells?: TableColumnCells;
	columns?: TableColumnElement[];
	subRows?: {
		value: any;
		onClickProps?: any;
		columns: TableColumnElement[];
	}[] | ReactNode;
	subRowsContainerClassName?: string;
}

/**
 * Map one virtualized row item into rendered table row data.
 */
export type MapTableListDataFn = (
	item: VZListItemObj,
	i: number,
	list: VZListItemObj[],
) => MapTableListOutput | ReactElement | null;

/**
 * Represent one virtualized table item.
 */
export interface VZListItemObj {
	item: any;
	otherProps?: any;
	lastItemIdOnMount: string | null;
	[key: string]: any;
}

/**
 * Store non-rendering runtime flags for virtualized table work.
 */
export interface VZReferenceObj {
	mounted: boolean;
	loading?: boolean;
	fetchingTop?: boolean;
	fetchingBottom?: boolean;
	blockedTopCursor?: string | null;
	blockedBottomCursor?: string | null;
	topCursor: [string, string] | null;
	bottomCursor: [string, string] | null;
}

/**
 * Store render-driving virtualized table data.
 */
export interface VirtualizedDataState {
	cursorPosition: CursorPositionObj | null;
	itemIds: string[] | null;
	startOfListItemId: string | null;
	endOfListItemId: string | null | undefined;
	lastItemIdOnMount: string | null;
}

/**
 * Represent the full virtualized table state consumed by DOM effects.
 */
export interface VirtualizedState extends VirtualizedDataState {
	setCursorPosition: (id: CursorPositionObj | null) => void;
	resetVirtualizedItems: (items: any[] | null) => void;
	mergeStartOfListItems: (items: any[], mergeFromLastItem: boolean) => void;
	prependMissingStartItems: (items: any[]) => void;
	mergeFetchedItems: (items: any[], after: boolean) => void;
	setEndOfListItemId: (id: string | null) => void;
	setStartOfListItemId: (id: string | null) => void;
	listData: VZListItemObj[] | null;
	hasMoreTop: boolean;
	hasMoreBottom: boolean;
	referenceObj: MutableRefObject<VZReferenceObj>;
}

/**
 * Store the list window React should render.
 */
export interface VirtualizedRenderWindow {
	listData: VZListItemObj[] | null;
	renderIsDeferred: boolean;
}

/**
 * Represent props shared by the virtualized table controller.
 */
export interface VirtualizedTableBaseProps extends ReactDivElement {
	MockComponent?: ReactNode;
	HeaderComponent?: ReactNode;
	FooterComponent?: ElementType;
	disableInfiniteScroll?: boolean;
	endOfListMessage?: string;
	otherProps?: Record<string, any>;
	loading?: boolean;
	fetchMore?: FetchMoreFn;
	startOfListItems?: any[] | null;
	getItemId?: (item: any) => string;
	fragmentName: string;
	reactiveFragmentFn?: ReactiveFragmentFn;
	limit: number;
	refreshKey?: string | number;
	resetKey?: string | number;
	maxFetchLimit?: number;
	openModalPopUp: OpenModalPopUpFn;
	rootElementQuery?: string;
}

/**
 * Represent props accepted by the grid table renderer.
 */
export type TableListProps = {
	bodyRef?: Ref<HTMLDivElement>;
	borderStyle?: HeaderBorderStyle;
	columnWidths?: Record<string, number>;
	disableOnClickRow?: boolean;
	reactiveFragmentFn?: ReactiveFragmentFn;
	onColumnResizeCommit?: (columnWidths: Record<string, number>) => void;
	resizableColumns?: boolean;
	tableDesign?: TableDesign;
	trowClassName?: string;
	cellClassNames?: string | (string | undefined)[];
	footerNode?: ReactNode;
	removeLeftPadding?: boolean;
	removeRightPadding?: boolean;
	headers?: Partial<TableHeaderObj>[] | null;
	listData: VZListItemObj[] | null;
	mapListData: MapTableListDataFn;
	onClickRow?: (vzItem?: VZListItemObj, subRowItemValue?: any, onClickProps?: any) => void;
};

/**
 * Represent props passed to one memoized table row group.
 */
export type TableListItemProps = Pick<
	TableListProps,
	'cellClassNames' | 'disableOnClickRow' | 'mapListData' | 'onClickRow' | 'removeLeftPadding' | 'removeRightPadding' | 'tableDesign' | 'trowClassName'
> & {
	item: VZListItemObj;
	i: number;
	nextItem?: VZListItemObj | null;
	previousItem?: VZListItemObj | null;
};

/**
 * Store active column resize state outside React render.
 */
export type TableColumnResizeState = {
	cleanupBodyStyle?: () => void;
	columnKey: string;
	guideLeft: number;
	latestWidth?: number;
	startClientX: number;
	startColumnWidths: Record<string, number>;
	startGuideLeft: number;
	startWidth: number;
	tableElements: HTMLDivElement[];
	widthDirection: 1 | -1;
};

/**
 * Represent the column controlled by a resize divider.
 */
export type TableDividerResizeTarget = {
	column: TableDesignColumn;
	dividerIndex: number;
	widthDirection: 1 | -1;
};
