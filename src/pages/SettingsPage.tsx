import { useState } from 'react'
import useStore from '../store/useStore'
import { DEFAULT_OVERTIME_SETTINGS } from '../lib/storage'

export default function SettingsPage() {
  const settings = useStore((s) => s.overtimeSettings)
  const setOvertimeSettings = useStore((s) => s.setOvertimeSettings)

  const [deemedLabel, setDeemedLabel] = useState(settings.deemedLabel)
  const [actualLabel, setActualLabel] = useState(settings.actualLabel)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setOvertimeSettings({ deemedLabel, actualLabel })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleReset() {
    setDeemedLabel(DEFAULT_OVERTIME_SETTINGS.deemedLabel)
    setActualLabel(DEFAULT_OVERTIME_SETTINGS.actualLabel)
  }

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
            支給欄の項目名（例：みなし残業）と、総支給金額以下の実残業項目名（例：普通残業①）を指定します。
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

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">実残業項目（実績側）</label>
          <input
            type="text"
            value={actualLabel}
            onChange={(e) => { setActualLabel(e.target.value); setSaved(false) }}
            placeholder="例：普通残業①"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500">
          計算式：{deemedLabel || '…'} − {actualLabel || '…'} ＝ 差額（プラスなら得）
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
