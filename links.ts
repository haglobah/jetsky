/**
 * Interface representing an extracted URL span.
 */
interface UrlSpan {
  start: number; // Start index of the URL in the original text
  end: number;   // End index of the URL in the original text
  url: string;   // The extracted URL
}

/**
 * Parses URLs from markdown text and removes the [text](url) parts.
 *
 * @param text - The markdown text to parse.
 * @returns An object containing:
 *  - spans: An array of UrlSpan objects for each extracted URL.
 *  - modifiedText: The text with all [text](url) parts removed.
 */
export function parseMarkdownUrl(text: string): { spans: UrlSpan[]; modifiedText: string } {
  const spans: UrlSpan[] = [];

  // Regular expression to match markdown links: [text](url)
  // Captures 'text' in group 1 and 'url' in group 2
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;

  // Array to hold all matches with their indices
  const matches: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;

  // Find all matches
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    matches.push(match);
  }

  for (const m of matches) {
    console.log(m)
    const url = m[2];
    const urlStart = m.index;
    const urlEnd = urlStart + m[1].length;
    spans.push({
        start: urlStart,
        end: urlEnd,
        url: url,
    });
  }
  // Remove the [text](url) parts from the text
  // To avoid messing up the indices, remove from the end towards the start
  let modifiedText = text;
  for (let i = matches.length - 1; i >= 0; i--) {
      const m = matches[i];
      modifiedText =
          modifiedText.slice(0, m.index) + m[1] + modifiedText.slice(m.index + m[0].length);
  }
  return { spans, modifiedText };
}
