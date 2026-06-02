import { gql } from 'graphql-tag';
import { sheetCellFragment, sheetFragment, sheetGridFragment, sheetRangeFragment, sheetRegionFragment } from '../fragments/sheetFragments.ts';

export const sheetsQry = gql`
query sheets (
  $organizationId: GenericID!
  $active: Boolean
) {
  sheets (
    organizationId: $organizationId
    active: $active
  ) {
    ...sheetFragment
  }
}

${sheetFragment}
`;

export const sheetQry = gql`
query sheet (
  $organizationId: GenericID!
  $sheetId: GenericID!
) {
  sheet (
    organizationId: $organizationId
    sheetId: $sheetId
  ) {
    ...sheetFragment
  }
}

${sheetFragment}
`;

export const sheetGridQry = gql`
query sheetGrid (
  $organizationId: GenericID!
  $sheetId: GenericID!
  $viewport: SheetGridViewportInput!
) {
  sheetGrid (
    organizationId: $organizationId
    sheetId: $sheetId
    viewport: $viewport
  ) {
    ...sheetGridFragment

    sheet {
      ...sheetFragment
    }

    cells {
      ...sheetCellFragment
    }

    ranges {
      ...sheetRangeFragment
    }

    regions {
      ...sheetRegionFragment
    }
  }
}

${sheetGridFragment}
${sheetFragment}
${sheetCellFragment}
${sheetRangeFragment}
${sheetRegionFragment}
`;
