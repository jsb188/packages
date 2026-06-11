const STAR_STYLE_DELIMITERS = ['***', '**', '*'] as const;
const UNDERSCORE_STYLE_DELIMITERS = ['___', '__', '_'] as const;
const STRIKETHROUGH_STYLE_DELIMITER = '~~';
const STYLE_MARKDOWN_DELIMITER_SETS = [
  ...STAR_STYLE_DELIMITERS.flatMap((starDelimiter) => UNDERSCORE_STYLE_DELIMITERS.flatMap((underscoreDelimiter) => [
    [starDelimiter, underscoreDelimiter, STRIKETHROUGH_STYLE_DELIMITER],
    [starDelimiter, STRIKETHROUGH_STYLE_DELIMITER, underscoreDelimiter],
    [underscoreDelimiter, starDelimiter, STRIKETHROUGH_STYLE_DELIMITER],
    [underscoreDelimiter, STRIKETHROUGH_STYLE_DELIMITER, starDelimiter],
    [STRIKETHROUGH_STYLE_DELIMITER, starDelimiter, underscoreDelimiter],
    [STRIKETHROUGH_STYLE_DELIMITER, underscoreDelimiter, starDelimiter],
  ])),
  ...STAR_STYLE_DELIMITERS.flatMap((starDelimiter) => UNDERSCORE_STYLE_DELIMITERS.flatMap((underscoreDelimiter) => [
    [starDelimiter, underscoreDelimiter],
    [underscoreDelimiter, starDelimiter],
  ])),
  ...STAR_STYLE_DELIMITERS.flatMap((starDelimiter) => [
    [starDelimiter, STRIKETHROUGH_STYLE_DELIMITER],
    [STRIKETHROUGH_STYLE_DELIMITER, starDelimiter],
  ]),
  ...UNDERSCORE_STYLE_DELIMITERS.flatMap((underscoreDelimiter) => [
    [underscoreDelimiter, STRIKETHROUGH_STYLE_DELIMITER],
    [STRIKETHROUGH_STYLE_DELIMITER, underscoreDelimiter],
  ]),
  ...STAR_STYLE_DELIMITERS.map((starDelimiter) => [starDelimiter]),
  ...UNDERSCORE_STYLE_DELIMITERS.map((underscoreDelimiter) => [underscoreDelimiter]),
  [STRIKETHROUGH_STYLE_DELIMITER],
];

export type LabelMarkdownPart = {
  className?: string | null;
  italic?: boolean;
  medium?: boolean;
  semibold?: boolean;
  strikethrough?: boolean;
  text: string;
  underline?: boolean;
};

/*
 * Escape markdown style delimiters so they can be used inside a regex source.
 */
