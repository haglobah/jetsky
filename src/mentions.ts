/**
 * Represents a mention span within the text.
 */
interface MentionSpan {
  start: number;
  end: number;
  handle: string;
}

/**
* Represents a facet feature.
*/
interface MentionFeature {
  $type: string;
  did: string;
}

/**
* Represents a facet structure.
*/
interface Facet {
  index: {
      byteStart: number;
      byteEnd: number;
  };
  features: MentionFeature[];
}

/**
* Represents the response from the handle resolution API.
*/
interface HandleResolutionResponse {
  did: string;
  // Add other fields if necessary
}

export function parseMentions(text: string) {
  const spans: MentionSpan[] = []
  // Define the regex with global flag to find all matches
  // Using positive lookbehind to exclude the preceding character from the match
  // Ensure the environment supports lookbehind assertions
  const mentionRegex: RegExp = /(?<=[\$|\W])@([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/g;

  // Use matchAll to get all matches with capturing groups
  const matches = text.matchAll(mentionRegex);

  for (const match of matches) {
      if (match.index === undefined) {
          continue; // Safety check
      }

      // match[0]: The mention without the preceding character due to lookbehind
      const mention = match[0];
      const start = match.index;
      const end = start + mention.length;
      const handle = mention.substring(1); // Remove '@'

      spans.push({ start, end, handle });
  }

  return { spans };
}

async function resolveHandle(pdsUrl: string, handle: string): Promise<string | null> {
  const endpoint = "/xrpc/com.atproto.identity.resolveHandle";

  const url = new URL(endpoint, pdsUrl);
  url.searchParams.append("handle", handle);

  try {
    const response = await fetch(url.toString());

    if (response.status === 400) {
      // Handle can't be resolved, skip
      console.warn(`Handle "${handle}" could not be resolved. Status: 400`);
      return null;
    }

    if (!response.ok) {
      console.error(`Failed to resolve handle "${handle}". Status: ${response.status}`);
      return null;
    }

    const data: HandleResolutionResponse = await response.json();

    if (!data.did) {
      console.error(`No DID found in response for handle "${handle}".`);
      return null;
    }

    return data.did;
  } catch (error) {
    console.error(`Error resolving handle "${handle}":`, error);
    return null;
  }
}

/**
 * Processes mentions in the given text by resolving their handles to DIDs and compiling facets.
 * @param text - The input text to process.
 * @param pdsUrl - The base URL for PDS.
 * @returns A Promise that resolves to an array of facets.
 */
async function processMentions(facets: Facet[],text: string, pdsUrl: string): Promise<Facet[]> {
  const { spans } = parseMentions(text);

  // Extract unique handles to minimize duplicate requests
  const uniqueHandles: Set<string> = new Set(spans.map((m) => m.handle));

  // Initialize a Map to store handle to DID mappings
  const handleToDidMap: Map<string, string | null> = new Map();

  // Create an array of Promises for handling each unique handle
  const resolvePromises: Promise<void>[] = [];

  for (const handle of uniqueHandles) {
    const promise = this.resolveHandle(pdsUrl, handle)
      .then((did: string) => {
        handleToDidMap.set(handle, did);
      })
      .catch(() => {
        // On error, set to null
        handleToDidMap.set(handle, null);
      });

    resolvePromises.push(promise);
  }

  // Await all handle resolutions
  await Promise.all(resolvePromises);

  // Now, iterate through spans and build facets
  for (const m of spans) {
    const did = handleToDidMap.get(m.handle);

    if (!did) {
      // Handle couldn't be resolved; skip adding to facets
      continue;
    }

    // Append to facets array
    facets.push({
      index: {
        byteStart: m.start,
        byteEnd: m.end,
      },
      features: [
        {
          $type: "app.bsky.richtext.facet#mention",
          did: did,
        },
      ],
    });
  }

  return facets;
}
