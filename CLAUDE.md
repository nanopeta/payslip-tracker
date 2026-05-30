# CLAUDE.md

## プロジェクト概要

給与明細・源泉徴収票の MHT ファイルをアップロードして管理・可視化する React SPA。
バックエンドなし。データはすべて localStorage に保存。外部にデータは送信されない。

- **本番URL**: https://nanopeta.github.io/payslip-tracker/
- **対象システム**: OBC 給与システム（hromssp.obc.jp）の MHT 保存ファイル
- **対応会社**: GMOリサーチ&AI株式会社

---

## よく使うコマンド

```bash
npm run dev      # 開発サーバー起動 (http://localhost:5173/payslip-tracker/)
npm run build    # 本番ビルド（tsc -b && vite build）
npm run preview  # ビルド結果をローカルでプレビュー
```

---

## 技術スタック

| ライブラリ | バージョン | 用途 |
|---|---|---|
| React | 18.3.1 | UIフレームワーク |
| Vite | 6.3.5 | ビルドツール |
| TypeScript | 5.8.3 | 型チェック |
| Tailwind CSS | **3.4.19（固定）** | スタイリング |
| Recharts | 2.15.3 | チャート描画 |
| Zustand | 5.0.3 | 状態管理 |
| React Router | 6.28.0 | ルーティング |
| pdfjs-dist | 5.2.133 | PDF解析（現在ほぼ未使用） |
| uuid | 11.1.0 | ID生成 |

> **注意**: Tailwind は `3.4.19` に固定。`npm install tailwindcss` で最新版（v4）に上がると設定が壊れる。

---

## ディレクトリ構成

```
src/
├── types/
│   ├── payslip.ts          # Payslip, PayslipIncome/Deductions/Attendance/Summary 型定義
│   └── withholding.ts      # WithholdingTaxCertificate, ParseResult 型定義
├── lib/
│   ├── storage.ts          # localStorage CRUD + OvertimeSettings
│   ├── mhtParser.ts        # MHTファイル解析（メイン）
│   ├── pdfParser.ts        # PDF解析（旧・ほぼ未使用）
│   ├── formatters.ts       # 円表示・和暦・時間フォーマット
│   └── aggregations.ts     # 月次集計・年次集計・みなし残業計算
├── store/
│   └── useStore.ts         # Zustand store（localStorage と同期）
├── components/
│   ├── layout/             # Sidebar（PC）、BottomNav（スマホ）、Layout
│   ├── ui/                 # StatCard
│   ├── charts/             # NetPayTrendChart（折れ線）、IncomeDeductionChart（棒）
│   ├── payslip/            # PayslipCard、PayslipDetailView
│   ├── withholding/        # WithholdingCard
│   └── upload/             # DropZone、PayslipReviewForm、WithholdingReviewForm
└── pages/
    ├── DashboardPage.tsx   # ダッシュボード（月次集計・チャート）
    ├── PayslipsPage.tsx    # 給与明細一覧（一括削除機能あり）
    ├── PayslipDetailPage.tsx
    ├── AnnualSummaryPage.tsx
    ├── UploadPage.tsx      # MHTアップロード（複数ファイル対応）
    └── SettingsPage.tsx    # みなし残業設定
```

---

## データモデル（主要型）

```typescript
// types/payslip.ts

interface PayslipIncome {
  basicSalary: number          // 基本給
  wlbAllowance: number         // ワークライフバランス手当
  deemedOvertime: number       // みなし残業
  lifePlanAllowance: number    // ライフプラン手当
  commuteAdjustment: number    // 通勤費調整
  thankYouAllowance: number    // サンキュー手当
  zoomAllowance: number        // ZOOM手当
  adjustmentSalary: number     // 調整給
  commuteAllowance: number     // 通勤手当
  taxableCommuteAllowance: number
  overtime: number             // 普通残業①（旧フィールド、detailIncome に移行中）
  lifePlanSupport: number      // ライフプラン支援（旧フィールド、detailIncome に移行中）
  otherIncome: Record<string, number>    // 未知の支給項目
  detailIncome: Record<string, number>   // 総支給金額以下の項目（合計に含めない）
  total: number                // 総支給金額
}

interface PayslipDeductions {
  healthInsurance: number      // 健康保険料
  longTermCareInsurance: number // 介護保険料
  pensionInsurance: number     // 厚生年金保険
  employmentInsurance: number  // 雇用保険料
  incomeTax: number            // 所得税
  residentTax: number          // 住民税
  deposit: number              // 預り金
  taxRefund: number            // 税還付
  expenseReimbursement: number // 経費精算
  healthInsuranceBenefit: number // 健保給付金
  temporaryChildcare: number   // 一時保育料
  advance: number              // 仮払金
  otherDeductions: Record<string, number>
  total: number                // 控除合計額
}

interface PayslipSummary {
  netPay: number               // 差引支給額
  bankTransfer: number         // 銀行１振込額
  extras?: Record<string, number> // 子育支援金など計算セクションの追加項目（動的）
}

interface Payslip {
  id: string
  year: number
  month: number
  payslipType?: 'monthly' | 'bonus'  // 未指定は monthly 扱い
  payslipLabel?: string              // 'ｲﾝｾﾝﾃｨﾌﾞ'、'賞与' など元ラベル文字列
  employeeName?: string
  companyName?: string
  income: PayslipIncome
  deductions: PayslipDeductions
  attendance: PayslipAttendance
  summary: PayslipSummary
  sourceFileName?: string
  createdAt: string
}
```

