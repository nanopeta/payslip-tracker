# CLAUDE.md

## Claude Code への指示（必読）

このプロジェクトで作業する際は以下のルールに従うこと。

### ブランチ・PR ワークフロー

1. **作業ブランチ**: `claude/<機能名>-<ランダムID>` 形式で作成（例: `claude/fix-parser-a1b2c3`）
2. **コミット**: 日本語メッセージ、末尾に `https://claude.ai/code/session_...` を付ける
3. **プッシュ後は必ず PR を作成**（draft にしない）
4. **PR 作成直後に即マージする**（ユーザー確認・CI 待ち・レビューコメント確認は不要）
5. **`subscribe_pr_activity` は呼ばない**。PR 監視・CI 自動修正ループは行わない
6. `main` への直接プッシュは禁止。必ずフィーチャーブランチ経由

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
npm run agent-team                          # 5タスク×1スプリントで改善（API キー不要）
npm run agent-team -- --sprint-size=3       # 1スプリント 3件で改善
npm run agent-team -- --max-sprints=5       # スプリント数を指定（デフォルト: 1）
npm run agent-team -- --fast                # Reviewer・ドキュメント更新をスキップ（高速・低トークン）
npm run agent-team -- --no-review          # Reviewer をスキップ
npm run agent-team -- --no-doc-update      # CLAUDE.md 更新をスキップ
npm run agent-team -- --no-push            # スプリント完了後のプッシュを省略
npm run agent-team -- --model=claude-haiku-4-5-20251001  # 使用モデルを指定
```

---

## 技術スタック

| ライブラリ | バージョン | 用途 |
|---|---|---|
| React | 18.3.1 | UIフレームワーク |
| Vite | 6.3.5 | ビルドツール |
| TypeScript | 5.8.3 | 型チェック |
| Tailwind CSS | **3.4.19（固定）** | スタイリング |
| Recharts | 2.15.3 | チャート描画（折れ線・棒グラフ）|
| Chart.js | 4.5.1 | ドーナツ・ステップ折れ線チャート |
| react-chartjs-2 | 5.3.1 | Chart.js の React ラッパー |
| chartjs-plugin-annotation | 3.1.0 | Chart.js 参照線プラグイン |
| Zustand | 5.0.3 | 状態管理 |
| React Router | 6.28.0 | ルーティング |
| pdfjs-dist | 5.2.133 | PDF解析（現在ほぼ未使用） |
| uuid | 11.1.0 | ID生成 |
| tsx | 4.19+ | TypeScript スクリプト実行（devDep） |

> **注意**: Tailwind は `3.4.19` に固定。`npm install tailwindcss` で最新版（v4）に上がると設定が壊れる。
>
> **チャートライブラリの使い分け**:
> - **Recharts**: `TrendSummaryChart`・`OvertimeHoursChart`・`GainTrendChart`・`MonthlyNetPayBarChart`・`PaidLeaveTrendChart`（未使用）
> - **Chart.js**: `IncomeDonutChart`・`DeductionDonutChart`・`NetPayBreakdownChart`（ドーナツ）、`IncomeBreakdownTrendChart`（ステップ折れ線）、`AnnualTotalsBarChart`（折れ線）

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
│   ├── aggregations.ts     # 月次集計・年次集計・みなし残業計算・社会保険料集計・前後明細ナビゲーション
│   └── furusatoCalc.ts     # ふるさと納税上限額計算（TaxDeductionInputs, FurusatoResult, calcFurusato）
├── store/
│   └── useStore.ts         # Zustand store（localStorage と同期）
├── components/
│   ├── layout/             # Sidebar（PC）、BottomNav（スマホ）、Layout
│   ├── ui/                 # StatCard
│   ├── charts/
│   │   ├── TrendSummaryChart.tsx          # 支給・手取りの推移（Recharts 折れ線）★メイン
│   │   ├── DeductionDonutChart.tsx        # 控除内訳ドーナツチャート（Chart.js）
│   │   ├── IncomeDonutChart.tsx           # 支給内訳ドーナツチャート（Chart.js）
│   │   ├── NetPayBreakdownChart.tsx       # 総支給→手取りの内訳チャート・概要タブ（Chart.js）
│   │   ├── IncomeBreakdownTrendChart.tsx  # 支給合算推移・ステップ折れ線（Chart.js）
│   │   ├── OvertimeHoursChart.tsx         # 残業時間推移（Recharts 棒グラフ・45h/80h参照線付き）
│   │   ├── GainTrendChart.tsx             # みなし残業差額推移（Recharts 折れ線）
│   │   ├── MonthlyNetPayBarChart.tsx      # 年間集計の月次手取り棒グラフ・給与/賞与スタック（Recharts）
│   │   ├── AnnualTotalsBarChart.tsx       # 年間集計ページの年別推移折れ線グラフ（Chart.js）
│   │   └── PaidLeaveTrendChart.tsx        # 旧・未使用（有給残日数の推移）
│   ├── payslip/
│   │   ├── PayslipCard.tsx            # 明細一覧のカード（monthly かつ overtimeHours > 0 のとき残業時間を表示）
│   │   ├── PayslipDetailView.tsx      # 1件の明細詳細
│   │   └── AnnualDetailView.tsx       # 年間集計詳細（PayslipDetailView スタイル）
│   ├── withholding/        # WithholdingCard
│   └── upload/             # DropZone、PayslipReviewForm（重複検出付き）、WithholdingReviewForm
└── pages/
    ├── DashboardPage.tsx   # ダッシュボード（StatCards・収支内訳タブ・みなし残業効率・今年の累計・チャート群）
    ├── PayslipsPage.tsx    # 給与明細一覧（ソート切り替え・年別グループトグル・月フィルター・フリーテキスト検索・アクティブフィルターチップス・一括削除）
    ├── PayslipDetailPage.tsx  # 明細詳細（前後月ナビゲーション・前月比サマリー・収支内訳3タブ）
    ├── AnnualSummaryPage.tsx  # 年間集計（月次手取平均・最高月・最低月・税/社保内訳・MonthlyNetPayBarChart・CSV エクスポート・シミュレーターカード）
    ├── UploadPage.tsx      # MHTアップロード（複数ファイル対応・重複検出）
    └── SettingsPage.tsx    # みなし残業設定（試算プレビュー付き）・JSON バックアップ/復元・CSV エクスポート
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
| `payslip_tracker_tax_inputs` | `TaxDeductionInputs { ideco, lifeInsurancePremium, careInsurancePremium, earthquakeInsurancePremium, dependents }` |

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

Props: `title`, `value`, `sub?`, `delta?`（数値、¥付きで自動フォーマット）, `deltaLabel?`（デフォルト: `'前月比'`）, `deltaText?`（文字列、`deltaPositive?` で色制御）, `highlight?`

**padding**: `p-3`（12px）に統一。`p-[18px]` は使わない。

**差引支給額カードのタイトル**: 年月を動的に埋め込む。
```tsx
title={latestMonth ? `差引支給額（${latestMonth.year}年${latestMonth.month}月）` : '差引支給額'}
```
`sub` には年月を重複表示しない。`手取り率` に計算式サブテキストは入れない。`有給残日数` に年月サブテキストは入れない。

### 給与種別バッジ（pill）

`payslipType === 'bonus'` の明細カードに表示するインラインバッジのスタイル:

```tsx
<span className="rounded-full text-xs px-2 py-0.5 bg-brand-100 text-brand-700">
  {payslip.payslipLabel ?? '賞与'}
