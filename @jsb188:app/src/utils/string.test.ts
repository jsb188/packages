import { beforeAll, describe, expect, it } from 'vitest';

import { configI18n } from '../main.ts';
import {
  addIndefiniteArticle,
  buildSingleText,
  camelCaseToDash,
  cn,
  convertToInternationalPhone,
  escapeCSVValue,
  formatPhoneNumber,
  formatReferenceNumber,
  getAlphanumeric,
  getDisplayName,
  getNthString,
  getSearchNames,
  guessFirstName,
  isEmail,
  isInvisibleString,
  isPhone,
  joinReadable,
  makeAddressText,
  passwordStrength,
  regexFromText,
  removeGeneratedTextGarbage,
  shortenToParagraph,
  shortenToSpace,
  splitTextIntoChunks,
  textWithBrackets,
  truncateFileName,
  ucFirst,
} from './string.ts';

beforeAll(() => {
  configI18n();
});

describe('cn', () => {
  it('joins truthy class names with spaces', () => {
    expect(cn('card', false, 'selected', undefined, null, '')).toBe('card selected');
  });
});

describe('shortenToSpace', () => {
  it('shortens at the last available space before the limit', () => {
    expect(shortenToSpace('alpha beta gamma', 12)).toBe('alpha beta...');
  });

  it('falls back to a hard cut when no spaces exist', () => {
    expect(shortenToSpace('alphabetagamma', 5)).toBe('alpha...');
  });
});

describe('guessFirstName', () => {
  it('drops leading articles and returns the first meaningful word', () => {
    expect(guessFirstName('the quick brown fox')).toBe('quick');
  });

  it('keeps short names instead of stripping the full word as an article suffix', () => {
    expect(guessFirstName('An Lee')).toBe('Lee');
  });
});

describe('addIndefiniteArticle', () => {
  it('handles silent-h and consonant-sounding vowel exceptions', () => {
    expect(addIndefiniteArticle('honest answer')).toBe('an honest answer');
    expect(addIndefiniteArticle('user')).toBe('a user');
  });
});

describe('isEmail', () => {
  it('accepts trimmed valid emails and rejects malformed values', () => {
    expect(isEmail('  hello@example.com  ')).toBe(true);
    expect(isEmail('hello@example')).toBe(false);
  });
});

describe('convertToInternationalPhone and isPhone', () => {
  it('normalizes North American and existing international numbers', () => {
    expect(convertToInternationalPhone('(555) 123-4567')).toBe('+15551234567');
    expect(convertToInternationalPhone('+44 20 1234 5678')).toBe('+442012345678');
  });

  it('rejects invalid phone-like input', () => {
    expect(convertToInternationalPhone('05551234567')).toBeNull();
    expect(convertToInternationalPhone('555-abc-1234')).toBeNull();
  });

  it('supports optional conversion when validating phone numbers', () => {
    expect(isPhone('5551234567')).toBe(true);
    expect(isPhone('5551234567', true)).toBe(false);
    expect(isPhone('+442012345678', true)).toBe(true);
  });
});

describe('passwordStrength', () => {
  it('reports rule-by-rule password strength details', () => {
    expect(passwordStrength('Abcdef1!')).toEqual({
      valid: true,
      isLongEnough: true,
      hasLowercase: true,
      hasUppercase: true,
      hasDigit: true,
      hasSpecial: true,
    });

    expect(passwordStrength('abcdefg')).toMatchObject({
      valid: false,
      isLongEnough: false,
      hasLowercase: true,
      hasUppercase: false,
      hasDigit: false,
      hasSpecial: false,
    });
  });
});

describe('getAlphanumeric and getSearchNames', () => {
  it('removes punctuation while optionally preserving spaces', () => {
    expect(getAlphanumeric('A-B_C!', false)).toBe('ABC');
    expect(getAlphanumeric('A-B_C!', true)).toBe('ABC');
  });

  it('splits mixed delimiters and keeps case-insensitive unique names', () => {
    expect(getSearchNames(['Alice, Bob and alice', 'Carol;\nBob', null])).toEqual([
      'Alice',
      'Bob',
      'Carol',
    ]);
  });
});

describe('regexFromText', () => {
  it('builds a case-insensitive regex from cleaned words', () => {
    const regex = regexFromText('Hello, world!');

    expect(regex).not.toBeNull();
    expect('say hello there'.match(regex!)).toEqual(['hello']);
    expect('WORLD tour'.match(regex!)).toEqual(['WORLD']);
  });

  it('returns null when no searchable words remain', () => {
    expect(regexFromText('a !')).toBeNull();
  });
});

describe('ucFirst and camelCaseToDash', () => {
  it('formats capitalization and dash-separated names', () => {
    expect(ucFirst('marketday')).toBe('Marketday');
    expect(camelCaseToDash('camelCase2Value')).toBe('camel-case-2-value');
    expect(camelCaseToDash('API')).toBe('api');
  });
});

