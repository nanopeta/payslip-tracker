import { useRef, useState } from 'react'

interface Props {
  onFile: (file: File) => void
  disabled?: boolean
}

export default function DropZone({ onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function isMHT(file: File): boolean {
    return file.name.toLowerCase().endsWith('.mht') || file.name.toLowerCase().endsWith('.mhtml')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && isMHT(file)) onFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center gap-3
        border-2 border-dashed rounded-xl p-12 cursor-pointer
        transition-colors select-none
        ${dragging ? 'border-brand-500 bg-brand-50' : 'border-gray-300 bg-white hover:border-brand-400 hover:bg-gray-50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".mht,.mhtml"
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <svg className={`w-12 h-12 ${dragging ? 'text-brand-500' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <div className="text-center">
        <p className="text-gray-700 font-medium">ここにMHTをドラッグ&amp;ドロップ</p>
        <p className="text-gray-400 text-sm mt-1">またはクリックしてファイルを選択</p>
        <p className="text-gray-400 text-xs mt-2">.mht / .mhtml 形式の給与明細に対応</p>
      </div>
    </div>
  )
}