</span>
```

- `payslipType === 'monthly'`（または未指定）には表示しない
- `payslipLabel` 未設定時は `'賞与'` をフォールバック表示
- 配置: カード右カラムの `text-right space-y-1` 先頭に `<p>` ラッパーで配置

---

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

### MonthlyNetPayBarChart（年間集計 棒グラフ）

`AnnualSummaryPage.tsx` の各年カード内に埋め込む月次手取り棒グラフ。

```typescript
export interface MonthlyNetPayBarChartPoint {
  label: string         // "MM月" 形式
  monthlyNetPay: number
  bonusNetPay: number
}

interface Props {
  data: MonthlyNetPayBarChartPoint[]
  hasBonus: boolean     // true のとき賞与バーを追加・凡例表示
}
```

- 棒は `stackId="a"` でスタック
- 色: 給与手取り `#5fad9b`（success）、賞与手取り `#f59e0b`（amber）
- `hasBonus === false` のとき棒の上部角丸 `radius={[3,3,0,0]}`、`true` のとき給与バーは角丸なし
- Tooltip ラベル: `'monthlyNetPay'` → `'給与手取り'`、`'bonusNetPay'` → `'賞与手取り'`
- `hasBonus === true` のときのみ Legend を表示

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

### previousPayslip / nextPayslip / pickMonthlyFirst

```typescript
previousPayslip(payslips, id)  // 対象明細より前月以前で最も新しい明細を返す
nextPayslip(payslips, id)      // 対象明細より後月以降で最も古い明細を返す
pickMonthlyFirst(candidates)   // 候補から monthly 優先（undefined は monthly 扱い）で返す
```

- 比較キーは `year*100+month`。年またぎも正しく動作
- 同月複数明細がある場合は `pickMonthlyFirst` でボーナスより給与を優先

### previousSameTypePayslip / nextSameTypePayslip

同種別（給与は給与、賞与は賞与）の前後明細を返す。`PayslipDetailPage.tsx` のナビゲーション・比較に使用。

```typescript
previousSameTypePayslip(payslips, current)  // 同 payslipType で直前の明細
nextSameTypePayslip(payslips, current)      // 同 payslipType で直後の明細
```

- `payslipType` が未設定のものは `'monthly'` 扱い
- 給与ナビでは賞与をスキップ、賞与ナビでは給与をスキップ
- `PayslipDetailPage.tsx` の前後ボタンと前月比カードは両方ともこの関数を使って統一

### AnnualTotals（月次手取統計）

`annualTotals()` で以下の統計フィールドも計算される:

| フィールド | 内容 |
|---|---|
| `monthCount` | 全明細件数（賞与込み）。`hasYtdData` 判定専用 |
| `monthlyMonthCount` | monthly 明細のユニーク月数（Set で重複排除）。YTD「〇ヶ月分」表示に使用 |
| `avgMonthlyNetPay` | 月次手取の平均（monthly 明細のみ、円単位で丸め） |
| `maxMonthNetPay` | 月次手取の最高額 |
| `maxMonthLabel` | 最高月のラベル（例: `"5月"`） |
| `minMonthNetPay` | 月次手取の最低額 |
| `minMonthLabel` | 最低月のラベル |

- `monthCount` は `hasYtdData`（YTD セクション表示判定）専用。賞与のみ月も1件としてカウント
- `monthlyMonthCount` は表示用（「3ヶ月分」など）。賞与月を除いたユニーク月数

`AnnualSummaryPage.tsx` で `monthlySlips.length > 0` のときのみ「月次手取（給与のみ）」セクションを表示。

### socialInsuranceTrend / SocialInsuranceTrendPoint

```typescript
socialInsuranceTrend(payslips): SocialInsuranceTrendPoint[]
```

monthly 明細のみを対象に、全期間の月次 4保険合計を時系列順（古い→新しい）で返す。

```typescript
export interface SocialInsuranceTrendPoint {
  label: string   // "YYYY/MM" 形式（applyPeriodFilter 互換）
  total: number   // 4保険合計額
}
```

- `SocialInsuranceTrendChart.tsx` で Recharts 折れ線チャートとして描画
- `DashboardPage.tsx` の `siTrend.length >= 2` のときのみ表示（StatCards 直下・YTD 前）
- `calcSocialInsuranceTotal()` を再利用して計算

### latestSocialInsurance / SocialInsuranceStats

```typescript
latestSocialInsurance(payslips): SocialInsuranceStats | null
```

monthly 明細のみを対象に、最新月の健康保険＋介護保険＋厚生年金＋雇用保険の合計と差額を返す。

```typescript
interface SocialInsuranceStats {
  total: number       // 4保険合計額
  prevTotal: number | null
  delta: number | null  // 前月比（1件のみのとき null）
  label: string       // "YYYY/MM" 形式の最新月ラベル
}
```

`DashboardPage.tsx` の StatCard で `deltaPositive={delta <= 0}`（保険料減少=緑）を使う。

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

BottomNav のタブラベル: ホーム・明細・アップロード・**年次**（旧: 源泉）。

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


### みなし残業差額ツールチップの金額表示が `¥` なしになる

