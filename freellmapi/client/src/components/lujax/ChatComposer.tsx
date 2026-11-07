import { memo, useState, useRef, useCallback, useEffect, type KeyboardEvent, type DragEvent } from 'react'
import { ArrowUp, Paperclip, Square, X, Mic, MicOff } from 'lucide-react'

const SpeechRecognition = typeof window !== 'undefined'
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null

interface ChatComposerProps {
  onSend: (text: string, images: string[]) => void
  onStop?: () => void
  isStreaming?: boolean
  disabled?: boolean
  placeholder?: string
}

function ChatComposerImpl({ onSend, onStop, isStreaming, disabled, placeholder }: ChatComposerProps) {
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    return () => { recognitionRef.current?.abort() }
  }, [])

  const toggleRecording = useCallback(() => {
    if (!SpeechRecognition) return

    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    const lang = (() => { try { return localStorage.getItem('lujax_voice_lang') || 'fr-FR' } catch { return 'fr-FR' } })()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setText(prev => {
        const base = prev.replace(/\s*🎤.*$/, '')
        if (event.results[event.results.length - 1].isFinal) {
          return (base ? base + ' ' : '') + transcript
        }
        return (base ? base + ' ' : '') + transcript
      })
    }

    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => setIsRecording(false)

    recognition.start()
    setIsRecording(true)
  }, [isRecording])

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed && !images.length) return
    onSend(trimmed, images)
    setText('')
    setImages([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isStreaming) return
      handleSend()
    }
  }

  const addFile = (file: File) => {
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImages(prev => [...prev, reader.result as string])
      }
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    for (const file of Array.from(e.dataTransfer.files)) addFile(file)
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    for (const item of Array.from(e.clipboardData.items)) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) addFile(file)
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-4 sm:px-4">
      <div
        className={`hover-glow relative rounded-2xl border bg-card shadow-sm transition-all ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border glow-border'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-border p-3">
            {images.map((img, i) => (
              <div key={i} className="group/img relative">
                <img src={img} alt={`Image jointe ${i + 1}`} className="h-16 w-16 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                  aria-label={`Supprimer l'image ${i + 1}`}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background opacity-0 transition-opacity group-hover/img:opacity-100 focus-visible:opacity-100"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={textareaRef}
          id="lujax-composer-input"
          value={text}
          onChange={e => { setText(e.target.value); adjustHeight() }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder || 'Message Lujax...'}
          aria-label="Message Lujax"
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-transparent px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
        />

        <div role="toolbar" aria-label="Actions du message" className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Joindre une image"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Paperclip className="h-4 w-4" aria-hidden="true" />
            </button>
            {SpeechRecognition && (
              <button
                type="button"
                onClick={toggleRecording}
                aria-label={isRecording ? 'Arrêter l\'enregistrement' : 'Saisie vocale'}
                aria-pressed={isRecording}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  isRecording
                    ? 'bg-red-500/10 text-red-500 animate-pulse'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {isRecording ? <MicOff className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
            <span role="status" aria-live="polite" className="sr-only">
              {isRecording ? 'Enregistrement en cours' : ''}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => {
                for (const f of Array.from(e.target.files || [])) addFile(f)
                e.target.value = ''
              }}
            />
          </div>

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Arrêter la génération"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-80"
            >
              <Square className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={disabled || (!text.trim() && !images.length)}
              aria-label="Envoyer le message"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-80 disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Lujax — Ta propre IA, 100% gratuite et open-source.
      </p>
    </div>
  )
}

export const ChatComposer = memo(ChatComposerImpl)
