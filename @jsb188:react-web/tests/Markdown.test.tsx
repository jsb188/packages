import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import Markdown, { parseTextWithLinks } from '../ui/Markdown';

type MarkdownProps = Parameters<typeof Markdown>[0];

/*
 * Normalize rendered markup so string assertions are stable across formatting differences.
 */
function normalizeHtml(html: string) {
  return html.replace(/\s+/g, ' ').trim();
}

/*
 * Count regex matches in a rendered markup string.
 */
function countMatches(text: string, regex: RegExp) {
  return text.match(regex)?.length || 0;
}

/*
 * Render Markdown into static HTML for snapshot-free assertions.
 */
function renderMarkdown(children: string, props: MarkdownProps = {}) {
  return normalizeHtml(
    renderToStaticMarkup(
      createElement(Markdown, {
        ...props,
        children,
      }),
    ),
  );
}

describe('parseTextWithLinks', () => {
  it('renders markdown links into anchor tags', () => {
    const html = parseTextWithLinks(
      'Read [docs](https://example.com,_blank) and [profile](/profile).',
    );

    expect(html).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">docs</a>',
    );
    expect(html).toContain('<a href="/profile">profile</a>');
  });
});

describe('Markdown', () => {
  it('groups consecutive list lines into a single list wrapper', () => {
    const html = renderMarkdown('- First item\n- Second item\n\nTail paragraph');

    expect(countMatches(html, /class="ul"/g)).toBe(1);
    expect(countMatches(html, /class="ul_li"/g)).toBe(2);
    expect(html).toContain('First item');
    expect(html).toContain('Second item');
    expect(html).toContain('Tail paragraph');
  });

  it('keeps inline markdown formatting inside list items', () => {
    const html = renderMarkdown('- **Bold** and _italic_');

    expect(html).toContain('class="ft_semibold"');
    expect(html).toContain('<i>');
    expect(html).toContain('Bold');
    expect(html).toContain('italic');
  });

  it('renders article headings as standalone heading blocks', () => {
    const html = renderMarkdown('# Heading line\nBody paragraph', {
      as: 'section',
      preset: 'article',
    });

    expect(countMatches(html, /<h1>/g)).toBe(1);
    expect(countMatches(html, /<section>/g)).toBe(1);
    expect(html).toContain('Heading line');
    expect(html).toContain('Body paragraph');
    expect(html.indexOf('<h1>')).toBeLessThan(html.indexOf('<section>'));
  });

  it('renders highlight tags for content description preset', () => {
    const html = renderMarkdown('[hl]Important[/hl]', {
      preset: 'content_description',
    });

    expect(html).toContain('class="em_text"');
    expect(html).toContain('Important');
  });
});
