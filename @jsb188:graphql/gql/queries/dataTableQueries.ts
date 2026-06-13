import { gql } from 'graphql-tag';
import { dataTableCellFragment, dataTableFragment, dataTableRowFragment } from '../fragments/dataTableFragments.ts';

export const dataTablesQry = gql`
query dataTables (
  $organizationId: GenericID!
  $filter: DataTablesFilter
  $sort: GridItemSort
  $cursor: Cursor
  $after: Boolean!
  $limit: Int!
) {
  dataTables (
    organizationId: $organizationId
    filter: $filter
    sort: $sort
    cursor: $cursor
    after: $after
    limit: $limit
  ) {
    ...dataTableFragment
  }
}

${dataTableFragment}
`;

export const dataTableQry = gql`
query dataTable (
  $organizationId: GenericID!
  $dataTableId: GenericID!
) {
  dataTable (
    organizationId: $organizationId
    dataTableId: $dataTableId
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
) {
  dataTableRows (
    dataTableId: $dataTableId
    organizationId: $organizationId
    cursor: $cursor
    limit: $limit
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
