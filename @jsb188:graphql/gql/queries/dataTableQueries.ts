import { gql } from 'graphql-tag';
import { dataTableCellFragment, dataTableFragment, dataTableRowFragment } from '../fragments/dataTableFragments.ts';

export const dataTablesQry = gql`
query dataTables (
  $organizationId: GenericID!
  $active: Boolean
) {
  dataTables (
    organizationId: $organizationId
    active: $active
  ) {
    ...dataTableFragment
  }
}

${dataTableFragment}
`;

export const dataTableRowsQry = gql`
query dataTableRows (
  $dataTableId: GenericID!
  $organizationId: GenericID!
  $cursor: Cursor
  $limit: Int!
  $filter: DataTableRowsFilterInput
) {
  dataTableRows (
    dataTableId: $dataTableId
    organizationId: $organizationId
    cursor: $cursor
    limit: $limit
    filter: $filter
  ) {
    ...dataTableRowFragment

    cells {
      ...dataTableCellFragment
    }
  }
}

${dataTableRowFragment}
${dataTableCellFragment}
`;