**原因**: `formatter` に `formatYen` を使わず文字列テンプレートで組み立てていた。

**対処**: `formatter={(v: number) => [\`${v >= 0 ? '+' : '-'}${formatYen(Math.abs(v))}\`, '差額']}` に統一。→ **実装済み（DashboardPage.tsx）**

---

### PayslipsPage のフィルター行がモバイルで折り返す

**原因**: フィルター pill ボタンが折り返して縦に重なる。

**対処**: フィルター行ラッパーを `flex flex-nowrap overflow-x-auto pb-1` にして横スクロール可能にし、各ボタンに `flex-shrink-0` を付与。→ **実装済み（PayslipsPage.tsx）**

---

## 開発時の注意点

### PayslipDetailPage のレイアウト順

```
1. ヒーローカード（PayslipDetailView）
   ├── 差引支給額（左・大）
   └── 総支給額（右・小）
2. みなし残業効率カード（PayslipDetailView）
3. 勤怠カード（PayslipDetailView）
4. 前月比カード（prevSameType があるときのみ）
5. 収支内訳カード（income > 0 || deductions > 0 のとき）
   └── 概要/支給/控除 タブ
```

### PayslipDetailView 勤怠カードの alwaysShow パターン

有休取得は0でも常に表示する（その月に有休を取っていなくてもカードに出す）。

```typescript
{ label: '有休取得', value: attendance.paidLeave, display: `${attendance.paidLeave}日`, alwaysShow: true },
// その他の項目は alwaysShow: false（value > 0 のときのみ表示）
```

フィルタリング:
```tsx
.map((item) => (item.alwaysShow || item.value > 0) ? <div>...</div> : null)
```

### 新しい支給・控除項目を追加したいとき

1. `src/lib/mhtParser.ts` の `INCOME_LABELS` または `DEDUCTION_LABELS` にラベル→フィールド名のマッピングを追加
2. `src/types/payslip.ts` の `PayslipIncome` / `PayslipDeductions` にフィールドを追加
3. `emptyIncome()` / `emptyDeductions()` の初期値に `0` を追加
4. `PayslipReviewForm.tsx` の入力欄に `<NumInput>` を追加（控除の場合はクレジット項目になるか確認）
5. `PayslipDetailView.tsx` の表示行に追加（勤怠の `alwaysShow` パターン参照）
6. `DeductionDonutChart.tsx` の `SLICES` に追加（負値になる項目は自動的にクレジット扱いになる）

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
1. **StatCards** — 差引支給額（動的年月タイトル・`highlight`）・総支給・控除合計・手取り率・有給残日数・累計残業時間（6ヶ月以上のときのみ）
2. **収支内訳カード** — `selectedDonutYM` 月選択ドロップダウン + 3タブ（概要/支給/控除）→ `NetPayBreakdownChart` / `IncomeDonutChart` / `DeductionDonutChart`
3. **みなし残業効率カード** — `selectedGainYM` 月選択ドロップダウン + 差額・4カラムグリッド（みなし/実残業代/残業時間/使用率）・残業時給・基本時給 + 残業時間推移（`OvertimeHoursChart`）+ 月次差額推移（`GainTrendChart`）+ **年間合算セクション**（選択月の年の合計）
4. **今年の累計カード** — 給与/賞与/合計の4カラム表テーブル（総支給・手取り・差額）+ 月次手取統計（平均/最高/最低）。「今年の賞与」StatCard は廃止・統合済み
5. **支給合算の推移** — `IncomeBreakdownTrendChart`（期間フィルター付き・2件以上のときのみ）
6. **支給・手取りの推移** — `TrendSummaryChart`（期間フィルター付き）
7. **最近の給与明細** — 直近3件のカードリスト（「全件を見る」リンク付き）

> **注**: `socialInsuranceTrend` / `latestSocialInsurance` は `aggregations.ts` に実装済みだが、現在ダッシュボードでは未使用（対応チャートコンポーネントも存在しない）。将来実装時に利用可能。

### 収支内訳カード（月選択 + 3タブ）

`DashboardPage.tsx` と `PayslipDetailPage.tsx` の両方で使用する共通パターン。

```typescript
const [donutTab, setDonutTab] = useState<'overview' | 'income' | 'deduction'>('overview')
const [selectedDonutYM, setSelectedDonutYM] = useState<string>('')  // ダッシュボードのみ

// タブ切り替え UI
{(['overview', 'income', 'deduction'] as const).map(({ key, label }) => (
  <button className={`px-2.5 py-1 ... ${donutTab === key ? 'bg-brand-600 text-white' : 'bg-white text-gray-600'}`}>
    {label}
  </button>
))}

// レンダリング
donutTab === 'overview' → <NetPayBreakdownChart />
donutTab === 'income'   → <IncomeDonutChart />
donutTab === 'deduction'→ <DeductionDonutChart />
```

- デフォルトタブは `'overview'`
- ダッシュボードは月選択ドロップダウン付き、明細詳細ページは固定月（当該明細）

### みなし残業 年間合算セクション

月選択ドロップダウンで選択した年（`gainSelectedYear`）の全給与明細を集計して表示。

```typescript
const gainSelectedYear = effectiveGainYM ? parseInt(effectiveGainYM.split('/')[0]) : currentYear
const currentYearGainSlips = monthlyPayslips.filter((p) => p.year === gainSelectedYear)
const ytdDeemedTotal = currentYearGainSlips.reduce((sum, p) => sum + getIncomeValueByLabel(p.income, settings.deemedLabel), 0)
const ytdActualTotal = currentYearGainSlips.reduce((sum, p) => sum + settings.actualLabels.reduce(...), 0)
const ytdGainTotal = ytdDeemedTotal - ytdActualTotal
const ytdDeemedHours = DEEMED_HOURS * currentYearGainSlips.length  // みなし時間合計
const ytdActualHours = currentYearGainSlips.reduce((sum, p) => sum + p.attendance.overtimeHours, 0)
const ytdGainHours = ytdDeemedHours - ytdActualHours
const ytdUsagePercent = ytdDeemedHours > 0 ? (ytdActualHours / ytdDeemedHours) * 100 : 0
const ytdOvertimeHourlyRate = ytdDeemedHours > 0 ? Math.round(ytdDeemedTotal / ytdDeemedHours) : 0
const ytdBasicHourlyRate = ytdOvertimeHourlyRate > 0 ? Math.round(ytdOvertimeHourlyRate / 1.25) : 0
```

