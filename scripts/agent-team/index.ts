/**
 * payslip-tracker エージェントチーム
 *
 * PM → Dev → Reviewer の3エージェントがスプリント方式で協調して
 * payslip-tracker を継続的に改善する CLI ツール。
 *
 * 使い方:
 *   ANTHROPIC_API_KEY=sk-ant-... npm run agent-team
 *   npm run agent-team -- --sprint-size=3
 */

import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

// ─── 定数 ────────────────────────────────────────────
const MODEL = 'claude-opus-4-8'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '../..')

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

// ─── Anthropic クライアント ───────────────────────────
if (!process.env.ANTHROPIC_API_KEY) {
  console.error(`${C.red}エラー: ANTHROPIC_API_KEY が設定されていません${C.reset}`)
  console.error('  export ANTHROPIC_API_KEY=sk-ant-... を実行してから起動してください')
  process.exit(1)
}
const client = new Anthropic()

// ─── ツール定義 ───────────────────────────────────────
type ToolName = 'read_file' | 'write_file' | 'list_directory' | 'run_command'

const TOOLS: Record<ToolName, Anthropic.Tool> = {
  read_file: {
    name: 'read_file',
    description: 'ファイルの内容を読む。path は PROJECT_ROOT からの相対パス（例: src/pages/DashboardPage.tsx）',
    input_schema: {
      type: 'object' as const,
      properties: { path: { type: 'string', description: 'ファイルパス（相対）' } },
      required: ['path'],
    },
  },
  write_file: {
    name: 'write_file',
    description: 'ファイルを作成または上書きする。path は PROJECT_ROOT からの相対パス',
    input_schema: {
      type: 'object' as const,
      properties: {
        path:    { type: 'string', description: 'ファイルパス（相対）' },
        content: { type: 'string', description: 'ファイルの内容（完全な内容を渡すこと）' },
      },
      required: ['path', 'content'],
    },
  },
  list_directory: {
    name: 'list_directory',
    description: 'ディレクトリ内のファイル・サブディレクトリ一覧を取得',
    input_schema: {
      type: 'object' as const,
      properties: { path: { type: 'string', description: 'ディレクトリパス（相対）' } },
      required: ['path'],
    },
  },
  run_command: {
    name: 'run_command',
    description: 'シェルコマンドを実行。npm run build / git diff / git log などが使用可能。git commit/push/add/checkout など Git 書き込み操作は禁止。',
    input_schema: {
      type: 'object' as const,
      properties: { command: { type: 'string', description: '実行するコマンド' } },
      required: ['command'],
    },
  },
}

// git 書き込み系コマンドをブロック
const BLOCKED_CMDS = [
  'git commit', 'git push', 'git add', 'git checkout', 'git reset',
  'git rebase', 'git merge', 'git branch -d', 'rm -rf', 'rm -r',
]

