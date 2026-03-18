import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { usePopOverState } from '@jsb188/react/states';
import { memo, useMemo, useEffect, useRef, useState, type ComponentProps, type Dispatch, type InputHTMLAttributes, type MouseEventHandler, type ReactNode, type SetStateAction } from 'react';
import { COMMON_ICON_NAMES, Icon } from '@jsb188/react-web/svgs/Icon';
import { Pill } from '@jsb188/react-web/ui/Button';
import {
  InlineTableDatePicker,
  InlineTableInput,
  InlineTableOptions,
  TDCol,
  THead,
  TRow,
} from '@jsb188/react-web/ui/TableListUI';
import { PopOverMoreButton, TooltipButton } from './PopOver';

export type EditableTableOption = ComponentProps<typeof InlineTableOptions>['options'][number];
export type EditableTableHeader = ComponentProps<typeof THead>['headers'][number];

type EditableTableActionButton = {
  disabled?: boolean;
  iconName: string;
  message: string;
  onClick?: MouseEventHandler<any>;
};

type EditableTableRowActionsProps = {
  actionButtons?: EditableTableActionButton[];
  allowActiveTransform?: boolean;
  allowEdit?: boolean;
  disabled?: boolean;
  editOptions?: any[];
  emptyState?: ReactNode;
  isEditing?: boolean;
  isLocked?: boolean;
  lockedMessage?: string;
  moreButtonZClassName?: string;
  pending?: boolean;
  onCancel?: MouseEventHandler<any>;
  onSave?: MouseEventHandler<any>;
};

type EditableTableCellBase = Omit<ComponentProps<typeof TDCol>, 'children'>;

export type EditableTableCell = EditableTableCellBase & {
  actions?: EditableTableRowActionsProps;
  children?: ReactNode;
  dateProps?: ComponentProps<typeof InlineTableDatePicker>;
  inputProps?: ComponentProps<typeof InlineTableInput>;
  kind?: 'content' | 'input' | 'options' | 'date' | 'actions';
  optionsProps?: ComponentProps<typeof InlineTableOptions>;
};

export type EditableTableRow = Omit<ComponentProps<typeof TRow>, 'children'> & {
  columns: EditableTableCell[];
};

type EditableTableSchemaContext<RowData, DraftValues> = {
  draftValues: DraftValues;
  isEditing: boolean;
  item: RowData;
  onCancelEdit?: () => void;
  onSaveEdit?: () => void;
  rowKey: string;
};

type EditableTableEditorConfig<DraftValues> =
  | {
      autoFocus?: boolean;
      field: keyof DraftValues;
      inputType?: InputHTMLAttributes<HTMLInputElement>['type'];
      placeholder: string;
      saveOnEnter?: boolean;
      type: 'input';
    }
  | {
      actions: EditableTableRowActionsProps;
      type: 'actions';
    }
  | {
      field: keyof DraftValues;
      mapValue?: (value: unknown) => DraftValues[keyof DraftValues];
      maxDate?: Date;
      minDate?: Date;
      placeholder: string;
      type: 'date';
    }
  | {
      field: keyof DraftValues;
      options: EditableTableOption[];
      placeholder: string;
      type: 'options';
    };

export type EditableTableColumn<RowData, DraftValues> = Pick<EditableTableCell, 'removeLeftPadding' | 'removeRightPadding'> & {
  className?: string | ((context: EditableTableSchemaContext<RowData, DraftValues>) => string | undefined);
  display?: (context: EditableTableSchemaContext<RowData, DraftValues>) => ReactNode;
  editor?: (context: EditableTableSchemaContext<RowData, DraftValues>) => EditableTableEditorConfig<DraftValues> | null | undefined;
  useEditorWhen?: (context: EditableTableSchemaContext<RowData, DraftValues>) => boolean;
};

export type EditableTableSchemaRow<RowData, DraftValues> = Omit<EditableTableRow, 'columns'> & {
  draftValues: DraftValues;
  isEditing?: boolean;
  item: RowData;
  onCancelEdit?: () => void;
  onSaveEdit?: () => void;
  rowKey: string;
};

type EditableTableFooterAction = {
  active?: boolean;
  activeIconName?: string;
  activeLabel?: string;
  className?: string;
  colorClassName?: string;
  hasRows?: boolean;
  iconName?: string;
  label: string;
  onClick: MouseEventHandler<any>;
  show?: boolean;
};

