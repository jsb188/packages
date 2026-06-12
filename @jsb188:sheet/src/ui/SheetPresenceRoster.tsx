import { AvatarImg } from '@jsb188/react-web/ui/Avatar';
import type { SheetPresenceRosterEntry } from '../libs/sheet-collab.ts';

// Most avatars shown before collapsing the rest into a +N counter
const SHEET_PRESENCE_ROSTER_MAX_AVATARS = 6;

interface SheetPresenceRosterProps {
	roster: SheetPresenceRosterEntry[];
}

/*
 * Render the avatar row of other users currently viewing the sheet, each
 * ringed with their collaboration selection color.
 */
export function SheetPresenceRoster(p: SheetPresenceRosterProps) {
	if (!p.roster.length) {
		return null;
	}

	const visibleEntries = p.roster.slice(0, SHEET_PRESENCE_ROSTER_MAX_AVATARS);
	const hiddenCount = p.roster.length - visibleEntries.length;

	return <div
		className='h_item gap_4 no_shrink'
		data-sheet-presence-roster='true'
	>
		{visibleEntries.map((entry) => (
			<div
				key={entry.user.accountId}
				className='pill'
				style={{
					boxShadow: `0 0 0 2px ${entry.color}`,
				}}
				title={entry.user.displayName}
			>
				<AvatarImg
					displayName={entry.user.displayName}
					size='tiny'
					urlPath={entry.user.photoUri || undefined}
				/>
			</div>
		))}
		{hiddenCount > 0
			? <span className='ft_xs cl_md'>
				{`+${hiddenCount}`}
			</span>
			: null}
	</div>;
}

export default SheetPresenceRoster;
