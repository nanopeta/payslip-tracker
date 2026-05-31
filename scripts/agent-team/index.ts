/**
 * payslip-tracker エージェントチーム（Claude Code CLI 版）
 *
 * PM → Dev → Reviewer の3エージェントがスプリント方式で協調して
 * payslip-tracker を継続的に改善する CLI ツール。
 *
 * API キー不要。Claude Code CLI (claude コマンド) を使用。
 *
 * 使い方:
 *   npm run agent-team
 *   npm run agent-team -- --sprint-size=3
 */

import { spawnSync, execSync } from 'child_process'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

// ─── 定数 ────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '../..')

// エージェントはシステム temp dir から起動（PROJECT_ROOT の CLAUDE.md を読み込まないため）
const AGENT_CWD = os.tmpdir()

const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  blue:   '\x1b[34m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  gray:   '\x1b[90m',
  red:    '\x1b[31m',
}

// ─── CLI 引数 ─────────────────────────────────────────
const cliArgs = process.argv.slice(2)
const sprintSize = parseInt(
  cliArgs.find(a => a.startsWith('--sprint-size='))?.split('=')[1] ?? '5'
)

// ─── claude CLI の存在確認 ────────────────────────────
const claudeCheck = spawnSync('claude', ['--version'], { encoding: 'utf-8', shell: true })
if (claudeCheck.error || claudeCheck.status !== 0) {
  console.error(`${C.red}エラー: claude コマンドが見つかりません${C.reset}`)
  console.error('  Claude Code CLI をインストールしてください:')
  console.error('  https://claude.ai/code')
  process.exit(1)
}

// ─── ログ ─────────────────────────────────────────────
type Role = 'PM' | 'Dev' | 'Reviewer' | 'System'

const roleColors: Record<Role, string> = {
  PM:       C.blue,
  Dev:      C.green,
  Reviewer: C.yellow,
  System:   C.cyan,
}

function log(role: Role, msg: string) {
  const c = roleColors[role]
  console.log(`\n${c}${C.bold}[${role}]${C.reset} ${msg}`)
}

function logPreview(text: string) {
  const preview = text.slice(0, 300).replace(/\n/g, ' ')
  console.log(`  ${C.gray}→ ${preview}${text.length > 300 ? '...' : ''}${C.reset}`)
}

// ─── Claude CLI 呼び出し ──────────────────────────────
// AGENT_CWD（/tmp）から起動することで PROJECT_ROOT の CLAUDE.md を読まない
function callClaude(prompt: string): string {
  const result = spawnSync(
    'claude',
    ['--print', '--allowedTools', 'Read,Write,Edit,Bash'],
    {
      input: prompt,
      cwd: AGENT_CWD,
      encoding: 'utf-8',
      timeout: 300_000,
      maxBuffer: 10 * 1024 * 1024,
      shell: true,
    }
  )

  if (result.error) {
    throw new Error(`Claude CLI エラー: ${result.error.message}`)
  }
  if (result.status !== 0) {
    const stderr = (result.stderr ?? '').slice(0, 500)
    throw new Error(`Claude CLI 終了コード ${result.status}: ${stderr}`)
  }
  return result.stdout ?? ''
}

// ─── エージェント呼び出し ──────────────────────────────
function runAgent(
  role: Role,
  systemContext: string,
  sharedHistory: string[],
  taskInstruction: string,
): string {
  log(role, '作業開始...')

  const historySection = sharedHistory.length > 0
    ? `## チームの会話履歴（最新 ${Math.min(sharedHistory.length, 8)} 件）\n\n` +
      sharedHistory.slice(-8).join('\n\n---\n\n') + '\n\n---\n\n'
    : ''

  const prompt = `${systemContext}\n\n${historySection}## 今回のタスク\n\n${taskInstruction}`

  const result = callClaude(prompt)
  logPreview(result)
  return result
}

// ─── システムプロンプト ───────────────────────────────
const BASE_CONSTRAINTS = `
## プロジェクトルート
${PROJECT_ROOT}

すべてのファイル参照・コマンド実行は以下のように絶対パスまたは cd を使用:
- Read: ${PROJECT_ROOT}/src/pages/DashboardPage.tsx
- Bash: cd ${PROJECT_ROOT} && npm run build
- Bash: cd ${PROJECT_ROOT} && git log --oneline -30

## プロジェクト制約（CLAUDE.md より）
- Tailwind CSS 3.4.19 固定（npm install tailwindcss を実行しない）
- ブランドカラー: brand-600 (#5b8fa8)、success #5fad9b、danger #d06868、background #eef4f8
- TypeScript strict モード（型エラーは必ず修正すること）
- git commit/push/add/checkout などは絶対に実行しない（スクリプト側が制御する）
- 以下のファイルは変更しない: types/payslip.ts, lib/storage.ts, lib/mhtParser.ts
- formatYen は '¥' プレフィックス形式
`

