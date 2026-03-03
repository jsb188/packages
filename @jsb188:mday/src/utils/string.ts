/**
 * Truncate a file name while preserving extension when possible.
 */

export function truncateFileName(fileName: string, maxLen = 34) {
  if (fileName.length <= maxLen) {
    return fileName;
  }

  const extIndex = fileName.lastIndexOf('.');
  const ext = extIndex > 0 ? fileName.slice(extIndex) : '';
  const headLen = Math.max(1, maxLen - ext.length - 3);
  return fileName.slice(0, headLen) + '...' + ext;
}