表示レイアウト（4カラムグリッド×2行）:
- 行1: みなし（〇〇h）| 実残業代合計 | 残業時間合計 | 年間使用率（プログレスバー付き）
- 行2: 年間差額 | 得した時間 | 残業時給平均 | 基本時給平均

ラベル「みなし（〇〇h）」の `〇〇h` は `ytdDeemedHours`（月数×45）を動的表示。1行に収まるよう「みなし合計（〇〇h）」ではなく「みなし（〇〇h）」とする。

### 今年の累計カードの構成（給与+賞与統合テーブル）

```typescript
// 必要な変数
const currentYearMonthlyIncome = currentYearMonthlySlips.reduce((s, p) => s + p.income.total, 0)
const currentYearMonthlyNetPay = currentYearMonthlySlips.reduce((s, p) => s + p.summary.netPay, 0)
const currentYearBonusIncome = currentYearBonusSlips.reduce((s, p) => s + p.income.total, 0)
const currentYearBonusTotal  = currentYearBonusSlips.reduce((s, p) => s + p.summary.netPay, 0)
```

4カラムテーブル（ヘッダー行: 空 | 総支給 | 手取り | 差額）:
- 給与行: `currentYearMonthlyIncome` / `currentYearMonthlyNetPay` / 差額（赤）
- 賞与行（賞与ありのみ）: `currentYearBonusIncome` / `currentYearBonusTotal` / 差額 + 前年比インライン
- 合計行: `ytd.totalIncome` / `ytd.totalNetPay` / `-ytd.totalDeductions`

- 「今年の賞与」StatCard は廃止。賞与情報はこのカードに統合
- `bonusDelta`（前年比）は賞与行のラベルに `text-[10px]` でインライン表示

### PayslipsPage の年別グループトグルパターン

```typescript
const [groupByYear, setGroupByYear] = useState(true)

// フィルター行の「年別」ボタン（filterYear === 'all' のときのみ表示）
<button
  onClick={() => setGroupByYear((v) => !v)}
  className={`... ${groupByYear ? 'bg-brand-100 text-brand-700 border-brand-300' : 'bg-white text-gray-600 border-gray-200'}`}
>
  年別
</button>

// groupedByYear の生成条件
const groupedByYear = filterYear === 'all' && groupByYear ? ... : null
```

- デフォルトは `true`（年別グループ表示オン）
- 特定年フィルター中はボタン自体を非表示（`filterYear !== 'all'` のとき）

### PayslipsPage のアクティブフィルターチップス

`activeFilters` 配列を構築してチップとして表示する。

```typescript
const activeFilters: { label: string; onRemove: () => void }[] = []
if (filterYear !== 'all') activeFilters.push({ label: `${filterYear}年`, onRemove: ... })
if (filterMonth !== 'all') activeFilters.push({ label: `${filterMonth}月`, onRemove: ... })
if (filterType !== 'all') activeFilters.push({ label: ..., onRemove: ... })
if (searchQuery.trim() !== '') activeFilters.push({ label: `"${searchQuery}"`, onRemove: ... })
```

スタイル: `bg-brand-100 text-brand-700 border-brand-200 rounded-full text-xs px-2.5 py-1`
- 各チップに `×` ボタン（個別解除）
- 2件以上のとき「すべて解除」ボタンを末尾に追加

### IncomeBreakdownTrendChart の仕様

```typescript
export interface IncomeBreakdownPoint {
  label: string          // "YYYY/MM" 形式
  basicSalary: number
  deemedOvertime: number
  wlbAllowance: number
  lifePlanAllowance: number
}
```

- 4項目の**合算値**を1本のステップ折れ線で表示（`stepped: 'before'`）
- 前月から値が変わったポイントは赤（`#d06868`）、変わらない点は青（`#5b8fa8`）
- Tooltip に合算額 + 前月比差額を表示
- Chart.js（`chart.js/auto`）で実装（Recharts ではない）

### DeductionDonutChart のクレジット項目処理

`DeductionDonutChart.tsx` は全12控除フィールドを表示対象とする。負値（クレジット）と正値（控除）を分けて扱う。

```typescript
// 正値項目 → ドーナツスライス + 凡例（通常色）
// 負値項目（taxRefund, expenseReimbursement, healthInsuranceBenefit など）→ 凡例のみ（緑色）

const positiveItems = allNamed.filter((s) => s.value > 0)
const creditItems = allNamed.filter((s) => s.value < 0)

// 正値のグロス合計（% 計算の分母）
const grossPositiveTotal = deductions.total - creditTotal  // creditTotal は負値
```

- `%` 計算の分母は `grossPositiveTotal`（ネット total ではなく）→ 100% 超えを防ぐ
- 凡例の並び順: 正値項目 → クレジット項目 → 合計行
- 合計行は `deductions.total`（ネット額）を表示

### IncomeDonutChart / DeductionDonutChart / NetPayBreakdownChart の共通仕様

モバイルは縦積み、PC は横並びのレイアウト:
```tsx
<div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-6">
  <div className="flex-shrink-0" style={{ width: 160, height: 160 }}>
    <canvas ref={canvasRef} />
  </div>
  <div className="w-full min-w-0 divide-y divide-gray-100 sm:flex-1 sm:self-center">
    {/* 凡例リスト */}
  </div>
</div>
```

- キャンバスサイズ: 160×160px
- Chart.js（`chart.js/auto`）で実装

### UI コンパクト化基準（最新）

余白削減の標準値:

| 要素 | クラス |
|---|---|
| StatCard padding | `p-3` |
| Layout コンテンツ | `p-3 md:p-5` |
| ページ間隔 | `space-y-3`（大）/ `space-y-2`（StatCards内） |
| グループ間隔 | `space-y-4` |
| カード padding | `p-3` |
| セクション見出し mb | `mb-2.5`（カード内タイトル標準） |
| グリッド gap | `gap-2`〜`gap-3` |
| カード間隔（リスト） | `space-y-2` |

### PayslipsPage の年別グループ表示パターン

`filterYear === 'all'` のとき、`filtered` を年ごとにグループ化して年ヘッダー（件数・手取合計）付きで表示する。