const PM_SYSTEM = `あなたは payslip-tracker のプロダクトマネージャーです。コードを分析してスプリントバックログを作成します。
${BASE_CONSTRAINTS}

## スプリント計画の手順
1. Bash ツールで \`cd ${PROJECT_ROOT} && git log --oneline -30\` を実行して実装済みの改善を確認
2. Read ツールで ${PROJECT_ROOT}/CLAUDE.md を読んで最新の制約・設計方針・コンポーネント一覧を把握
3. Bash ツールで \`ls ${PROJECT_ROOT}/src/pages ${PROJECT_ROOT}/src/components/charts\` を確認
4. 必要に応じて主要ファイルを Read ツールで読む
5. 未実装の改善を ${sprintSize} 件選んで、以下の JSON 形式だけで返す（前後に余分なテキスト不要）:

{"backlog":["タスク1の説明（対象ファイル・実装内容を含む）","タスク2の説明","..."]}

## 選定基準
- git log に含まれていない（実装済みでない）改善のみ
- 既存データ（PayslipIncome, PayslipDeductions, PayslipAttendance）で実現できる改善
- 1タスク = Dev が単独で実装できる規模（1〜3ファイルの変更）
- CLAUDE.md の規約に従った実装が可能なタスク`

const DEV_SYSTEM = `あなたは payslip-tracker の熟練したフロントエンドエンジニアです。実装を担当します。
${BASE_CONSTRAINTS}

## 実装手順
1. Read ツールで ${PROJECT_ROOT}/CLAUDE.md を読んで最新の制約を確認
2. Read ツールで変更予定のファイルを読む（絶対パスを使用）
3. 類似する既存コンポーネント（TrendSummaryChart.tsx, StatCard.tsx 等）も Read ツールで読んで一貫性を保つ
4. Edit または Write ツールで変更を適用（絶対パスを使用）
5. Bash ツールで \`cd ${PROJECT_ROOT} && npm run build\` を実行してエラーがないか確認
6. ビルドエラーがあれば修正して再度 build を確認
7. 完了したら変更したファイルと実装内容の概要を報告

## 注意
- 新規 Chart コンポーネントは ${PROJECT_ROOT}/src/components/charts/ に作成
- インライン style={{ color: '#5fad9b' }} はブランドカラーに使用
- Recharts 標準設定（interval={0}, angle={-30} 等）に従う
- Bash ツールで git commit/push/add を実行しない（スクリプト側が管理）`

const REVIEWER_SYSTEM = `あなたは payslip-tracker のコードレビュアーです。
${BASE_CONSTRAINTS}

## レビュー手順
1. Bash ツールで \`cd ${PROJECT_ROOT} && git diff HEAD\` を実行して変更内容を確認
2. 変更されたファイルを Read ツールで詳しく確認（絶対パスを使用）
3. チェック項目:
   - TypeScript 型安全性（any の不適切な使用、型エラー等）
   - CLAUDE.md の規約遵守（ブランドカラー、Recharts パターン等）
   - 既存パターンとの一貫性（StatCard, TrendSummaryChart 等との整合性）
   - 既存機能のデグレードがないか

## 判断
- 問題なし → 最後に「LGTM」と明記して承認
- 問題あり → 「LGTM」とは書かず、具体的な修正箇所と方法を列挙`

const DOC_UPDATE_SYSTEM = `あなたは payslip-tracker のドキュメント管理者です。
${BASE_CONSTRAINTS}

## 手順
1. Bash ツールで \`cd ${PROJECT_ROOT} && git diff HEAD\` を実行してスプリントの変更内容を確認
2. Read ツールで ${PROJECT_ROOT}/CLAUDE.md を読む
3. 必要なら Edit ツールで ${PROJECT_ROOT}/CLAUDE.md を更新:
   - 新しいコンポーネントがあれば「ディレクトリ構成」に追加
   - 新しいパターンや制約があれば「開発時の注意点」に追記
4. 変更が小さくドキュメント更新が不要な場合は「更新不要」と返す

既存の記述スタイル（日本語、表形式）を維持すること`

// ─── Git ヘルパー ─────────────────────────────────────
function gitCommit(message: string) {
  try {
    execSync('git add -A', { cwd: PROJECT_ROOT })
    execSync(`git commit -m ${JSON.stringify(message)} --allow-empty`, { cwd: PROJECT_ROOT })
    const firstLine = message.split('\n')[0]!
    console.log(`  ${C.green}✅ コミット: ${firstLine.slice(0, 60)}${C.reset}`)
  } catch (e: unknown) {
    console.error(`  ${C.red}コミットエラー: ${e}${C.reset}`)
  }
}

