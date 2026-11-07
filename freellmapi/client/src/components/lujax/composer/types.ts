export interface ChatComposerHandle {
  /** Insert text at the cursor position. */
  insertText: (text: string) => void
  /** Get current text content. */
  getText: () => string
  /** Set text content. */
  setText: (text: string) => void
  /** Add an image (base64 data URL). */
  addImage: (dataUrl: string) => void
  /** Clear all content. */
  clear: () => void
  /** Focus the textarea. */
  focus: () => void
}
