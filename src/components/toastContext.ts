import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export type ToastFunction = (message: string, tone?: ToastTone) => void

export const ToastContext = createContext<ToastFunction | null>(null)

export function useToast(): ToastFunction {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
