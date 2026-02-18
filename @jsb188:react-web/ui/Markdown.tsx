import { Fragment, memo, useMemo, useState } from 'react';

import { nameToEmoji } from '@jsb188/app/constants/emoji.ts';
import i18n from '@jsb188/app/i18n/index.ts';
import parseEmojiText from '@jsb188/app/utils/emoji.ts';
import { randomItem } from '@jsb188/app/utils/object.ts';
import { cn } from '@jsb188/app/utils/string.ts';
import { makeUploadsUrl } from '@jsb188/app/utils/url_client.ts';
import type { ReactSpanElement } from '../types/dom.d';

/**
 * Regex pattern for all presets
 */

const PRESET_REGEX = {
  // message: /\*([^*]+)\*|_(.*?)_/g
  // article: /^#+([^#]+) |\*+([^*]+)\*+|_+([^_]+)_+|:([^: ])+:/gmi,
  // article: /^#.*|\*+([^*]+)\*+|_+([^_]+)_+|:([^: ])+:/gmi,
  // content_description: /\*+([^*]+)\*+|_+([^_]+)_+|:([^: ])+:|\[+([^[\]]+)\]+/gi, // More regex needs to be added for this
  // message: /\*+([^*]+)\*+|_+([^_]+)_+|:([^: ])+:/gi, // I'm not sure what the difference is between "message" and "chat"
  // chat: /\*+([^*]+)\*+|_+([^_]+)_+|:([^: ])+:/gi,

  // article: /^#.*|\*+([^*\n]+)\*+|\b_+([^_\n]+)_+\b|:([^:\n ])+:/gmi,
  article: /^#.*|\*+([^*\n]+)\*+|\b_+([^_\n]+)_+\b|^- .+$|:([^:\n ])+:|\[(.*?)##(.*?)\]/gmi,
  content_description: /\[hl\]([\s\S]*?)\[\/hl\]|\*+([^*\n]+)\*+|\b_+([^_\n]+)_+\b|:([^:\n ])+:|\[+([^[\]\n]+)\]+/gi, // More regex needs to be added for this
  message: /\*+([^*\n]+)\*+|\b_+([^_\n]+)_+\b|^- .+$|:([^:\n ])+:/gi,

  // NOTE: Next time you do mobile, check if this regex works in mobile
  // I added ":emoji_style:" tags to the regex
  prompt: /\*+([^*\n]+)\*+|\b_+([^_\n]+)_+\b|:([^:\n ])+:/gi,
} as Record<string, RegExp>;

type MarkdownPreset = keyof typeof PRESET_REGEX;

const TAG_REGEX = /{{(.*?)}}|%{(.*?)}/gmi;
const HIGHLIGHT_TAG_REGEX = /^\[hl\]([\s\S]*?)\[\/hl\]$/i;
const SPAN_MARKUP_REGEX = /^\[(.*?)##(.*?)\]$/;
const HEADING_DOM_MAP = {
  '#': 'h1',
  '##': 'h2',
  '###': 'h3',
} as const;

// NOTE: All regex that needs innner regex must be named here
const TAG_REGEX_PRESETS = ['prompt'];

/**
 * Parse dynamic random tags for supported presets.
 */

const parsePresetTags = (text: string, needsTagRegex: boolean) => {
  if (!needsTagRegex) {
    return text;
  }

  return text.replace(TAG_REGEX, (matchedStr: string) => {
    const letter = matchedStr.charAt(0);
    if (letter === '{') {
      const word = matchedStr.substring(2, matchedStr.length - 2)
        .toLowerCase();
      const matchWord = {
        ai: 'AI',
        kaji: 'AI',
        hu: 'User',
        user: 'User',
      }[word as string];

      if (matchWord) {
        return matchWord;
      }
      return [randomItem(word.split('|'))];
    } else if (letter === '%') {
      if (matchedStr.startsWith('%{') && matchedStr.endsWith('}')) {
        const word = matchedStr.substring(2, matchedStr.length - 1)
          .toLowerCase();
        return randomItem(word.split('|'));
      }
    }
    return matchedStr;
  });
};

/**
 * Split markdown text into paragraphs per preset rules.
 */

const splitMarkdownParagraphs = (
  text: string,
  noWrap: boolean | undefined,
  preset: MarkdownPreset,
) => {
  if (noWrap) {
    return [text];
  }

  let paragraphTexts = (text.split(/\n{2,}|(?=^- )/gm) || []).filter(Boolean);

  if (preset === 'article') {
    paragraphTexts = paragraphTexts.reduce((acc: string[], str: string) => {
      const isHeading = /^#.* /.test(str);
      if (isHeading) {
        return acc.concat(str.split('\n'));
      }
      return acc.concat(str);
    }, []).filter(Boolean);
  }

  return paragraphTexts;
};

/**
 * Parse a single paragraph into markdown fragments.
 */

const parseMarkdownParagraph = (
  text: string,
  preset: MarkdownPreset,
  fullText: string,
  codeUriMap?: Map<string, string>,
  MappedCodeComponent?: RenderMappedCodeFn,
  as?: React.ElementType,
) => {
  const regex = PRESET_REGEX[preset];
  if (!regex) {
    return text;
  }

  const arr = [];
  let match;
  let strPos = 0;
  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const matchedStr = match[0];
    const start = match.index;
    const end = match.index + matchedStr.length;
    const strLen = start - strPos;

    if (strLen > 0) {
      const str1 = text.substring(strPos, start);
      arr.push([str1]);
    }

    arr.push(getMarkdownEl(matchedStr, fullText, codeUriMap, MappedCodeComponent, as));
    strPos = end;
  }

  if (!arr.length) {
    return text;
  }

  if (text.length > strPos) {
    const str2 = text.substring(strPos);
    arr.push([str2]);
  }

  return arr;
};


