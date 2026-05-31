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

// PROJECT_ROOT から起動（Windows ではTEMPからだとプロジェクトへのアクセスがブロックされる）
const AGENT_CWD = PROJECT_ROOT

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
const maxSprints = parseInt(
  cliArgs.find(a => a.startsWith('--max-sprints='))?.split('=')[1] ?? '2'
)
const modelArg = cliArgs.find(a => a.startsWith('--model='))?.split('=')[1]
// --fast は --no-review + --no-doc-update のショートカット
const fast = cliArgs.includes('--fast')
const skipReview    = fast || cliArgs.includes('--no-review')
const skipDocUpdate = fast || cliArgs.includes('--no-doc-update')

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
function callClaude(prompt: string): string {
  const args = ['--print', '--allowedTools', 'Read,Write,Edit,Bash']
  if (modelArg) args.push('--model', modelArg)

  const result = spawnSync('claude', args, {
    input: prompt,
    cwd: AGENT_CWD,
    encoding: 'utf-8',
    timeout: 300_000,
    maxBuffer: 10 * 1024 * 1024,
    shell: true,
  })

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
const MAX_HISTORY_ENTRIES = 4
const MAX_ENTRY_CHARS = 300

function runAgent(
  role: Role,
  systemContext: string,
  sharedHistory: string[],
  taskInstruction: string,
): string {
  log(role, '作業開始...')

  const historySection = sharedHistory.length > 0
    ? `## 直近の作業履歴\n` +
      sharedHistory.slice(-MAX_HISTORY_ENTRIES)
        .map(h => h.length > MAX_ENTRY_CHARS ? h.slice(0, MAX_ENTRY_CHARS) + '…' : h)
        .join('\n---\n') + '\n---\n\n'
    : ''

  const prompt = `${systemContext}\n\n${historySection}## タスク\n\n${taskInstruction}`

  const result = callClaude(prompt)
  logPreview(result)
  return result
}

// ─── システムプロンプト ───────────────────────────────
const R = PROJECT_ROOT  // 短縮エイリアス

const BASE_CONSTRAINTS = `プロジェクト: ${R}
制約: Tailwind 3.4.19固定 / brand-600=#5b8fa8 / success=#5fad9b / danger=#d06868 / TSストリクト / git操作禁止 / 変更禁止: types/payslip.ts,lib/storage.ts,lib/mhtParser.ts`

const PM_SYSTEM = `payslip-tracker PM。バックログ作成専任。
${BASE_CONSTRAINTS}

1. \`cd ${R} && git log --oneline -20\` で実装済みを確認
2. \`ls ${R}/src/pages ${R}/src/components/charts\` でファイル一覧確認
3. 未実装の改善${sprintSize}件を以下のJSON形式のみで返す（余分なテキスト不要）:

{"backlog":["タスク1（対象ファイル・内容）","タスク2",...]}

選定基準: git logに無い / 既存データで実現可能 / 1〜3ファイル変更規模
種別: 新機能・バグ修正・UI/UX改善・レイアウト修正をバランスよく混在させる`

const DEV_SYSTEM = `payslip-tracker フロントエンドエンジニア。
${BASE_CONSTRAINTS}

実装: 対象ファイルをReadで確認→Edit/Writeで実装→\`cd ${R} && npm run build\`でエラー確認→修正
- 新Chartは ${R}/src/components/charts/ に作成
- Recharts: interval={0}, angle={-30}, Y軸は万単位
- git操作は一切実行しない`

const REVIEWER_SYSTEM = `payslip-tracker コードレビュアー。
${BASE_CONSTRAINTS}

1. \`cd ${R} && git diff HEAD\` で変更確認
2. TS型安全性 / ブランドカラー遵守 / 既存パターン整合性 をチェック
3. 問題なし→最後に「LGTM」と明記 / 問題あり→「LGTM」を書かず修正箇所を列挙`

const DOC_UPDATE_SYSTEM = `payslip-tracker ドキュメント管理者。
${BASE_CONSTRAINTS}

1. \`cd ${R} && git diff HEAD\` で変更確認
2. 新コンポーネント・新パターンがあれば ${R}/CLAUDE.md をEditで更新（既存スタイル維持）
3. 更新不要なら「更新不要」とだけ返す`

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
  const flags = [
    modelArg    ? `model=${modelArg}`   : '',
    skipReview    ? 'no-review'         : '',
    skipDocUpdate ? 'no-doc-update'     : '',
  ].filter(Boolean).join(' / ') || 'standard'

  console.log(`${C.cyan}${C.bold}
╔══════════════════════════════════════════╗
║   🤖  Agent Team — payslip-tracker      ║
║   sprint=${String(sprintSize).padEnd(2)} / ${flags.padEnd(26)}║
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

      // Reviewer: レビュー（--no-review / --fast でスキップ）
      if (!skipReview) {
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
      }

      // タスクごとにコミット
      const commitMsg =
        `${task.slice(0, 72)}\n\nhttps://claude.ai/code/session_01PqsriuZUFvNfoZUk8KksSp`
      gitCommit(commitMsg)
    }

    // ─── ドキュメント更新（--no-doc-update / --fast でスキップ）─
    if (!skipDocUpdate) {
      log('System', 'CLAUDE.md を最新状態に更新中...')
      const docText = runAgent(
        'Dev',
        DOC_UPDATE_SYSTEM,
        sharedHistory,
        'このスプリントの変更内容を CLAUDE.md に反映してください。',
      )
      sharedHistory.push(`[ドキュメント更新 — スプリント${sprintNo}]\n${docText}`)
      if (!docText.includes('更新不要')) {
        gitCommit(
          `ドキュメント更新（スプリント${sprintNo}）\n\nhttps://claude.ai/code/session_01PqsriuZUFvNfoZUk8KksSp`
        )
      }
    }

    if (maxSprints > 0 && sprintNo >= maxSprints) {
      console.log(`\n${C.cyan}✅ 指定スプリント数（${maxSprints}）完了。終了します。${C.reset}`)
      break
    }
    sprintNo++
    console.log(`\n${C.cyan}🔄 スプリント ${sprintNo} を開始します... (Ctrl+C で停止)${C.reset}`)
  }
}

main()