function executeTool(name: string, input: Record<string, string>): string {
  try {
    if (name === 'read_file') {
      const p = path.join(PROJECT_ROOT, input['path']!)
      if (!fs.existsSync(p)) return `エラー: ファイルが存在しません: ${input['path']}`
      const content = fs.readFileSync(p, 'utf-8')
      // 大きなファイルは先頭 6000 文字に制限
      return content.length > 6000 ? content.slice(0, 6000) + '\n... (truncated)' : content
    }

    if (name === 'write_file') {
      const p = path.join(PROJECT_ROOT, input['path']!)
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.writeFileSync(p, input['content']!)
      return `OK: ${input['path']} を書き込みました`
    }

    if (name === 'list_directory') {
      const p = path.join(PROJECT_ROOT, input['path']!)
      if (!fs.existsSync(p)) return `エラー: ディレクトリが存在しません: ${input['path']}`
      return fs.readdirSync(p).join('\n')
    }

    if (name === 'run_command') {
      const cmd = input['command']!
      for (const blocked of BLOCKED_CMDS) {
        if (cmd.includes(blocked)) {
          return `エラー: このコマンドは禁止されています: "${blocked}"`
        }
      }
      try {
        return execSync(cmd, { cwd: PROJECT_ROOT, encoding: 'utf-8', timeout: 120_000 })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        return `コマンドエラー:\n${msg.slice(0, 2000)}`
      }
    }

    return `エラー: 未知のツール: ${name}`
  } catch (e: unknown) {
    return `ツール実行エラー: ${e instanceof Error ? e.message : String(e)}`
  }
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

function logTool(name: string, inputStr: string) {
  const short = inputStr.length > 100 ? inputStr.slice(0, 100) + '...' : inputStr
  console.log(`  ${C.gray}🔧 ${name}(${short})${C.reset}`)
}

function logPreview(text: string) {
  const preview = text.slice(0, 250).replace(/\n/g, ' ')
  console.log(`  ${C.gray}→ ${preview}${text.length > 250 ? '...' : ''}${C.reset}`)
}

// ─── エージェント呼び出し ──────────────────────────────
async function runAgent(
  role: Role,
  systemPrompt: string,
  sharedHistory: string[],
  availableTools: ToolName[],
  taskInstruction: string,
): Promise<string> {
  log(role, '作業開始...')

  const historySection = sharedHistory.length > 0
    ? `## チームの会話履歴（最新 ${Math.min(sharedHistory.length, 10)} 件）\n\n` +
      sharedHistory.slice(-10).join('\n\n---\n\n') + '\n\n---\n\n'
    : ''

  const messages: Anthropic.MessageParam[] = [{
    role: 'user',
    content: `${historySection}${taskInstruction}`,
  }]

  const tools = availableTools.map(n => TOOLS[n])

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 8096,
    system: [{
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' },
    }],
    tools,
    messages,
  })

  // Agentic loop
  while (response.stop_reason === 'tool_use') {
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of response.content) {
      if (block.type === 'tool_use') {
        logTool(block.name, JSON.stringify(block.input))
        const result = executeTool(block.name, block.input as Record<string, string>)
        toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result })
      }
    }

    messages.push({ role: 'assistant', content: response.content })
    messages.push({ role: 'user', content: toolResults })

    response = await client.messages.create({
      model: MODEL,
      max_tokens: 8096,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      tools,
      messages,
    })
  }

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')

  logPreview(text)
  return text
}

// ─── システムプロンプト ───────────────────────────────
const BASE_CONSTRAINTS = `
プロジェクト制約（CLAUDE.md より）:
- Tailwind CSS 3.4.19 固定（npm install tailwindcss を実行しない）
- ブランドカラー: brand-600 (#5b8fa8)、success #5fad9b、danger #d06868、background #eef4f8
- TypeScript strict モード（型エラーは必ず修正すること）
- git commit/push/add などは実行しない（スクリプト側が制御する）
- 以下のファイルは変更しない: types/payslip.ts, lib/storage.ts, lib/mhtParser.ts
- formatYen は '¥' プレフィックス形式（円マーク）
`

const PM_SYSTEM = `あなたは payslip-tracker のプロダクトマネージャーです。コードを分析してスプリントバックログを作成します。
${BASE_CONSTRAINTS}

スプリント計画の手順:
1. run_command で \`git log --oneline -30\` を実行して実装済みの改善を確認
2. read_file で CLAUDE.md を読んで最新の制約・設計方針・コンポーネント一覧を把握
3. list_directory で src/pages, src/components/charts を確認
4. 必要に応じて主要ファイルを read_file で読む
5. 未実装の改善を ${sprintSize} 件選んで、以下の JSON 形式だけで返す（前後に余分なテキスト不要）:

{"backlog":["タスク1の説明（対象ファイル・実装内容を含む）","タスク2の説明","..."]}

選定基準:
- git log に含まれていない（実装済みでない）改善のみ
- 既存データ（PayslipIncome, PayslipDeductions, PayslipAttendance）で実現できる改善
- 1タスク = Dev が単独で実装できる規模（1〜3ファイルの変更）
- CLAUDE.md の規約に従った実装が可能なタスク`