type EditableTablePopOverActionContext<DraftValues> = {
  action: string;
  clearDraftValuesForRow: (rowKey: string) => void;
  draftValuesByRow: Record<string, DraftValues>;
  editingRowKey: string;
  rowKey: string;
  setDraftValuesByRow: Dispatch<SetStateAction<Record<string, DraftValues>>>;
  setDraftValuesForRow: (rowKey: string, values: DraftValues) => void;
  setEditingRowKey: Dispatch<SetStateAction<string>>;
  updateDraftValuesForRow: (rowKey: string, updater: (draftValues: DraftValues | undefined) => DraftValues) => void;
  value: string | number | null | undefined;
};

type EditableTableToggleEditingRowOptions<DraftValues> = Partial<{
  getDraftValues: () => DraftValues | null | undefined;
  onCloseRow: (rowKey: string) => void;
}>;

/*
 * Build a stable popover option name for an editable-table row.
 */

export function getEditableTablePopOverName(prefix: string, rowKey: string) {
  return `${prefix}${rowKey}`;
}

/*
 * Parse an editable-table row key from a prefixed popover option name.
 */

export function getEditableTableRowKeyFromPopOverName(prefix: string, name?: string | null) {
  if (!name?.startsWith(prefix)) {
    return null;
  }

  return name.replace(prefix, '');
}

/*
 * Strip editable-only config fields before passing cell props to TDCol.
 */

function getEditableTableCellProps(cell: EditableTableCell) {
  const {
    kind,
    inputProps,
    optionsProps,
    dateProps,
    actions,
    ...rest
  } = cell as EditableTableCell & Partial<{
    inputProps: ComponentProps<typeof InlineTableInput>;
    optionsProps: ComponentProps<typeof InlineTableOptions>;
    dateProps: ComponentProps<typeof InlineTableDatePicker>;
    actions: EditableTableRowActionsProps;
  }>;

  return rest;
}

/*
 * Share editable-row draft state and popover edit actions across table screens.
 */

