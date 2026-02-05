import i18n from '@jsb188/app/i18n/index.ts';
import { getObject } from '@jsb188/app/utils/object.ts';
import type { ReportFieldsColumn, ReportFieldsObj, ReportFieldsRow, ReportSectionGQL } from '@jsb188/mday/types/report.d.ts';
import { DateTime } from 'luxon';

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
 * Types
 */

interface MapDataParams {
	answerKey: string | null;
	cursorPrefix: (string | number | bigint)[];
	period: string;
}

/**
 * Helper; replace template strings in String values in report data
 */

export function replaceTemplateStrings(
	str: string | null,
	mapParams?: MapDataParams | Record<string, any> | null,
	answers?: Record<string, any> | null,
	variables?: Record<string, any> | null,
) {
	return str?.replace(/{{(.*?)}}/g, (_, p1) => {
		switch (p1) {
			case 'year':
				return variables?.year ?? mapParams?.period?.split?.('-')?.[0] ?? '#year';
			case 'month': {
				const month = variables?.month ?? 0; // Defaults to January, so always make sure the report Object has this info
				return !isNaN(month) && month >= 0 ? new Date(2000, month, 1).toLocaleString('en', { month: 'long' }) : '#month';
			}
			case 'orgName':
			case 'organizationName': // deprecation support
				return variables?.orgName ?? '#orgName';
			case 'operationDescription': {
				const i18nKey = `org.operation_desc.${variables?.operation}`;
				if (i18n.has(i18nKey)) {
					return i18n.t(variables?.commodities?.length ? i18nKey : i18nKey + '_default', {
						commodities: variables?.commodities ? variables.commodities.join(', ').toLowerCase() : '',
					});
				}
				return 'Unknown';
			}
			case 'certificationScope':
				return i18n.has(`org.cert_scope.${variables?.operation}`) ? i18n.t(`org.cert_scope.${variables?.operation}`) : 'Unknown';
			case 'beginningOfPeriod':
				return DateTime.fromISO(mapParams?.period, { zone: variables?.timeZone }).toFormat('LL/dd/yyyy');
			case 'endOfPeriodYear':
				return DateTime.fromISO(mapParams?.period, { zone: variables?.timeZone }).endOf('year').toFormat('LL/dd/yyyy');
			default:
		}

		const answerKey = mapParams?.answerKey ? mapParams.answerKey + '.' : '';
		const value = getObject(answers, answerKey + p1) ?? getObject(variables, answerKey + p1);
		if (value === undefined || value === null) {
			return '';
		}

		return value;
	})?.trim() ?? '';
}

// Test this with undefined
// const value = getObject(answers, p1) ?? getObject(variables, p1);

/**
 * Map column data
 */

export function mapColumnData(
	fields: ReportFieldsObj,
	answers: Record<string, any> | null | undefined,
	mapParams: MapDataParams,
	col: Partial<ReportFieldsColumn> | null | undefined,
	rowIdentifier: string,
	colIndex: number,
) {
	if (!col) {
		return null;
	}

	const { cursorPrefix } = mapParams;
	const columnId = rowIdentifier + '.' + (col.key || '__' + colIndex);

	let checked = typeof col.checked === 'boolean' ? col.checked : null;
	let text = col.text;

	if (typeof col.value === 'string') {
		text = replaceTemplateStrings(col.value, mapParams, answers, fields.variables);
	} else if (answers) {
		const answerVal = getObject(answers, columnId);
		if (typeof answerVal === 'string') {
			text = answerVal;
		} else if (typeof answerVal === 'boolean') {
			checked = answerVal;
		}
	}

	if (text && text === col.text) {
		text = replaceTemplateStrings(text, mapParams, answers, fields.variables);
	}

	let placeholder;
	if (col.placeholder) {
		placeholder = replaceTemplateStrings(col.placeholder, mapParams, answers, fields.variables);
	}

	return {
		...col,
		id: cursorPrefix.concat(columnId),
		text,
		placeholder,
		checked,
	};
}

/**
 * Map row data
 */

export function mapRowData(
	row: ReportFieldsRow,
	fields: ReportFieldsObj,
	answers: Record<string, any> | null | undefined,
	mapParams: MapDataParams,
) {
	const { period, cursorPrefix, answerKey } = mapParams;
	const { key: rowKey, isHeader, preset } = row;
	// NOTE: Every {{row}} *must* have a key in the report/template database Object
	const rowIdentifier = `${answerKey || '__'}.${rowKey || 'ERROR'}`;

	let extraColumns: any[] = [];
	switch (preset) {
		case 'MONTH':
			{
				const year = fields.variables?.year ?? period.split('-')[0];
				const month = fields.variables?.month ?? 0; // Defaults to January, so always make sure the report Object has this info
				const numberOfDays = new Date(Number(year), month + 1, 0).getDate();

				extraColumns = Array.from({ length: numberOfDays }, (_, i) => {
					return mapColumnData(
						fields,
						answers,
						mapParams,
						{
							key: `days.${i}`,
							className: 'h_center',
							text: isHeader ? String(i + 1) : '',
						},
						rowIdentifier,
						i,
					);
				});
			}
			break;
		default:
	}

	return {
		...row,
		id: cursorPrefix.concat(rowIdentifier),
		columns: row.columns?.map((col, ii) => {
			return mapColumnData(fields, answers, mapParams, col, rowIdentifier, ii);
		}).concat(extraColumns),
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
