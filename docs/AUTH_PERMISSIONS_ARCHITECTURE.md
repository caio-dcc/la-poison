# Arquitetura de Autenticação e Permissões — LaPoison

**Versão:** 1.0  
**Data:** 2026-05-25  
**Status:** Production-ready

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Fluxo de Autenticação](#fluxo-de-autenticação)
3. [Modelo de Roles e Permissões](#modelo-de-roles-e-permissões)
4. [Tabelas de Banco de Dados](#tabelas-de-banco-de-dados)
5. [RLS Policies](#rls-policies)
6. [Admin Dashboard](#admin-dashboard)
7. [Audit Logging](#audit-logging)
8. [Guia de Operações](#guia-de-operações)
9. [Security Checklist](#security-checklist)
10. [Troubleshooting](#troubleshooting)

---

## 🔍 Visão Geral

LaPoison usa **Supabase Auth** para autenticação (email/password + OAuth Google) e um modelo **RBAC (Role-Based Access Control)** baseado na tabela `profiles`. O sistema suporta 4 níveis de acesso:

| Nível                | Acesso                                                   | Descrição                                               |
| -------------------- | -------------------------------------------------------- | ------------------------------------------------------- |
| **Anônimo**          | Leitura pública                                          | Pode ver drinks, usar chatbot (3/dia), ler comentários  |
| **Logado (Free)**    | `/conta`, `/meus-bares`, `/inventario`, chatbot (10/dia) | User padrão sem pagamento                               |
| **Pro (Subscriber)** | Tudo + chatbot ilimitado                                 | `subscriptions.status = 'active'`                       |
| **Admin**            | `/admin` + controle total                                | `profiles.is_admin = true` ou `profiles.role = 'admin'` |

---

## 🔑 Fluxo de Autenticação

```
┌─────────────────────────────────────────────────────────────┐
│                      User Browser                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
                   [LoginForm.tsx]
                  (client component)
                          ↓
         ┌──────────────────┬──────────────────┐
         ↓                  ↓                  ↓
   [Email/Password]    [Google OAuth]    [Signup]
   signInWithPassword  signInWithOAuth   signUp
         ↓                  ↓                  ↓
   └──────────────────────┬──────────────────┘
                          ↓
                  [Supabase Auth]
                  JWT gerado →
                  sb-access-token cookie
                  sb-refresh-token cookie
                          ↓
              ┌───────────────────────┐
              ↓                       ↓
    [/api/auth/callback] ←────────────┘
    (OAuth/Email confirm)
              ↓
    Exchange code for session
              ↓
    Redireciona para ?redirect
         ou /{locale}
```

### Fluxo Detalhado

1. **Signup/Login (client-side)**
   - Usuário acessa `/pt/login` ou `/pt/signup`
   - Form submete para Supabase Auth client (`signInWithPassword` ou `signInWithOAuth`)
   - OAuth Google redireciona para `/api/auth/callback?code=...`

2. **Session Exchange (server-side)**
   - `/api/auth/callback` recebe `code` de Supabase
   - Chama `exchangeCodeForSession(code)` para gerar JWT
   - JWT é armazenado em cookies HTTP-only pelo middleware
   - Redireciona para `?redirect` param ou home

3. **Session Refresh (on every request)**
   - `middleware.ts` chama `createClient(request)` em toda request
   - `createClient()` chama `supabase.auth.getUser()` implicitamente
   - Supabase verifica JWT nos cookies; se expirado, tenta refresh com refresh-token
   - Nova sessão é armazenada nos cookies

4. **Protected Routes**
   - `middleware.ts` verifica `auth.getUser()` para rotas em `PROTECTED_PREFIXES`
   - Se não autenticado → redireciona para `/pt/login?redirect=<pathname>`
   - Se autenticado → permite acesso

5. **Admin Routes**
   - Além de autenticação, `/admin/layout.tsx` verifica `profiles.is_admin`
   - Se `is_admin = false` → redireciona para home (`/pt`)
   - Se `is_admin = true` → renderiza admin layout com sidebar

---

## 👥 Modelo de Roles e Permissões

### Tabela `profiles`

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'superadmin')),
  display_name TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

### Níveis de Rol

| Role         | is_admin | Permissões                                | Acesso                                 |
| ------------ | -------- | ----------------------------------------- | -------------------------------------- |
| `user`       | false    | Leitura pública, criar comentários/drinks | `/conta`, `/meus-bares`, `/inventario` |
| `moderator`  | false    | + Aprovar user_drinks, deletar comments   | (A definir em futuras features)        |
| `admin`      | true     | Tudo + Admin panel, logs, user management | `/admin`, `/admin/users`, etc          |
| `superadmin` | true     | Tudo acima + pode promover admins         | `/admin` + special operations          |

**Nota:** `is_admin` é redundante com `role = 'admin'`. Mantém-se `is_admin` por compatibilidade com RLS existente.

---

## 💾 Tabelas de Banco de Dados

### `auth.users` (Supabase gerenciada)

Tabela interna do Supabase. Campos relevantes:

- `id` (UUID) — identificador único
- `email` (TEXT) — email de login
- `encrypted_password` (TEXT) — hash bcrypt (nunca acessar direto)
- `email_confirmed_at` (TIMESTAMP) — null se não confirmado
- `user_metadata` (JSONB) — dados customizados (ex: `{username: "..."}`)
- `created_at`, `updated_at`

**Acesso:** Via `supabase.auth.*` ou Admin API com service key

---

### `profiles`

Extensão da tabela `auth.users` com informações de role e profile.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  display_name TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = TRUE;
```

**RLS:**

- `SELECT`: Usuários leem seu próprio perfil
- `UPDATE`: Usuários atualizam seu próprio perfil, mas NÃO podem mudar `is_admin` ou `role`
- `INSERT`/`UPDATE` (`is_admin`, `role`): Apenas service key

---

### `audit_logs`

Registra todas as ações sensíveis do admin.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

**RLS:**

- `SELECT`: Apenas admins (via RLS com check de `profiles.is_admin`)
- `INSERT`: Apenas service key

---

## 🔐 RLS Policies

### `profiles`

```sql
-- Users can read their own profile
CREATE POLICY "profiles_self_read" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile, but NOT role/is_admin
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND is_admin = (SELECT is_admin FROM profiles WHERE id = auth.uid()));
```

**Explicação:** A política `WITH CHECK` força que o usuário mantenha seu próprio valor de `is_admin` — não pode mudar. Service key bypassa essa check.

---

### `audit_logs`

```sql
-- Admins can read
CREATE POLICY "admins_read_audit_logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Only service role can insert
CREATE POLICY "service_role_insert_audit_logs" ON audit_logs
  FOR INSERT WITH CHECK (false);
```

---

### Outras Tabelas Relevantes

| Tabela            | RLS    | Policy                           | Notas                     |
| ----------------- | ------ | -------------------------------- | ------------------------- |
| `subscriptions`   | ✅ Sim | User lê própria; Service escreve | Feature gating de chatbot |
| `chatbot_usage`   | ✅ Sim | User lê própria; Service escreve | Rate limiting             |
| `bars`            | ✅ Sim | Owner CRUD                       | User-owned resources      |
| `inventory_items` | ✅ Sim | Owner via bar FK                 | Nested ownership          |
| `cocktails`       | ✅ Sim | Public read; Service write       | Content admin             |

---

## 🎛️ Admin Dashboard

**Localização:** `app/[locale]/admin/`

### Estrutura

```
/pt/admin
├── /pt/admin/              → Dashboard (stats)
├── /pt/admin/users         → Listar usuários
├── /pt/admin/subscriptions → Listar subscriptions
└── /pt/admin/audit         → Audit logs
```

### Componentes

**`app/[locale]/admin/layout.tsx`**

- Server component que verifica `is_admin`
- Renderiza sidebar de navegação
- Redireciona non-admins para `/pt`

**`app/[locale]/admin/page.tsx`**

- Stats: total users, pro users, queries hoje, receita estimada
- Queries server-side com service key

**`app/[locale]/admin/users/page.tsx`**

- Tabela de usuários com role e status de subscription
- Paginação (primeiras 50)

**`app/[locale]/admin/subscriptions/page.tsx`**

- Tabela de subscriptions ativas, canceladas, em trial
- Mostra status e period_end

**`app/[locale]/admin/audit/page.tsx`**

- Feed de audit logs (últimos 100)
- Color-coded por tipo de ação

---

## 📝 Audit Logging

### Função Utility

**Arquivo:** `src/lib/audit.ts`

```typescript
export async function logAuditEvent(params: {
  actorId: string
  actorEmail: string
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
})
```

### Exemplo de Uso

```typescript
import { logAuditEvent } from '@/lib/audit'

// After promoting a user to admin
await logAuditEvent({
  actorId: adminUserId,
  actorEmail: adminEmail,
  action: 'promote_admin',
  targetType: 'user',
  targetId: targetUserId,
  metadata: { reason: 'Trusted moderator' },
})
```

### Ações Pré-registradas

- `create_superadmin` — Script `create-superadmin.mjs`
- `promote_admin` — (a implementar em admin panel)
- `delete_user` — (a implementar em admin panel)
- `ban_user` — (a implementar em admin panel)

---

## 🚀 Guia de Operações

### 1. Criar Superadmin

**Pré-requisito:** Migration 010 já aplicada.

```bash
node scripts/create-superadmin.mjs
```

**O que faz:**

1. Busca/cria user com email `dev.caio.marques@gmail.com`
2. Seta `profiles.is_admin = true, role = 'superadmin'`
3. Registra em `audit_logs`
4. Imprime instruções de login

**Próximo passo:** Fazer login via Google OAuth com o email especificado.

---

### 2. Fazer Login como Admin

1. Ir para `http://localhost:3000/pt/login`
2. Clicar "Login with Google"
3. Usar `dev.caio.marques@gmail.com`
4. Supabase vincula automaticamente ao perfil admin criado
5. Redireciona para `/pt/admin` se for admin, ou `/pt` se não for

---

### 3. Verificar Status de Admin

Via Dashboard Supabase:

```sql
SELECT id, is_admin, role FROM profiles WHERE is_admin = true;
```

Via Admin API (Node.js):

```typescript
const {
  data: { user },
} = await supabase.auth.getUser()
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin, role')
  .eq('id', user.id)
  .single()

console.log(profile.is_admin) // true/false
```

---

### 4. Ver Audit Logs

Via Dashboard Supabase:

```sql
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50;
```

Via Admin Panel:

- Ir para `/pt/admin/audit`

---

## ✅ Security Checklist

### Implementado ✅

- [x] Supabase Auth com email + Google OAuth
- [x] Session management via HTTP-only cookies
- [x] Automatic session refresh a cada request
- [x] RLS policies em todas as tabelas com dados sensíveis
- [x] Admin verification no layout server component (não middleware)
- [x] Rate limiting no chatbot (IP + user-based)
- [x] Audit logging de ações sensíveis
- [x] Passwords não armazenados em app (delegado a Supabase)
- [x] Service key separado de publishable key
- [x] Admin routes protegidas em middleware + layout

### Em Progresso 🔄

- [ ] 2FA/MFA para admin accounts (requer Supabase Auth factor APIs)
- [ ] IP whitelist para admin logins
- [ ] Webhook signature validation (Stripe webhook já implementado)

### Recomendado para Futuro 🎯

- [ ] Password reset flow securizado (magic link)
- [ ] Email confirmation obrigatória no signup
- [ ] Login rate limiting (5 tentativas/5min)
- [ ] Session timeout (30min inatividade)
- [ ] CSRF tokens em forms
- [ ] Content Security Policy headers
- [ ] Helmet.js para security headers

---

## 🐛 Troubleshooting

### Problema: "Admin check always redirects"

**Causa:** Migration 010 não aplicada, tabela `profiles` vazia ou sem `is_admin`.

**Solução:**

1. Verificar que migration 010 foi aplicada:
   ```sql
   SELECT * FROM information_schema.columns
   WHERE table_name = 'profiles' AND column_name = 'role';
   ```
2. Se não existir, copiar `supabase/migrations/010_admin_and_audit.sql` no Supabase Dashboard SQL Editor
3. Rodar `node scripts/create-superadmin.mjs` novamente

---

### Problema: "Login with Google não funciona"

**Causa:** Redirect URI não registrado no Google Cloud Console.

**Solução:**

1. Ir para [Google Cloud Console](https://console.cloud.google.com/)
2. Projeto → OAuth 2.0 Credentials
3. Adicionar Authorized redirect URI:
   - `http://localhost:3000/auth/v1/callback` (dev)
   - `https://<seu-domínio>/auth/v1/callback` (prod)
4. Salvar e testar

---

### Problema: "audit_logs insert falha com 'policy violates'"

**Causa:** RLS policy rejeita insert fora do service key.

**Solução:** Usar `SUPABASE_SERVICE_KEY` em `server.ts` automaticamente bypassa RLS. Se erro persiste:

1. Verificar que `server.ts` usa `SUPABASE_SERVICE_KEY`
2. Verificar que `SUPABASE_SERVICE_KEY` é válida no `.env.local`
3. Rodar `createClient()` apenas no server, não no client

---

### Problema: "User consegue mudar `is_admin` em UPDATE"

**Causa:** RLS policy `profiles_self_update` com `WITH CHECK (is_admin = (SELECT ...))` não está funcionando.

**Solução:**

1. Verificar sintaxe SQL:
   ```sql
   CREATE POLICY "profiles_self_update" ON profiles
     FOR UPDATE USING (auth.uid() = id)
     WITH CHECK (auth.uid() = id AND is_admin = (SELECT is_admin FROM profiles WHERE id = auth.uid()));
   ```
2. O `WITH CHECK` força que o novo valor de `is_admin` seja igual ao antigo. Service key bypassa.
3. Se still permite update, droppar a policy e recriar:
   ```sql
   DROP POLICY "profiles_self_update" ON profiles;
   CREATE POLICY "profiles_self_update" ...
   ```

---

### Problema: "Middleware não redireciona para admin check"

**Causa:** Admin check está no layout server component, não no middleware. Middleware só protege de não-autenticados.

**Solução:** Isso é correto! Admin verification deve estar em `/admin/layout.tsx`, não em middleware, porque precisa de service key para query RLS.

---

## 📚 Referências

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js SSR with Supabase](https://supabase.com/docs/guides/auth/server-side-rendering)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Última atualização:** 2026-05-25  
**Versão anterior:** N/A (primeira versão)