// ─── メイン ───────────────────────────────────────────
function main() {
  console.log(`${C.cyan}${C.bold}
╔══════════════════════════════════════════╗
║   🤖  Agent Team — payslip-tracker      ║
║   スプリントサイズ: ${String(sprintSize).padEnd(2)} 件 / Ctrl+C で停止  ║
╚══════════════════════════════════════════╝${C.reset}`)

  // 作業ブランチを作成
  const branchName = `claude/agent-team-${Date.now()}`
  execSync(`git checkout -b ${branchName}`, { cwd: PROJECT_ROOT })
  console.log(`\n${C.cyan}作業ブランチ: ${branchName}${C.reset}`)

  const sharedHistory: string[] = []
  let sprintNo = 1

  // Ctrl+C ハンドラ
  process.on('SIGINT', () => {
    console.log(`\n${C.yellow}⏹ 停止中... ブランチをプッシュしています${C.reset}`)
    try {
      execSync(`git push -u origin ${branchName}`, { cwd: PROJECT_ROOT })
      console.log(`${C.green}✅ プッシュ完了`)
      console.log(`PR を作成してください:`)
      console.log(`  gh pr create --draft --head ${branchName} --base main${C.reset}`)
    } catch (e) {
      console.error(`${C.red}プッシュエラー: ${e}${C.reset}`)
    }
    process.exit(0)
  })

  // ─── スプリントループ ─────────────────────────────
  while (true) {
    console.log(`\n${C.blue}${'═'.repeat(54)}`)
    console.log(`  📋  スプリント ${sprintNo} — 計画フェーズ`)
    console.log(`${'═'.repeat(54)}${C.reset}`)

    // PM: バックログ作成
    const planningResult = runAgent(
      'PM',
      PM_SYSTEM,
      sharedHistory,
      `スプリント ${sprintNo} のバックログを ${sprintSize} 件 JSON 形式で作成してください。`,
    )

    // JSON パース（ブレースの対応を数えて正確に抽出）
    let backlog: string[] = []
    try {
      const start = planningResult.indexOf('{"backlog"')
      if (start !== -1) {
        let depth = 0, end = -1
        for (let i = start; i < planningResult.length; i++) {
          if (planningResult[i] === '{') depth++
          else if (planningResult[i] === '}' && --depth === 0) { end = i; break }
        }
        if (end !== -1) {
          backlog = (JSON.parse(planningResult.slice(start, end + 1)) as { backlog: string[] }).backlog
        }
      }
    } catch {
      log('System', `${C.red}PM の出力を JSON としてパースできませんでした。スプリントをスキップします。${C.reset}`)
      sprintNo++
      continue
    }

    if (backlog.length === 0) {
      log('System', '改善提案がありませんでした。終了します。')
      break
    }

    sharedHistory.push(
      `[PM — スプリント${sprintNo} バックログ]\n` +
      backlog.map((t, i) => `${i + 1}. ${t}`).join('\n')
    )
    console.log(`\n${C.blue}バックログ:${C.reset}`)
    backlog.forEach((t, i) => console.log(`  ${i + 1}. ${t}`))

    // ─── 実装スプリント ────────────────────────────
    for (let itemNo = 0; itemNo < backlog.length; itemNo++) {
      const task = backlog[itemNo]!
      console.log(`\n${C.green}${'─'.repeat(54)}`)
      console.log(`  🔨  ${itemNo + 1}/${backlog.length}: ${task.slice(0, 60)}`)
      console.log(`${'─'.repeat(54)}${C.reset}`)

      // Dev: 実装
      const implText = runAgent(
        'Dev',
        DEV_SYSTEM,
        sharedHistory,
        `次のタスクを実装してください:\n\n${task}`,
      )
      sharedHistory.push(`[Dev — タスク${itemNo + 1}]\n${implText}`)

      // Reviewer: レビュー
      const reviewText = runAgent(
        'Reviewer',
        REVIEWER_SYSTEM,
        sharedHistory,
        'Dev の実装をレビューしてください。',
      )
      const approved = reviewText.toLowerCase().includes('lgtm')
      sharedHistory.push(`[Reviewer — タスク${itemNo + 1}]\n${reviewText}`)

      // 修正が必要な場合（1回まで）
      if (!approved) {
        log('System', 'Reviewer から修正指示あり → Dev が対応します')
        const revisionText = runAgent(
          'Dev',
          DEV_SYSTEM,
          sharedHistory,
          'Reviewer の指摘に対応して修正してください。',
        )
        sharedHistory.push(`[Dev — 修正]\n${revisionText}`)
      }

      // タスクごとにコミット
      const commitMsg =
        `${task.slice(0, 72)}\n\nhttps://claude.ai/code/session_01PqsriuZUFvNfoZUk8KksSp`
      gitCommit(commitMsg)
    }

    // ─── ドキュメント更新 ─────────────────────────
    log('System', 'CLAUDE.md を最新状態に更新中...')
    const docText = runAgent(
      'Dev',
      DOC_UPDATE_SYSTEM,
      sharedHistory,
      'このスプリントの変更内容を CLAUDE.md に反映してください。',
    )
    sharedHistory.push(`[ドキュメント更新 — スプリント${sprintNo}]\n${docText}`)
    gitCommit(
      `ドキュメント更新（スプリント${sprintNo}）\n\nhttps://claude.ai/code/session_01PqsriuZUFvNfoZUk8KksSp`
    )

    sprintNo++
    console.log(`\n${C.cyan}🔄 スプリント ${sprintNo} を開始します... (Ctrl+C で停止)${C.reset}`)
  }
}

main()
