import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type DragEvent } from 'react'
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

export function ChatComposer({ onSend, onStop, isStreaming, disabled, placeholder }: ChatComposerProps) {
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
    <div className="mx-auto w-full max-w-3xl px-4 pb-4">
      <div
        className={`relative rounded-2xl border bg-card shadow-sm transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-border p-3">
            {images.map((img, i) => (
              <div key={i} className="group/img relative">
                <img src={img} alt="" className="h-16 w-16 rounded-lg object-cover" />
                <button
                  onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background opacity-0 transition-opacity group-hover/img:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => { setText(e.target.value); adjustHeight() }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder || 'Message Lujax...'}
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-transparent px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
        />

        {/* Bottom bar */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Attach image"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            {SpeechRecognition && (
              <button
                onClick={toggleRecording}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  isRecording
                    ? 'bg-red-500/10 text-red-500 animate-pulse'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
                title={isRecording ? 'Stop recording' : 'Voice input'}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
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
              onClick={onStop}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-80"
              title="Stop generating"
            >
              <Square className="h-3.5 w-3.5" fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={disabled || (!text.trim() && !images.length)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-80 disabled:opacity-30"
              title="Send message"
            >
              <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <p className="mt-2 text-center text-xs text-muted-foreground">
        Lujax is free and open source. Powered by 635 AI models from 34 providers.
      </p>
    </div>
  )
}
