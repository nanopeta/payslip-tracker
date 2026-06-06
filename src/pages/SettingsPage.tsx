import { useRef, useState } from 'react'
import useStore from '../store/useStore'
import { DEFAULT_OVERTIME_SETTINGS, loadAiMemo, saveAiMemo } from '../lib/storage'
import { exportJSON, exportCSV } from '../lib/exporters'
import type { StorageState } from '../lib/storage'
import { getIncomeValueByLabel, latestPayslip, annualTotals, calcOvertimeGain, uniqueYears } from '../lib/aggregations'
import { formatYen } from '../lib/formatters'
import { usePrivacy } from '../hooks/usePrivacy'

export default function SettingsPage() {
  const { fmt } = usePrivacy()
  const settings = useStore((s) => s.overtimeSettings)
  const setOvertimeSettings = useStore((s) => s.setOvertimeSettings)
  const payslips = useStore((s) => s.payslips)
  const withholdingCerts = useStore((s) => s.withholdingCerts)
  const restoreState = useStore((s) => s.restoreState)

  const [deemedLabel, setDeemedLabel] = useState(settings.deemedLabel)
  const [actualLabels, setActualLabels] = useState<string[]>(settings.actualLabels)
  const [saved, setSaved] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [aiMemo, setAiMemo] = useState(() => loadAiMemo())
  const [savedMemo, setSavedMemo] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleSave() {
    const labels = actualLabels.filter((l) => l.trim())
    setOvertimeSettings({ deemedLabel, actualLabels: labels.length > 0 ? labels : DEFAULT_OVERTIME_SETTINGS.actualLabels })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleExportJSON() {
    exportJSON({ version: 1, payslips, withholdingCerts })
  }

  function handleExportCSV() {
    exportCSV(payslips)
  }

  function processJSONFile(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as StorageState
        if (
          !Array.isArray(parsed.payslips) ||
          !Array.isArray(parsed.withholdingCerts) ||
          typeof parsed.version !== 'number'
        ) {
          setImportStatus('error')
          setTimeout(() => setImportStatus('idle'), 4000)
          return
        }
        if (!window.confirm(`${parsed.payslips.length}件の明細と${parsed.withholdingCerts.length}件の源泉徴収票を復元します。現在のデータは上書きされます。よろしいですか？`)) {
          return
        }
        restoreState({ payslips: parsed.payslips, withholdingCerts: parsed.withholdingCerts })
        setImportStatus('success')
        setTimeout(() => setImportStatus('idle'), 3000)
      } catch {
        setImportStatus('error')
        setTimeout(() => setImportStatus('idle'), 4000)
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    }
    reader.readAsText(file)
  }

  function handleImportJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    processJSONFile(file)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.name.endsWith('.json')) {
      setImportStatus('error')
      setTimeout(() => setImportStatus('idle'), 4000)
      return
    }
    setImportStatus('idle')
    processJSONFile(file)
  }

  function handleSaveAiMemo() {
    saveAiMemo(aiMemo)
    setSavedMemo(true)
    setTimeout(() => setSavedMemo(false), 2000)
  }

  function generateReport(): string {
    const today = new Date().toISOString().slice(0, 10)
    const currentYear = new Date().getFullYear()
    const monthlySlips = payslips.filter((p) => !p.payslipType || p.payslipType === 'monthly')
    const latest = latestPayslip(monthlySlips)
    const years = uniqueYears(payslips)
    const lines: string[] = []

    lines.push(`# 給与明細レポート — ${today}`)
    lines.push('')

    if (aiMemo.trim()) {
      lines.push('## 分析メモ')
      lines.push('')
      lines.push(aiMemo.trim())
      lines.push('')
      lines.push('---')
      lines.push('')
    }

    if (latest) {
      const netPayRate =
        latest.income.total > 0
          ? ((latest.summary.netPay / latest.income.total) * 100).toFixed(1)
          : '0.0'
      const gain = calcOvertimeGain(latest, settings)
      const gainStr = `${gain >= 0 ? '+' : ''}${formatYen(gain)}`

      lines.push(`## 直近サマリー（${latest.year}年${latest.month}月）`)
      lines.push('')
      lines.push('| 項目 | 金額 |')
      lines.push('|---|---|')
      lines.push(`| 差引支給額（手取り） | ${formatYen(latest.summary.netPay)} |`)
      lines.push(`| 総支給額 | ${formatYen(latest.income.total)} |`)
      lines.push(`| 控除合計 | ${formatYen(latest.deductions.total)} |`)
      lines.push(`| 手取り率 | ${netPayRate}% |`)
      if (latest.attendance.overtimeHours > 0) {
        lines.push(`| 残業時間 | ${latest.attendance.overtimeHours.toFixed(1)}h / 45h みなし |`)
      }
      lines.push(`| みなし残業差額 | ${gainStr} |`)
      lines.push('')

      const d = latest.deductions
      const deductionRows = [
        ['健康保険料', d.healthInsurance],
        ['介護保険料', d.longTermCareInsurance],
        ['厚生年金保険', d.pensionInsurance],
        ['雇用保険料', d.employmentInsurance],
        ['所得税', d.incomeTax],
        ['住民税', d.residentTax],
      ].filter(([, v]) => (v as number) > 0)

      if (deductionRows.length > 0) {
        lines.push('## 控除内訳（直近月）')
        lines.push('')
        lines.push('| 項目 | 金額 |')
        lines.push('|---|---|')
        for (const [label, value] of deductionRows) {
          lines.push(`| ${label} | ${formatYen(value as number)} |`)
        }
        lines.push('')
      }

      lines.push('---')
      lines.push('')
    }

    if (years.length > 0) {
      lines.push('## 年間集計')
      lines.push('')
      lines.push('| 年 | 総支給 | 手取り | 控除 | 賞与手取り | 給与月数 |')
      lines.push('|---|---|---|---|---|---|')
      for (const year of years) {
        const totals = annualTotals(payslips, year)
        const bonusNetPay = payslips
          .filter((p) => p.year === year && p.payslipType === 'bonus')
          .reduce((s, p) => s + p.summary.netPay, 0)
        const label =
          year === currentYear && totals.monthlyMonthCount < 12
            ? `${year}（YTD ${totals.monthlyMonthCount}ヶ月）`
            : `${year}`
        lines.push(
          `| ${label} | ${formatYen(totals.totalIncome)} | ${formatYen(totals.totalNetPay)} | ${formatYen(totals.totalDeductions)} | ${bonusNetPay > 0 ? formatYen(bonusNetPay) : '—'} | ${totals.monthlyMonthCount} |`,
        )
      }
      lines.push('')
      lines.push('---')
      lines.push('')
    }

    const recentMonthly = [...monthlySlips]
      .sort((a, b) => a.year * 100 + a.month - (b.year * 100 + b.month))
      .slice(-6)

    if (recentMonthly.length > 0) {
      lines.push('## 残業・みなし残業差額推移（直近最大6ヶ月）')
      lines.push('')
      lines.push('| 月 | 残業時間 | みなし残業差額 |')
      lines.push('|---|---|---|')
      for (const p of recentMonthly) {
        const gain = calcOvertimeGain(p, settings)
        const gainStr = `${gain >= 0 ? '+' : ''}${formatYen(gain)}`
        lines.push(
          `| ${p.year}/${String(p.month).padStart(2, '0')} | ${p.attendance.overtimeHours.toFixed(1)}h | ${gainStr} |`,
        )
      }
      lines.push('')
    }

    return lines.join('\n')
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(generateReport())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select a textarea
    }
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

  const latestMonthly = latestPayslip(
    payslips.filter((p) => !p.payslipType || p.payslipType === 'monthly'),
  )
  const previewDeemed = latestMonthly
    ? getIncomeValueByLabel(latestMonthly.income, deemedLabel.trim())
    : null
  const activeActualLabels = actualLabels.filter((l) => l.trim())
  const previewActualBreakdown = latestMonthly
    ? activeActualLabels.map((l) => ({
        label: l,
        value: getIncomeValueByLabel(latestMonthly.income, l.trim()),
      }))
    : []
  const previewActualTotal = previewActualBreakdown.reduce((s, r) => s + r.value, 0)
  const previewGain = previewDeemed !== null ? previewDeemed - previewActualTotal : null

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

        {latestMonthly ? (
          <div className="bg-brand-50 rounded-lg border border-brand-200 px-3 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-brand-700 mb-2">
              試算プレビュー（{latestMonthly.year}年{latestMonthly.month}月分）
            </p>
            <div className="flex justify-between text-xs text-gray-600">
              <span>{deemedLabel.trim() || 'みなし残業'}</span>
              <span
                className="font-mono"
                style={{ color: (previewDeemed ?? 0) === 0 ? '#9ca3af' : undefined }}
              >
                {(previewDeemed ?? 0) === 0 ? '¥0 (未検出)' : fmt(previewDeemed ?? 0)}
              </span>
            </div>
            {previewActualBreakdown.map((row, i) => (
              <div key={i} className="flex justify-between text-xs text-gray-500 pl-2">
                <span>−&nbsp;{row.label}</span>
                <span
                  className="font-mono"
                  style={{ color: row.value === 0 ? '#9ca3af' : undefined }}
                >
                  {row.value === 0 ? '¥0 (未検出)' : fmt(row.value)}
                </span>
              </div>
            ))}
            <div className="border-t border-brand-200 pt-1.5 flex justify-between text-xs font-semibold">
              <span className="text-gray-700">差額</span>
              <span
                className="font-mono"
                style={{ color: (previewGain ?? 0) >= 0 ? '#5fad9b' : '#d06868' }}
              >
                {previewGain !== null
                  ? `${previewGain >= 0 ? '+' : ''}${fmt(previewGain)}`
                  : '—'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400 px-1">
            明細データがありません。MHTファイルをアップロードするとプレビューが表示されます。
          </p>
        )}

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

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div>
          <p className="text-sm font-bold text-gray-600 flex items-center gap-2">
            <span className="w-1 h-4 bg-gray-400 rounded-full inline-block"></span>
            AI分析メモ
          </p>
          <p className="text-xs text-gray-400 mt-1">
            状況・目標・前提条件などを自由に記載します。AI出力テキストの先頭に含まれます。
          </p>
        </div>
        <textarea
          value={aiMemo}
          onChange={(e) => { setAiMemo(e.target.value); setSavedMemo(false) }}
          placeholder={`例:\n40代独身。みなし残業の消化率を改善したい。\niDeCo月2.3万拠出中。ふるさと納税の上限を毎年確認したい。`}
          rows={5}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSaveAiMemo}
            className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
          >
            {savedMemo ? '保存しました ✓' : '保存する'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div>
          <p className="text-sm font-bold text-gray-600 flex items-center gap-2">
            <span className="w-1 h-4 bg-gray-400 rounded-full inline-block"></span>
            AI用テキスト出力
          </p>
          <p className="text-xs text-gray-400 mt-1">
            給与データをMarkdown形式でクリップボードにコピーします。Claude・ChatGPT等に貼り付けて分析できます。氏名・会社名は含まれません。
          </p>
        </div>
        {payslips.length === 0 ? (
          <p className="text-xs text-gray-400 px-1">明細データがありません。MHTファイルをアップロードすると出力できます。</p>
        ) : (
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-brand-200 text-sm text-brand-700 hover:bg-brand-50 transition-colors"
          >
            <span className="font-medium">{copied ? 'コピーしました ✓' : 'テキストをコピー'}</span>
            <span className="text-xs text-gray-400">
              {payslips.length}件 / {uniqueYears(payslips).length}年分
            </span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-700">データ管理</p>
          <p className="text-xs text-gray-400 mt-0.5">データはすべてブラウザ内のみに保存されています</p>
        </div>
        <div className="space-y-2">
          <button
            onClick={handleExportJSON}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span>JSONでバックアップ</span>
            <span className="text-xs text-gray-400">全データ・完全復元可</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span>CSVでエクスポート</span>
            <span className="text-xs text-gray-400">Excel・スプレッドシート用</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportJSON}
          />
          <div
            onClick={() => { setImportStatus('idle'); fileInputRef.current?.click() }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm cursor-pointer transition-colors select-none ${
              isDragging
                ? 'border-dashed border-brand-400 bg-brand-50 text-brand-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>JSONから復元</span>
            <span className={`text-xs ${isDragging ? 'text-brand-500' : 'text-gray-400'}`}>
              {isDragging ? 'ドロップして復元' : 'ファイルを選択またはドロップ'}
            </span>
          </div>
          {importStatus === 'success' && (
            <p className="text-xs px-1" style={{ color: '#5fad9b' }}>復元が完了しました</p>
          )}
          {importStatus === 'error' && (
            <p className="text-xs px-1" style={{ color: '#d06868' }}>ファイルの形式が正しくありません</p>
          )}
        </div>
      </div>
    </div>
  )
}