---

## localStorage スキーマ

| キー | 内容 |
|---|---|
| `payslip_tracker_v1` | `StorageState { version, payslips[], withholdingCerts[] }` |
| `payslip_tracker_settings` | `OvertimeSettings { deemedLabel, actualLabels[] }` |

- バージョンが変わったらデータを空リセット
- 初回アクセスは空状態スタート（サンプルデータなし）
- 設定のみ別キーで保存（データ削除時も設定は保持）

### OvertimeSettings の旧形式マイグレーション

旧: `{ actualLabel: string }` → 新: `{ actualLabels: string[] }`

`loadSettings()` 内で自動マイグレーション済み。

---

## MHT ファイル解析（mhtParser.ts）

### 対応ファイル形式

OBC 給与システム（hromssp.obc.jp）から「名前を付けて保存（MHT/MHTML形式）」したファイル。

### 解析フロー

1. `file.text()` で文字列取得
2. `extractHTML()`: `<!DOCTYPE html>` から MIME 境界（`\n------`）の直前まで抽出
3. 年月・種別を `targetPaymentTime` div から取得
4. セクション境界を位置で特定（勤怠他 / 支給 / 控除 / 計算）
5. `extractPairs()` / `extractCalcPairs()` で各セクションのラベル-値ペアを抽出

### 年月・種別の取得優先順位

1. `<div class="targetPaymentTime-..."><h>2026年 5月分 給与</h></div>`
2. `<option selected>2026年5月</option>`（ドロップダウン）
3. ページ内の `YYYY年MM月分 XXX` パターン

`月分` の後のラベル（給与 / 賞与 / ｲﾝｾﾝﾃｨﾌﾞ等）で `payslipType` を判別:
- `給与` → `payslipType = 'monthly'`
- それ以外 → `payslipType = 'bonus'`、`payslipLabel` にラベル文字列を保存

### HTMLラベルの特殊ケース

| 特殊ラベル | 処理 |
|---|---|
| `ワークライフバ` | HTMLで切れている → `wlbAllowance` に マップ |
| `ﾗｲﾌﾌﾟﾗﾝ` | 1回目（総支給前）→ `lifePlanAllowance`、2回目→ `detailIncome['ライフプラン支援']` |
| 総支給金額より後の項目 | `income.detailIncome` に格納（合計に含めない） |
| 計算セクションの差引支給額・銀行振込以外 | `summary.extras` に格納 |

### decodeHTML の変換

- `&nbsp;` → スペース
- `<タグ>` を除去
- 全角スペース（`　`）を除去
- 連続スペースを除去（`所　得　税` → `所得税`）

---

## ダッシュボード集計ロジック（aggregations.ts）

### netPayTrend（月次集計）

同月に複数の明細（給与＋インセンティブ等）がある場合、月ごとに合算。
各 `TrendPoint` には以下を含む:
- `netPay`: 全種別合計
- `monthlyNetPay`: `payslipType === 'monthly'` のみ
- `bonusNetPay`: `payslipType === 'bonus'` のみ

### calcOvertimeGain

```
みなし残業 − (actualLabels の合計) = 差額
```

複数の実残業ラベルをすべて合算して差額を計算。

### getIncomeValueByLabel

ラベル文字列から数値を取得する優先順位:
1. `INCOME_LABEL_FIELDS` の既知フィールド
2. `income.detailIncome[label]`
3. `income.otherIncome[label]`

---

## ルーティング（App.tsx）

