"use strict";
/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. *
 */
/**
 * balancetext.js
 *
 * Author: Randy Edmunds
 */

/*jslint vars: true, plusplus: true, devel: true, browser: true, nomen: true, indent: 4, maxerr: 50, regexp: true */
/*jshint laxbreak: true */
/*global define, module, CustomEvent, NodeList */

/*
 * Copyright (c) 2007-2009 unscriptable.com and John M. Hann
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the “Software”), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 * Except as contained in this notice, the name(s) of the above
 * copyright holders (unscriptable.com and John M. Hann) shall not be
 * used in advertising or otherwise to promote the sale, use or other
 * dealings in this Software without prior written authorization.
 *
 * http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
 *
 * Tested to work on (lowest browser):
 * - Sarari 4
 * - Chrome 16
 * - Firefox 10
 * - IE 9
 * - Edge 13
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        define([], factory);
    } else if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.balanceText = factory();
    }
}(this, function () {

    /**
     * Polyfill for Array.isArray
     *
     * @param arg   - The thing to check if it is an array or not
     */
    function isArray(arg) {
        if (Array.isArray) {
            return Array.isArray(arg);
        }

        return Object.prototype.toString.call(arg) === '[object Array]';
    }

    /**
     * Polyfill for $(document).ready()
     *
     * @param fn   - The function to execute when the document is ready
     */
    function ready(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            document.attachEvent('onreadystatechange', function () {
                if (document.readyState !== 'loading') {
                    fn();
                }
            });
        }
    }

    /**
     * Polyfill for $(el).trigger('my-event', {some: 'data'});
     *
     * @param el        - the element to trigger an event on
     * @param eventName - the event to trigger
     * @param data      - the data to send in the event
     */
    function trigger(el, eventName, data) {
        var event;
        if (window.CustomEvent) {
            event = new CustomEvent(eventName, {detail: data});
        } else {
            event = document.createEvent('CustomEvent');
            event.initCustomEvent(eventName, true, true, data);
        }

        el.dispatchEvent(event);
    }

    /**
     * Debounces a function over a threshold
     *
     * @param func      - The function to debounce
     * @param threshold - time in ms
     * @param execAsap  - when true, execute immediately
     */
    function debounce(func, threshold, execAsap) {
        var timeout;

        return function debounced() {
            var obj = this, args = arguments;
            function delayed() {
                if (!execAsap) {
                    func.apply(obj, args);
                }
                timeout = null;
            }

            if (timeout) {
                clearTimeout(timeout);
            } else if (execAsap) {
                func.apply(obj, args);
            }
            timeout = setTimeout(delayed, threshold || 100);
        };
    }

    /**
     * Handle resize events and execute a debounced function
     *
     * @param fn   - the function to execute on window resize
     */
    function smartresize(fn) {
        if (fn) {
            window.addEventListener('resize', debounce(fn));
        } else {
            trigger(window, "smartresize");
        }
    }

    /**
     * Convert a NodeList to an Array.  NodeLists look like Arrays
     * but they don't behave like Arrays.  Convert the NodeList to an Array.
     *
     * @param nodeList   - the NodeList to convert to a Array
     */
    function nodeListAsArray(nodeList) {
        return nodeList ? Array.prototype.slice.call(nodeList) : [];
    }

    var style = document.documentElement.style,
        hasTextWrap = (style.textWrap || style.WebkitTextWrap || style.MozTextWrap || style.MsTextWrap || style.OTextWrap),
        wsMatches;

    function NextWS_params() {
        this.reset();
    }

    NextWS_params.prototype.reset = function () {
        this.index = 0;
        this.width = 0;
    };

    /**
     * Returns true iff char at index is a space character outside of HTML < > tags.
     *
     * @param txt   - the text to check
     * @param index - the index of the character to check
     */
    var isWS = function (txt, index) {
        var re = /\s(?![^<]*>)/g,
            match;

        if (!wsMatches) {
            // Only calc ws matches once per line
            wsMatches = [];
            match = re.exec(txt);
            while (match !== null) {
                wsMatches.push(match.index);
                match = re.exec(txt);
            }
        }

        return wsMatches.indexOf(index) !== -1;
    };

    /**
     * Strip the tags from an element
     *
     * @param el   - the element to act on
     */
    var removeTags = function (el) {
        var brs = nodeListAsArray(el.querySelectorAll('br[data-owner="balance-text"]'));
        brs.forEach(function (br) { br.outerHTML = " "; });

        var spans = nodeListAsArray(el.querySelectorAll('span[data-owner="balance-text"]'));
        if (spans.length > 0) {
            var txt = "";
            spans.forEach(function (span) {
                txt += span.textContent;
                span.parentNode.removeChild(span);
            });
            el.innerHTML = txt;
        }
    };

    /**
     * Checks to see if we should justify the balanced text with the
     * element based on the textAlign property in the computed CSS
     *
     * @param el        - element to check
     */
    var isJustified = function (el) {
        style = el.currentStyle || window.getComputedStyle(el, null);
        return (style.textAlign === 'justify');
    };

    /**
     * Add whitespace after words in text to justify the string to
     * the specified size.
     * @param el       - the element to justify
     * @param txt      - text string
     * @param conWidth - container width
     */
    var justify = function (el, txt, conWidth) {
        txt = txt.trim();
        var words = txt.split(' ').length;
        txt = txt + ' ';

        // if we don't have at least 2 words, no need to justify.
        if (words < 2) {
            return txt;
        }

        // Find width of text in the DOM
        var tmp = document.createElement('span');
        tmp.innerHTML = txt;
        el.appendChild(tmp);
        var size = tmp.offsetWidth;
        tmp.parentNode.removeChild(tmp);

        // Figure out our word spacing and return the element
        var wordSpacing = Math.floor((conWidth - size) / (words - 1));
        tmp.style.wordSpacing = wordSpacing + 'px';
        tmp.setAttribute('data-owner', 'balance-text');

        var div = document.createElement('div');
        div.appendChild(tmp);
        return div.innerHTML;
    };

    /**
     * In the current simple implementation, an index i is a break
     * opportunity in txt iff it is 0, txt.length, or the
     * index of a non-whitespace char immediately preceded by a
     * whitespace char.  (Thus, it doesn't honour 'white-space' or
     * any Unicode line-breaking classes.)
     *
     * @precondition 0 <= index && index <= txt.length
     *
     * @param txt   - the text to check
     * @param index - the index to check
     */
    var isBreakOpportunity = function (txt, index) {
        return ((index === 0) || (index === txt.length) ||
                (isWS(txt, index - 1) && !isWS(txt, index)));
    };

    /**
     * Finds the first break opportunity (@see isBreakOpportunity)
     * in txt that's both after-or-equal-to index c in the direction dir
     * and resulting in line width equal to or past clamp(desWidth,
     * 0, conWidth) in direction dir.  Sets ret.index and ret.width
     * to the corresponding index and line width (from the start of
     * txt to ret.index).
     *
     * @param el       - element
     * @param txt      - text string
     * @param conWidth - container width
     * @param desWidth - desired width
     * @param dir      - direction (-1 or +1)
     * @param c        - char index (0 <= c && c <= txt.length)
     * @param ret      - return object; index and width of previous/next break
     *
     */
    var findBreakOpportunity = function (el, txt, conWidth, desWidth, dir, c, ret) {
        var w;
        if (txt && typeof txt === 'string') {
            for(;;) {
                while (!isBreakOpportunity(txt, c)) {
                    c += dir;
                }

                el.innerHTML = txt.substr(0, c);
                w = el.offsetWidth;

                if (dir < 0) {
                    if ((w <= desWidth) || (w <= 0) || (c === 0)) {
                        break;
                    }
                } else {
                    if ((desWidth <= w) || (conWidth <= w) || (c === txt.length)) {
                        break;
                    }
                }

                c += dir;
            }
        }
        ret.index = c;
        ret.width = w;
    };

    /**
     * Detects the width of a non-breaking space character, given the height of
     * the element with no-wrap applied.
     *
     * @param el        - element
     * @param h         - height
     *
     */
    var getSpaceWidth = function (el, h) {
        var container = document.createElement('div');

        container.style.display = "block";
        container.style.position = "absolute";
        container.style.bottom = 0;
        container.style.right = 0;
        container.style.width = 0;
        container.style.height = 0;
        container.style.margin = 0;
        container.style.padding = 0;
        container.style.visibility = "hidden";
        container.style.overflow = "hidden";

        var space = document.createElement('span');

        space.style.fontSize = "2000px";
        space.innerHTML = "&nbsp;";

        container.appendChild(space);

        el.appendChild(container);

        var dims = space.getBoundingClientRect();
        container.parentNode.removeChild(container);

        var spaceRatio = dims.height / dims.width;

        return (h / spaceRatio);
    };

    // Selectors and elements to watch;
    // calling $.balanceText(elements) adds "elements" to this list.
    var watching = {
        sel: ['.balance-text'], // default class to watch
        el: []
    };

    /**
     * Ensure that a list of elements is an array of elements.
     * NodeLists aren't really arrays, and single items need to
     * be formed into an array
     *
     * @param elements   - the list of elements
     */
    function ensureElementArray(elements) {
        if (NodeList.prototype.isPrototypeOf(elements)) {
            elements = nodeListAsArray(elements);
        }

        if (!isArray(elements)) {
            elements = [elements];
        }

        return elements;
    }

    /**
     *  When a browser has native support for the text-wrap property,
     * the text balanceText plugin will let the browser handle it natively,
     * otherwise it will apply its own text balancing code.
     *
     * @param elements   - the list of elements to balance
     */
    function balanceText(elements) {
        if (hasTextWrap) {
            // browser supports text-wrap, so do nothing
            return this;
        }

        if (typeof elements === 'string') {
            elements = document.querySelectorAll(elements);
        }

        elements = ensureElementArray(elements);

        return elements.forEach(function (el) {
            // In a lower level language, this algorithm takes time
            // comparable to normal text layout other than the fact
            // that we do two passes instead of one, so we should
            // be able to do without this limit.
            var maxTextWidth = 5000;

            removeTags(el);                        // strip balance-text tags

            // save settings
            var oldWS = el.style.whiteSpace;
            var oldFloat = el.style.float;
            var oldDisplay = el.style.display;
            var oldPosition = el.style.position;
            var oldLH = el.style.lineHeight;

            // remove line height before measuring container size
            el.style.lineHeight = 'normal';

            var containerWidth = el.offsetWidth;
            var containerHeight = el.offsetHeight;

            // temporary settings
            el.style.whiteSpace = 'nowrap';
            el.style.float = 'none';
            el.style.display = 'inline';
            el.style.position = 'static';

            var nowrapWidth = el.offsetWidth;
            var nowrapHeight = el.offsetHeight;

            // An estimate of the average line width reduction due
            // to trimming trailing space that we expect over all
            // lines other than the last.

            var spaceWidth = ((oldWS === 'pre-wrap') ? 0 : getSpaceWidth(el, nowrapHeight));

            if (containerWidth > 0 &&                  // prevent divide by zero
                    nowrapWidth > containerWidth &&    // text is more than 1 line
                    nowrapWidth < maxTextWidth) {      // text is less than arbitrary limit (make this a param?)

                var remainingText = el.innerHTML;
                var newText = "";
                var lineText = "";
                var shouldJustify = isJustified(el);
                var totLines = Math.round(containerHeight / nowrapHeight);
                var remLines = totLines;

                // loop vars
                var desiredWidth, guessIndex, le, ge, splitIndex;

                // Determine where to break:
                while (remLines > 1) {

                    // clear whitespace match cache for each line
                    wsMatches = null;

                    desiredWidth = Math.round((nowrapWidth + spaceWidth) / remLines - spaceWidth);

                    // Guessed char index
                    guessIndex = Math.round((remainingText.length + 1) / remLines) - 1;

                    le = new NextWS_params();

                    // Find a breaking space somewhere before (or equal to) desired width,
                    // not necessarily the closest to the desired width.
                    findBreakOpportunity(el, remainingText, containerWidth, desiredWidth, -1, guessIndex, le);

                    // Find first breaking char after (or equal to) desired width.
                    ge = new NextWS_params();
                    guessIndex = le.index;
                    findBreakOpportunity(el, remainingText, containerWidth, desiredWidth, +1, guessIndex, ge);

                    // Find first breaking char before (or equal to) desired width.
                    le.reset();
                    guessIndex = ge.index;
                    findBreakOpportunity(el, remainingText, containerWidth, desiredWidth, -1, guessIndex, le);

                    // Find closest string to desired length
                    if (le.index === 0) {
                        splitIndex = ge.index;
                    } else if ((containerWidth < ge.width) || (le.index === ge.index)) {
                        splitIndex = le.index;
                    } else {
                        splitIndex = ((Math.abs(desiredWidth - le.width) < Math.abs(ge.width - desiredWidth))
                                            ? le.index
                                            : ge.index);
                    }

                    // Break string
                    lineText = remainingText.substr(0, splitIndex);
                    if (shouldJustify) {
                        newText += justify(el, lineText, containerWidth);
                    } else {
                        newText += lineText.replace(/\s$/, "");
                        newText += '<br data-owner="balance-text" />';
                    }
                    remainingText = remainingText.substr(splitIndex);

                    // update counters
                    remLines--;
                    el.innerHTML = remainingText;
                    nowrapWidth = el.offsetWidth;
                }

                if (shouldJustify) {
                    el.innerHTML = newText + justify(el, remainingText, containerWidth);
                } else {
                    el.innerHTML = newText + remainingText;
                }
            }

            // restore settings
            el.style.whiteSpace = oldWS;
            el.style.float = oldFloat;
            el.style.display = oldDisplay;
            el.style.position = oldPosition;
            el.style.lineHeight = oldLH;
        });
    }

    // Call the balanceText plugin on elements that it's watching.
    function applyBalanceText() {
        var selectedElements = document.querySelectorAll(watching.sel.join(','));
        var elements = watching.el.concat(nodeListAsArray(selectedElements));
        balanceText(elements);
    }

    /**
     * Apply the BalanceText routine on the document and watch the list
     * of elements.  On window resize, re-apply BalanceText to the given elements
     * 
     * @param elements - the elements to watch after applying BalanceText
     */
    function balanceTextAndWatch(elements) {
        if (typeof elements === 'string') {
            watching.sel.push(elements);
        } else {
            elements = ensureElementArray(elements);

            elements.forEach(function (el) {
                watching.el.push(el);
            });
        }

        applyBalanceText();
    }

    /**
     * Initialize the events for which to re-apply BalanceText.  They are:
     * - Document ready
     * - Window resize
     */
    function initHandlers() {
        // Apply on DOM ready
        ready(applyBalanceText);

        // Reapply on resize
        smartresize(applyBalanceText);
    }

    if (window && window.jQuery) {
        window.jQuery.fn.balanceTextUpdate = applyBalanceText;

        // Watch elements or a selector for the next updates
        window.jQuery.balanceText = function (elements) {
            if (!elements) {
                initHandlers();
                return;
            }

            balanceTextAndWatch(elements);
        };

        window.jQuery.fn.balanceText = function () {
            balanceText(this.toArray());
        };
    }

    return {
        ready: ready,
        applyBalanceText: applyBalanceText,
        balanceText: balanceText,
        balanceTextAndWatch: balanceTextAndWatch,
        initHandlers: initHandlers
    };
}));
