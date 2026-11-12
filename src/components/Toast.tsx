import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { ToastContext, type ToastFunction, type ToastTone } from './toastContext'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)
  const timers = useRef<number[]>([])

  const toast = useCallback<ToastFunction>((message, tone = 'success') => {
    const id = ++counter.current
    setItems((current) => [...current, { id, message, tone }])
    const timer = window.setTimeout(() => {
      setItems((current) => current.filter((item) => item.id !== id))
    }, 3600)
    timers.current.push(timer)
  }, [])

  const value = useMemo(() => toast, [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 lg:bottom-8 lg:items-end lg:px-8">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={clsx(
              'animate-in pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg',
              item.tone === 'success' && 'border-ok/20 bg-surface text-ink',
              item.tone === 'error' && 'border-danger/25 bg-surface text-ink',
              item.tone === 'info' && 'border-line bg-surface text-ink',
            )}
          >
            <span className="mt-0.5">
              {item.tone === 'success' ? (
                <CheckCircle2 className="size-4 text-ok" />
              ) : item.tone === 'error' ? (
                <AlertTriangle className="size-4 text-danger" />
              ) : (
                <Info className="size-4 text-brand" />
              )}
            </span>
            <span className="flex-1 leading-snug">{item.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
