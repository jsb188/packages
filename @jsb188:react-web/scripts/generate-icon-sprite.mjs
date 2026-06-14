import { pathToFileURL } from 'node:url';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { transform } from 'esbuild';
import { Children, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const packageRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');
const iconSourcePath = path.join(packageRoot, 'svgs', 'IconSVGs.tsx');
const generatedDir = path.join(packageRoot, 'svgs', 'generated');
const spriteOutputPath = path.join(repoRoot, 'apps', 'marketday', 'public', 'icons.svg');
const metaOutputPath = path.join(generatedDir, 'IconSpriteMeta.generated.ts');
const pathDataOutputPath = path.join(repoRoot, 'apps', 'marketday', 'public', 'icon-path-data.json');
const defaultViewBox = '0 0 24 24';

/*
 * Convert an exported icon constant name into the kebab-case icon name used by the app.
 */
function camelCaseToDash(str) {
  if (/^[A-Z0-9]+$/.test(str)) {
    return str.toLowerCase();
  }

  return str.replace(/([A-Z]|\d+)/g, (match, _, offset) => {
    return (offset <= 0 ? '' : '-') + match.toLowerCase();
  });
}

/*
 * Escape an XML attribute value for generated SVG output.
 */
function escapeXMLAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/*
 * Return a short content hash for cache-busting static generated icon assets.
 */
function getContentHash(value) {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

/*
 * Parse static SVG markup into root attributes and child markup.
 */
function parseSVGMarkup(markup, iconName) {
  const match = markup.match(/^<svg\b([^>]*)>([\s\S]*)<\/svg>$/);

  if (!match) {
    throw new Error(`Could not parse SVG markup for ${iconName}`);
  }

  const attrs = {};
  const attrSource = match[1] || '';

  for (const attrMatch of attrSource.matchAll(/([:\w-]+)="([^"]*)"/g)) {
    attrs[attrMatch[1]] = attrMatch[2];
  }

  return {
    attrs,
    children: match[2],
  };
}

/*
 * Build one SVG symbol from a rendered React SVG element.
 */
function createSymbolMarkup(iconName, renderedMarkup) {
  const { attrs, children } = parseSVGMarkup(renderedMarkup, iconName);
  const viewBox = attrs.viewBox || defaultViewBox;
  const groupAttrs = Object.entries(attrs)
    .filter(([key]) => !['xmlns', 'viewBox', 'class', 'width', 'height'].includes(key))
    .map(([key, value]) => `${key}="${escapeXMLAttribute(value)}"`)
    .join(' ');
  const innerMarkup = groupAttrs ? `<g ${groupAttrs}>${children}</g>` : children;

  return {
    symbol: `<symbol id="${escapeXMLAttribute(iconName)}" viewBox="${escapeXMLAttribute(viewBox)}">${innerMarkup}</symbol>`,
    viewBox,
  };
}

/*
 * Add drawable path data from a React icon node into a flat path list.
 */
function addIconSVGPathDataFromNode(node, pathData) {
  Children.forEach(node, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    if (typeof child.props.d === 'string' && child.props.stroke !== 'none') {
      pathData.push(child.props.d);
    }

    if (child.props.children) {
      addIconSVGPathDataFromNode(child.props.children, pathData);
    }
  });
}

/*
 * Compile the TSX icon registry to a temporary ESM module and import it.
 */
async function importIconModule() {
  const source = await readFile(iconSourcePath, 'utf8');
  const result = await transform(source, {
    format: 'esm',
    jsx: 'automatic',
    loader: 'tsx',
    sourcemap: false,
  });
  const tempDir = await mkdir(path.join(generatedDir, `.tmp-icons-${Date.now()}`), { recursive: true });
  const tempModulePath = path.join(tempDir, 'IconSVGs.generated.mjs');

  await writeFile(tempModulePath, result.code);

  try {
    return await import(pathToFileURL(tempModulePath).href);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

/*
 * Generate the static SVG sprite and TypeScript metadata files.
 */
async function main() {
  const iconModule = await importIconModule();
  const symbols = [];
  const iconNames = [];
  const viewBoxes = {};
  const pathDataByName = {};

  for (const [exportName, iconNode] of Object.entries(iconModule)) {
    if (!isValidElement(iconNode)) {
      continue;
    }

    const iconName = camelCaseToDash(exportName);
    const renderedMarkup = renderToStaticMarkup(iconNode);
    const { symbol, viewBox } = createSymbolMarkup(iconName, renderedMarkup);
    const pathData = [];

    addIconSVGPathDataFromNode(iconNode, pathData);
    symbols.push(symbol);
    iconNames.push(iconName);

    if (viewBox !== defaultViewBox) {
      viewBoxes[iconName] = viewBox;
    }

    if (pathData.length) {
      pathDataByName[iconName] = pathData;
    }
  }

  const sprite = [
    '<svg xmlns="http://www.w3.org/2000/svg">',
    '<defs>',
    ...symbols,
    '</defs>',
    '</svg>',
    '',
  ].join('\n');
  const pathDataJSON = JSON.stringify(pathDataByName, null, 2) + '\n';
  const spriteHash = getContentHash(sprite);
  const pathDataHash = getContentHash(pathDataJSON);

  const metaSource = [
    '/* This file is generated by scripts/generate-icon-sprite.mjs. Do not edit by hand. */',
    `export const ICON_SPRITE_URL = '/icons.svg?v=${spriteHash}';`,
    `export const ICON_PATH_DATA_URL = '/icon-path-data.json?v=${pathDataHash}';`,
    `export const DEFAULT_ICON_VIEW_BOX = ${JSON.stringify(defaultViewBox)};`,
    `export const ICON_SPRITE_NAMES = ${JSON.stringify(iconNames, null, 2)} as const;`,
    'export const ICON_SPRITE_NAME_SET: ReadonlySet<string> = new Set(ICON_SPRITE_NAMES);',
    `export const ICON_SPRITE_VIEW_BOXES: Readonly<Record<string, string>> = ${JSON.stringify(viewBoxes, null, 2)};`,
    '',
    '/*',
    ' * Return true when an icon name exists in the generated SVG sprite.',
    ' */',
    'export function hasIconSpriteName(name?: string | null) {',
    '  return !!name && ICON_SPRITE_NAME_SET.has(name);',
    '}',
    '',
    '/*',
    ' * Return the source viewBox for an icon name.',
    ' */',
    'export function getIconSpriteViewBox(name: string) {',
    '  return ICON_SPRITE_VIEW_BOXES[name] || DEFAULT_ICON_VIEW_BOX;',
    '}',
    '',
  ].join('\n');

  await mkdir(path.dirname(spriteOutputPath), { recursive: true });
  await mkdir(path.dirname(pathDataOutputPath), { recursive: true });
  await mkdir(generatedDir, { recursive: true });
  await writeFile(spriteOutputPath, sprite);
  await writeFile(metaOutputPath, metaSource);
  await writeFile(pathDataOutputPath, pathDataJSON);

  console.log(`Generated ${iconNames.length} icons in ${path.relative(repoRoot, spriteOutputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