```typescript
// groupedByYear: { year, items, count, totalNetPay }[] | null
// null のとき（特定年フィルター中）はフラットグリッドを表示
const groupedByYear = filterYear === 'all'
  ? Array.from(yearMap).sort(([a], [b]) => b - a).map(...)
  : null
```

- `filterType`（給与/賞与）フィルターとの組み合わせは `filtered` を共通ベースとするため自動で正しく動作
- 前月比デルタ参照には `filteredIndexMap`（`id → filtered インデックス`）を使う

### PayslipsPage の月フィルターパターン

`filterYear !== 'all'` のときのみ月 pill ボタンを表示する。

```typescript
const [filterMonth, setFilterMonth] = useState<number | 'all'>('all')

// 年を 'all' に戻したとき月フィルターもリセット
if (val === 'all') setFilterMonth('all')
```

- `filterYear === 'all'` のとき月フィルターは非表示（`groupedByYear` と排他）
- スタイルは期間フィルターと同一（選択中: `bg-brand-600 text-white`、未選択: `bg-gray-100 text-gray-500`）
- 月フィルターの pill ボタン行は `flex flex-nowrap gap-1.5 overflow-x-auto pb-1` でモバイル横スクロール対応

### PayslipsPage のモバイル横スクロールフィルターパターン

フィルター行全体をモバイルで横スクロール可能にする実装パターン:

```tsx
{/* フィルター行ラッパー: モバイルは横スクロール、PC は折り返し */}
<div className="flex flex-nowrap md:flex-wrap gap-2 items-center overflow-x-auto pb-1 md:pb-0">
  {/* 各フィルターボタン/select に flex-shrink-0 を付与 */}
  <select className="flex-shrink-0 ..." />
  <div className="flex-shrink-0 flex rounded-lg ...">
    {/* pill ボタン群 */}
  </div>
</div>
```

- `flex-nowrap` + `overflow-x-auto` でモバイル横スクロールを実現
- `md:flex-wrap` + `md:pb-0` で PC では折り返しに戻す
- 子要素すべてに `flex-shrink-0` を付けて幅が縮まないようにする

### PayslipsPage の絞り込みサマリーバー

フィルター適用時（`isFiltered === true`）かつ `filtered.length > 0` のとき、一覧末尾にサマリーバーを表示する。

```typescript
// フィルター適用判定（いずれかが 'all' 以外なら true）
const isFiltered =
  filtered.length < payslips.length ||
  filterYear !== 'all' ||
  filterType !== 'all' ||
  filterMonth !== 'all' ||
  searchQuery.trim() !== ''

// 集計
const filteredNetPayTotal = filtered.reduce((sum, p) => sum + p.summary.netPay, 0)
const filteredNetPayAvg = filtered.length > 0 ? Math.round(filteredNetPayTotal / filtered.length) : 0
```

表示内容: 「絞り込み件数 · 手取合計 · 平均手取」を `·` 区切りで横並び。
スタイル: `bg-white rounded-xl border border-brand-200 shadow-sm px-5 py-3`

- `filtered.length === 0` のとき「条件に一致する明細がありません」が表示されるためサマリーバーは非表示
- `filterYear === 'all'` のとき月フィルターは非表示だが、`filterType !== 'all'` 選択時は年別グループビューの下にサマリーが現れる（全体合計として自然な挙動）

### PayslipsPage のフリーテキスト検索パターン

`searchQuery` state + `matchesSearch()` で年月・金額・氏名・ラベルを横断検索する。

```typescript
const [searchQuery, setSearchQuery] = useState('')

function matchesSearch(p: Payslip): boolean {
  const q = searchQuery.trim().toLowerCase()
  if (!q) return true

  // 年月マッチ: "2026年5月" / "2026/05"
  const yearMonthFull = `${p.year}年${p.month}月`
  const yearMonthSlash = `${p.year}/${String(p.month).padStart(2, '0')}`
  if (yearMonthFull.includes(q) || yearMonthSlash.includes(q)) return true
  if (`${p.year}`.startsWith(q) || `${p.month}月` === q) return true

  // 金額マッチ: 4桁以上の数字列で総支給・手取りを部分一致
  const qDigits = q.replace(/[^0-9]/g, '')
  if (qDigits.length >= 4) {
    if (String(p.income.total).includes(qDigits)) return true
    if (String(p.summary.netPay).includes(qDigits)) return true
  }

  // テキストマッチ
  if (p.employeeName?.toLowerCase().includes(q)) return true
  if (p.companyName?.toLowerCase().includes(q)) return true
  if (p.payslipLabel?.toLowerCase().includes(q)) return true

  return false
}
```

- 検索 UI: 虫眼鏡 SVG アイコン（`absolute left-3`）付きの `<input type="text">` をフィルター行の下に配置
- `isFiltered` 判定に `searchQuery.trim() !== ''` を含める（サマリーバー表示に影響）

### OvertimeHoursChart の参照線仕様

残業時間棒グラフには2本の参照線を表示する。

| 参照線 | y値 | 色 | strokeDasharray | strokeWidth | ラベル |
|---|---|---|---|---|---|
| みなし残業上限 | 45 | `#5b8fa8`（brand-600）| `"4 2"` | 1.5 | `'45h'` |
| 過労ライン | 80 | `#d06868`（--danger）| `"4 2"` | 1.5 | `'80h'` |

```tsx
<ReferenceLine y={45} stroke="#5b8fa8" strokeDasharray="4 2" strokeWidth={1.5}
  label={{ value: '45h', position: 'right', fontSize: 10, fill: '#5b8fa8' }} />
<ReferenceLine y={80} stroke="#d06868" strokeDasharray="4 2" strokeWidth={1.5}
  label={{ value: '80h', position: 'right', fontSize: 10, fill: '#d06868' }} />
```

- 過労ラインに `#b94040` など brand パレット外の色は使わない。必ず `--danger: #d06868`

### TrendSummaryChart の dot カスタムレンダラー

データ点が 1〜2 件のときに Recharts の `dot` オブジェクト指定では点が描画されないケースがある。
カスタム関数レンダラーで明示的に `<circle>` を返すことで確実に表示する。

```tsx
dot={(props: { cx?: number; cy?: number }) => {
  const { cx, cy } = props
  if (cx == null || cy == null) return <circle r={0} />
  return <circle key={`np-${cx}-${cy}`} cx={cx} cy={cy} r={4} fill="#5fad9b" />
}}
```

