import type { ReportFieldsObj, ReportFieldsRow, ReportSectionGQL } from '@jsb188/mday/types/report.d.ts';
import { REPORT_NUMBERED_PRESETS } from '../constants/report.ts';

/**
 * Get report sections file status
 * Returns whether a report has any finished files, if all sections have files, and if all sections are empty
 */

export interface ReportSectionsFileStatus {
	hasValidFile: boolean;
	isComplete: boolean;
	isEmpty: boolean;
}

export interface ReportSectionsFilesCount {
	required: number;
	hasFile: number;
}

/*
 * Check whether one report row should contribute to automated line numbering.
 */

export function isReportNumberedRow(row?: Pick<ReportFieldsRow, 'preset' | '__notAutomated'> | null): boolean {
	return !!row && !row.__notAutomated && !!row.preset && REPORT_NUMBERED_PRESETS.includes(row.preset);
}

/*
 * Build one report line number using the numbered row index and column index.
 */

export function getReportLineNumber(lineIndex?: number | null, colIndex?: number | null): string | null {
	if (!lineIndex || colIndex == null) {
		return null;
	}

	return `${lineIndex}.${colIndex + 1}`;
}

export function getReportFilesCount(sections?: ReportSectionGQL[]): ReportSectionsFilesCount {
	return (sections || []).reduce((acc, section) => {
		if (section.requireFileUploads) {
			acc.required++;
			if (section.files?.filter(file => !file.__deleted)?.length) {
				acc.hasFile++;
			}
		}
		return acc;
	}, {
		required: 0,
		hasFile: 0
	});
}

export function getReportFileStatus(sections: ReportSectionGQL[] | undefined): ReportSectionsFileStatus {
	let hasValidFile = false;
	let totalRequiring = 0;
	let totalWithFile = 0;

	for (const section of sections || []) {
		if (!section.requireFileUploads) continue;

		totalRequiring++;

		let hasNonDeleted = false;
		let hasCompleted = false;

		if (section.files) {
			for (const file of section.files) {
				if (!file.__deleted) {
					hasNonDeleted = true;
					if (!file.uploadStatus) {
						hasCompleted = true;
						break; // Found completed file, no need to check more
					}
				}
			}
		}

		if (hasNonDeleted) totalWithFile++;
		if (!hasCompleted) hasValidFile = true;
	}

	return {
		hasValidFile,
		isComplete: totalRequiring > 0 && totalWithFile === totalRequiring,
		isEmpty: totalWithFile === 0,
	};
}

/**
 * Get gridLayoutStyle CSS value for client
 */

export function makeGridLayoutStyle(fields: ReportFieldsObj, period: string) {
	const firstHeaderRow = fields.rows?.find((r) => r.isHeader) || fields.rows?.[0];
	const firstPreset = firstHeaderRow?.preset;

	let gridLayoutStyle = fields.gridLayoutStyle || '';
	switch (firstPreset) {
		case 'MONTH':
			{
				const year = fields.variables?.year ?? period.split('-')[0];
				const month = fields.variables?.month ?? 0; // Defaults to January, so always make sure the report Object has this info
				const numberOfDays = new Date(Number(year), month + 1, 0).getDate();

				gridLayoutStyle += ' ' + Array.from({ length: numberOfDays }, (_) => {
					return '50px'; // 50px per column
				}).join(' ');
			}
			break;
		default:
	}

	// console.log('gridLayoutStyle', gridLayoutStyle);
	// console.log('firstPreset', firstPreset);

	return gridLayoutStyle;
}
