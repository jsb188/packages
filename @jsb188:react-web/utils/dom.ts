import { DOM_IDS } from '@jsb188/app/constants/app';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Observes multiple sections and reports the single "active" one
 * based on intersection with the viewport.
 */

export function useViewportSections(
  options: {
    rootElementId?: string | null;
  } = {}
) {
  const { rootElementId = DOM_IDS.mainBodyScrollArea } = options;

  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Map<string, HTMLElement>>(new Map());
  const [viewingElementId, setViewingElementId] = useState<string | null>(null);

  /** Callback ref factory */
  const registerViewportRef = useCallback((id: string) => {
    return (el: HTMLElement | null) => {
      if (!observerRef.current) return;

      if (el) {
        elementsRef.current.set(id, el);
        observerRef.current.observe(el);
      } else {
        const prev = elementsRef.current.get(id);
        if (prev) observerRef.current.unobserve(prev);
        elementsRef.current.delete(id);
      }
    };
  }, []);

  useEffect(() => {
    const root = rootElementId ? document.getElementById(rootElementId) : null;
    observerRef.current = new IntersectionObserver((entries) => {
      let mostVisibleId: string | null = null;
      let maxVisiblePixels = 0;

      const viewportTop = 0;
      const viewportBottom = root instanceof Element
        ? root.getBoundingClientRect().height
        : window.innerHeight;

      for (const entry of entries) {
        if (!entry.isIntersecting) {
          continue;
        }

        const rect = entry.boundingClientRect;
        const visiblePixels = Math.min(rect.bottom, viewportBottom) - Math.max(rect.top, viewportTop);

        if (visiblePixels > maxVisiblePixels) {
          maxVisiblePixels = visiblePixels;
          mostVisibleId = (entry.target as HTMLElement).id;
        }
      }

      if (mostVisibleId) {
        setViewingElementId(mostVisibleId);
      }
    }, {
      root,
      // use generous margins so all nearby sections are reported
      rootMargin: "0px",
      threshold: Array.from({ length: 21 }, (_, i) => i / 20),
    });

    return () => observerRef.current?.disconnect();
  }, [rootElementId]);

  return {
    registerViewportRef,
    viewingElementId,
  };
}

/**
 * Observe div ref for intersection with boundaries
 */

export function useIntersectionObserver(
  callback: (isIntersecting: boolean, entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {},
  rootElementId: string | null = DOM_IDS.mainBodyScrollArea,
) {
  const divRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = divRef.current;
    if (!element) return;

    let observerOptions;
    if (rootElementId && !options.root) {
      observerOptions = {
        ...options,
        root: document.getElementById(rootElementId) || undefined,
      };
    } else {
      observerOptions = options;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        callback(entry.isIntersecting, entry);
      });
    }, observerOptions);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [divRef.current, rootElementId, options.root, options.rootMargin, options.threshold]);

  return divRef;
}

/**
 * Check if parent has class name
 */

export function parentHasClassName(el: HTMLElement | null, cnRegex: RegExp, count = 0): boolean {
  if (!el || (!el.className && !el.parentNode)) {
    return false;
  } else if (
    typeof el.className === 'string' && cnRegex && cnRegex.test(el.className)
  ) {
    // console.log('!!!!!!!!!!', el && el.className, '::::', cnRegex);
    // NOTE: FontAwesome elements may return an SVG as className
    // So a "string" check is required
    return true;
  }

  // if (el) {
  //   console.log(':::>', el.className, cnRegex, cnRegex.test(el.className));
  // }

  return (
    !!el.parentNode &&
    count < 10 &&
    parentHasClassName(el.parentNode as HTMLElement, cnRegex, count + 1)
  );
}

/**
 * Detect click outside
 */

export function useOnClickOutside(
  ref: React.RefObject<HTMLElement | null | undefined>,
  listening: boolean,
  listenToResize: boolean,
  ignoreClassName: string | null,
  onClickOutside?: (e: MouseEvent | Event, isResize: boolean) => void,
) {
  const isListening = listening && typeof onClickOutside === 'function';

  useEffect(() => {
    if (isListening) {
      const handleClickOutside = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          // console.log('(1) in');
          const overlayEl = document.getElementById('root-overlay');
          // const check = !overlayEl || !overlayEl.contains(e.target);

          // Bring this back if you want to allow from outside the ref
          const check1 = !overlayEl || !overlayEl.contains(e.target as Node);
          const check2 = !ignoreClassName ||
            !parentHasClassName(
              e.target as HTMLElement,
              new RegExp('\\b' + ignoreClassName + '\\b'),
            );
          // const check3 = !selfContainerClassName || !parentHasClassName(e.target, new RegExp('\\b' + selfContainerClassName + '\\b'));
          // if (check1 && check2 && check3) {

          if (check1 && check2) {
            onClickOutside(e, false);
          }
        }
      };

      let handleResize: (e: Event) => void;
      if (listenToResize) {
        handleResize = (e: Event) => onClickOutside(e, true);
        globalThis.addEventListener('resize', handleResize);
      }

      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);

        if (handleResize) {
          globalThis.removeEventListener('resize', handleResize);
        }
      };
    }
  }, [isListening]);
}

