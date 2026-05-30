import { useState } from 'react'
import useStore from '../store/useStore'
import { DEFAULT_OVERTIME_SETTINGS } from '../lib/storage'

export default function SettingsPage() {
  const settings = useStore((s) => s.overtimeSettings)
  const setOvertimeSettings = useStore((s) => s.setOvertimeSettings)

  const [deemedLabel, setDeemedLabel] = useState(settings.deemedLabel)
  const [actualLabels, setActualLabels] = useState<string[]>(settings.actualLabels)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    const labels = actualLabels.filter((l) => l.trim())
    setOvertimeSettings({ deemedLabel, actualLabels: labels.length > 0 ? labels : DEFAULT_OVERTIME_SETTINGS.actualLabels })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleReset() {
    setDeemedLabel(DEFAULT_OVERTIME_SETTINGS.deemedLabel)
    setActualLabels([...DEFAULT_OVERTIME_SETTINGS.actualLabels])
    setSaved(false)
  }

  function updateLabel(idx: number, v: string) {
    setActualLabels((prev) => prev.map((l, i) => (i === idx ? v : l)))
    setSaved(false)
  }

  function addLabel() {
    setActualLabels((prev) => [...prev, ''])
    setSaved(false)
  }

  function removeLabel(idx: number) {
    setActualLabels((prev) => prev.filter((_, i) => i !== idx))
    setSaved(false)
  }

  const formula = `${deemedLabel || '…'} − (${actualLabels.filter(Boolean).join(' ＋ ') || '…'}) ＝ 差額`

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-gray-900">設定</h1>
        <p className="text-gray-500 text-sm mt-0.5">アプリの動作をカスタマイズします</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-0.5">みなし残業 効率計算</p>
          <p className="text-xs text-gray-400">
            給与明細に記載されているラベル名をそのまま入力してください。
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">みなし残業項目（上限側）</label>
          <input
            type="text"
            value={deemedLabel}
            onChange={(e) => { setDeemedLabel(e.target.value); setSaved(false) }}
            placeholder="例：みなし残業"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs text-gray-500">実残業項目（実績側・複数指定可）</label>
          {actualLabels.map((label, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="text"
                value={label}
                onChange={(e) => updateLabel(idx, e.target.value)}
                placeholder="例：普通残業①"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              {actualLabels.length > 1 && (
                <button
                  onClick={() => removeLabel(idx)}
                  className="text-gray-400 hover:text-red-500 transition-colors px-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addLabel}
            className="text-xs text-brand-600 hover:text-brand-700 text-left flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            項目を追加
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
          計算式：{formula}（プラスなら得）
        </div>

        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
          >
            デフォルトに戻す
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            {saved ? '保存しました ✓' : '保存する'}
          </button>
        </div>
      </div>
    </div>
  )
}
