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
| Recharts | 2.15.3 | チャート描画 |
| Zustand | 5.0.3 | 状態管理 |
| React Router | 6.28.0 | ルーティング |
| pdfjs-dist | 5.2.133 | PDF解析（現在ほぼ未使用） |
| uuid | 11.1.0 | ID生成 |
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
│   └── aggregations.ts     # 月次集計・年次集計・みなし残業計算・社会保険料集計・前後明細ナビゲーション
├── store/
│   └── useStore.ts         # Zustand store（localStorage と同期）
├── components/
│   ├── layout/             # Sidebar（PC）、BottomNav（スマホ）、Layout
│   ├── ui/                 # StatCard
│   ├── charts/
│   │   ├── TrendSummaryChart.tsx      # 支給・手取りの推移（折れ線）★メイン
│   │   ├── PaidLeaveTrendChart.tsx    # 有給残日数の推移（棒グラフ）
│   │   ├── DeductionDonutChart.tsx    # 控除内訳ドーナツチャート（最新月）
│   │   ├── OvertimeHoursChart.tsx     # 残業時間推移（棒グラフ・45h参照線・80h過労ライン付き）
│   │   ├── SocialInsuranceTrendChart.tsx  # 4保険合計の月次推移（折れ線）
│   │   ├── MonthlyNetPayBarChart.tsx  # 年間集計の月次手取り棒グラフ（給与/賞与スタック）
│   │   ├── NetPayTrendChart.tsx       # 旧・未使用
│   │   └── IncomeDeductionChart.tsx   # 旧・未使用
│   ├── payslip/
│   │   ├── PayslipCard.tsx            # 明細一覧のカード（monthly かつ overtimeHours > 0 のとき残業時間を表示）
│   │   ├── PayslipDetailView.tsx      # 1件の明細詳細
│   │   └── AnnualDetailView.tsx       # 年間集計詳細（PayslipDetailView スタイル）
│   ├── withholding/        # WithholdingCard
│   └── upload/             # DropZone、PayslipReviewForm（重複検出付き）、WithholdingReviewForm
└── pages/
    ├── DashboardPage.tsx   # ダッシュボード（YTD累計・チャート・みなし残業・控除内訳・4保険合計）
    ├── PayslipsPage.tsx    # 給与明細一覧（ソート切り替え・年別グループ・月フィルター・フリーテキスト検索・一括削除）
    ├── PayslipDetailPage.tsx  # 明細詳細（前後月ナビゲーション・前月比サマリー・控除内訳ドーナツチャート）
    ├── AnnualSummaryPage.tsx  # 年間集計（月次手取平均・最高月・最低月・税/社保内訳・MonthlyNetPayBarChart・CSV エクスポート）
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

### DeductionDonutChart の凡例でレイアウト崩れ

**原因**: 健康保険・厚生年金等の長いラベルが凡例に並ぶとチャートエリアを圧迫する。

**対処**: `<Legend wrapperStyle={{ fontSize: 10 }} />` でフォントを縮小し、各 `<Cell>` に `legendType="square"` を付与。→ **実装済み（DeductionDonutChart.tsx）**

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
1. **StatCards** — 最新月の差引支給額・総支給・控除合計・手取り率・有給残日数・**4保険合計**（前月比付き）・**今年の賞与**（前年比付き・当年賞与データがある場合のみ）
2. **社会保険料の推移** — `SocialInsuranceTrendChart`（2件以上ある場合のみ）
3. **今年の累計（YTD）** — `annualTotals(payslips, currentYear)` で計算。当年データがない場合は非表示
4. **みなし残業効率カード** — 差額・詳細数値・残業時間推移チャート（`OvertimeHoursChart`）・月次差額推移
5. **支給・手取りの推移** — `TrendSummaryChart`（期間フィルター付き）
6. **有給残日数の推移** — `PaidLeaveTrendChart`（2件以上ある場合のみ）
7. **控除内訳ドーナツチャート** — `DeductionDonutChart`（最新給与月のデータ）
8. **最近の給与明細** — 直近3件のカードリスト（「全件を見る」リンク付き）

### DashboardPage の StatCard 折りたたみパターン

差引支給額・総支給・控除合計の3枚を常時表示し、残り（手取り率・有給残・4保険・税負担・賞与）は `showExtraCards` state でトグル展開する。

```typescript
const [showExtraCards, setShowExtraCards] = useState(false)
// トグルボタン
<button onClick={() => setShowExtraCards(v => !v)}>
  {showExtraCards ? '▲ 閉じる' : '▼ もっと見る'}
</button>
{showExtraCards && (
  <>
    {/* 手取り率・有給残・4保険・税負担・賞与 StatCards */}
  </>
)}
```

- 常時表示3枚は `highlight` フラグなし（グラデーション背景なし）
- YTD・みなし残業セクションの背景は `bg-brand-50` で色分けし視覚階層を明確化

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

### PayslipDetailView / AnnualDetailView のセクションヘッダー

セクションヘッダー（支給明細・控除明細など）に左側アクセントバーを付与し視認性を高める。

```tsx
<div className="flex items-center gap-2 mb-3">
  <div className="w-1 h-5 rounded-full bg-brand-600" />  {/* アクセントバー */}
  <h3 className="font-semibold text-brand-800 text-sm">{title}</h3>
</div>
```

- 合計行（支給合計・控除合計）には `bg-gray-50` の背景色を追加して通常行と区別する

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

### PayslipDetailPage の前月比サマリー

前後ナビゲーションバー直下に手取り・総支給・控除合計の前月比カード（`!editing && prev` のときのみ表示）。

```typescript
const items = [
  { label: '手取り', delta: payslip.summary.netPay - prev.summary.netPay },
  { label: '総支給', delta: payslip.income.total - prev.income.total },
  { label: '控除合計', delta: payslip.deductions.total - prev.deductions.total, invert: true },
]
// invert: true の項目は増加→赤（控除が増えると手取り減少）
style={{ color: (invert ? delta <= 0 : delta >= 0) ? '#5fad9b' : '#d06868' }}
```

- **`invert` フラグ**: 控除合計など「増加が不利」な指標に使う。`deltaPositive={delta <= 0}` の StatCard パターンと同義

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
