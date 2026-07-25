import { AlertCircle } from 'lucide-react'
import type { ScanErrorBannerModel } from '@/components/scanner/scannerPageState'

type Props = {
  model: ScanErrorBannerModel
}

export function ScannerErrorBanner({ model }: Props) {
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-2.5 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-[13px] text-danger"
    >
      <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p>
          <span className="font-semibold text-foreground">
            {model.headline}.
          </span>{' '}
          {model.detail}
        </p>
        <p className="mt-1 text-muted-foreground">{model.tip}</p>
      </div>
    </div>
  )
}