function escapeStyleDelimiterForRegex(delimiter: string) {
  return delimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/*
 * Build the regex boundary for delimiters with stricter token rules.
 */
function getStyleDelimiterBoundary(delimiter: string, position: 'start' | 'end') {
  if (position === 'start') {
    if (delimiter.startsWith('_')) {
      return '\\b';
    }

    if (delimiter.startsWith('~~')) {
      return '(?<!~)';
    }

    return '';
  }

  if (delimiter.endsWith('_')) {
    return '\\b';
  }

  if (delimiter.endsWith('~~')) {
    return '(?!~)';
  }

  return '';
}

/*
 * Build the content matcher for text inside one markdown style delimiter set.
 */
function getStyleMarkdownContentRegexSource(delimiters: string[]) {
  const excludedCharacters = [
    delimiters.some((delimiter) => delimiter.includes('*')) ? '*' : '',
    delimiters.some((delimiter) => delimiter.includes('_')) ? '_' : '',
    delimiters.some((delimiter) => delimiter.includes('~')) ? '~' : '',
  ].join('');

  return `[^${escapeStyleDelimiterForRegex(excludedCharacters)}\\n]+`;
}

/*
 * Build a markdown style regex source for one delimiter combination.
 */
function getStyleMarkdownRegexSource(delimiters: string[]) {
  const openingDelimiter = delimiters.join('');
  const closingDelimiter = [...delimiters].reverse().join('');
  const openingRegex = escapeStyleDelimiterForRegex(openingDelimiter);
  const closingRegex = escapeStyleDelimiterForRegex(closingDelimiter);

  return [
    getStyleDelimiterBoundary(openingDelimiter, 'start'),
    openingRegex,
    getStyleMarkdownContentRegexSource(delimiters),
    closingRegex,
    getStyleDelimiterBoundary(closingDelimiter, 'end'),
  ].join('');
}

export const INLINE_STYLE_MARKDOWN_REGEX_SOURCE = STYLE_MARKDOWN_DELIMITER_SETS
  .map((delimiters) => getStyleMarkdownRegexSource(delimiters))
  .join('|');

export const LABEL_MARKDOWN_REGEX_SOURCE = `${INLINE_STYLE_MARKDOWN_REGEX_SOURCE}|\\[(.*?)##(.*?)\\]`;

const LABEL_MARKDOWN_REGEX = new RegExp(LABEL_MARKDOWN_REGEX_SOURCE, 'gmi');
const LABEL_MARKDOWN_SPAN_REGEX = /^\[(.*?)##(.*?)\]$/;

/*
 * Identify italic and underline styles represented by underscore delimiters.
 */
function getUnderscoreStyles(delimiter: string) {
  return {
    italic: delimiter.length === 1 || delimiter.length === 3,
    underline: delimiter.length >= 2,
  };
}

/*
 * Return label-markdown style info when the token delimiters match.
 */
function getDelimitedLabelMarkdownPart(
  matchedStr: string,
  openingDelimiter: string,
  closingDelimiter: string,
): LabelMarkdownPart | null {
  if (!matchedStr.startsWith(openingDelimiter) || !matchedStr.endsWith(closingDelimiter)) {
    return null;
  }

  const text = matchedStr.substring(openingDelimiter.length, matchedStr.length - closingDelimiter.length);
  const starDelimiter = openingDelimiter.match(/\*+/)?.[0] || '';
  const underscoreDelimiter = openingDelimiter.match(/_+/)?.[0] || '';
  const underscoreStyles = getUnderscoreStyles(underscoreDelimiter);

  return {
    italic: underscoreStyles.italic || undefined,
    medium: starDelimiter.length === 1 || undefined,
    semibold: starDelimiter.length === 2 || starDelimiter.length === 3 || undefined,
    strikethrough: openingDelimiter.includes(STRIKETHROUGH_STYLE_DELIMITER) || undefined,
    text,
    underline: underscoreStyles.underline || undefined,
  };
}

/*
 * Parse one style token from the label markdown delimiter set.
 */
export function parseLabelMarkdownStyleToken(matchedStr: string): LabelMarkdownPart | null {
  for (const delimiters of STYLE_MARKDOWN_DELIMITER_SETS) {
    const stylePart = getDelimitedLabelMarkdownPart(
      matchedStr,
      delimiters.join(''),
      [...delimiters].reverse().join(''),
    );

    if (stylePart) {
      return stylePart;
    }
  }

  return null;
}

/*
 * Parse one label-markdown token into a shareable render model.
 */
export function parseLabelMarkdownToken(matchedStr: string): LabelMarkdownPart {
  const spanMatch = matchedStr.match(LABEL_MARKDOWN_SPAN_REGEX);
  if (spanMatch) {
    return {
      className: spanMatch[1],
      text: spanMatch[2],
    };
  }

  return parseLabelMarkdownStyleToken(matchedStr) || { text: matchedStr };
}

/*
 * Return the CSS class list used by DOM Markdown for one label-markdown part.
 */
export function getLabelMarkdownPartClassName(part: Pick<LabelMarkdownPart, 'className' | 'medium' | 'semibold' | 'strikethrough' | 'underline'>) {
  return [
    part.className,
    part.medium ? 'ft_medium' : '',
    part.semibold ? 'ft_semibold' : '',
    part.underline ? 'u' : '',
    part.strikethrough ? 'strikethrough' : '',
  ].filter(Boolean).join(' ') || null;
}

/*
 * Return the DOM element name used by DOM Markdown for one label-markdown part.
 */
export function getLabelMarkdownPartElement(part: Pick<LabelMarkdownPart, 'italic'>) {
  return part.italic ? 'i' : 'span';
}

/*
 * Parse label-preset markdown text into plain and styled text parts.
 */
export function parseLabelMarkdownText(text: string): LabelMarkdownPart[] {
  const parts: LabelMarkdownPart[] = [];
  const regex = new RegExp(LABEL_MARKDOWN_REGEX.source, LABEL_MARKDOWN_REGEX.flags);
  let match: RegExpExecArray | null;
  let strPos = 0;

  while ((match = regex.exec(text)) !== null) {
    const matchedStr = match[0];
    const start = match.index;
    const end = match.index + matchedStr.length;

    if (start > strPos) {
      parts.push({ text: text.substring(strPos, start) });
    }

    parts.push(parseLabelMarkdownToken(matchedStr));
    strPos = end;
  }

  if (!parts.length) {
    return [{ text }];
  }

  if (text.length > strPos) {
    parts.push({ text: text.substring(strPos) });
  }

  return parts;
}