/**
 * Parse text with links into <a> tags.
 * @param {string} text - The text to parse.
 * @param {string} [linkClassName] - Optional class name for the <a> tags.
 * @returns {string} - The parsed text with <a> tags.
 * @example
 * const text = "Check out [Google](https://www.google.com) and [GitHub](https://github.com).";
 */

export function parseTextWithLinks(text: string,  linkClassName?: string) {
  return text.replace(/\[(.*?)\]\((.*?)\)/g, (_, text, link) => {
    const [url, target, rel] = link.split(',');
    const hasRel = !!rel || url.startsWith('http');

    return (
      '<a ' +
        `href="${url}"` +
        (linkClassName ? ` class="${linkClassName}"` : '') +
        (target ? ` target="${target}"` : '') +
        (hasRel ? ` rel="${rel || 'noopener noreferrer'}"` : '') +
      '>' +
        text +
      '</a>'
    );
  });
}

/**
 * Text with links.
 * Always use this for printing texts that has links.
 */

interface TextWithLinksProps {
  as: React.ElementType;
  children: string;
  className?: string;
  linkClassName?: string;
}

export const TextWithLinks = memo((p: TextWithLinksProps) => {
  const { as, children, className, linkClassName, ...other } = p;
  const Component = as || 'span';

  return <Component
    {...other}
    className={className}
    dangerouslySetInnerHTML={{ __html: parseTextWithLinks(children, linkClassName) }}
  />;
});

TextWithLinks.displayName = 'TextWithLinks';

/**
 * Helper; convert text with emoji short code to emoji text
 */

export const getEmojiText = (text: string) => {
  const emojiRegex = /:([a-zA-Z0-9_]+):/g;
  const emojiText = text.replace(emojiRegex, (matchedStr) => {
    const emoji = nameToEmoji[ matchedStr.substring(1, matchedStr.length - 1).toLowerCase().trim() ];
    return emoji || matchedStr;
  });

  return emojiText;
};

/**
 * Convert emojis to emoji fonts
 */

type EmojiWrapperProps = {
  children: string;
  preset?: '3D' | 'Color' | 'Flat' | 'High Contrast';
  emojiClassName?: string;
  allowBigEmojis?: boolean;
};

export function EmojiWrapper(p: EmojiWrapperProps) {
  const { children, emojiClassName, allowBigEmojis } = p;
  const preset = p.preset || '3D'; // Only non-aimated 3D is supported right now
  // const ref = useRef(`el-${Math.round(Math.random() * 1000)}-${Date.now()}`);

  const { chunks, isEmojiOnly } = useMemo(() => {
    const result = parseEmojiText(children, preset);
    return result;
  }, [children]);

  return chunks.map((chunk, i) => {
    if (typeof chunk === 'string') {
      // Everything must be wrapped in <span> because..
      // When users use Google translate to translate the browser,
      // It causes dynamic text changes to crash the app.
      return <span key={i}>{chunk}</span>;
    } else if (Array.isArray(chunk)) {
      const [, , text] = chunk as string[];

      return <span
        className={cn(
          'noto_emoji',
          // 'emoji',
          emojiClassName,
          allowBigEmojis && isEmojiOnly ? 'big-emoji' : '',
        )}
        key={i}
      >
        {text}
        {/* <Emoji url={url} text={text} /> */}
      </span>;
    }

    return null;
  });
}