- `key` を `cx-cy` ベースで付与して React の reconciliation 警告を防ぐ
- `cx/cy` が `null/undefined` のときは `r={0}` の空 circle を返す（null は型エラーになる）

### AnnualSummaryPage のシミュレーターカード（ふるさと納税・年収試算）

`AnnualSummaryPage.tsx` の先頭カード。年選択ドロップダウン付き。

#### 年収試算の計算仕様

```typescript
// 実績Nヶ月 + 月平均×残りMヶ月 で12ヶ月分を推計
const simRemainingMonths = Math.max(0, 12 - simMonthlyCount)

// 総支給
const simProjectedMonthlyIncome = simMonthlyIncomeSum + simMonthlyIncomeAvg * simRemainingMonths
const simIncome = simProjectedMonthlyIncome + simBonusIncomeSum

// 社会保険料（ふるさと納税計算にも使用）
const simProjectedMonthlySI = simMonthlySISum + simMonthlySIAvg * simRemainingMonths
const simSocialInsurance = simProjectedMonthlySI + simBonusSISum  // 賞与分も加算

// 所得税・住民税
const simProjectedMonthlyIncomeTax = simMonthlyIncomeTaxSum + simMonthlyIncomeTaxAvg * simRemainingMonths
const simProjectedMonthlyResidentTax = simMonthlyResidentTaxSum + simMonthlyResidentTaxAvg * simRemainingMonths

// 手取り
const simProjectedMonthlyNetPay = simMonthlyNetPaySum + simMonthlyNetPayAvg * simRemainingMonths
const simProjectedNetPay = simProjectedMonthlyNetPay + simBonusNetPaySum

// 控除の整合（税還付・経費精算などマイナス調整を「その他・調整」として表示）
const simImpliedDeductions = simIncome - simProjectedNetPay
const simShownDeductions = simProjectedMonthlySI + simBonusSISum + ...  // SI+税の合計
const simDeductionAdjustment = simImpliedDeductions - simShownDeductions  // 負値 = クレジット
```

- `simIsProjected = simRemainingMonths > 0`（12ヶ月揃っていれば試算行を非表示）
- 賞与の社保・所得税も別行で表示（`simBonusSISum > 0` のときのみ）
- `simDeductionAdjustment !== 0` のとき「その他・調整」行を表示して合計を `simImpliedDeductions` に一致させる

#### ふるさと納税計算（furusatoCalc.ts）

令和7年度税制改正対応済み（給与所得控除最低保障額 55万→65万、基礎控除を給与所得連動で段階的に変化）。

```typescript
// src/lib/furusatoCalc.ts
interface TaxDeductionInputs {
  ideco: number                      // iDeCo年額
  lifeInsurancePremium: number       // 新生命保険料（一般）年額
  careInsurancePremium: number       // 介護医療保険料年額
  earthquakeInsurancePremium: number // 地震保険料年額
  dependents: number                 // 扶養人数（一般扶養）
}

interface FurusatoResult {
  employmentIncomeDeduction: number  // 給与所得控除
  employmentIncome: number           // 給与所得
  // 所得税側
  lifeInsuranceDeduction: number     // 生命保険料控除（所得税）
  earthquakeDeduction: number        // 地震保険料控除（所得税）
  dependentDeduction: number         // 扶養控除（所得税）
  basicDeduction: number             // 基礎控除（所得税、給与所得連動で変化）
  taxableIncome: number              // 課税所得（所得税）
  incomeTaxRate: number              // 所得税率
  incomeTaxAmount: number            // 正確な年税額（速算表×復興特別税1.021）
  // 住民税側
  lifeInsuranceDeductionRT: number   // 生命保険料控除（住民税）
  earthquakeDeductionRT: number      // 地震保険料控除（住民税）
  dependentDeductionRT: number       // 扶養控除（住民税）
  taxableIncomeResident: number      // 課税所得（住民税）
  residentTaxDividend: number        // 住民税所得割（10%）
  furusatoLimit: number              // 推定上限額（自己負担2,000円含む）
}

// 計算式
furusatoLimit = floor(residentTaxDividend * 0.2 / (1 - incomeTaxRate * 1.021 - 0.1)) + 2000
```

- `calcFurusato(annualIncome, socialInsurance, inputs)` → `FurusatoResult`
- localStorage `payslip_tracker_tax_inputs` に入力値を永続化（データ削除しても保持）
- 生命保険料控除は `lifeInsurancePremium`（一般）と `careInsurancePremium`（介護医療）を別枠で計算し合算（所得税上限 12万、住民税上限 7万）
- `incomeTaxAmount` は年末調整の還付金試算にも使用（年末調整カード）

#### シミュレーターの2カード構成

`AnnualSummaryPage.tsx` は年間集計ページ先頭に2枚のカードを配置する。

**Card 1: 年収試算・年末調整還付金**（`simMonthlyCount > 0` のときのみ表示）

1. **年収試算セクション**
   - 3列グリッド: 総支給 / 手取り / 控除合計
   - 「内訳」トグル（`showIncomeDetail` state）→ 総支給・控除・手取りの詳細行
   - 内訳の各行: `実績（Nヶ月）` + `月平均×残りMヶ月` + 賞与実績 + 合計
2. **年末調整 推定還付金セクション**（`simResult` があり `!customMode` のとき表示）
   - `refund = projectedIT - simResult.incomeTaxAmount`（毎月天引き合計 − 正確な年税額）
   - 還付 → `#5fad9b`、追加納税 → `#d06868`
   - 「計算内訳」トグル（`showRefundDetail` state）

**Card 2: ふるさと納税シミュレーター**

1. カスタムモード切替ボタン（`customMode` state）
   - OFF（自動）: Card 1 の試算値（`simIncome` / `simSocialInsurance`）を引き継ぎ
   - ON: `customIncome` / `customSocialInsurance` を手動入力
2. 2列グリッド: 給与収入 / 社会保険料（自動値またはカスタム入力）
3. 4項目入力: iDeCo / 新生命保険料 / 介護医療保険料 / 地震保険料 / 扶養人数
4. 上限額表示カード + 「計算内訳」トグル（`showSimDetail` state）

### AnnualSummaryPage の年カード前年比表示

