import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DropZone from '../components/upload/DropZone'
import PayslipReviewForm from '../components/upload/PayslipReviewForm'
import WithholdingReviewForm from '../components/upload/WithholdingReviewForm'
import useStore from '../store/useStore'
import { parsePDF } from '../lib/pdfParser'
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
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [fileName, setFileName] = useState('')

  async function handleFile(file: File) {
    setError(null)
    setFileName(file.name)
    setStep('parsing')
    try {
      const result = await parsePDF(file)
      if (result.type === 'unknown') {
        setError('給与明細または源泉徴収票として認識できませんでした。別のPDFを試してください。')
        setStep('idle')
        return
      }
      if (result.payslip) result.payslip.sourceFileName = file.name
      if (result.withholding) result.withholding.sourceFileName = file.name
      setParseResult(result)
      setStep('review')
    } catch (e) {
      setError(`PDFの読み込みに失敗しました: ${e instanceof Error ? e.message : String(e)}`)
      setStep('idle')
    }
  }

  function handleSavePayslip(p: Payslip) {
    addPayslip(p)
    navigate('/payslips')
  }

  function handleSaveWithholding(w: WithholdingTaxCertificate) {
    addWithholdingCert(w)
    navigate('/annual')
  }

  function handleCancel() {
    setStep('idle')
    setParseResult(null)
    setError(null)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">PDFアップロード</h1>
        <p className="text-gray-500 text-sm mt-0.5">給与明細・源泉徴収票のPDFを登録</p>
      </div>

      <div className="bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
        <svg className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-sm text-brand-700">
          PDFはブラウザ内のみで処理。外部に送信されません。
        </p>
      </div>

      {step === 'idle' && (
        <>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <DropZone onFile={handleFile} />
        </>
      )}

      {step === 'parsing' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-gray-700 font-medium">解析中...</p>
            <p className="text-gray-400 text-sm mt-1">{fileName}</p>
          </div>
        </div>
      )}

      {step === 'review' && parseResult?.type === 'payslip' && parseResult.payslip && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="font-semibold text-gray-800">内容を確認・編集してください</p>
            {parseResult.confidence < 0.5 && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                自動解析の精度が低い場合があります
              </span>
            )}
          </div>
          <PayslipReviewForm
            initial={parseResult.payslip}
            onSave={handleSavePayslip}
            onCancel={handleCancel}
          />
        </div>
      )}

      {step === 'review' && parseResult?.type === 'withholding' && parseResult.withholding && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="font-semibold text-gray-800">内容を確認・編集してください</p>
            {parseResult.confidence < 0.5 && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full">
                自動解析の精度が低い場合があります
              </span>
            )}
          </div>
          <WithholdingReviewForm
            initial={parseResult.withholding}
            onSave={handleSaveWithholding}
            onCancel={handleCancel}
          />
        </div>
      )}
    </div>
  )
}