/**
 * Parse heading markdown tokens.
 */

const getHeadingEl = (matchedStr: string) => {
  const [prefix, ...headingTextArr] = matchedStr.split(' ');
  const headingText = headingTextArr.join(' ');
  const dom = HEADING_DOM_MAP[prefix as keyof typeof HEADING_DOM_MAP];

  if (dom && headingText) {
    return [headingText, '', null, dom];
  }

  return null;
};

/**
 * Parse list markdown tokens.
 */

const getListEl = (matchedStr: string, as?: React.ElementType) => {
  return [
    matchedStr.substring(2),
    'ul_li',
    'span',
    as || 'div',
    true
  ];
};

/**
 * Parse asterisk markdown tokens.
 */

const getAsteriskEl = (matchedStr: string) => {
  // Keep this exact edge case for backwards compatibility.
  if (matchedStr === '****') {
    return [matchedStr];
  }

  if (
    matchedStr.startsWith('**') &&
    matchedStr.endsWith('**') &&
    matchedStr.length > 4
  ) {
    return [
      matchedStr.substring(2, matchedStr.length - 2),
      'ft_semibold',
      'span'
    ];
  }

  return [
    matchedStr.substring(1, matchedStr.length - 1),
    'ft_medium cl_primary'
  ];
};

/**
 * Parse code map and emoji markdown tokens.
 */

const getCodeOrEmojiEl = (
  matchedStr: string,
  fullText: string,
  codeUriMap?: Map<string, string>,
  MappedCodeComponent?: RenderMappedCodeFn,
) => {
  const mappedCodeUri = codeUriMap?.get(matchedStr);

  if (mappedCodeUri || (MappedCodeComponent && codeUriMap?.has(matchedStr))) {
    if (MappedCodeComponent) {
      return <MappedCodeComponent code={matchedStr} imageUri={mappedCodeUri} fullText={fullText} />;
    }

    return <img
      className='md_img'
      src={makeUploadsUrl(mappedCodeUri, 'small', true) as string}
      alt={matchedStr}
    />;
  }

  const emojiName = matchedStr.substring(1, matchedStr.length - 1).toLowerCase().trim();
  const emoji = nameToEmoji[emojiName];
  if (emoji) {
    return [emoji];
  }

  return null;
};

/**
 * Parse bracket markdown tokens.
 */

const getBracketEl = (matchedStr: string) => {
  const highlightMatch = matchedStr.match(HIGHLIGHT_TAG_REGEX);
  if (highlightMatch) {
    return (
      <span className='em_text'>
        <span className='rel z1'>
          {highlightMatch[1]}
        </span>
      </span>
    );
  }

  // [spanClassName, text]
  const spanMatch = matchedStr.match(SPAN_MARKUP_REGEX);
  if (spanMatch) {
    return [spanMatch[2], spanMatch[1]];
  }

  return [matchedStr.substring(1, matchedStr.length - 1)];
};

/**
 * Find style for Markdown
 */

const getMarkdownEl = (
  matchedStr: string,
  fullText: string,
  codeUriMap?: Map<string, string>,
  MappedCodeComponent?: RenderMappedCodeFn,
  as?: React.ElementType,
) => {

  const letter = matchedStr[0];
  switch (letter) {
    case '#': {
      const headingEl = getHeadingEl(matchedStr);
      if (headingEl) {
        return headingEl;
      }
      break;
    }
    case '-':
      return getListEl(matchedStr, as);
    case '*':
      return getAsteriskEl(matchedStr);
    case '_': {
      const str2 = matchedStr.substring(1, matchedStr.length - 1);
      return [str2, null, 'i'];
    }
    case ':': {
      const codeOrEmojiEl = getCodeOrEmojiEl(matchedStr, fullText, codeUriMap, MappedCodeComponent);
      if (codeOrEmojiEl) {
        return codeOrEmojiEl;
      }
      break;
    }
    case '[':
      return getBracketEl(matchedStr);
    default:
  }

  return [matchedStr];
};

/**
 * Markdown; text chunks
 */

interface MarkdownTextProps {
  as?: React.ElementType;
  noWrap?: boolean;
  className?: string;
  children: string;
}

