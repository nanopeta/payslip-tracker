import { useState } from 'react'
import { Link } from 'react-router-dom'
import useStore from '../store/useStore'
import PayslipCard from '../components/payslip/PayslipCard'
import { formatYen } from '../lib/formatters'

export default function PayslipsPage() {
  const payslips = useStore((s) => s.payslips)
  const deletePayslips = useStore((s) => s.deletePayslips)

  const [selecting, setSelecting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filterYear, setFilterYear] = useState<number | 'all'>('all')
  const [filterMonth, setFilterMonth] = useState<number | 'all'>('all')
  const [filterType, setFilterType] = useState<'all' | 'monthly' | 'bonus'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<'date-desc' | 'date-asc' | 'netpay-desc' | 'income-desc'>('date-desc')

  const sorted = [...payslips].sort((a, b) => {
    switch (sortOrder) {
      case 'date-asc':
        return (a.year * 100 + a.month) - (b.year * 100 + b.month)
      case 'netpay-desc':
        return b.summary.netPay - a.summary.netPay
      case 'income-desc':
        return b.income.total - a.income.total
      default:
        return (b.year * 100 + b.month) - (a.year * 100 + a.month)
    }
  })

  const years = [...new Set(payslips.map((p) => p.year))].sort((a, b) => b - a)
  const hasBonusData = payslips.some((p) => p.payslipType === 'bonus')

  function matchesSearch(p: typeof sorted[0]): boolean {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true

    const yearMonthFull = `${p.year}年${p.month}月`
    const yearMonthSlash = `${p.year}/${String(p.month).padStart(2, '0')}`
    if (yearMonthFull.includes(q) || yearMonthSlash.includes(q)) return true
    if (`${p.year}`.startsWith(q) || `${p.month}月` === q) return true

    const qDigits = q.replace(/[^0-9]/g, '')
    if (qDigits.length >= 4) {
      if (String(p.income.total).includes(qDigits)) return true
      if (String(p.summary.netPay).includes(qDigits)) return true
    }

    if (p.employeeName?.toLowerCase().includes(q)) return true
    if (p.companyName?.toLowerCase().includes(q)) return true
    if (p.payslipLabel?.toLowerCase().includes(q)) return true

    return false
  }

  const filtered = sorted.filter((p) => {
    if (filterYear !== 'all' && p.year !== filterYear) return false
    if (filterMonth !== 'all' && p.month !== filterMonth) return false
    if (filterType === 'monthly' && p.payslipType === 'bonus') return false
    if (filterType === 'bonus' && p.payslipType !== 'bonus') return false
    if (!matchesSearch(p)) return false
    return true
  })

  // filterYear === 'all' かつ日付ソートのとき年別グループを生成
  const groupedByYear = filterYear === 'all' && sortOrder.startsWith('date')
    ? (() => {
        const yearMap = new Map<number, typeof filtered>()
        for (const p of filtered) {
          if (!yearMap.has(p.year)) yearMap.set(p.year, [])
          yearMap.get(p.year)!.push(p)
        }
        return [...yearMap.entries()]
          .sort(([a], [b]) => b - a)
          .map(([year, items]) => ({
            year,
            items,
            count: items.length,
            totalNetPay: items.reduce((sum, p) => sum + p.summary.netPay, 0),
          }))
      })()
    : null

  const filteredIndexMap = new Map(filtered.map((p, i) => [p.id, i]))

  function resetSelection() {
    setSelectedIds(new Set())
    setSelecting(false)
  }

  const isFiltered = filtered.length < payslips.length || filterYear !== 'all' || filterType !== 'all' || filterMonth !== 'all' || searchQuery.trim() !== ''
  const filteredNetPayTotal = filtered.reduce((sum, p) => sum + p.summary.netPay, 0)
  const filteredNetPayAvg = filtered.length > 0 ? Math.round(filteredNetPayTotal / filtered.length) : 0

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleDeleteSelected() {
    if (!window.confirm(`選択した ${selectedIds.size} 件を削除しますか？`)) return
    deletePayslips([...selectedIds])
    setSelectedIds(new Set())
    setSelecting(false)
  }

  function cancelSelecting() {
    setSelecting(false)
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">給与明細</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filtered.length === payslips.length ? `${payslips.length}件` : `${filtered.length} / ${payslips.length}件`}</p>
        </div>
        <div className="flex items-center gap-2">
          {selecting ? (
            <>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  削除 ({selectedIds.size}件)
                </button>
              )}
              <button
                onClick={cancelSelecting}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
            </>
          ) : (
            <>
              {payslips.length > 0 && (
                <button
                  onClick={() => setSelecting(true)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  選択削除
                </button>
              )}
              <Link
                to="/upload"
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                追加
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      {payslips.length > 0 && (
        <div className="space-y-2">
        <div className="flex flex-nowrap md:flex-wrap gap-2 items-center overflow-x-auto pb-1 md:pb-0">
          <select
            value={filterYear}
            onChange={(e) => {
              const val = e.target.value === 'all' ? 'all' : Number(e.target.value)
              setFilterYear(val)
              if (val === 'all') setFilterMonth('all')
              resetSelection()
            }}
            className="flex-shrink-0 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
          >
            <option value="all">すべての年</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          {hasBonusData && (
            <div className="flex-shrink-0 flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {(['all', 'monthly', 'bonus'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setFilterType(t); resetSelection() }}
                  className={`px-3 py-1.5 transition-colors ${filterType === t ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  {t === 'all' ? 'すべて' : t === 'monthly' ? '給与' : '賞与'}
                </button>
              ))}
            </div>
          )}
          <div className="flex-shrink-0 flex rounded-lg border border-gray-200 overflow-hidden text-sm md:ml-auto">
            {(
              [
                { key: 'date-desc', label: '新しい順' },
                { key: 'date-asc', label: '古い順' },
                { key: 'netpay-desc', label: '手取り↓' },
                { key: 'income-desc', label: '総支給↓' },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setSortOrder(key); resetSelection() }}
                className={`px-3 py-1.5 transition-colors ${sortOrder === key ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {filterYear !== 'all' && (
          <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => { setFilterMonth('all'); resetSelection() }}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-sm transition-colors ${filterMonth === 'all' ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              すべて
            </button>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <button
                key={m}
                onClick={() => { setFilterMonth(m); resetSelection() }}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-sm transition-colors ${filterMonth === m ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                {m}月
              </button>
            ))}
          </div>
        )}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); resetSelection() }}
            placeholder="年月・金額・氏名で検索 (例: 2026年5月 / 300000)"
            className="w-full pl-9 pr-8 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); resetSelection() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          {payslips.length === 0 ? (
            <>
              <p>給与明細がありません</p>
              <p className="text-sm mt-1">MHTをアップロードして追加してください</p>
            </>
          ) : (
            <p>条件に一致する明細がありません</p>
          )}
        </div>
      ) : groupedByYear ? (
        <div className="space-y-6">
          {groupedByYear.map(({ year, items, count, totalNetPay }) => (
            <div key={year}>
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-200">
                <span className="font-semibold text-gray-700">{year}年</span>
                <span className="text-gray-400 text-sm">·</span>
                <span className="text-gray-500 text-sm">{count}件</span>
                <span className="text-gray-400 text-sm">·</span>
                <span className="text-gray-500 text-sm">手取合計 <span className="font-medium text-gray-700">{formatYen(totalNetPay)}</span></span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((p) => {
                  const fi = filteredIndexMap.get(p.id)!
                  return (
                    <div key={p.id} className="relative">
                      {selecting && (
                        <button
                          onClick={() => toggleSelect(p.id)}
                          className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            selectedIds.has(p.id)
                              ? 'bg-brand-600 border-brand-600'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          {selectedIds.has(p.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      )}
                      <div
                        onClick={selecting ? () => toggleSelect(p.id) : undefined}
                        className={selecting ? 'cursor-pointer' : ''}
                      >
                        <PayslipCard
                          payslip={p}
                          prevNetPay={sortOrder === 'date-desc' ? filtered[fi + 1]?.summary.netPay : undefined}
                          searchQuery={searchQuery}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((p, i) => (
            <div key={p.id} className="relative">
              {selecting && (
                <button
                  onClick={() => toggleSelect(p.id)}
                  className={`absolute top-2 left-2 z-10 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedIds.has(p.id)
                      ? 'bg-brand-600 border-brand-600'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {selectedIds.has(p.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )}
              <div
                onClick={selecting ? () => toggleSelect(p.id) : undefined}
                className={selecting ? 'cursor-pointer' : ''}
              >
                <PayslipCard
                  payslip={p}
                  prevNetPay={sortOrder === 'date-desc' ? filtered[i + 1]?.summary.netPay : undefined}
                  searchQuery={searchQuery}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {isFiltered && filtered.length > 0 && (
        <div className="bg-white rounded-xl border border-brand-200 shadow-sm px-5 py-3 flex flex-wrap gap-x-6 gap-y-1 items-center text-sm">
          <span className="text-gray-500">絞り込み <span className="font-semibold text-gray-800">{filtered.length}件</span></span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">手取合計 <span className="font-semibold text-gray-800">{formatYen(filteredNetPayTotal)}</span></span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-500">平均手取 <span className="font-semibold text-gray-800">{formatYen(filteredNetPayAvg)}</span></span>
        </div>
      )}
    </div>
  )
}
