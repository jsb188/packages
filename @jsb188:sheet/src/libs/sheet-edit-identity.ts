// Per-tab identity stamped on cell-edit mutations. The server echoes it on
// the realtime payloads those mutations produce, so the originating client
// can recognize its own echoes (the mutation response already carried the
// same data) and skip re-processing them.

let sheetEditClientId: string | null = null;

/*
 * Return the stable per-tab client id for cell-edit mutations.
 */
export function getSheetEditClientId() {
	if (!sheetEditClientId) {
		sheetEditClientId = globalThis.crypto?.randomUUID?.() || `c-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
	}

	return sheetEditClientId;
}