// const DONE = [];

function MarkdownText(p: MarkdownTextProps) {
  const { as: Element, noWrap, className, children } = p;

  if (typeof children !== 'string') {
    console.warn(
      '<MarkdownText /> children must be a string, it was: ' + children,
    );
    return null;
  }

  if (!noWrap) {
    const lines = children.split(/\r?\n/);

    // Do URL's here

    const lastPos = lines.length - 1;
    const linesCmp = lines.map((text, n) => (
      <Fragment key={n}>
        <EmojiWrapper>
          {text}
        </EmojiWrapper>
        {lastPos === n ? null : <br />}
      </Fragment>
    ));

    if (Element) {
      return (
        <Element className={className}>
          {linesCmp}
        </Element>
      );
    } else {
      // Everything must be wrapped in <span> because..
      // When users use Google translate to translate the browser,
      // It causes dynamic text changes to crash the app.
      return (
        <span className={className}>
          {linesCmp}
        </span>
      );
    }

    // const frontBR = /^(?:\r\n|\r|\n)/.test(children) ? <br /> : null;
    // const endBR = /(?:\r\n|\r|\n)$/.test(children) ? <br /> : null;

    // // Do URL's here

    // if (El) {
    //   return <El className={className}>
    //     {frontBR}
    //     {children}
    //     {endBR}
    //   </El>;
    // } else if (className) {
    //   return <span className={className}>
    //     {frontBR}
    //     {children}
    //     {endBR}
    //   </span>;
    // } else if (frontBR || endBR) {
    //   return <>
    //     {frontBR}
    //     {children}
    //     {endBR}
    //   </>;
    // }
  }

  // Everything must be wrapped in <span> because..
  // When users use Google translate to translate the browser,
  // It causes dynamic text changes to crash the app.
  return <span>{children}</span>;
}

/**
 * Emoji Text
 */

function EmojiTextCmp(p: EmojiTextProps) {
  const { children, El, ...other } = p;
  const EmojiTextEl = El || 'span';

  return (
    <EmojiTextEl {...other}>
      <MarkdownText>
        {children}
      </MarkdownText>
    </EmojiTextEl>
  );
}

EmojiTextCmp.displayName = 'EmojiTextCmp';

/**
 * Emoji Text wrapper to prevent crashes (in Android)
 */

interface EmojiTextProps extends ReactSpanElement {
  children: string;
  El: React.ElementType;
}

export const EmojiText = (p: EmojiTextProps) => {
  return <EmojiTextCmp {...p} key={String(p.children)} />;
};

EmojiText.displayName = 'EmojiText';

/**
 * Markdown
 */

