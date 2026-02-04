import { makeUploadsUrl } from '@jsb188/app/utils/url_client.ts';
import type { RefObject } from 'react';
import { useEffect, useCallback, useRef, useState } from 'react';
import { getTextFromDOMElement, isTypingKey, pasteTextAtCaret, updateInnerHTMLRepositionCaret } from '../utils/dom';

/**
 * Types
 */

export interface MappedImageCodesObj {
  regex: RegExp;
  dict: Record<string, string>;
}

/**
 * Helper; make inner HTML
 */

export function makeInnerHTML(rawText: string | null, mappedImageCodes?: MappedImageCodesObj): string {
  if (!rawText) {
    return rawText || '';
  }

  const htmlSafeText = rawText.replace(/>/g, '&gt;').replace(/</g, '&lt;');
  if (mappedImageCodes) {
    return htmlSafeText.replace(mappedImageCodes.regex, (match) => {
      const stickerPhotoUri = mappedImageCodes.dict[match];
      // Not using self-closing "/>" syntax because that's a React convention;
      // In real JS generated DOM, it does not self-close.
      return `<img src="${makeUploadsUrl(stickerPhotoUri, 'tiny')}" alt="${match}" class="cm_sticker">`;
    });
  }
  return htmlSafeText;
}

/**
 * Helper; mutate text, and return mutated text if different
 */

function getMutatedTextIfDifferent(
  textContent: string,
  currentHTML: string,
  mappedImageCodes?: MappedImageCodesObj
): string | null {
  const mutatedInnerHTML = makeInnerHTML(textContent, mappedImageCodes);
  const mutatedHTMLStripped = mutatedInnerHTML.replace(/\<(.*?)\>/g, '').trim();
  const currentHTMLStripped = currentHTML.replace(/\<(.*?)\>/g, '').trim();

  return mutatedHTMLStripped !== currentHTMLStripped ? mutatedInnerHTML : null;
}

/**
 * Use contentEditable element hook
 */

interface ContentEditableParams {
  mappedImageCodes?: MappedImageCodesObj;
  handleTyping?: (currentText: string) => void;
  handleTextChange?: (currentText: string) => void;
  handleSubmit?: (submitText: string) => void;
}

interface ContentEditableHandlers {
  htmlText: string;
  setHtmlText: (htmlText: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onKeyUp: (e: React.KeyboardEvent) => void;
  onInput: (e: React.FormEvent) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onSubmit: () => void;
}

type UseContentEditableOutput = [
  RefObject<HTMLDivElement | null>,
  RefObject<string>,
  ContentEditableHandlers
];

export function useContentEditable(
  params: ContentEditableParams
): UseContentEditableOutput {

  const { mappedImageCodes, handleTyping, handleTextChange, handleSubmit } = params;
  const textRef = useRef(''); // This has to be a ref, otherwise paste events will not work
  const textElRef = useRef<HTMLDivElement | null>(null);
  const handlersRef = useRef({ backspace: false, mappedImageCodes, typing: handleTyping, textChange: handleTextChange, submit: handleSubmit });
  const [htmlText, setHtmlText] = useState(() => makeInnerHTML(textRef.current, mappedImageCodes)); // Doing () => {} makes state compute only once

  useEffect(() => {
    handlersRef.current = {
      backspace: handlersRef.current.backspace,
      mappedImageCodes,
      typing: handleTyping,
      textChange: handleTextChange,
      submit: handleSubmit
    };
  }, [mappedImageCodes, handleTyping, handleTextChange, handleSubmit]);

  const onSubmit = () => {
    const submitText = textRef.current.trim();
    if (submitText) {
      handlersRef.current.submit?.(submitText.replace(/\r\n|\r|\u2028|\u2029/g, '\n'));
    }
  };

  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    // console.log(e.target.innerText);
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    } else if (handlersRef.current.typing && isTypingKey(e)) {
      handlersRef.current.typing(textRef.current);
    }

    handlersRef.current.backspace = e.key === 'Backspace' || e.key === 'Delete';
  }, []);

  const onKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (handlersRef.current.backspace) {
      if (textElRef.current && textRef.current === '\n') {
        updateInnerHTMLRepositionCaret(textElRef.current, '');
        textRef.current = '';
      }
    }

    if (handlersRef.current.typing && isTypingKey(e)) {
      // NOTE: Use key up for typing emit instead of keydown
      // If you use keydown, key down handlers will not catch it if you type from outside the textarea
      handlersRef.current.typing(textRef.current);
    }
  }, []);

  const onInput = useCallback((e: React.FormEvent) => {
    if (e.isTrusted && textElRef.current) {
      const textContent = getTextFromDOMElement(textElRef.current);
      textRef.current = textContent;
      handlersRef.current.textChange?.(textContent);

      if (handlersRef.current.mappedImageCodes) {
        const mutatedText = getMutatedTextIfDifferent(textContent, e.currentTarget.innerHTML, handlersRef.current.mappedImageCodes);
        if (textElRef.current && mutatedText) {
          updateInnerHTMLRepositionCaret(textElRef.current, mutatedText);
        }
      }
    }
  }, []);

  const onPaste = useCallback((e: React.ClipboardEvent) => {
    pasteTextAtCaret(e, (pastedText: string) => {
      const mutatedText = getMutatedTextIfDifferent(pastedText, e.currentTarget.innerHTML, handlersRef.current.mappedImageCodes);
      if (textElRef.current && mutatedText) {
        updateInnerHTMLRepositionCaret(textElRef.current, mutatedText);
      }

      const textContent = getTextFromDOMElement(textElRef.current!);
      textRef.current = textContent;
    });
  }, []);

  return [textElRef, textRef, {
    htmlText,
    setHtmlText,
    onKeyDown,
    onKeyUp,
    onInput,
    onPaste,
    onSubmit
  }];
}