describe('shortenToParagraph', () => {
  it('uses paragraph boundaries before falling back to word trimming', () => {
    const text = 'First line\nSecond line\nThird line';

    expect(shortenToParagraph(text, 18)).toBe('First line');
    expect(shortenToParagraph('Alpha beta gamma', 10)).toBe('Alpha...');
  });
});

describe('isInvisibleString', () => {
  it('detects strings made only from whitespace-like invisible characters', () => {
    expect(isInvisibleString('ㅤ️⠀')).toBe(true);
    expect(isInvisibleString(' visible ')).toBe(false);
  });
});

describe('buildSingleText', () => {
  it('supports feature maps, conditional lines, first-match groups, and blank line collapsing', () => {
    expect(
      buildSingleText(
        [
          'Header',
          '',
          '',
          { advanced: ['Advanced section'] },
          [['beta', '!legacy'], ['Beta only']],
          [
            [['admin'], ['Admin choice']],
            [['member'], ['  Member choice']],
            [['!member'], ['Fallback choice']],
          ],
          'Footer',
        ],
        '\n',
        ['advanced', 'beta', 'member'],
      ),
    ).toBe('Header\n\nAdvanced section\nBeta only\nMember choice\nFooter');
  });
});

describe('joinReadable and textWithBrackets', () => {
  it('joins human-readable lists and appends bracket text when present', () => {
    expect(joinReadable(['Alpha', 'Beta', 'Gamma'])).toBe('Alpha, Beta and Gamma');
    expect(textWithBrackets('Status', ['draft', 'internal'], ['[', ']'])).toBe('Status [draft internal]');
    expect(textWithBrackets('', ['draft', 'internal'], ['[', ']'])).toBe('draft internal');
  });
});

describe('removeGeneratedTextGarbage and escapeCSVValue', () => {
  it('normalizes generated whitespace and escapes CSV-sensitive values', () => {
    expect(removeGeneratedTextGarbage('Hello\n\n world\tfrom\r\nAI')).toBe('Hello world from AI');
    expect(escapeCSVValue('plain')).toBe('plain');
    expect(escapeCSVValue('a,"b"\nc')).toBe('"a,""b""\nc"');
  });
});

describe('truncateFileName', () => {
  it('preserves extensions while truncating long file names', () => {
    expect(truncateFileName('very-long-document-name.pdf', 12)).toBe('very-....pdf');
    expect(truncateFileName('short.txt', 20)).toBe('short.txt');
  });
});

describe('formatPhoneNumber', () => {
  it('formats trailing 10 digits into a readable North American phone number', () => {
    expect(formatPhoneNumber('+15551234567')).toBe('+1 (555) 123-4567');
    expect(formatPhoneNumber('5551234567')).toBe('(555) 123-4567');
    expect(formatPhoneNumber('not-a-phone')).toBe('not-a-phone');
  });
});

describe('splitTextIntoChunks', () => {
  it('prefers nearby line breaks when splitting long text', () => {
    expect(splitTextIntoChunks('12345\n67890\nabcde', 10, 5)).toEqual([
      '12345',
      '67890',
      'abcde',
    ]);
  });

  it('falls back to whitespace boundaries when no line break is nearby', () => {
    expect(splitTextIntoChunks('alpha beta gamma delta', 12, 2)).toEqual([
      'alpha beta',
      'gamma delta',
    ]);
  });
});

describe('formatReferenceNumber and getNthString', () => {
  it('formats numeric references and ordinal suffixes', () => {
    expect(formatReferenceNumber('42')).toBe('#42');
    expect(formatReferenceNumber('abc')).toBe('abc');
    expect(getNthString(1)).toBe('1st');
    expect(getNthString(2)).toBe('2nd');
    expect(getNthString(3)).toBe('3rd');
    expect(getNthString(11)).toBe('11th');
    expect(getNthString(23)).toBe('23rd');
  });
});

describe('makeAddressText and getDisplayName', () => {
  it('formats addresses in each supported display mode', () => {
    const address = {
      line1: '1 Main St',
      line2: 'Suite 2',
      city: 'Toronto',
      state: 'ON',
      postalCode: 'A1A 1A1',
      country: 'CA',
    };

    expect(makeAddressText(address, 'REGION_ONLY')).toBe('Toronto, ON, CA');
    expect(makeAddressText(address, 'SINGLE_LINE', true)).toBe(
      '1 Main St, Suite 2, Toronto, ON, A1A 1A1, Canada',
    );
    expect(makeAddressText(address)).toBe(
      '1 Main St\nSuite 2\nToronto, ON A1A 1A1\nCA',
    );
  });

  it('builds a full name and short display name together', () => {
    expect(getDisplayName('John', 'Smith')).toEqual({
      fullName: 'John Smith',
      displayName: 'John',
    });
  });
});
