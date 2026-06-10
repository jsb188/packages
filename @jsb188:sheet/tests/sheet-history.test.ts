import { describe, expect, it } from 'vitest';
import { getOptimisticSheetCellFromEditInput, getSheetValueEditInput } from '../src/libs/sheet-history';

describe('sheet history optimistic cells', () => {
	it('uses the edited formula text instead of preserving stale formula metadata', () => {
		const optimisticCell = getOptimisticSheetCellFromEditInput(
			getSheetValueEditInput(1, 1, '=B1'),
			{
				columnIndex: 1,
				formula: {
					engine: 'server',
					references: [{
						id: 'A1',
						kind: 'SHEET_CELL',
						status: 'OK',
						text: 'A1',
					}],
					text: '=A1',
					version: 1,
				},
				rawInput: '=A1',
				rowIndex: 1,
				value: 'old',
			},
		);

		expect(optimisticCell.rawInput).toBe('=B1');
		expect(optimisticCell.formula?.text).toBe('=B1');
		expect(optimisticCell.formula?.references).toEqual([]);
		expect(optimisticCell.formula?.error).toBeNull();
	});

	it('clears stale formula metadata when a formula cell becomes plain text', () => {
		const optimisticCell = getOptimisticSheetCellFromEditInput(
			getSheetValueEditInput(1, 1, 'Plain text'),
			{
				columnIndex: 1,
				formula: {
					engine: 'server',
					text: '=A1',
					version: 1,
				},
				rawInput: '=A1',
				rowIndex: 1,
				value: 'old',
			},
		);

		expect(optimisticCell.rawInput).toBe('Plain text');
		expect(optimisticCell.formula).toBeNull();
	});
});
