# CLAUDE.md

## Claude Code への指示（必読）

このプロジェクトで作業する際は以下のルールに従うこと。

### ブランチ・PR ワークフロー

1. **作業ブランチ**: `claude/<機能名>-<ランダムID>` 形式で作成（例: `claude/fix-parser-a1b2c3`）
2. **コミット**: 日本語メッセージ、末尾に `https://claude.ai/code/session_...` を付ける
3. **プッシュ後は必ず PR を作成**（draft でよい）
4. **マージは確認不要**。PR 作成後そのままマージしてよい
5. `main` への直接プッシュは禁止。必ずフィーチャーブランチ経由

### ビルド確認

コードを変更したら必ず `npm run build` でエラーがないことを確認してからコミット。

### 実装変更時のチェックリスト

- [ ] `npm run build` が通ること（`tsc -b && vite build`）
- [ ] 既存のデータ型変更時は localStorage の後方互換性を確認
- [ ] `OvertimeSettings` の変更時は `loadSettings()` のマイグレーション処理を更新
- [ ] 新しい支給・控除項目追加時は「開発時の注意点」セクションの手順に従う

---

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

# エージェントチーム（AI 自律改善）
ANTHROPIC_API_KEY=sk-ant-... npm run agent-team             # Ctrl+C まで無限改善
npm run agent-team -- --sprint-size=3  # 1スプリント 3件で改善
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
| @anthropic-ai/sdk | 0.39+ | エージェントチーム（devDep） |
| tsx | 4.19+ | TypeScript スクリプト実行（devDep） |

> **注意**: Tailwind は `3.4.19` に固定。`npm install tailwindcss` で最新版（v4）に上がると設定が壊れる。

---

## ディレクトリ構成

```
scripts/
└── agent-team/
    └── index.ts            # エージェントチーム CLI（PM/Dev/Reviewer）
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
│   ├── charts/
│   │   ├── TrendSummaryChart.tsx      # 支給・手取りの推移（折れ線）★メイン
│   │   ├── PaidLeaveTrendChart.tsx    # 有給残日数の推移（棒グラフ）
│   │   ├── DeductionDonutChart.tsx    # 控除内訳ドーナツチャート（最新月）
│   │   ├── OvertimeHoursChart.tsx     # 残業時間推移（棒グラフ・45h参照線付き）
│   │   ├── NetPayTrendChart.tsx       # 旧・未使用
│   │   └── IncomeDeductionChart.tsx   # 旧・未使用
│   ├── payslip/
│   │   ├── PayslipCard.tsx            # 明細一覧のカード
│   │   ├── PayslipDetailView.tsx      # 1件の明細詳細
│   │   └── AnnualDetailView.tsx       # 年間集計詳細（PayslipDetailView スタイル）
│   ├── withholding/        # WithholdingCard
│   └── upload/             # DropZone、PayslipReviewForm（重複検出付き）、WithholdingReviewForm
└── pages/
    ├── DashboardPage.tsx   # ダッシュボード（YTD累計・チャート・みなし残業・控除内訳）
    ├── PayslipsPage.tsx    # 給与明細一覧（一括削除機能あり）
    ├── PayslipDetailPage.tsx
    ├── AnnualSummaryPage.tsx
    ├── UploadPage.tsx      # MHTアップロード（複数ファイル対応・重複検出）
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

## UI デザイン仕様

### 配色（資産管理ダッシュボードと統一）

```css
/* tailwind.config.cjs の brand パレット */
brand-50:  #f0f7fb
brand-100: #e6f0f5
brand-200: #c8dfe9
brand-300: #a0c8d8
brand-400: #7aafc5
brand-500: #6a9fb8
brand-600: #5b8fa8   /* ← メインカラー */
brand-700: #4a7a93
brand-800: #3a6078
brand-900: #2a4a5e

/* セマンティックカラー（インラインstyleで使用） */
--success: #5fad9b   /* プラス・手取り */
--danger:  #d06868   /* マイナス・控除 */

/* body */
background: #eef4f8
color:      #243447
```

- サイドバー: `bg-white border-r border-brand-200`、アクティブ: `bg-brand-100 text-brand-700`
- Tailwind クラスで brand-xxx を使うか、インライン `style={{ color: '#5fad9b' }}` で指定

### StatCard

```typescript
// highlight=true のときのグラデーション
background: 'linear-gradient(135deg, #2a5068 0%, #3d7490 50%, #4e8fa6 100%)'