function MarkdownCmp(p: MarkdownProps) {
  const {
    children,
    color,
    size,
    lightMode,
    noWrap,
    preset: preset_,
    as,
    newLineAs,
    codesMap,
    MappedCodeComponent,
    LastComponent,
    ...other
  } = p;

  const Element = as || 'div';
  const NewLineElement = newLineAs || 'span';
  const preset = preset_ || 'message';
  const needsTagRegex = TAG_REGEX_PRESETS.includes(preset);

  // console.log('children');
  // console.log('children');
  // console.log('children');
  // console.log('children');
  // console.log(children);

  // const doLog = p.doLog;
  // const doLog = children === ':wave:';
  // const doLog = children?.indexOf('Test. This is a very long reply test.') === 0;

  const mdText = useMemo(() => {
    if (typeof children !== 'string') {
      console.warn('<Markdown /> children must be a string, it was: ' + children);
      return '';
    }

    return parsePresetTags(children || '', needsTagRegex);
  }, [children, needsTagRegex]);

  /**
   * Precompute code lookup table to avoid O(n) scans per token.
   */
  const codeUriMap = useMemo(() => {
    if (!codesMap?.length) {
      return undefined;
    }

    return new Map(codesMap);
  }, [codesMap]);

  const paragraphs = useMemo(() => {
    const paragraphTexts = splitMarkdownParagraphs(mdText || '', noWrap, preset);
    return paragraphTexts.map((text) => parseMarkdownParagraph(
      text,
      preset,
      mdText || '',
      codeUriMap,
      MappedCodeComponent,
      as,
    ));
  }, [as, codeUriMap, MappedCodeComponent, mdText, noWrap, preset]);

  // if (p.doLog) {
  //   paragraphs.map(x => x.split('\n').map(xx => console.log('|' + xx + '|')));
  // }
  // console.log(paragraphs);
  const paraLen = paragraphs.length;
  const endOfListPos = paraLen - 1;

  if (!paraLen) {
    return LastComponent || null;
  }

  // console.log('paragraphs');
  // console.log(paragraphs);
  // console.log(paragraphs[endOfListPos]);

  return paragraphs.map((
    mds: any,
    n: number
  ) => {

    // Lazy typing:
    // mds = [
    //   string?, // [0] text
    //   string?, // [1] className
    //   React.ElementType?, // [2] as
    //   React.ElementType?, // [3] Block element
    //   boolean? // [4] isBlock - this is a blocked markdown syntax, setting it to "true" will prevent double wrapping
    // ][];

    const isParts = Array.isArray(mds);
    const lastMdPos = isParts && (mds.length - 1);
    const isBlockedMD = isParts && mds[0][4];
    const Block = ((isParts || isBlockedMD) && mds[0][3]) || Element;
    const isEndOfList = n === endOfListPos;

    return (
      <Block
        key={n}
        {...other}
        className={isBlockedMD ? mds[0][1] : other.className}
      >
        {typeof mds === 'string'
          ? (
            <MarkdownText noWrap={noWrap}>
              {mds.trim()}
            </MarkdownText>
          )
          : mds.map((md: string[] | React.ReactNode, i: number) => {
            if (!Array.isArray(md)) {
              return <Fragment key={i}>
                {md}
              </Fragment>;
            }

            const fragmentText = lastMdPos === i && typeof md[0]?.trimEnd === 'function' ? md[0].trimEnd() : md[0];
            if (!fragmentText) {
              // Do not trim() here; sometimes empty spaces are necessary;
              // ie. between RP markdowns and %{a|b|c}
              return null;
            }

            return (
              <MarkdownText
                key={i}
                noWrap={noWrap}
                // doLog={doLog}
                className={isBlockedMD ? undefined : md[1]}
                as={md[2] as React.ElementType || NewLineElement}
              >
                {fragmentText}
              </MarkdownText>
            );
          })
        }

        {isEndOfList && <>
          {
            // This allows CSS :second-child to work
            // Also when paragraph is a single "string", :first-child should not be applied
            // and this allows that to happen.
            typeof paragraphs[endOfListPos] === 'string' && <span />
          }
          {LastComponent}
        </>}
      </Block>
    );
  });
}

// MarkdownCmp.propTypes = {
//   children: PropTypes.string,
//   noWrap: PropTypes.bool, // Used to allow single line for .ellip style
//   preset: PropTypes.oneOf(Object.keys(PRESET_REGEX)),
// };

/**
 * Types
 */

export type RenderMappedCodeFn = (p: {
  code: string;
  imageUri?: string;
  fullText: string;
}) => React.ReactNode;

type MarkdownProps = Partial<{
  children: string;
  className: string;
  color: string;
  size: string;
  lightMode: boolean;
  noWrap: boolean;
  preset: MarkdownPreset;
  as: React.ElementType;
  newLineAs: string;
  codesMap: [string, string][]; // [code, imageUri]
  MappedCodeComponent: RenderMappedCodeFn;
  LastComponent: React.ReactNode;
}>;

/**
 * Markdown wrapper to prevent crashes (in Android)
 */

function Markdown(p: MarkdownProps) {
  return <MarkdownCmp {...p} key={String(p.children)} />;
}

Markdown.displayName = 'Markdown';

/**
 * Markdown with "read more"
 */

export const MarkdownReadMore = memo((p: MarkdownProps & {
  ReadMoreComponent?: React.ElementType;
  readMoreText?: string;
  summaryLength?: number;
}) => {
  const { ReadMoreComponent, children, summaryLength = 300, readMoreText, ...other } = p;
  const text = children || '';
  const [showAll, setShowAll] = useState(false);

  if (text.length <= summaryLength || showAll) {
    return <Markdown {...other}>
      {text}
    </Markdown>;
  }

  const ReadMoreEl = ReadMoreComponent || 'button';

  return <>
    <Markdown {...other}>
      {text.substring(0, summaryLength).trimEnd() + '...'}
    </Markdown>

    <ReadMoreEl onClick={() => setShowAll(true)} className='link cl_secondary bd_b_5 bd_main'>
      {readMoreText || i18n.t('form.read_more')}
    </ReadMoreEl>
  </>;
});


export default Markdown;
