/**
 * Parses URLs from markdown text and removes the [text](url) parts.
 *
 * @param text - The markdown text to parse.
 * @returns An object containing:
 *  - spans: An array of UrlSpan objects for each extracted URL.
 *  - modifiedText: The text with all [text](url) parts removed.
 */

interface UrlSpan {
  start: number,
  end: number,
  url: string,
}

export function processMarkdownLinks(text: string) {
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const spans: UrlSpan[] = [];
  let modifiedText = '';
  let lastIndex = 0;
  let match;

  while ((match = markdownLinkRegex.exec(text)) !== null) {
      const [fullMatch, linkText, url] = match;
      const matchIndex = match.index;

      // Append text before the current match to modifiedText
      modifiedText += text.slice(lastIndex, matchIndex);

      // The start index of the URL in modifiedText
      const spanStart = modifiedText.length;

      // Append the link text (without markdown syntax) to modifiedText
      modifiedText += linkText;

      // The end index of the URL in modifiedText
      const spanEnd = spanStart + linkText.length;

      // Add the span with correct indices
      spans.push({
          start: spanStart,
          end: spanEnd,
          url: url,
      });

      // Update lastIndex to the end of the current match
      lastIndex = matchIndex + fullMatch.length;
  }

  // Append any remaining text after the last match
  modifiedText += text.slice(lastIndex);

  return { spans, modifiedText };
}