/**
 * Focus element if it exists
 */

export function focusElement(elemId: string) {
  const el = document.getElementById(elemId);
  if (el) {
    el.focus();
  }
}

/**
 * Get platform shortcut
 */

export function platformShortcut(key: string) {
  const isMac = /Mac|iPhone|iPod|iPad/i.test(globalThis.navigator?.platform);
  return (isMac ? '⌘' : '^') + key;
}

/**
 * Quick helper for copying a text to clipboard
 */

export function useCopyToClipboard(textToCopy: string, resetTimeMS: number = 2250): [boolean, () => void] {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, resetTimeMS);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const onClickCopy = () => {
    const el = document.createElement('textarea');
    el.value = textToCopy;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    setCopied(true);
  };

  return [copied, onClickCopy];
}

/**
 * Remove HTML from text when pasting to conten editable
 */

export async function removeHTMLfromPaste(e: React.ClipboardEvent) {
  if (typeof navigator?.clipboard?.readText === 'function') {
    // This is not available on older browsers
    const clipboardText = await navigator.clipboard.readText();
    return clipboardText;
  }

  // @ts-expect-error - Older browser deprecation support
  const html = (e.originalEvent || e).clipboardData.getData('text/html');
  const result = document.createElement('div');
  result.innerHTML = html;

  result.querySelectorAll('style').forEach((el) => el.remove());
  result.querySelectorAll('meta').forEach((el) => el.remove());
  result.querySelectorAll('link').forEach((el) => el.remove());

  result.querySelectorAll('img').forEach(img => {
    const altText = img.alt || '';
    const textNode = document.createTextNode(altText);
    img.replaceWith(textNode);
  });

  result.querySelectorAll('br').forEach(br => {
    const textNode = document.createTextNode('\n');
    br.replaceWith(textNode);
  });

  // result.querySelectorAll('p').forEach(p => {
  //   const textNode = document.createTextNode('\n');
  //   p.replaceWith(textNode);
  // });

  // result.querySelectorAll('div').forEach(div => {
  //   const textNode = document.createTextNode('\n');
  //   div.replaceWith(textNode);
  // });

  const text = result.innerHTML
    .replace(/<\/?[^`]+?\/?>/gmi, '\n')
    .replace(/\n[\s]*\n/gmi, '\n')
    .trim();

  // NOTE: If copied from inside the content editable, "double line breaks" will become single.
  // So result.innerText would be correct in this case.
  // But if html is copied from outside, then reuslt.innerText would remove all line breaks,
  // Making text.replace(..) correct.
  // There's no way to tell where the text was copied, so use text as the output.
  // This is a small issue becasue all modern browsers will have access to navigator.clipboard.readText()

  return text;
}

/**
 * Get text from the entire DOM element;
 * including text form of all child elements.
 */

export function getTextFromDOMElement(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  if (!clone) {
    return '';
  }

  // Replace all <img> elements with their alt text
  clone.querySelectorAll('img').forEach(img => {
    const altText = img.alt || '';
    const textNode = document.createTextNode(altText);
    img.replaceWith(textNode);
  });

  clone.querySelectorAll('br').forEach(br => {
    const textNode = document.createTextNode('\n');
    br.replaceWith(textNode);
  });

  return clone.textContent || '';
}

/**
 * Remove HTML and paste text at caret position
 */

export async function pasteTextAtCaret(e: React.ClipboardEvent, cb: (text: string) => void) {
  e.preventDefault();

  // const text = await removeHTMLfromPaste(e);
  const text = e.clipboardData.getData('text/plain');

  // NOTE: execCommand() is deprecated, but this is still the #1 recommended way to
  // insert text at caret position in content editable elements. There is no drop-in
  // replacement for this deprecated method.
  document.execCommand('insertText', false, text);

  const activeEl = document.activeElement;
  if (activeEl) {
    cb((activeEl as HTMLElement).innerText || '');
  }

  // This code below all works, but the problem is that history state is not updated,
  // which makes "undo" and "redo" not work properly.
  // But this code below may be useful for not-user-triggered pastes.

  // const text = e.clipboardData.getData('text/plain');

  // if (globalThis.getSelection) {
  //   // IE9 and non-IE
  //   const sel = globalThis.getSelection();
  //   if (sel?.getRangeAt && sel.rangeCount) {
  //     let range = sel.getRangeAt(0);
  //     range.deleteContents();

  //     const textNode = document.createTextNode(text);
  //     range.insertNode(textNode);

  //     // Move caret to the end of the inserted text node
  //     range.setStartAfter(textNode);
  //     range.collapse(true);
  //     sel.removeAllRanges();
  //     sel.addRange(range);
  //   }
  // } else if (
  //   // @ts-expect-error - Deprecation support
  //   document.selection && document.selection.type != 'Control'
  // ) {
  //   // @ts-expect-error - IE < 9
  //   document.selection.createRange().pasteHTML(text);
  // }

  // const activeEl = document.activeElement;
  // if (activeEl) {
  //   cb((activeEl as HTMLElement).innerText || '');
  // }
}

/**
 * Trim content editable text to max length
 */

export function trimContentEditableText(
  el: HTMLElement,
  maxLength: number,
) {
  const editingText = el.innerText;
  if (editingText.length > maxLength) {
    // Trim the text if over limit
    el.innerText = editingText.slice(0, maxLength);

    // Move the cursor to the end
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);

    const sel = globalThis.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
}

/**
 * Take the current position of caret in content editable;
 * then update the innerHTML and then set the caret back to the same position.
 */

export function updateInnerHTMLRepositionCaret(
  el: HTMLElement,
  nextHTMLText: string,
) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;

  const range = sel.getRangeAt(0);

  // Create a marker
  const marker = document.createElement("span");
  marker.id = "caret-marker";

  // Insert marker at current caret position
  range.insertNode(marker);

  // Replace innerHTML
  el.innerHTML = nextHTMLText;

  // Find the marker again
  const newMarker = el.querySelector("#caret-marker");
  if (newMarker) {
    const newRange = document.createRange();
    newRange.setStartAfter(newMarker);
    newRange.collapse(true);

    sel.removeAllRanges();
    sel.addRange(newRange);

    // Remove marker
    newMarker.remove();
  } else {
    // Fallback: put caret at end
    el.focus();
    const fallbackRange = document.createRange();
    fallbackRange.selectNodeContents(el);
    fallbackRange.collapse(false);
    sel.removeAllRanges();
    sel.addRange(fallbackRange);
  }
}

/**
 * Get current caret position in content editable element
 * @param el - Content editable element
 * @returns
 */

// export function getCaretPosition(el: HTMLElement) {
//   const selection = window.getSelection();
//   if (!selection || selection.rangeCount === 0) return null;
//   const range = selection.getRangeAt(0);

//   // Clone range to avoid modifying original
//   const preRange = range.cloneRange();

//   // Select all content before caret
//   preRange.selectNodeContents(el);
//   preRange.setEnd(range.endContainer, range.endOffset);

//   // The caret position is the length of this text
//   const caretPos = preRange.toString().length;
//   return caretPos;
// }

/**
 * Set caret position in content editable element
 * @param el - Content editable element
 * @param chars - Number of characters to set caret position at
 * @returns
 */

// export function setCaretPosition(el: HTMLElement, chars: number) {
//   if (chars === null) return;

//   const selection = window.getSelection();
//   let nodeStack = [el];
//   let charCount = 0;
//   let node: Node | undefined;
//   let found = false;

//   while (!found && (node = nodeStack.pop())) {
//     if (node.nodeType === 3) {
//       // text node
//       const nextCharCount = charCount + (node.textContent?.length || 0);
//       if (chars <= nextCharCount) {
//         const range = document.createRange();
//         range.setStart(node, chars - charCount);
//         range.collapse(true);

//         selection?.removeAllRanges();
//         selection?.addRange(range);
//         found = true;
//         console.log('found?', 'yes', chars, charCount, '->', chars - charCount);

//       } else {
//         charCount = nextCharCount;
//       }
//     } else {
//       // element node, add children
//       const children = Array.from(node.childNodes);
//       for (let i = children.length - 1; i >= 0; i--) {
//         nodeStack.push(children[i]);
//       }
//     }
//   }
// }

/**
 * Check if scroll position of HTML ref is at bottom
 */

export function isScrollAtBottom(
  element: HTMLElement | Element | null,
  threshold: number
): boolean {

  if (element) {
    const { scrollHeight, clientHeight, scrollTop } = element;
    const scrollBottom = scrollHeight - clientHeight - scrollTop;
    const pixels = threshold > 0 && threshold < 1 ? clientHeight * threshold : threshold;

    return scrollBottom <= pixels;
  }

  return false;
}

/**
 * Check if key is worth listening to (for typing status)
 */

export function isTypingKey(e: React.KeyboardEvent | React.FormEvent): boolean {
  return (
    (!e.metaKey || ['v', 'x'].includes(e.key)) &&
    !e.ctrlKey && !e.altKey &&
    ![
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'CapsLock', 'Enter', 'Tab',
      'Shift', 'Meta', 'Control', 'Alt', 'Escape', 'Backspace',
    ].includes(e.key)
  );
}

/**
 * Check if code is rendered in client or server
 */

export function isServerRender(): boolean {
  return typeof globalThis?.document === 'undefined';
}

/**
 * You can't use useLayoutEffect on the server,
 * so use this if the code needs to run in both client + server.
 */

export const useIsomorphicLayoutEffect = isServerRender() ? useEffect : useLayoutEffect;

/**
 * Wait for client render using a hook.
 * This should be used to prevents errors that happen when
 * client renders don't match SSR render--
 * e.g. Due to timezone/locale differences and other
 * situations that depend on local specific browser APIs.
 */

export function useWaitForClientRender(): boolean {
  const [didWaitClientRender, setDidWaitClientRender] = useState<boolean>(false);

  useIsomorphicLayoutEffect(() => {
    if (!didWaitClientRender && !isServerRender()) {
      setDidWaitClientRender(true);
    }
  }, []);

  return didWaitClientRender;
}
