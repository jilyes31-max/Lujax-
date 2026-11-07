import { createContext, type ReactNode } from 'react'

export type CodeRenderer = (code: string, language: string) => ReactNode

export interface CodeRenderersContextValue {
  renderers: Record<string, CodeRenderer>
}

export const CodeRenderersContext = createContext<CodeRenderersContextValue | null>(null)
