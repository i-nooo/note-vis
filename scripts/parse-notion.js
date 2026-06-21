import fs from "fs/promises";
import path from "path";
import pLimit from "p-limit";
import { Client } from "@notionhq/client";

const outputFile = "./src/data/notes.json";

///////////////////////////////////////////////

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;
const NOTION_DATA_SOURCE_ID = process.env.NOTION_DATA_SOURCE_ID;

if (!NOTION_API_KEY || !NOTION_DATABASE_ID || !NOTION_DATA_SOURCE_ID) {
  console.error(
    ">>> Error: Notion API key, Notion Database ID, 또는 Notion Data Source ID가 .env 파일에 설정되어 있지 않습니다.",
  );
  process.exit(1);
}

/////////////////////////////////////////////

let notion = new Client({
  auth: NOTION_API_KEY,
  notionVersion: "2026-03-11",
});

const pageResponse = await notion.search({
  filter: {
    property: "object",
    value: "page"
  },
  sort: {
    direction: "descending",
    timestamp: "last_edited_time"
  }
});

const pages = pageResponse.results;

///////////////////////////////////////////////

const limit = pLimit(5);

const notes = await Promise.all(
  pages.map((page) =>
    limit(async () => {
      const pageId = page.id.replaceAll("-", "");

      const [detail, markdown] = await Promise.all([
        notion.pages.retrieve({
          page_id: pageId,
        }),
        notion.pages.retrieveMarkdown({
          page_id: pageId,
        }),
      ]);

      return {
        id: pageId,
        type: "note",

        title:
          detail.properties.이름?.title?.[0]?.plain_text ??
          "Untitled",

        tags:
          detail.properties.tag?.multi_select?.map(
            (tag) => tag.name
          ) ?? [],

        createdTime: detail.created_time,
        lastEditedTime: detail.last_edited_time,

        contents: markdown.markdown,
      };
    })
  )
);

////////////////////////////////////////////////////////

const noteMap = new Map(
  notes.map((note) => [note.id, note])
);

const links = [];
const linkSet = new Set();

function addLink(source, target, type) {
  const key = `${source}:${target}:${type}`;

  if (linkSet.has(key)) {
    return;
  }

  linkSet.add(key);

  links.push({
    source,
    target,
    type,
  });
}

//////////////////////////////////////////////////
// mention link parsing

const mentionRegex =
  /<mention-page\s+url="https:\/\/app\.notion\.com\/p\/([a-z0-9]+)"\s*\/>/gi;

for (const note of notes) {
  let match;

  while ((match = mentionRegex.exec(note.contents))) {
    addLink(
      note.id,
      match[1],
      "mention"
    );
  }
}

////////////////////////////////////////////////////////////
// tag links

const tagSet = new Set();

for (const note of notes) {
  for (const tag of note.tags) {
    tagSet.add(tag);

    addLink(
      note.id,
      `tag:${tag}`,
      "tag"
    );
  }
}

///////////////////////////////////////////////////////////
// nodes

const tagNodes = [...tagSet].map((tag) => ({
  id: `tag:${tag}`,
  type: "tag",
  name: tag,
}));

const nodes = [
  ...notes,
  ...tagNodes,
];

///////////////////////////////////////////////////////
// diagnostics

const brokenLinks = links.filter((link) => {
  if (link.type !== "mention") {
    return false;
  }

  return !noteMap.has(link.target);
});

const selfLinks = links.filter(
  (link) =>
    link.type === "mention" &&
    link.source === link.target
);

const connected = new Set();

for (const link of links) {
  connected.add(link.source);
  connected.add(link.target);
}

const orphanNotes = notes.filter(
  (note) => !connected.has(note.id)
);

//////////////////////////////////////////////////
// degree

const degree = {};

for (const node of nodes) {
  degree[node.id] = 0;
}

for (const link of links) {
  degree[link.source] =
    (degree[link.source] ?? 0) + 1;

  degree[link.target] =
    (degree[link.target] ?? 0) + 1;
}

//////////////////////////////////
// output

const graph = {
  nodes,
  links,

  diagnostics: {
    brokenLinks,
    selfLinks,
    orphanNotes,
  },

  stats: {
    notes: notes.length,
    tags: tagNodes.length,
    nodes: nodes.length,
    links: links.length,
    brokenLinks: brokenLinks.length,
    selfLinks: selfLinks.length,
    orphanNotes: orphanNotes.length,
  },

  degree,
};

await fs.mkdir(
  path.dirname(outputFile),
  { recursive: true }
);

await fs.writeFile(
  outputFile,
  JSON.stringify(graph, null, 2),
  "utf8"
);

console.log(graph.stats);