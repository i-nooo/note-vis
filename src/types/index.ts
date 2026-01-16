export type LinkType = 'tag' | 'mention' | 'prerequisite'

export interface NoteNode {
  id: string
  title: string
  url?: string
  content?: string
  tags?: Array<string>
  degree?: number
  prerequisites?: Array<string>
  related?: Array<string>
  dateCreated?: string
  dateUpdated?: string
}

export interface GraphLink {
  source: string
  target: string
  type: LinkType
  broken?: boolean
}

export interface GraphData {
  nodes: Array<NoteNode>
  links: Array<GraphLink>
}