// デルタ表示（前月比）
delta >= 0 → '+¥XX,XXX' (color: #5fad9b)
delta < 0  → '-¥XX,XXX' (color: #d06868)
```

Props: `title`, `value`, `sub?`, `delta?`（数値、¥付きで自動フォーマット）, `deltaText?`（文字列、`deltaPositive?` で色制御）, `highlight?`

### formatYen（formatters.ts）

```typescript
// ¥ プレフィックス形式（円マークは ¥ を使う）
formatYen(n) → '¥1,234,567'
```

### Recharts チャートの標準仕様

`TrendSummaryChart.tsx` を基準とした標準設定:

```typescript
<LineChart margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
  <XAxis
    dataKey="label"
    tick={{ fontSize: 11, fill: '#6b7280' }}
    interval={0}      // ← ラベルが飛ぶのを防ぐ（必須）
    angle={-30}
    textAnchor="end"
    height={48}
  />
  <YAxis
    tickFormatter={(v) => `¥${(v / 10000).toFixed(1)}万`}
    tick={{ fontSize: 11, fill: '#6b7280' }}
    width={62}
  />
  <Tooltip contentStyle={{ fontSize: 12, borderRadius: '8px' }} />
  <Legend wrapperStyle={{ fontSize: 12 }} />
```

- チャートデータは **左が古い・右が最新** の時系列順にソートして渡す
- Y軸の単位は `万` を使う（`k` は使わない）
- 複数の折れ線: 色は `#5b8fa8`（支給）、`#5fad9b`（手取り）、`#4a7a93`（給与のみ支給）、`#2d8a7a`（給与のみ手取り）

### 期間フィルターパターン

ダッシュボードの推移グラフで使っている共通パターン（`DashboardPage.tsx` 参照）:

```typescript
type PeriodFilter = 'all' | 'year' | '6m' | '12m'

// フィルター関数: label フィールドが "YYYY/MM" 形式であること
function applyPeriodFilter<T extends { label: string }>(
  rows: T[], filter: PeriodFilter, latestLabel: string
): T[]
```

> **注意**: `TrendPoint.yearMonth` は `"2026年5月"` 形式で、フィルターには使えない。
> フィルターには `"YYYY/MM"` 形式の `label` フィールドを使うこと。

フィルターUIは `PERIOD_FILTERS` 配列 + pill ボタン（選択中: `bg-brand-600 text-white`、未選択: `bg-gray-100 text-gray-500`）。

---

## みなし残業の計算仕様

```
DEEMED_HOURS = 45  // みなし残業時間（固定値）

みなし残業金額    = getIncomeValueByLabel(income, settings.deemedLabel)
実残業代合計      = settings.actualLabels の各ラベル金額の合算
差額（gain）      = みなし残業金額 − 実残業代合計

残業時給          = みなし残業金額 ÷ DEEMED_HOURS  （円/h、端数切捨て）
基本時給          = 残業時給 ÷ 1.25               （割増率 1.25 の逆算）
使用率            = 実残業時間 ÷ DEEMED_HOURS × 100 （%）
```

- `gain > 0`: みなし残業が余っている（お得）→ `#5fad9b`
- `gain < 0`: みなし残業を超過している（損）→ `#d06868`
- 基本時給は `overtimeHourlyRate > 0` のときのみ表示

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

### TrendPoint.yearMonth でフィルターが効かない

**原因**: `TrendPoint.yearMonth` は `"2026年5月"` 形式で格納されており、`"YYYY/MM"` を期待するフィルターロジックと形式が合わない。

**対処**: 期間フィルターには `label` フィールド（`"2026/05"` 形式）を使う。`applyPeriodFilter` のジェネリクスは `{ label: string }` で制約する。

---

### PR マージ時に conflicts が発生する

**原因**: squash merge で取り込まれた後、ブランチに残った元コミットが rebase 時に重複扱いになる。

**対処**:
```bash
git fetch origin main
git rebase origin/main   # skipped commits の警告が出ても正常
git push --force-with-lease origin <branch>
# → その後 GitHub で再マージ
```

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

---

## 開発環境セットアップ

```bash
# 初回セットアップ
npm install        # 依存パッケージのインストール（postinstall で pdf.worker.min.mjs もコピーされる）
npm run dev        # 開発サーバー起動（ http://localhost:5173/payslip-tracker/ ）

# ビルド確認
npm run build      # TypeScript チェック + Vite ビルド
npm run preview    # ビルド成果物をローカルで確認
```

### 推奨 VS Code 拡張

- **ESLint** (`dbaeumer.vscode-eslint`)
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- **TypeScript Vue Plugin** または **Volar** は不要（React プロジェクト）

### 環境変数

| 変数 | 値 | 用途 |
|---|---|---|
| `BASE_URL`（Vite 自動設定） | `/payslip-tracker/` | ルーティング・ワーカーパス |

`vite.config.ts` で `base: '/payslip-tracker/'` を設定済み。`import.meta.env.BASE_URL` で参照できる。

---

## GitHub Actions（CI/CD）

`.github/workflows/deploy.yml`:
- `main` ブランチへのプッシュで自動実行
- `npm ci && npm run build` → `dist/` を GitHub Pages にデプロイ
- デプロイ先: https://nanopeta.github.io/payslip-tracker/

### GitHub Pages の設定（初回のみ）

リポジトリの Settings > Pages > Source を **GitHub Actions** に変更する必要がある。

---

## よくある開発タスクのパターン

### MHT パーサーに新しいラベルを追加

```typescript
// src/lib/mhtParser.ts
const INCOME_LABELS: Record<string, string> = {
  // ...既存...
  '新しい手当': 'newAllowance',  // 追加
}
```

同時に `PayslipIncome` 型・`emptyIncome()` にも追加が必要（上記「新しい支給・控除項目を追加したいとき」参照）。

### ダッシュボードに新しい統計を追加

1. `src/lib/aggregations.ts` に集計関数を追加
2. `src/pages/DashboardPage.tsx` で呼び出して `<StatCard>` または新しいセクションで表示

### ダッシュボードのセクション構成（DashboardPage.tsx）

上から順に:
1. **StatCards** — 最新月の差引支給額・総支給・控除合計・手取り率（前月比付き）
2. **今年の累計（YTD）** — `annualTotals(payslips, currentYear)` で計算。当年データがない場合は非表示
3. **みなし残業効率カード** — 差額・詳細数値・残業時間推移チャート（`OvertimeHoursChart`）・月次差額推移
4. **支給・手取りの推移** — `TrendSummaryChart`（期間フィルター付き）
5. **有給残日数の推移** — `PaidLeaveTrendChart`（2件以上ある場合のみ）
6. **控除内訳ドーナツチャート** — `DeductionDonutChart`（最新給与月のデータ）
7. **最近の給与明細** — 直近5件のカードリスト

### localStorage のデータをリセットしたいとき（開発中）

ブラウザの DevTools > Application > Local Storage で `payslip_tracker_v1` を削除。
設定だけリセットしたい場合は `payslip_tracker_settings` を削除。

---

## エージェントチーム（自律改善システム）

`scripts/agent-team/index.ts` — PM・Dev・Reviewer の3エージェントが協調して payslip-tracker を自律的に改善するCLIツール。

### 起動方法

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run agent-team
npm run agent-team -- --sprint-size=3  # 1スプリントあたり3件
```

### 動作フロー（スプリント方式）

1. **PM（スプリント計画）**: `git log` と最新 `CLAUDE.md` を読んで未実装の改善を N 件バックログ化
2. **Dev（実装）**: 各タスクを `read_file` → `write_file` → `npm run build` で実装・検証
3. **Reviewer（レビュー）**: `git diff HEAD` で変更を確認し LGTM or 修正指示
4. Dev が修正（最大1回）→ タスクごとに **自動コミット**
5. スプリント後に **CLAUDE.md を自動更新**（新コンポーネント・パターンを追記）
6. `Ctrl+C` で停止 → ブランチをプッシュして終了

### 制約

- `git commit/push/add` などはスクリプト側が制御（エージェントは実行不可）
- `types/payslip.ts`, `lib/storage.ts`, `lib/mhtParser.ts` は変更対象外
- PM は毎スプリントで最新の `CLAUDE.md` と `git log` を参照して実装済み改善をスキップ
