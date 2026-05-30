import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DropZone from '../components/upload/DropZone'
import PayslipReviewForm from '../components/upload/PayslipReviewForm'
import WithholdingReviewForm from '../components/upload/WithholdingReviewForm'
import useStore from '../store/useStore'
import { parseMHTFile } from '../lib/mhtParser'
import type { ParseResult } from '../types/withholding'
import type { Payslip } from '../types/payslip'
import type { WithholdingTaxCertificate } from '../types/withholding'

type Step = 'idle' | 'parsing' | 'review'

export default function UploadPage() {
  const navigate = useNavigate()
  const addPayslip = useStore((s) => s.addPayslip)
  const addWithholdingCert = useStore((s) => s.addWithholdingCert)

  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState<string | null>(null)
  const [parseResults, setParseResults] = useState<ParseResult[]>([])
  const [reviewIndex, setReviewIndex] = useState(0)
  const [parsingTotal, setParsingTotal] = useState(0)
  const [parsingDone, setParsingDone] = useState(0)

  async function handleFiles(files: File[]) {
    setError(null)
    setParsingTotal(files.length)
    setParsingDone(0)
    setStep('parsing')

    const results: ParseResult[] = []
    const errors: string[] = []

    await Promise.all(files.map(async (file) => {
      try {
        const result = await parseMHTFile(file)
        if (result.type !== 'unknown') {
          if (result.payslip) result.payslip.sourceFileName = file.name
          if (result.withholding) result.withholding.sourceFileName = file.name
          results.push(result)
        } else {
          errors.push(`${file.name}: 給与明細として認識できませんでした`)
        }
      } catch (e) {
        errors.push(`${file.name}: ${e instanceof Error ? e.message : String(e)}`)
      }
      setParsingDone((n) => n + 1)
    }))

    if (results.length === 0) {
      setError(errors.join('\n') || '読み込めるファイルがありませんでした。')
      setStep('idle')
      return
    }

    // 年月順にソート
    results.sort((a, b) => {
      const ay = (a.payslip?.year ?? a.withholding?.year ?? 0) * 100 + (a.payslip?.month ?? 0)
      const by = (b.payslip?.year ?? b.withholding?.year ?? 0) * 100 + (b.payslip?.month ?? 0)
      return ay - by
    })

    if (errors.length > 0) setError(errors.join('\n'))
    setParseResults(results)
    setReviewIndex(0)
    setStep('review')
  }

  function handleSavePayslip(p: Payslip) {
    addPayslip(p)
    advance()
  }

  function handleSaveWithholding(w: WithholdingTaxCertificate) {
    addWithholdingCert(w)
    advance()
  }

  function advance() {
    const next = reviewIndex + 1
    if (next < parseResults.length) {
      setReviewIndex(next)
    } else {
      const hasPayslip = parseResults.some((r) => r.type === 'payslip')
      navigate(hasPayslip ? '/payslips' : '/annual')
    }
  }

  function handleCancel() {
    setStep('idle')
    setParseResults([])
    setReviewIndex(0)
    setError(null)
  }

  const currentResult = parseResults[reviewIndex]
  const total = parseResults.length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">MHTアップロード</h1>
        <p className="text-gray-500 text-sm mt-0.5">明細書照会ページをMHTで保存して登録</p>
      </div>

      <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <svg className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-sm text-brand-700">
          MHTファイルはブラウザ内のみで処理。外部に送信されません。
        </p>
      </div>

      {step === 'idle' && (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 whitespace-pre-wrap">
              {error}
            </div>
          )}
          <DropZone onFiles={handleFiles} />
        </>
      )}

      {step === 'parsing' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-gray-700 font-medium">MHTを解析中...</p>
            <p className="text-gray-400 text-sm mt-1">{parsingDone} / {parsingTotal} 件</p>
          </div>
        </div>
      )}

      {step === 'review' && currentResult && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="font-semibold text-gray-800">内容を確認・編集してください</p>
              {total > 1 && (
                <p className="text-sm text-gray-500 mt-0.5">{reviewIndex + 1} / {total} 件目</p>
              )}
            </div>
            {currentResult.confidence < 0.5 && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                自動解析の精度が低い場合があります
              </span>
            )}
          </div>
          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 whitespace-pre-wrap">
              {error}
            </div>
          )}
          {currentResult.type === 'payslip' && currentResult.payslip && (
            <PayslipReviewForm
              initial={currentResult.payslip}
              onSave={handleSavePayslip}
              onCancel={handleCancel}
            />
          )}
          {currentResult.type === 'withholding' && currentResult.withholding && (
            <WithholdingReviewForm
              initial={currentResult.withholding}
              onSave={handleSaveWithholding}
              onCancel={handleCancel}
            />
          )}
        </div>
      )}
    </div>
  )
}
