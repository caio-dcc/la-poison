# AGENT_STATE.json — Schema e protocolo

Este arquivo é o **único ponto de verdade** sobre o estado do desenvolvimento entre as IDEs (Claude Code, Cursor, Antigravity).

## Schema

```typescript
type AgentState = {
  version: '1.0'
  project: string
  last_updated: string // ISO 8601
  last_agent: 'claude-code' | 'cursor' | 'antigravity' | 'init'
  current_task: Task | null
  completed_tasks: CompletedTask[]
  tasks_queue: QueuedTask[]
  session_log: LogEntry[]
  cache_keys: string[] // chaves usadas em docs/CACHE.md
  notes: Record<string, string>
}

type Task = {
  id: string // "T-XXX"
  status: 'queued' | 'in_progress' | 'blocked' | 'completed' | 'skipped'
  started_at: string // ISO
  agent: 'claude-code' | 'cursor' | 'antigravity'
}

type CompletedTask = {
  id: string
  completed_at: string
  agent: string
  commit_sha?: string
  notes?: string
}

type QueuedTask = {
  id: string
  priority: number // menor = primeiro
  phase: string // "0-setup", "1-ingest", etc
  title: string
  blockers: string[] // IDs de tasks que precisam estar em completed_tasks
}

type LogEntry = {
  timestamp: string
  agent: string
  action: string
  files_changed: string[]
}
```

## Regras de concorrência

1. Antes de começar QUALQUER ação, ler o arquivo
2. Se `current_task !== null` e `last_agent !== você`:
   - Se `last_updated` < 30 minutos → **PARAR** e perguntar ao usuário
   - Se ≥ 30 minutos → assumir abandono e prosseguir, mas avisar usuário
3. Ao começar: marcar `current_task` com seu agente
4. Ao terminar: mover para `completed_tasks`, set `current_task: null`
5. Sempre incrementar `session_log`

## Como pegar a próxima task

```typescript
function nextEligibleTask(state: AgentState): QueuedTask | null {
  const completedIds = new Set(state.completed_tasks.map(t => t.id))
  const eligible = state.tasks_queue
    .filter(t => t.blockers.every(b => completedIds.has(b)))
    .sort((a, b) => a.priority - b.priority)
  return eligible[0] ?? null
}
```

## Exemplo de atualização

```diff
{
-  "last_updated": "2026-05-12T10:00:00Z",
+  "last_updated": "2026-05-12T10:23:14Z",
-  "last_agent": "init",
+  "last_agent": "cursor",
-  "current_task": null,
+  "current_task": {
+    "id": "T-001",
+    "status": "in_progress",
+    "started_at": "2026-05-12T10:23:14Z",
+    "agent": "cursor"
+  },
   "session_log": [
+    {
+      "timestamp": "2026-05-12T10:23:14Z",
+      "agent": "cursor",
+      "action": "Iniciou T-001: setup do projeto Next.js",
+      "files_changed": []
+    }
   ]
}
```
