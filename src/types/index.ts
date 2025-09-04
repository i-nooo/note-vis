export type LinkType = 'tag' | 'mention' | 'prerequisite'

export interface NoteNode {
  id: string
  title: string
  url?: string
  content?: string
  tags?: Array<string>
  degree?: number
  prerequisites?: Array<string>
  dateCreated?: string
  dateUpdated?: string
}

export interface GraphLink {
  source: string
  target: string
  type: LinkType
}

export interface GraphData {
  nodes: Array<NoteNode>
  links: Array<{ source: string; target: string; type: LinkType }>
}

export interface TreeNode {
  id: string
  title: string
  url?: string
  children?: Array<TreeNode>
  prerequisites?: Array<string>
}
