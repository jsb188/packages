const ICON_PATH_DATA_URL = '/icon-path-data.json';
let iconPathData: Record<string, readonly string[]> = {};
let iconPathDataLoadPromise: Promise<void> | null = null;

/*
 * Return true when loaded path data exists for an icon name.
 */
function hasLoadedIconSVGPathData(name?: string | null) {
  return !!name && Object.prototype.hasOwnProperty.call(iconPathData, name);
}

/*
 * Load SVG path data from the generated static asset.
 */
export function loadIconSVGPathData() {
  if (typeof window === 'undefined') {
    return Promise.resolve();
  }

  if (iconPathDataLoadPromise) {
    return iconPathDataLoadPromise;
  }

  iconPathDataLoadPromise = fetch(ICON_PATH_DATA_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load icon path data: ${response.status}`);
      }

      return response.json();
    })
    .then((data) => {
      iconPathData = data || {};
    })
    .catch((error) => {
      console.warn('IconPathData: Failed to load icon path data', error);
    });

  return iconPathDataLoadPromise;
}

/*
 * Return SVG path data for an icon name using loaded IconSVGs path metadata.
 */
export function getIconSVGPathData(name: string, backupName?: string) {
  const iconKey = hasLoadedIconSVGPathData(name) ? name : backupName || '';

  return iconPathData[iconKey] || [];
}