各年カードの展開ヘッダー右端に前年比手取り差額（±¥XX万）を表示する。

```tsx
// 前年データがある場合のみ表示
const prevYearTotal = groupedYears.find(g => g.year === year - 1)?.totalNetPay
const yoyDelta = prevYearTotal != null ? totalNetPay - prevYearTotal : null

{yoyDelta !== null && (
  <span style={{ color: yoyDelta >= 0 ? '#5fad9b' : '#d06868', fontSize: 13 }}>
    {yoyDelta >= 0 ? '+' : ''}{formatYen(yoyDelta)}
  </span>
)}
```

- 前年データが存在しない最古年では表示しない
- ヘッダー row: `展開トグルボタン（flex-1）+ 前年比テキスト + CSV ボタン` の横並び

### PayslipsPage フィルター変更時の選択リセット

フィルター（年・月・種別）またはソート順を変更したとき、一括選択の `selectedIds` と `selecting` モードを自動リセットする。

```typescript
// フィルター変更時に選択状態をリセット
function handleFilterChange(newFilter: ...) {
  setSelectedIds(new Set())
  setSelecting(false)
  setFilterYear(newFilter)  // など
}
```

- フィルター変更後に前の選択が残ると「見えないアイテムが選択中」になる誤操作を防ぐ

### カードタイトルの標準スタイル（全ページ共通）

アプリ全体のカード・セクションタイトルは以下のスタイルに統一されている。

```tsx
{/* 標準（gray） */}
<p className="text-sm font-bold text-gray-600 mb-2.5 flex items-center gap-2">
  <span className="w-1 h-4 bg-gray-400 rounded-full inline-block"></span>
  セクション名
</p>

{/* みなし残業効率（amber） */}
<p className="text-sm font-bold text-amber-600 mb-2.5 flex items-center gap-2">
  <span className="w-1 h-4 bg-amber-400 rounded-full inline-block"></span>
  みなし残業 効率
</p>

{/* flex justify-between の子（mb なし、親 div で制御） */}
<p className="text-sm font-bold text-gray-600 flex items-center gap-2">
  <span className="w-1 h-4 bg-gray-400 rounded-full inline-block"></span>
  タイトル
</p>
```

- `text-gray-700 font-semibold`（旧）や `text-gray-900 font-semibold`（旧）は使わない
- 左アクセントバーは `w-1 h-4 rounded-full` で統一（旧: `h-3.5` や `h-5` も統一済み）
- `gap-1.5`（旧）ではなく `gap-2` に統一

### PayslipDetailView / AnnualDetailView のセクションヘッダー

カードタイトルは上記「カードタイトルの標準スタイル」を使用。
`PayslipReviewForm.tsx` 内の支給/控除セクションタイトルは別スタイル（`text-xs font-semibold uppercase tracking-wider`）を維持。

### AnnualTotalsBarChart の仕様

`AnnualSummaryPage.tsx` の全年集計グラフ（最下部）。名前に "Bar" とあるが **Chart.js の折れ線グラフ（type: 'line'）** で実装されている（#98 で棒グラフから変更済み）。

```typescript
interface AnnualTotalsPoint {
  label: string       // 年ラベル（"2025"など）
  totalIncome: number
  totalNetPay: number
}
```

- 総支給: 青系（`#5b8fa8`）破線、差引支給: 緑系（`#5fad9b`）実線
- Chart.js で実装（Recharts ではない）
- 高さ: 220px固定

---

### AnnualSummaryPage の CSV エクスポートパターン

各年カードのヘッダー右端に CSV ダウンロードボタンを配置する。

```typescript
function exportCsv(year: number, slips: Payslip[]) {
  const headers = ['年月', '種別', '総支給', '控除合計', '手取り', '残業時間']
  const rows = [...slips]
    .sort((a, b) => a.month - b.month)
    .map((p) => [
      `${p.year}/${String(p.month).padStart(2, '0')}`,
      p.payslipType === 'bonus' ? (p.payslipLabel ?? '賞与') : '給与',
      p.income.total,
      p.deductions.total,
      p.summary.netPay,
      p.attendance.overtimeHours,
    ])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  // BOM付き UTF-8 で Excel 文字化け防止
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `payslip_${year}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
```

- ヘッダー行レイアウト: 展開トグルボタン（`flex-1`）+ CSV ボタンの横並び `<div className="flex items-center gap-2">`
- CSV ボタンスタイル: `text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50`
- ファイル名: `payslip_YYYY.csv`

### AnnualSummaryPage の月次手取り棒グラフ埋め込みパターン

各年カード内の月次明細一覧の上に `MonthlyNetPayBarChart` を埋め込む。

```typescript
// chartData を作成（月順ソート、1〜12月ラベル）
const chartData: MonthlyNetPayBarChartPoint[] = Array.from(
  { length: 12 }, (_, i) => {
    const m = i + 1
    const monthly = slips.find(p => p.month === m && p.payslipType !== 'bonus')
    const bonus = slips.filter(p => p.month === m && p.payslipType === 'bonus')
    return {
      label: `${m}月`,
      monthlyNetPay: monthly?.summary.netPay ?? 0,
      bonusNetPay: bonus.reduce((s, p) => s + p.summary.netPay, 0),
    }
  }
).filter(d => d.monthlyNetPay > 0 || d.bonusNetPay > 0)

const hasBonus = slips.some(p => p.payslipType === 'bonus')
```

- グラフ高さ: `hasBonus ? 200 : 180`
- `slips.length > 0` のときのみ表示（データなし年はグラフ非表示）

### PayslipDetailPage の同種別ナビゲーション・前月比パターン

給与↔給与、賞与↔賞与で比較するため `previousSameTypePayslip` / `nextSameTypePayslip` を使用。
ナビゲーションボタンと前月比カードは同じ `prevSameType` / `nextSameType` を参照する。

```typescript
const prevSameType = payslip ? previousSameTypePayslip(payslips, payslip) : null
const nextSameType = payslip ? nextSameTypePayslip(payslips, payslip) : null

