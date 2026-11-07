import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { useComposer } from './ComposerContext'

const SpeechRecognition = typeof window !== 'undefined'
  ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  : null

interface VoiceInputButtonProps {
  children?: (state: { isRecording: boolean }) => ReactNode
}

export function VoiceInputButton({ children }: VoiceInputButtonProps) {
  const [isRecording, setIsRecording] = useState(false)
  const recognitionRef = useRef<any>(null)
  const composer = useComposer()

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
      const currentText = composer.getText()
      const base = currentText.replace(/\s*🎤.*$/, '')
      if (event.results[event.results.length - 1].isFinal) {
        composer.setText((base ? base + ' ' : '') + transcript)
      } else {
        composer.setText((base ? base + ' ' : '') + transcript)
      }
    }

    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => setIsRecording(false)

    recognition.start()
    setIsRecording(true)
  }, [isRecording, composer])

  if (!SpeechRecognition) return null

  if (children) {
    return <>{children({ isRecording })}</>
  }

  return (
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
  )
}
