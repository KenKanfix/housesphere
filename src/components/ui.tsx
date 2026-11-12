import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { Loader2, Search, X } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: ReactNode
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark shadow-sm shadow-brand/20',
  secondary: 'bg-surface text-ink border border-line hover:border-brand/40 hover:bg-brand-soft/40',
  ghost: 'text-muted hover:text-ink hover:bg-black/5',
  danger: 'bg-danger text-white hover:bg-danger/90 shadow-sm',
  soft: 'bg-brand-soft text-brand-dark hover:bg-brand/15',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-4.5 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex select-none items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-55',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-black/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('rounded-2xl border border-line bg-surface', className)}>{children}</div>
}

type BadgeTone = 'neutral' | 'brand' | 'amber' | 'danger' | 'ok'

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-black/5 text-muted',
  brand: 'bg-brand-soft text-brand-dark',
  amber: 'bg-amber-soft text-amber',
  danger: 'bg-danger-soft text-danger',
  ok: 'bg-ok-soft text-ok',
}

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{title}</h2>
      {action}
    </div>
  )
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-xs font-semibold uppercase tracking-wide text-muted">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted/80">{hint}</p> : null}
    </div>
  )
}

const fieldClasses =
  'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink shadow-sm transition-colors placeholder:text-muted/55 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:opacity-60'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(fieldClasses, className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(fieldClasses, 'appearance-none bg-[right_0.9rem_center] bg-no-repeat pr-9', className)} {...props}>
      {children}
    </select>
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(fieldClasses, 'min-h-24 resize-y', className)} {...props} />
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={clsx('relative', className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={clsx(fieldClasses, 'pl-10')}
      />
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      {icon ? <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">{icon}</div> : null}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function Modal({
  open = true,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open?: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg'
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = original
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          'animate-in flex max-h-[92svh] w-full flex-col overflow-hidden rounded-t-3xl bg-cream shadow-2xl sm:rounded-3xl',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line bg-surface px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          <IconButton label="Close" onClick={onClose} className="-mr-1 mt-0.5">
            <X className="size-5" />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer ? <div className="border-t border-line bg-surface px-5 py-4 sm:px-6">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-muted">{message}</p>
    </Modal>
  )
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: string; count?: number }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={clsx('no-scrollbar flex gap-1.5 overflow-x-auto rounded-xl bg-black/[0.04] p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={clsx(
            'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            value === tab.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span
              className={clsx(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                value === tab.value ? 'bg-brand-soft text-brand-dark' : 'bg-black/5 text-muted',
              )}
            >
              {tab.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}

export function ProgressBar({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'amber' | 'danger' }) {
  const tones = {
    brand: 'bg-brand',
    amber: 'bg-amber',
    danger: 'bg-danger',
  }
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/8">
      <div
        className={clsx('h-full rounded-full transition-all', tones[tone])}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

export function Stat({
  icon,
  label,
  value,
  hint,
  tone = 'brand',
  onClick,
}: {
  icon: ReactNode
  label: string
  value: string | number
  hint?: string
  tone?: 'brand' | 'amber' | 'danger' | 'neutral'
  onClick?: () => void
}) {
  const tones = {
    brand: 'bg-brand-soft text-brand-dark',
    amber: 'bg-amber-soft text-amber',
    danger: 'bg-danger-soft text-danger',
    neutral: 'bg-black/5 text-muted',
  }
  const content = (
    <>
      <div className={clsx('flex size-9 items-center justify-center rounded-xl', tones[tone])}>{icon}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</div>
      <div className="text-xs font-medium text-muted">{label}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-muted/80">{hint}</div> : null}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-brand/30 hover:bg-brand-soft/20"
      >
        {content}
      </button>
    )
  }

  return <div className="rounded-2xl border border-line bg-surface p-4">{content}</div>
}
