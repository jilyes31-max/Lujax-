import { type ReactNode } from 'react'
import { CodeRenderersContext, type CodeRenderersContextValue } from '@/lib/code-renderers'

interface CodeRenderersProviderProps {
  children: ReactNode
  value?: CodeRenderersContextValue
}

export function CodeRenderersProvider({ children, value }: CodeRenderersProviderProps) {
  const contextValue: CodeRenderersContextValue = value ?? { renderers: {} }
  return (
    <CodeRenderersContext.Provider value={contextValue}>
      {children}
    </CodeRenderersContext.Provider>
  )
}