export function useEditableTableState<DraftValues>(p?: Partial<{
  getRowKeyFromPopOverName: (name?: string | null) => string | null;
  onPopOverAction: (context: EditableTablePopOverActionContext<DraftValues>) => boolean | void;
}>) {
  const { popOver, closePopOver } = usePopOverState();
  const [editingRowKey, setEditingRowKey] = useState('');
  const [draftValuesByRow, setDraftValuesByRow] = useState<Record<string, DraftValues>>({});
  const editingRowKeyRef = useRef(editingRowKey);
  const draftValuesByRowRef = useRef(draftValuesByRow);
  const getRowKeyFromPopOverNameRef = useRef(p?.getRowKeyFromPopOverName);
  const onPopOverActionRef = useRef(p?.onPopOverAction);

  useEffect(() => {
    editingRowKeyRef.current = editingRowKey;
  }, [editingRowKey]);

  useEffect(() => {
    draftValuesByRowRef.current = draftValuesByRow;
  }, [draftValuesByRow]);

  useEffect(() => {
    getRowKeyFromPopOverNameRef.current = p?.getRowKeyFromPopOverName;
    onPopOverActionRef.current = p?.onPopOverAction;
  }, [p?.getRowKeyFromPopOverName, p?.onPopOverAction]);

  /*
   * Remove one row's draft state entry.
   */

  const clearDraftValuesForRow = (rowKey: string) => {
    setDraftValuesByRow((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
  };

  /*
   * Replace one row's draft state entry.
   */

  const setDraftValuesForRow = (rowKey: string, values: DraftValues) => {
    setDraftValuesByRow((prev) => ({
      ...prev,
      [rowKey]: values,
    }));
  };

  /*
   * Update one row's draft state entry from the previous draft value.
   */

  const updateDraftValuesForRow = (
    rowKey: string,
    updater: (draftValues: DraftValues | undefined) => DraftValues,
  ) => {
    setDraftValuesByRow((prev) => ({
      ...prev,
      [rowKey]: updater(prev[rowKey]),
    }));
  };

  /*
   * Update a single draft field while preserving the rest of the row draft.
   */

  const updateDraftField = <FieldKey extends keyof DraftValues>(
    rowKey: string,
    field: FieldKey,
    value: DraftValues[FieldKey],
    fallbackDraftValues?: DraftValues,
  ) => {
    setDraftValuesByRow((prev) => ({
      ...prev,
      [rowKey]: {
        ...(prev[rowKey] || fallbackDraftValues || {} as DraftValues),
        [field]: value,
      },
    }));
  };

  /*
   * Toggle inline edit mode for one row and optionally seed its draft values.
   */

  const toggleEditingRow = (
    rowKey: string,
    options?: EditableTableToggleEditingRowOptions<DraftValues>,
  ) => {
    const prevEditingRowKey = editingRowKeyRef.current;

    if (prevEditingRowKey === rowKey) {
      options?.onCloseRow?.(rowKey);
      setEditingRowKey('');
      return false;
    }

    if (prevEditingRowKey && prevEditingRowKey !== rowKey) {
      options?.onCloseRow?.(prevEditingRowKey);
    }

    const nextDraftValues = options?.getDraftValues?.();
    if (nextDraftValues && !draftValuesByRowRef.current[rowKey]) {
      setDraftValuesForRow(rowKey, nextDraftValues);
    }

    setEditingRowKey(rowKey);
    return true;
  };

  /*
   * Run an async save flow and close edit mode only when the save succeeds.
   */

  const runSaveAndCloseRow = async (
    rowKey: string,
    saveRow: (rowKey: string) => Promise<boolean>,
  ) => {
    const didSave = await saveRow(rowKey);
    if (didSave) {
      setEditingRowKey((prev) => prev === rowKey ? '' : prev);
    }

    return didSave;
  };

  useEffect(() => {
    const getRowKeyFromPopOverName = getRowKeyFromPopOverNameRef.current;
    const onPopOverAction = onPopOverActionRef.current;

    if (!getRowKeyFromPopOverName || !onPopOverAction) {
      return;
    }

    const { action, name, value } = popOver || {};
    const rowKey = getRowKeyFromPopOverName(name);

    if (!rowKey) {
      return;
    }

    const shouldClosePopOver = onPopOverAction({
      action: String(action || ''),
      clearDraftValuesForRow,
      draftValuesByRow: draftValuesByRowRef.current,
      editingRowKey: editingRowKeyRef.current,
      rowKey,
      setDraftValuesByRow,
      setDraftValuesForRow,
      setEditingRowKey,
      updateDraftValuesForRow,
      value: value as string | number | null | undefined,
    });

    if (shouldClosePopOver !== false) {
      closePopOver();
    }
  }, [popOver]);

  return {
    clearDraftValuesForRow,
    draftValuesByRow,
    draftValuesByRowRef,
    editingRowKey,
    editingRowKeyRef,
    runSaveAndCloseRow,
    setDraftValuesByRow,
    setDraftValuesForRow,
    setEditingRowKey,
    toggleEditingRow,
    updateDraftField,
    updateDraftValuesForRow,
  };
}

/*
 * Build a standardized single-cell empty-state row for editable tables.
 */

export function getEditableTableEmptyRow(message: string): EditableTableRow {
  return {
    columns: [{
      className: 'py_12 cl_lt g_fill',
      children: message,
    }],
  };
}

/*
 * Render one standardized row-action area for editable tables.
 */

const EditableTableRowActions = memo((p: EditableTableRowActionsProps) => {
  const {
    actionButtons,
    allowActiveTransform,
    allowEdit,
    disabled,
    editOptions,
    emptyState,
    isEditing,
    isLocked,
    lockedMessage,
    moreButtonZClassName,
    pending,
    onCancel,
    onSave,
  } = p;

  if (actionButtons?.length) {
    return <div className={cn('abs_r h_center', pending && 'op_50')}>
      {actionButtons.map((button, index) => (
        <TooltipButton
          key={index}
          position='top'
          offsetY={-4}
          className={cn('pointer av av_xxs r v_center', button.disabled && 'op_50')}
          message={button.message}
          onClick={button.disabled ? undefined : button.onClick}
        >
          <Icon name={button.iconName} />
        </TooltipButton>
      ))}
    </div>;
  }

  if (isEditing) {
    return <div className={cn('abs_r h_center', pending && 'op_50')}>
      <TooltipButton
        position='top'
        offsetY={-4}
        className='pointer av av_xxs r v_center'
        message={i18n.t('form.cancel')}
        onClick={onCancel}
      >
        <Icon name={COMMON_ICON_NAMES.cancel} />
      </TooltipButton>

      <TooltipButton
        position='top'
        offsetY={-4}
        className='pointer av av_xxs r v_center'
        message={i18n.t('form.press_enter_to_save')}
        onClick={onSave}
      >
        <Icon name={COMMON_ICON_NAMES.success} />
      </TooltipButton>
    </div>;
  }

  if (isLocked) {
    return <TooltipButton
      position='top'
      offsetY={-4}
      className='av av_xxs r v_center'
      tooltipClassName='a_c'
      message={lockedMessage}
    >
      <Icon name={COMMON_ICON_NAMES.lock} />
    </TooltipButton>;
  }

  if (allowEdit && editOptions?.length) {
    return <PopOverMoreButton
      allowActiveTransform={allowActiveTransform}
      disabled={disabled}
      editOptions={editOptions}
      zClassName={moreButtonZClassName || 'z8'}
    />;
  }

  return emptyState ?? ' ';
});

EditableTableRowActions.displayName = 'EditableTableRowActions';

/*
 * Render one standardized footer action pill for editable tables.
 */

const EditableTableFooterButton = memo((p: EditableTableFooterAction) => {
  const {
    active,
    activeIconName,
    activeLabel,
    className,
    colorClassName,
    hasRows,
    iconName,
    label,
    onClick,
    show,
  } = p;

  if (show === false) {
    return null;
  }

  return <div className={cn('pt_df h_item rel', hasRows && 'pl_16', className)}>
    <Pill
      as='button'
      size='sm'
      onClick={onClick}
      colorClassName={active ? colorClassName || 'bg_primary' : undefined}
    >
      {!active && !!iconName &&
      <span className='shift_up mr_5 -ml_3'>
        <Icon name={iconName} />
      </span>}

      {active ? activeLabel || label : label}

      {active && !!activeIconName &&
      <span className='shift_up ml_5 -mr_3'>
        <Icon name={activeIconName} />
      </span>}
    </Pill>
  </div>;
});

EditableTableFooterButton.displayName = 'EditableTableFooterButton';

/*
 * Convert one editable-table cell config into its rendered table content.
 */

function getEditableTableCellChildren(cell: EditableTableCell) {
  switch (cell.kind) {
    case 'input':
      return cell.inputProps ? <InlineTableInput {...cell.inputProps} /> : null;
    case 'options':
      return cell.optionsProps ? <InlineTableOptions {...cell.optionsProps} /> : null;
    case 'date':
      return cell.dateProps ? <InlineTableDatePicker {...cell.dateProps} /> : null;
    case 'actions':
      return cell.actions ? <EditableTableRowActions {...cell.actions} /> : null;
    default:
      return cell.children;
  }
}

/*
 * Build one editor cell from a schema-driven table column definition.
 */

function getEditableTableSchemaEditor<RowData, DraftValues>(p: {
  config: EditableTableEditorConfig<DraftValues>;
  context: EditableTableSchemaContext<RowData, DraftValues>;
  onChangeField?: (
    rowKey: string,
    field: keyof DraftValues,
    value: DraftValues[keyof DraftValues],
    fallbackDraftValues?: DraftValues,
  ) => void;
}) {
  const { config, context, onChangeField } = p;

  switch (config.type) {
    case 'input': {
      const fieldValue = context.draftValues[config.field as keyof DraftValues];
      return <InlineTableInput
        autoFocus={config.autoFocus}
        type={config.inputType}
        value={String(fieldValue || '')}
        placeholder={config.placeholder}
        onKeyDown={(e) => {
          if (config.saveOnEnter === false || e.key !== 'Enter') {
            return;
          }

          e.preventDefault();
          e.stopPropagation();
          context.onSaveEdit?.();
        }}
        onChange={(e) => {
          onChangeField?.(
            context.rowKey,
            config.field,
            e.target.value as DraftValues[keyof DraftValues],
            context.draftValues,
          );
        }}
      />;
    }
    case 'options': {
      const fieldValue = context.draftValues[config.field as keyof DraftValues];
      return <InlineTableOptions
        value={fieldValue as string | null | undefined}
        options={config.options}
        placeholder={config.placeholder}
        onChange={(value) => {
          onChangeField?.(
            context.rowKey,
            config.field,
            value as DraftValues[keyof DraftValues],
            context.draftValues,
          );
        }}
      />;
    }
    case 'date': {
      const fieldValue = context.draftValues[config.field as keyof DraftValues];
      return <InlineTableDatePicker
        value={fieldValue as string | number | null | undefined}
        placeholder={config.placeholder}
        minDate={config.minDate}
        maxDate={config.maxDate}
        onChange={(value) => {
          onChangeField?.(
            context.rowKey,
            config.field,
            (config.mapValue ? config.mapValue(value) : value) as DraftValues[keyof DraftValues],
            context.draftValues,
          );
        }}
      />;
    }
    case 'actions':
      return <EditableTableRowActions {...config.actions} />;
  }
}

/*
 * Convert schema-driven row and column definitions into raw table row data.
 */

function getEditableTableSchemaData<RowData, DraftValues>(p: {
  columns: EditableTableColumn<RowData, DraftValues>[];
  onChangeField?: (
    rowKey: string,
    field: keyof DraftValues,
    value: DraftValues[keyof DraftValues],
    fallbackDraftValues?: DraftValues,
  ) => void;
  rows: EditableTableSchemaRow<RowData, DraftValues>[];
}): EditableTableRow[] {
  const { columns, onChangeField, rows } = p;

  return rows.map((row) => {
    const context: EditableTableSchemaContext<RowData, DraftValues> = {
      draftValues: row.draftValues,
      isEditing: !!row.isEditing,
      item: row.item,
      onCancelEdit: row.onCancelEdit,
      onSaveEdit: row.onSaveEdit,
      rowKey: row.rowKey,
    };
    const {
      draftValues: _draftValues,
      isEditing: _isEditing,
      item: _item,
      onCancelEdit: _onCancelEdit,
      onSaveEdit: _onSaveEdit,
      rowKey: _rowKey,
      ...tableRow
    } = row;

    return {
      ...tableRow,
      columns: columns.map((column) => {
        const useEditor = !!column.editor && (column.useEditorWhen ? column.useEditorWhen(context) : context.isEditing);
        const editorConfig = useEditor ? column.editor?.(context) : null;

        return {
          className: typeof column.className === 'function' ? column.className(context) : column.className,
          removeLeftPadding: column.removeLeftPadding,
          removeRightPadding: column.removeRightPadding,
          children: editorConfig
            ? getEditableTableSchemaEditor({
              config: editorConfig,
              context,
              onChangeField,
            })
            : column.display?.(context),
        };
      }),
    };
  });
}

/*
 * Shared editable-table shell with standardized inline field and footer support.
 */

export function EditableTable<RowData = never, DraftValues = never>(p: {
  borderStyle?: ComponentProps<typeof THead>['borderStyle'];
  children?: ReactNode;
  className?: string;
  columns?: EditableTableColumn<RowData, DraftValues>[];
  data?: EditableTableRow[];
  emptyStateMessage?: string;
  footer?: ReactNode;
  footerAction?: EditableTableFooterAction;
  gridLayoutStyle: string;
  headers?: EditableTableHeader[];
  onChangeField?: (
    rowKey: string,
    field: keyof DraftValues,
    value: DraftValues[keyof DraftValues],
    fallbackDraftValues?: DraftValues,
  ) => void;
  removeLeftPadding?: boolean;
  removeRightPadding?: boolean;
  rows?: EditableTableSchemaRow<RowData, DraftValues>[];
}) {
  const {
    borderStyle,
    children,
    className,
    columns,
    data,
    emptyStateMessage,
    footer,
    footerAction,
    gridLayoutStyle,
    headers,
    onChangeField,
    removeLeftPadding,
    removeRightPadding,
    rows,
  } = p;

  const tableData = useMemo(() => {
    if (rows && columns) {
      if (!rows.length && emptyStateMessage) {
        return [getEditableTableEmptyRow(emptyStateMessage)];
      }

      return getEditableTableSchemaData({
        columns,
        onChangeField,
        rows,
      });
    }

    return data || [];
  }, [columns, data, emptyStateMessage, onChangeField, rows]);

  return <div className={cn('-mx_xs rel', className)}>
    {headers &&
    <THead
      borderStyle={borderStyle ?? 'BORDER'}
      removeLeftPadding={removeLeftPadding}
      removeRightPadding={removeRightPadding}
      gridLayoutStyle={gridLayoutStyle}
      headers={headers}
    />}

    {tableData.map((row, rowIndex) => {
      const { columns, gridLayoutStyle: rowGridLayoutStyle, ...rest } = row;

      return <TRow
        key={rowIndex}
        gridLayoutStyle={rowGridLayoutStyle || gridLayoutStyle}
        {...rest}
        removeBorderLine={row.removeBorderLine ?? true}
      >
        {columns.map((cell, cellIndex) => {
          return <TDCol
            key={cellIndex}
            removeLeftPadding={cell.removeLeftPadding ?? removeLeftPadding}
            removeRightPadding={cell.removeRightPadding ?? removeRightPadding}
            {...getEditableTableCellProps(cell)}
            className={cell.className ?? 'py_6 min_h_40'}
          >
            {getEditableTableCellChildren(cell)}
          </TDCol>;
        })}
      </TRow>;
    })}

    {children}
    {footerAction ? <EditableTableFooterButton {...footerAction} /> : footer}
  </div>;
}
