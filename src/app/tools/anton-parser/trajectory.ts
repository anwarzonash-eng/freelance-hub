'use client'

/* ------------------------------------------------------------------ *
 * Trajectory log parsing — the same rules the standalone viewer used to
 * turn `trajectory_messages` into numbered steps. Pure data in, pure
 * data out; the rendering lives in TaskTab.tsx.
 * ------------------------------------------------------------------ */

export interface TrajectoryMessage {
    role?: string
    content?: any
    tool_calls?: { id?: string; type?: string; function?: { name?: string; arguments?: string } }[]
    tool_call_id?: string
}
export interface StepItem {
    kind: 'response' | 'tool'
    subIdx: string
    text?: string
    toolName?: string
    input?: string
    output?: string
}
export interface Step { num: number; header: string; items: StepItem[] }

/* ------------------------------------------------------------------ *
 * Parsing — mirrors the original viewer's logic.
 * ------------------------------------------------------------------ */

/** Message content is a string on these logs; anything else is shown as JSON. */
export function asText(v: any): string {
    if (v == null) return ''
    if (typeof v === 'string') return v
    try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}

/** Every assistant message opens a step; its tool calls are paired with the
 *  `tool` messages carrying the matching tool_call_id. */
export function buildSteps(messages: TrajectoryMessage[]): Step[] {
    const steps: Step[] = []
    const byId = new Map<string, TrajectoryMessage>()
    messages.forEach(m => { if (m.role === 'tool' && m.tool_call_id) byId.set(m.tool_call_id, m) })

    let stepNum = 0
    messages.forEach(m => {
        if (m.role !== 'assistant') return
        stepNum++
        const calls = m.tool_calls || []
        const names = calls.map(c => c.function?.name || 'tool')
        const header = calls.length
            ? `Step ${stepNum}: Calling ${calls.length} tool(s): ${names.join(', ')}`
            : `Step ${stepNum}`

        const items: StepItem[] = []
        let sub = 1
        items.push({ kind: 'response', subIdx: String(sub), text: asText(m.content) })
        sub++

        calls.forEach(c => {
            let argsText = c.function?.arguments || ''
            try { argsText = JSON.stringify(JSON.parse(argsText), null, 2) } catch { /* leave raw */ }
            const result = c.id ? byId.get(c.id) : undefined
            items.push({
                kind: 'tool',
                subIdx: `${sub}-${sub + 1}`,
                toolName: c.function?.name || 'tool',
                input: argsText,
                output: result ? asText(result.content) : '(no matching tool result found)',
            })
            sub += 2
        })

        steps.push({ num: stepNum, header, items })
    })
    return steps
}

export function getPromptText(data: any): string {
    const msgs: TrajectoryMessage[] = data?.trajectory_messages || data?.initial_messages || []
    const first = msgs.find(m => m.role === 'user')
    return first ? asText(first.content) : '(no prompt found)'
}

export function getFinalAnswerText(data: any): string {
    if (data?.final_answer) {
        return typeof data.final_answer === 'string' ? data.final_answer : JSON.stringify(data.final_answer, null, 2)
    }
    const msgs: TrajectoryMessage[] = data?.trajectory_messages || []
    for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') return asText(msgs[i].content)
    }
    return '(no final answer found)'
}
