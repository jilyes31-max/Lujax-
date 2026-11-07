import { createContext, useContext, type ReactNode } from 'react'
import type { ChatComposerHandle } from './types'

const ComposerContext = createContext<ChatComposerHandle | null>(null)

export function useComposer(): ChatComposerHandle {
  const context = useContext(ComposerContext)
  if (!context) {
    throw new Error('useComposer must be used within a ChatComposer')
  }
  return context
}

export function ComposerProvider({ children, value }: { children: ReactNode; value: ChatComposerHandle }) {
  return (
    <ComposerContext.Provider value={value}>
      {children}
    </ComposerContext.Provider>
  )
}
