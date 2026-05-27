import i18n from '@jsb188/app/i18n/index.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import type { ReactNode } from 'react';
import { ActivityDots } from './Loading';

export type SheetEditorNavItem<Value extends string = string> = {
	label: ReactNode;
	value: Value;
	disabled?: boolean;
};

export type SheetEditorNavProps<Value extends string = string> = {
	activeValue: Value;
	className?: string;
	items: SheetEditorNavItem<Value>[];
	onChange: (value: Value) => void;
};

export type SheetSaveButtonProps = {
	className?: string;
	disabled?: boolean;
	saving?: boolean;
	type?: 'button' | 'reset' | 'submit';
};

/*
 * Return translated sheet editor UI text with a stable fallback for tests.
 */

function getSheetEditorTranslatedText(key: string, fallback: string) {
	return i18n.has(key) ? i18n.t(key) : fallback;
}

/*
 * Render the shared nav bar used by sheet editor forms.
 */

export function SheetEditorNav<Value extends string = string>(p: SheetEditorNavProps<Value>) {
	return <div className={cn('h_item bg_alt px_5 pt_8 gap_4 mb_1 bd_b_1 bd_lt', p.className)}>
		{p.items.map((item) => {
			const active = item.value === p.activeValue;

			return <button
				aria-pressed={active}
				className={`px_6 pt_4 pb_3 ft_xs r_2 bd_t_1 bd_l_1 bd_r_1 -mb_1 ${active ? 'bg bd_lt' : 'bd_invis cl_md'}`}
				disabled={item.disabled}
				key={item.value}
				onClick={() => {
					p.onChange(item.value);
				}}
				type='button'
			>
				{item.label}
			</button>;
		})}
	</div>;
}

/*
 * Render the shared save button used by sheet editor forms.
 */

export function SheetSaveButton(p: SheetSaveButtonProps) {
	return <button
		className={cn('rel h_28 px_8 bg_alt bg_active_hv bd_1 bd_bd ft_xs', p.className)}
		disabled={p.disabled || p.saving}
		type={p.type || 'submit'}
	>
		<span className={p.saving ? 'invis' : undefined}>
			{getSheetEditorTranslatedText('form.save', 'Save')}
		</span>

		{p.saving ? <span className='abs_full v_center'>
			<ActivityDots size='tn' />
		</span> : null}
	</button>;
}