const DEV_SYSTEM = `あなたは payslip-tracker の熟練したフロントエンドエンジニアです。実装を担当します。
${BASE_CONSTRAINTS}

実装手順:
1. read_file で CLAUDE.md を読んで最新の制約を確認
2. 変更予定のファイルを read_file で読む
3. 類似する既存コンポーネント（TrendSummaryChart.tsx, StatCard.tsx 等）も読んで一貫性を保つ
4. write_file で変更を適用（ファイル全体を渡すこと）
5. run_command で \`npm run build\` を実行してエラーがないか確認
6. ビルドエラーがあれば修正して再度 build を確認
7. 完了したら変更したファイルと実装内容の概要を報告

注意:
- 新規 Chart コンポーネントは src/components/charts/ に作成
- インライン style={{ color: '#5fad9b' }} はブランドカラーに使用
- Recharts 標準設定（interval={0}, angle={-30} 等）に従う`

const REVIEWER_SYSTEM = `あなたは payslip-tracker のコードレビュアーです。
${BASE_CONSTRAINTS}

レビュー手順:
1. run_command で \`git diff HEAD\` を実行して変更内容を確認（ステージングされていない変更もすべて表示）
2. 変更されたファイルを read_file で詳しく確認
3. チェック項目:
   - TypeScript 型安全性（any の不適切な使用、型エラー等）
   - CLAUDE.md の規約遵守（ブランドカラー、Recharts パターン等）
   - 既存パターンとの一貫性（StatCard, TrendSummaryChart 等との整合性）
   - 既存機能のデグレードがないか

判断:
- 問題なし → 最後に「LGTM」と明記して承認
- 問題あり → 「LGTM」とは書かず、具体的な修正箇所と方法を列挙`

const DOC_UPDATE_SYSTEM = `あなたは payslip-tracker のドキュメント管理者です。
${BASE_CONSTRAINTS}

手順:
1. run_command で \`git diff HEAD\` を実行してスプリントの変更内容を確認
2. read_file で CLAUDE.md を読む
3. 必要なら write_file で CLAUDE.md を更新:
   - 新しいコンポーネントがあれば「ディレクトリ構成」に追加
   - 新しいパターンや制約があれば「開発時の注意点」に追記
   - Recharts/StatCard の新しい使い方があれば「UI デザイン仕様」に追記
4. 変更が小さくドキュメント更新が不要な場合は「更新不要」と返す

注意: 既存の記述スタイル（日本語、表形式）を維持すること`

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
async function main() {
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
    const planningResult = await runAgent(
      'PM',
      PM_SYSTEM,
      sharedHistory,
      ['read_file', 'list_directory', 'run_command'],
      `スプリント ${sprintNo} のバックログを ${sprintSize} 件 JSON 形式で作成してください。`,
    )

    // JSON パース（正規表現でフォールバック）
    let backlog: string[] = []
    try {
      const jsonMatch = planningResult.match(/\{[\s\S]*?"backlog"[\s\S]*?\}/)
      if (jsonMatch) {
        backlog = (JSON.parse(jsonMatch[0]) as { backlog: string[] }).backlog
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
      const implText = await runAgent(
        'Dev',
        DEV_SYSTEM,
        sharedHistory,
        ['read_file', 'write_file', 'list_directory', 'run_command'],
        `次のタスクを実装してください:\n\n${task}`,
      )
      sharedHistory.push(`[Dev — タスク${itemNo + 1}]\n${implText}`)

      // Reviewer: レビュー
      const reviewText = await runAgent(
        'Reviewer',
        REVIEWER_SYSTEM,
        sharedHistory,
        ['read_file', 'run_command'],
        'Dev の実装をレビューしてください。',
      )
      const approved = reviewText.toLowerCase().includes('lgtm')
      sharedHistory.push(`[Reviewer — タスク${itemNo + 1}]\n${reviewText}`)

      // 修正が必要な場合（1回まで）
      if (!approved) {
        log('System', 'Reviewer から修正指示あり → Dev が対応します')
        const revisionText = await runAgent(
          'Dev',
          DEV_SYSTEM,
          sharedHistory,
          ['read_file', 'write_file', 'run_command'],
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
    const docText = await runAgent(
      'Dev',
      DOC_UPDATE_SYSTEM,
      sharedHistory,
      ['read_file', 'write_file', 'run_command'],
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

main().catch((e) => {
  console.error(`${C.red}致命的エラー:${C.reset}`, e)
  process.exit(1)
})
