# ARKEVest Mobile — Contexto

> Criado em 2026-06-12 (sessão 10). Documenta tudo específico ao app mobile ARKEVest.

---

## Stack

| Tecnologia | Versão | Papel |
|-----------|--------|-------|
| Expo SDK | 54.0.35 | Base do app |
| Expo Router | ~6.0.24 | Navegação file-based |
| React Native | 0.81.5 | Runtime nativo |
| React | 19.1.0 | UI |
| Zustand | ^5.0.3 | Estado global (auth store) |
| Axios | ^1.7.9 | HTTP client (mesmos endpoints da web) |
| expo-secure-store | ~15.0.8 | Persistência do token JWT |
| expo-updates | ~29.0.18 | OTA updates |
| expo-camera | ~17.0.10 | Scanner de código de barras |
| expo-linear-gradient | ~15.0.8 | Backgrounds |
| @expo/vector-icons | ^15.1.1 | Ionicons |

---

## Estrutura

```
apps/mobile/
├── app/
│   ├── _layout.tsx              # Root layout + OTA update check on launch (!__DEV__)
│   ├── (auth)/
│   │   └── login.tsx            # Tela de login; Alert SESSAO_ATIVA com forçar
│   ├── (app)/
│   │   ├── _layout.tsx          # Auth guard (redireciona /(auth)/login se sem token)
│   │   ├── index.tsx            # Home launcher (Vendas expandível + Clientes)
│   │   └── vendas/
│   │       └── sacolas/
│   │           ├── index.tsx    # Lista de sacolas (placeholder)
│   │           └── nova.tsx     # Nova sacola (placeholder)
├── components/
│   └── ui/
│       └── Button.tsx
├── constants/
│   └── theme.ts                 # Dark blue palette (bgGradientTop #0d1f3c → #111318, accent #00c8ff)
├── lib/
│   ├── api/
│   │   ├── client.ts            # Axios base URL + interceptor 401 (ignora /auth/login)
│   │   ├── auth.ts              # loginRequest — envia sempre plataforma: 'mobile'
│   │   └── sacolas.ts           # CRUD sacolas
│   └── store/
│       └── auth.store.ts        # Zustand: token, usuario, isLoading, sessaoAtiva, _hasHydrated
├── app.json                     # slug: arkevest, runtimeVersion: {policy:appVersion}, updates.url
├── eas.json                     # cli >=20, preview (APK android), production
├── metro.config.js              # watchFolders monorepo root + resolver.nodeModulesPaths
├── babel.config.js
└── tsconfig.json
```

---

## Contas e Acessos

| Serviço | Conta | Observação |
|---------|-------|-----------|
| expo.dev | gabriel.acker@gmail.com | organização: arkeflow |
| Play Store | gabriel.acker@gmail.com | conta criada, $25 pago |
| EAS project | arkevest | ID: 83cd8f1c-59e2-42f2-b7c0-c1a7a2be891e |
| Deploy branch | preview | runtime version: 1.0.0 |

---

## Build e Deploy

### Dev local (tunnel ngrok)
```bash
cd apps/mobile
pnpm expo start --tunnel
# Escaneie o QR no Expo Go ou no APK de dev
```

### OTA update (JS only — 90% dos casos)
```bash
cd apps/mobile
eas update --branch preview --message "descrição"
# Entregue automaticamente ao APK na próxima abertura do app
```

### Novo APK (mudanças nativas)
```bash
cd apps/mobile
eas build --platform android --profile preview --non-interactive
# Aguardar build → link no expo.dev
```

**Quando rebuild é necessário:** mudança de permissões, novo plugin nativo, upgrade de SDK, mudança em `app.json` (plugins, runtimeVersion, androidPackage).

---

## Build atual

| Campo | Valor |
|-------|-------|
| Build ID | `c39157fd-f3ef-447b-bc4c-cc59c8c13c42` |
| Runtime version | `1.0.0` |
| Branch | `preview` |
| Link | https://expo.dev/accounts/gabriel.acker/projects/arkevest/builds/c39157fd-f3ef-447b-bc4c-cc59c8c13c42 |
| Último OTA | grupo `671eb07b` — OTA check on launch |

---

## Telas aprovadas (mockups)

| # | Tela | Status |
|---|------|--------|
| 1 | **Login** — gradient #0d1f3c→#111318, ARKEvest logo, campo E-mail + Senha, KeyboardAvoidingView | ✓ funcional |
| 2 | **Home launcher** — dois cards (Vendas/Clientes); Vendas expande com Animated.spring mostrando Sacolas/Provas/Relatório | ✓ funcional |
| 3 | **Lista de sacolas** — FlatList, badges Aguardando/No caixa, FAB + Nova sacola | placeholder |
| 4 | **Busca de cliente** (passo 1 nova sacola) — busca fixa topo, lista filtrável, "Cadastrar novo" fixo acima teclado | pendente |
| 5 | **Cadastro cliente** — scroll com Next entre campos, CEP busca ViaCEP, Salvar fixo rodapé | pendente |
| 6 | **Adicionar produtos** (passo 2) — lista itens +/-, busca+câmera fixos, bottom sheet variação | pendente |

---

## Regras Importantes

### Autenticação e Sessão
- Token JWT salvo no `expo-secure-store` (SecureStore) — nunca em AsyncStorage
- Interceptor 401 em `client.ts` ignora `/auth/login` para evitar loop de remount
- 409 SESSAO_ATIVA retorna `{ code: 'SESSAO_ATIVA', ip, em }` — sem campos `error`/`message`
- Mobile exibe Alert com IP + horário da sessão ativa + botão "Entrar mesmo assim" (chama login com `forcar: true`)
- Sessão mobile NÃO conflita com sessão web/desktop (coexistem); só conflita com outra mobile

### Atualização OTA
- `_layout.tsx` chama `Updates.checkForUpdateAsync()` no mount, apenas em produção (`!__DEV__`)
- Se update disponível: `fetchUpdateAsync()` → `reloadAsync()` — app reinicia com novo bundle
- Erros são silenciados para não quebrar o app em ambiente offline/dev

### Monorepo pnpm
- `pnpm-lock.yaml` na raiz do monorepo deve estar sincronizado com todos os `package.json`
- EAS Build usa `pnpm install --frozen-lockfile` — qualquer dessincronização quebra o build
- `babel-preset-expo` deve ser devDependency do `package.json` raiz para funcionar no `eas update` local
- `public-hoist-pattern[]` no `.npmrc` raiz: `metro-runtime`, `@expo/cli`, `babel-preset-expo`

### Navegação
- Sacolas → `router.push('/(app)/vendas/sacolas')`
- Provas / Relatório → Alert "Em breve"
- Clientes → Alert "Em breve" (módulo pendente)
- Logout → `useAuthStore.logout()` + `router.replace('/(auth)/login')`

---

## Pendências

- [ ] Telas de sacolas funcionais (nova sacola, busca produto, câmera barcode)
- [ ] Tela de clientes (lista + cadastro + busca ViaCEP)
- [ ] Publicação na Play Store (APK pronto, conta criada)
- [ ] Testar OTA chegando no APK instalado (expo-updates check implementado, aguardando validação)
- [ ] Ícone e splash screen definitivos
- [ ] Configurar `eas submit` para Play Store
