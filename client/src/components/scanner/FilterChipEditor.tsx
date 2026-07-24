import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { Tag } from '@/components/answer-bank/Tag'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type Props = {
  items: string[]
  onChange: (items: string[]) => void
  exclude?: boolean
  addLabel: string
  disabled?: boolean
}

function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase()
}

function isDuplicateKeyword(items: string[], value: string): boolean {
  const normalized = normalizeKeyword(value)
  if (!normalized) return false
  return items.some((item) => normalizeKeyword(item) === normalized)
}

const filterChipClass = 'h-8 px-2.5 py-0'

function ExcludeTag({
  children,
  onRemove,
}: {
  children: React.ReactNode
  onRemove: () => void
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-[5px] bg-danger-soft px-2 py-0.5 text-[13px] font-medium whitespace-nowrap text-danger',
        filterChipClass,
      )}
    >
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove keyword"
        className="-mr-0.5 flex cursor-pointer items-center text-danger/50 transition-colors hover:text-danger"
      >
        <X size={12} />
      </button>
    </span>
  )
}

export function FilterChipEditor({
  items,
  onChange,
  exclude = false,
  addLabel,
  disabled = false,
}: Props) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const remove = (value: string) => {
    onChange(items.filter((item) => item !== value))
  }

  const commit = () => {
    const value = draft.trim()
    if (!value) {
      setDraft('')
      setAdding(false)
      return
    }

    if (isDuplicateKeyword(items, value)) {
      toast.error('That keyword is already in the list.')
      return
    }

    onChange([...items, value])
    setDraft('')
    setAdding(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item) =>
        exclude ? (
          <ExcludeTag key={item} onRemove={() => remove(item)}>
            {item}
          </ExcludeTag>
        ) : (
          <Tag
            key={item}
            className={filterChipClass}
            onRemove={disabled ? undefined : () => remove(item)}
          >
            {item}
          </Tag>
        ),
      )}

      {adding ? (
        <Input
          autoFocus
          value={draft}
          disabled={disabled}
          placeholder={addLabel}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            } else if (event.key === 'Escape') {
              setDraft('')
              setAdding(false)
            }
          }}
          className="h-8 w-36"
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className={cn('h-8 border-dashed')}
          onClick={() => setAdding(true)}
        >
          <Plus data-icon="inline-start" />
          {addLabel}
        </Button>
      )}
    </div>
  )
}