```
/payslip-tracker/             → DashboardPage
/payslip-tracker/payslips     → PayslipsPage
/payslip-tracker/payslips/:id → PayslipDetailPage
/payslip-tracker/upload       → UploadPage
/payslip-tracker/annual       → AnnualSummaryPage
/payslip-tracker/settings     → SettingsPage
```

`<BrowserRouter basename={import.meta.env.BASE_URL}>` で GitHub Pages のサブパスに対応。

---

## レスポンシブ対応（Layout.tsx）

| 画面幅 | レイアウト |
|---|---|
| スマホ（`< md`） | BottomNav（4タブ） + コンテンツフル幅 |
| PC（`md:` 以上） | Sidebar 左固定（`w-56`）+ `ml-56` でコンテンツをオフセット |

---

## デプロイ

- `main` ブランチへのプッシュで `.github/workflows/deploy.yml` が自動実行
- GitHub Pages のソース設定: **GitHub Actions**（Settings > Pages で要設定）
- ビルド: `npm ci && npm run build` → `dist/` を Pages にデプロイ

---

## 既知の問題と対処法

### GitHub Pages でサブルートのリロードが 404 になる

**原因**: SPA のルート（`/payslips` 等）で直接リロード・プルトゥリフレッシュすると、GitHub Pages がファイルを探して見つからず 404 を返す。

**対処**: `public/404.html` でパスをクエリパラメータにエンコードして `index.html` へリダイレクト。`index.html` 側でパスを復元。→ **実装済み**

---

### MHT ファイルの年月が取得できない

**原因**: `targetPaymentTime` div のクラス名が異なる、または構造が違うOBCバージョン。

**確認方法**: ブラウザの開発者ツールで MHT のHTMLを確認。`targetPaymentTime` を含む要素を探す。

**対処**: `mhtParser.ts` の正規表現を調整。フォールバックとして `<option selected>` やページ内テキストから取得する仕組みが既にある。

---

### MHT で項目の値が別の項目の値になる（ずれ）

**原因**: OBC HTML で `itemHeader` と `itemData` が同一 `<tr>` に収まっていない場合、`extractPairs()` が正しくペアリングできない。

**確認方法**: `extractPairs()` を `console.log` デバッグ。

**対処**: `extractPairs()` の `<tr>` 解析正規表現を調整するか、問題のラベルを `INCOME_LABELS` / `DEDUCTION_LABELS` のマッピングに追加。

---

### 複数ファイルアップロードで同じデータになる

**原因**: `PayslipReviewForm` の `useState` は初回レンダリング時しか初期値を使わない（Reactの仕様）。

**対処**: `UploadPage.tsx` で `<PayslipReviewForm key={reviewIndex} ...>` と `key` を付けて強制再マウント。→ **実装済み**

---

### Tailwind CSS が v4 にアップグレードされた

**原因**: `npm install tailwindcss` で最新版（v4）が入ると設定形式が変わり壊れる。

**対処**: `package.json` で `"tailwindcss": "3.4.19"` に固定されているため通常は発生しない。壊れた場合は `npm install tailwindcss@3.4.19` で戻す。

---

### actualLabel（旧設定）が機能しない

**原因**: 旧バージョンの設定が `{ actualLabel: string }` 形式でlocalStorageに残っている。

**対処**: `loadSettings()` で自動マイグレーション済み（`actualLabel` → `actualLabels: [actualLabel]`）。手動で直す場合はブラウザのdevToolsで `payslip_tracker_settings` キーを削除してリロード。

---

## 開発時の注意点

### 新しい支給・控除項目を追加したいとき

1. `src/lib/mhtParser.ts` の `INCOME_LABELS` または `DEDUCTION_LABELS` にラベル→フィールド名のマッピングを追加
2. `src/types/payslip.ts` の `PayslipIncome` / `PayslipDeductions` にフィールドを追加
3. `emptyIncome()` / `emptyDeductions()` の初期値に `0` を追加
4. `PayslipReviewForm.tsx` の入力欄に `<NumInput>` を追加
5. `PayslipDetailView.tsx` の表示行に `<Row>` を追加
6. `aggregations.ts` の `calcIncomeSum` / `calcDeductionSum` に加算を追加

### 新しいページを追加したいとき

1. `src/pages/NewPage.tsx` を作成
2. `src/App.tsx` に `<Route path="new-page" element={<NewPage />} />` を追加
3. `src/components/layout/Sidebar.tsx` にリンクを追加
4. `src/components/layout/BottomNav.tsx` にタブを追加（スマホ用）