// ナビゲーションボタン: prevSameType / nextSameType で前後移動
// 前月比カード: prevSameType との差分を 3カラム×2行（6項目）で表示
// 収支内訳チャート: prevDeductions={prevSameType?.deductions} など
```

前月比カードの 6 項目:
```typescript
[
  { label: '手取り',   delta: netPay差分,             invert: false },
  { label: '総支給',   delta: income.total差分,        invert: false },
  { label: '控除',     delta: deductions.total差分,     invert: true  },
  { label: '出勤日数', delta: workDays差分,            fmt: (d) => `${d>0?'+':''}${d}日` },
  { label: '残業時間', delta: overtimeHours差分,       invert: true, fmt: (d) => `...h` },
  { label: '有給残',   delta: paidLeaveRemaining差分,  fmt: (d) => `${d>0?'+':''}${d}日` },
]
```

- **`invert` フラグ**: 控除合計・残業時間など「増加が不利」な指標。増加→赤、減少→緑
- 値フォントは `text-sm font-semibold`（みなし残業/勤怠と統一）
- カードタイトルも標準スタイル（左アクセントバー + `text-sm font-bold text-gray-600`）

### localStorage のデータをリセットしたいとき（開発中）

ブラウザの DevTools > Application > Local Storage で `payslip_tracker_v1` を削除。
設定だけリセットしたい場合は `payslip_tracker_settings` を削除。

---

## エージェントチーム（自律改善システム）

`scripts/agent-team/index.ts` — PM・Dev・Reviewer の3エージェントが協調して payslip-tracker を自律的に改善するCLIツール。

### 起動方法

```bash
npm run agent-team                          # API キー不要・自動プッシュ付き
npm run agent-team -- --sprint-size=3       # 1スプリントあたり3件
npm run agent-team -- --fast                # Reviewer・ドキュメント更新をスキップ
npm run agent-team -- --no-push             # プッシュを省略
```

### 動作フロー（スプリント方式）

1. **PM（スプリント計画）**: `git log` と最新 `CLAUDE.md` を読んで未実装の改善を N 件バックログ化
2. **Dev（実装）**: 各タスクを Read → Edit/Write → Bash(`npm run build`) で実装・検証
3. **Reviewer（レビュー）**: Bash(`git diff HEAD`) で変更を確認し LGTM or 修正指示
4. Dev が修正（最大1回）→ タスクごとに **自動コミット**
5. スプリント後に **CLAUDE.md を自動更新**（新コンポーネント・パターンを追記）
6. 全スプリント完了または `Ctrl+C` → ブランチを **自動プッシュ** して終了

### 制約

- `git commit/push/checkout` などはスクリプト側が制御（エージェントは実行不可）
- `types/payslip.ts`, `lib/storage.ts`, `lib/mhtParser.ts` は変更対象外
- PM は毎スプリントで最新の `CLAUDE.md` と `git log` を参照して実装済み改善をスキップ

### 信頼性の仕組み（index.ts）

- Claude CLI タイムアウト: 10分（`CLAUDE_TIMEOUT_MS = 600_000`）
- タイムアウト・終了コード1 の場合は1回自動リトライ
- タスク単位で `try/catch` し、1件失敗しても次タスクへ継続
- `spawnSync` / `execSync` の呼び出しには `shell: true` を付与（Windows でも動作）
- プッシュ失敗時は指数バックオフで最大4回リトライ（2s → 4s → 8s → 16s）

---

## 開発効率化メモ（Claude Code 向け気付き集）

### CLAUDE.md の更新タイミング

新しいコンポーネント・パターン・型変更を実装した直後に CLAUDE.md を更新すること。
特に以下の変更は忘れやすい:
- チャートコンポーネントの追加・削除・ライブラリ変更
- `furusatoCalc.ts` の型変更（税制改正で頻繁に変わる）
- `TaxDeductionInputs` に項目追加 → localStorage スキーマも更新
- 新しい state（`useState`）や計算パターンの追加

### チャートライブラリ選択の指針

| ユースケース | ライブラリ |
|---|---|
| 折れ線・棒グラフ（Tooltip・参照線あり） | **Recharts** |
| ドーナツ・ステップ折れ線・高カスタム | **Chart.js** (`chart.js/auto` + `useRef<HTMLCanvasElement>`) |

Chart.js を使う場合は `useEffect` 内で `Chart.getChart(canvas)?.destroy()` → `new Chart(...)` パターン必須（HMR でインスタンスが残るバグを防ぐ）。

### TypeScript strict モードの注意点

`tsc -b` は strict モードで実行される。以下のパターンで型エラーになりやすい:

```typescript
// NG: 配列末尾の要素は T | undefined
const last = arr[arr.length - 1]   // T | undefined

// OK: 非nullアサーションか optional chaining を使う
const last = arr[arr.length - 1]!  // T（存在を確認してから使う）
const val = arr.at(-1)?.field      // undefined | field 型
```

- `as [number, number]` などのタプルアサーションは `split().map(Number)` の結果に必要
- Recharts の `dot` prop は `(props: { cx?: number; cy?: number }) => ReactElement` のカスタム関数が最も安全

### 税制改正対応の手順

令和の改正は毎年発生する。`furusatoCalc.ts` を変更する際は:
1. `calcEmploymentIncomeDeduction()` — 給与所得控除（最低保障額・区分）
2. `calcBasicDeductionIT()` — 基礎控除（給与所得連動の段階別）
3. `calcLifeInsuranceDeductionIT/RT()` — 生命保険料控除（上限）
4. `calcIncomeTaxAmount()` — 速算表（税率・控除額）

令和7・8年分: 基礎控除は `empIncome <= 1,320,000 → 95万、3,360,000 → 88万、4,890,000 → 68万、6,550,000 → 63万、23,500,000 → 58万`。令和9年以降は 132万超の区分が 58万に統一予定。

### 未使用コード・コンポーネントの扱い

現在未使用だが削除していないもの:
- `PaidLeaveTrendChart.tsx` — 有給推移グラフ（実装済み・ページ未組込み）
- `socialInsuranceTrend()` / `latestSocialInsurance()` — 社会保険料集計（aggregations.ts）
- `income.overtime` / `income.lifePlanSupport` — 旧フィールド（`detailIncome` に移行中）

削除より「旧・未使用」として残しておく方針（後から必要になる可能性あり）。

### ページ追加時の前後ナビゲーション設計

新しいページで「前後の明細に移動」を実装する場合は、**同種別ナビゲーション**を基本とする（`previousSameTypePayslip` / `nextSameTypePayslip`）。給与と賞与を混在させると比較が無意味になるため。
