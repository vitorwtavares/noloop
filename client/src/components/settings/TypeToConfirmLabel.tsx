import { Label } from '@/components/ui/label'

interface TypeToConfirmLabelProps {
  htmlFor: string
  confirmText: string
}

export function TypeToConfirmLabel({
  htmlFor,
  confirmText,
}: TypeToConfirmLabelProps) {
  return (
    <Label
      htmlFor={htmlFor}
      className="inline-flex items-baseline gap-0.5 text-sm"
    >
      <span>Type</span>
      <span className="font-semibold text-foreground">{confirmText}</span>
      <span>to confirm</span>
    </Label>
  )
}
