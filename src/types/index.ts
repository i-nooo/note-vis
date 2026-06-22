export type LinkType = "tag" | "mention";

export interface NoteNode {
  id: string;
  type: "note" | "tag";
  title: string;
  url?: string;
  contents?: string;
  tags?: Array<string>;
  createdTime?: string;
  lastEditedTime?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  type: LinkType;
  broken?: boolean;
}

export interface GraphData {
  nodes: Array<NoteNode>;
  links: Array<GraphLink>;
}
