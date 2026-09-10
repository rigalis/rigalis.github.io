export interface BlogPost {
  id: string
  title: string
  description: string
  content: string
  date: string
  readTime: string
  category: 'Reverse Engineering' | 'Binary Analysis' | 'Design' | 'CTF Writeups'
  tags: string[]
}

export interface Project {
  id: string
  title: string
  description: string
  longDescription: string
  tags: string[]
  category: 'Security Tools' | 'Design Systems' | 'Exploits / PoCs'
  githubUrl?: string
  demoUrl?: string
  featured?: boolean
}

export interface TerminalLine {
  text: string
  type: 'input' | 'output' | 'error' | 'system' | 'success'
}
