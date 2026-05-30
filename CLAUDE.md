# CLAUDE.md

## プロジェクト概要

給与明細・源泉徴収票のPDFをアップロードして管理・可視化するReact SPAです。
バックエンドなし。データはすべてlocalStorageに保存。

## よく使うコマンド

```bash
npm run dev      # 開発サーバー起動 (http://localhost:5173/payslip-tracker/)
npm run build    # 本番ビルド
npm run preview  # ビルド結果をローカルでプレビュー
```

## ディレクトリ構成

```
src/
├── types/
│   ├── payslip.ts        # Payslip型、PayslipIncome/Deductions/Attendance
│   └── withholding.ts    # WithholdingTaxCertificate型、ParseResult型
├── lib/
│   ├── storage.ts        # localStorage CRUD（空状態でスタート）
│   ├── pdfParser.ts      # pdfjs-distでPDF解析・フィールド抽出
│   ├── formatters.ts     # 円表示・和暦・時間フォーマット
│   └── aggregations.ts   # 月次推移・年次集計の計算
├── store/
│   └── useStore.ts       # Zustand store（storageと同期）
├── components/
│   ├── layout/           # Sidebar（PC）、BottomNav（スマホ）、Layout
│   ├── ui/               # StatCard
│   ├── charts/           # NetPayTrendChart、IncomeDeductionChart
│   ├── payslip/          # PayslipCard、PayslipDetailView
│   ├── withholding/      # WithholdingCard
│   └── upload/           # DropZone、PayslipReviewForm、WithholdingReviewForm
└── pages/
    ├── DashboardPage.tsx
    ├── PayslipsPage.tsx
    ├── PayslipDetailPage.tsx
    ├── AnnualSummaryPage.tsx
    └── UploadPage.tsx
```

## 重要な設計ポイント

### PDF解析（pdfParser.ts）
- `pdfjsLib.GlobalWorkerOptions.workerSrc = \`${import.meta.env.BASE_URL}pdf.worker.min.mjs\``
  - `import.meta.env.BASE_URL` を使う。絶対パス `/pdf.worker.min.mjs` はGitHub Pagesで動かない
- テキスト抽出後にY座標降順→X座標昇順でソートして読み順を復元
- キーワード近傍スキャンでフィールドを抽出（`findValueAfter`関数）
- 全角数字（０-９）を半角に正規化してからparseInt

### ルーティング（App.tsx）
- `<BrowserRouter basename={import.meta.env.BASE_URL}>` でGitHub Pagesのサブパスに対応
- `import.meta.env.BASE_URL` はvite.configの `base: '/payslip-tracker/'` から自動設定

### レスポンシブ対応（Layout.tsx）
- スマホ（`< md`）: BottomNav（4タブ） + コンテンツフル幅
- PC（`md:`以上）: Sidebar左固定 + `ml-56` でコンテンツをオフセット

### localStorageスキーマ
- キー: `payslip_tracker_v1`
- 初回アクセス時はデータ空（シーディングなし）
- バージョンが変わったら空にリセット

## 対応PDFフォーマット

### 給与明細（支給明細書）
GMOリサーチ&AI株式会社のフォーマット。以下のキーワードで判別:
`給与明細` / `総支給金額` / `差引支給額`

### 源泉徴収票
以下のキーワードで判別: `源泉徴収票` + `支払金額`

## デプロイ

- `main` ブランチへのプッシュで `.github/workflows/deploy.yml` が自動実行
- GitHub Pages のソース設定: **GitHub Actions**（Settingsで要設定）
- 本番URL: https://nanopeta.github.io/payslip-tracker/

## pdfjs-dist のワーカーファイルについて

`postinstall` スクリプトで `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` を `public/` にコピー。
`npm install` 後に自動実行される。手動でコピーする場合:
```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/
```
