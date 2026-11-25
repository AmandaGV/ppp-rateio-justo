# 💸 RateioJusto

> Projeto Portfólio Pessoal · Mentoria 2.0

O **RateioJusto** é um sistema web de **gestão e divisão proporcional de despesas compartilhadas** para grupos: viagens, eventos e repúblicas. Cada grupo tem participantes com papéis (ADMIN / MEMBRO), despesas divididas de três formas (igualitária, percentual ou valor exato) e um **balanço automático** que diz quem paga quanto para quem.

A aplicação foi construída para ser **aplicação-alvo de uma suíte de Engenharia de Qualidade** (testes de API, E2E e performance). Por isso ela tem:

- regras de negócio **explícitas e determinísticas** (limites, arredondamento e ordem de validação documentados);
- **Swagger** completo com schemas, códigos HTTP e exemplos de erro;
- **códigos de erro semânticos** em todas as respostas de erro;
- **`data-testid` semânticos** em botões, inputs, modais e alertas;
- **dados de seed com IDs fixos** e um endpoint para **restaurar o banco** entre execuções de teste.

> Esta aplicação **não** contém automação de testes: ela é o alvo da suíte, que deve ficar em outro projeto.

---

## Sumário

1. [Tecnologias](#tecnologias)
2. [Estrutura do monorepo](#estrutura-do-monorepo)
3. [Como instalar](#como-instalar)
4. [Como executar](#como-executar)
5. [URLs importantes](#urls-importantes)
6. [Dados de teste incluídos](#dados-de-teste-incluídos)
7. [Regras de negócio](#regras-de-negócio)
8. [Referência da API](#referência-da-api)
9. [Guia para automação (data-testid)](#guia-para-automação-data-testid)
10. [Banco de dados em memória](#banco-de-dados-em-memória)
11. [Variáveis de ambiente](#variáveis-de-ambiente)

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Backend | Node.js 18+, Express 5, Mongoose 8 |
| Banco de dados | **MongoDB em memória** via `mongodb-memory-server` |
| Autenticação | JWT (`jsonwebtoken`, validade de 2 horas) + senhas com hash `bcrypt` |
| Documentação | OpenAPI 3.0 + `swagger-ui-express` em `/api-docs` |
| Frontend | React 18 + Vite 6 + React Router 6 (CSS puro, sem framework de UI) |

## Estrutura do monorepo

```
ppp-rateio-justo/
├── README.md
├── package.json                 # atalhos para instalar/rodar os dois projetos
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js            # sobe o Mongo em memória, carrega o seed e inicia a API
│       ├── app.js               # Express, CORS, Swagger, rotas e tratamento de erros
│       ├── config/              # configuração via variáveis de ambiente
│       ├── database/
│       │   ├── connection.js    # mongodb-memory-server + Mongoose
│       │   └── seed.js          # dados de teste com IDs fixos
│       ├── docs/swagger.js      # especificação OpenAPI (configuração inline)
│       ├── models/              # Usuario, Grupo, Despesa
│       ├── middlewares/         # autenticação JWT e tratamento de erros
│       ├── routes/              # mapa de rotas /api
│       ├── controllers/         # camada HTTP (status codes)
│       ├── services/            # regras de negócio (auth, grupos, despesas, rateio, balanço)
│       └── utils/               # constantes de regras, erros, dinheiro em centavos, validações
└── frontend/
    ├── package.json
    ├── vite.config.js           # porta 5173 + proxy de /api para a API
    └── src/
        ├── pages/               # Login, Cadastro, Dashboard, Detalhes do grupo
        ├── components/
        │   ├── comum/           # Modal, Alerta, Badges, Navbar, rota protegida...
        │   ├── grupos/          # cartão de grupo, modal de novo grupo
        │   ├── despesas/        # lista e formulário dinâmico de despesas
        │   ├── membros/         # aba de membros
        │   └── balanco/         # aba de balanço / acerto de contas
        ├── context/             # sessão do usuário (JWT)
        ├── services/api.js      # cliente HTTP
        └── utils/
```

## Como instalar

**Pré-requisitos:** Node.js **18 ou superior** e npm. Não é preciso instalar MongoDB.

```bash
git clone https://github.com/AmandaGV/ppp-rateio-justo.git
cd ppp-rateio-justo

# instala backend e frontend
npm run install:all
# (equivalente a: cd backend && npm install  &&  cd ../frontend && npm install)
```

> ℹ️ Na **primeira execução** o `mongodb-memory-server` baixa automaticamente o binário do MongoDB (~100 MB) para `~/.cache/mongodb-binaries`. É necessário acesso à internet nesse primeiro start; depois ele fica em cache.

## Como executar

Abra **dois terminais** na raiz do projeto:

```bash
# Terminal 1 — API (porta 3001)
npm run start:backend

# Terminal 2 — Interface web (porta 5173)
npm run start:frontend
```

Ao subir, a API imprime:

```
[RateioJusto] Seed carregado: 24 usuários, 5 grupos, 7 despesas.
[RateioJusto] API:     http://localhost:3001/api
[RateioJusto] Swagger: http://localhost:3001/api-docs
```

Depois acesse **http://localhost:5173** e entre com `ana@rateiojusto.com` / `Senha@123`.

> Os dados vivem **apenas em memória**: ao reiniciar a API, tudo volta ao estado do seed. Para restaurar sem reiniciar, use `POST /api/test/reset`.

Build de produção do frontend (opcional): `npm run build:frontend` e `npm run preview --prefix frontend` (porta 4173, também com proxy para a API).

## URLs importantes

| O quê | URL |
|---|---|
| Interface web | http://localhost:5173 |
| Login | http://localhost:5173/login |
| Cadastro | http://localhost:5173/cadastro |
| Dashboard de grupos | http://localhost:5173/grupos |
| Detalhes de um grupo (aba) | http://localhost:5173/grupos/:id?aba=despesas \| membros \| balanco |
| API (base) | http://localhost:3001/api |
| **Swagger UI** | **http://localhost:3001/api-docs** |
| Especificação OpenAPI (JSON) | http://localhost:3001/api-docs.json |
| Health-check | http://localhost:3001/api/health |
| Reset do banco para o seed | `POST` http://localhost:3001/api/test/reset |

## Dados de teste incluídos

Carregados automaticamente a cada start da API (e a cada `POST /api/test/reset`). **Os IDs são fixos**, então podem ser usados diretamente nos testes.

### Usuários — senha de todos: `Senha@123`

| ID | Nome | E-mail | Uso sugerido |
|---|---|---|---|
| `650000000000000000000001` | Ana Souza | ana@rateiojusto.com | ADMIN em 3 grupos, MEMBRO em 1 |
| `650000000000000000000002` | Bruno Lima | bruno@rateiojusto.com | ADMIN da República, MEMBRO da Viagem |
| `650000000000000000000003` | Carla Mendes | carla@rateiojusto.com | MEMBRO |
| `650000000000000000000004` | Diego Rocha | diego@rateiojusto.com | MEMBRO; ADMIN de grupo com 1 participante |
| `650000000000000000000005` | Eva Martins | eva@rateiojusto.com | **Sem grupos** (testes de 403 e para ser adicionada) |
| `650000000000000000000101` … `…119` | Membro 01 … Membro 19 | membro01@rateiojusto.com … membro19@rateiojusto.com | Ocupam o Grupo Lotado |

### Grupos

| ID | Nome | Status | ADMIN | Membros | Para testar |
|---|---|---|---|---|---|
| `660000000000000000000001` | Viagem Floripa 2026 | ABERTO | Ana | Bruno, Carla | Os 3 tipos de rateio, desconto, despesa quitada, balanço |
| `660000000000000000000002` | República Centro | ABERTO | Bruno | Ana, Diego | Ana como MEMBRO (403 ao fechar/excluir), arredondamento de centavos |
| `660000000000000000000003` | Festa de Fim de Ano | FECHADO | Ana | Carla, Diego | 409 ao criar/editar/excluir despesas |
| `660000000000000000000004` | Grupo Lotado | ABERTO | Ana | Membro 01…19 (**20 participantes**) | 422 ao adicionar o 21º (ex.: Eva) |
| `660000000000000000000005` | Churrasco do Diego | ABERTO | Diego | — (**1 participante**) | Limite mínimo, remover o ADMIN (422) |

### Despesas

| ID | Grupo | Descrição | Total | Desc. | Líquido | Rateio | Pago por / autor | Divisão | Quitada |
|---|---|---|---|---|---|---|---|---|---|
| `670000000000000000000001` | Viagem | Hospedagem | 1.200,00 | 0% | 1.200,00 | IGUALITARIO | Ana | Ana 400 · Bruno 400 · Carla 400 | não |
| `670000000000000000000002` | Viagem | Combustível | 300,00 | 0% | 300,00 | PERCENTUAL | Bruno | Ana 50% (150) · Bruno 30% (90) · Carla 20% (60) | não |
| `670000000000000000000003` | Viagem | Jantar de sábado | 250,00 | 10% | 225,00 | VALOR_EXATO | Carla | Ana 100 · Bruno 75 · Carla 50 | não |
| `670000000000000000000004` | Viagem | Passeio de barco | 180,00 | 0% | 180,00 | IGUALITARIO | Bruno | 60 cada | **sim** |
| `670000000000000000000005` | República | Aluguel de novembro | 2.400,00 | 0% | 2.400,00 | IGUALITARIO | Bruno | 800 cada | não |
| `670000000000000000000006` | República | Internet | 100,00 | 0% | 100,00 | IGUALITARIO | Diego | Bruno 33,34 · Ana 33,33 · Diego 33,33 | não |
| `670000000000000000000007` | Festa | Buffet | 900,00 | 0% | 900,00 | IGUALITARIO | Ana | 300 cada | não |

### Balanços esperados do seed (oráculo para testes)

**Viagem Floripa 2026** — totalGasto **1.905,00**, totalPendente **1.725,00**, totalQuitado **180,00**

| Membro | Pagou | Deveria pagar | Saldo |
|---|---|---|---|
| Ana | 1.200,00 | 650,00 | **+550,00** |
| Bruno | 300,00 | 565,00 | **−265,00** |
| Carla | 225,00 | 510,00 | **−285,00** |

Transferências: **Carla → Ana 285,00** · **Bruno → Ana 265,00**

**República Centro** — totalGasto **2.500,00**: Bruno +1.566,66 · Ana −833,33 · Diego −733,33 → **Ana → Bruno 833,33** · **Diego → Bruno 733,33**

**Festa de Fim de Ano** — totalGasto **900,00**: Ana +600,00 · Carla −300,00 · Diego −300,00 → **Carla → Ana 300,00** · **Diego → Ana 300,00**

## Regras de negócio

Todas as respostas de erro seguem o formato:

```json
{ "erro": "CODIGO_SEMANTICO", "mensagem": "Texto legível", "detalhes": "opcional" }
```

### A. Usuários e autenticação

| # | Regra | Resultado |
|---|---|---|
| A1 | Cadastro exige `nome`, `email` e `senha` | 400 `VALIDACAO` com `detalhes[]` por campo |
| A2 | E-mail com formato válido | 400 `VALIDACAO` |
| A3 | E-mail **único** (sem diferenciar maiúsculas/minúsculas) | 409 `EMAIL_JA_CADASTRADO` |
| A4 | Senha: mínimo **8** caracteres, **1 maiúscula**, **1 número** e **1 caractere especial** | 400 `VALIDACAO` (uma mensagem por regra violada) |
| A5 | Senha armazenada com hash **bcrypt** e nunca retornada | — |
| A6 | Login retorna **JWT válido por 2 horas** (`expiresIn: 7200`) | 200 |
| A7 | Login com e-mail inexistente ou senha errada (mesma mensagem) | 401 `NAO_AUTENTICADO` |
| A8 | Rotas de grupos, membros, despesas e balanço exigem `Authorization: Bearer <token>` | 401 se ausente, malformado, inválido ou expirado |

### B. Grupos

| # | Regra | Resultado |
|---|---|---|
| B1 | Quem cria o grupo vira **ADMIN**; status inicial **ABERTO** | 201 |
| B2 | Usuários adicionados por e-mail (somente pelo ADMIN) entram como **MEMBRO** | 201 |
| B3 | Mínimo **1** e máximo **20** participantes. Adicionar o **21º** | 422 `LIMITE_PARTICIPANTES_EXCEDIDO` |
| B4 | Adicionar e-mail não cadastrado | 404 |
| B5 | Adicionar quem já participa | 409 `MEMBRO_JA_EXISTE` |
| B6 | O ADMIN não pode ser removido (o grupo nunca fica sem participantes) | 422 `REMOCAO_ADMIN_NAO_PERMITIDA` |
| B7 | Remover membro que participa de despesas (autor, pagador ou rateio) | 409 `MEMBRO_COM_DESPESAS` |
| B8 | Somente o ADMIN fecha o grupo (`PATCH /api/grupos/:id/fechar`). ABERTO → FECHADO é irreversível | 200; 403 para MEMBRO; 409 `GRUPO_JA_FECHADO` |
| B9 | Somente o ADMIN exclui o grupo (as despesas são excluídas junto) | 204; 403 para MEMBRO |
| B10 | Quem não participa do grupo não vê grupo, membros, despesas nem balanço | 403 `ACESSO_NEGADO` |
| B11 | ID inexistente **ou em formato inválido** | 404 `NAO_ENCONTRADO` |
| B12 | Nome do grupo obrigatório (até 100 caracteres); descrição opcional (até 200) | 400 |

### C. Despesas

| # | Regra | Resultado |
|---|---|---|
| C1 | Em grupo **FECHADO** não é possível criar, editar nem excluir despesas | 409 `GRUPO_FECHADO` |
| C2 | `valorTotal` entre **R$ 0,01** e **R$ 50.000,00** (inclusive). `<= 0` ou `> 50000` | 422 `VALOR_FORA_DO_LIMITE` |
| C3 | Valores com mais de 2 casas decimais, não numéricos ou ausentes | 400 `VALIDACAO` |
| C4 | `descontoPercentual` opcional (padrão 0), entre **0% e 50%** para qualquer participante | — |
| C5 | Desconto **acima de 50%** só pode ser lançado pelo **ADMIN** do grupo | 403 `DESCONTO_REQUER_ADMIN` |
| C6 | Desconto menor que 0% ou maior que 100% | 422 `DESCONTO_FORA_DO_LIMITE` |
| C7 | Valor líquido = total − desconto (arredondado ao centavo, meio para cima). Precisa ser ≥ R$ 0,01 | 422 `VALOR_LIQUIDO_INVALIDO` |
| C8 | **IGUALITARIO**: divide o líquido igualmente entre `participantes` (se omitido, entre todos os membros) | — |
| C9 | **PERCENTUAL**: `divisoes: [{ usuarioId, percentual }]`; soma **exatamente 100%** (tolerância zero: 99,9% ou 101% falham) | 422 `SOMA_PERCENTUAIS_INVALIDA` |
| C10 | Cada percentual > 0 e ≤ 100, com até 2 casas | 422 `PERCENTUAL_INVALIDO` |
| C11 | **VALOR_EXATO**: `divisoes: [{ usuarioId, valor }]`; soma **igual ao valor líquido**, ao centavo | 422 `SOMA_VALORES_INVALIDA` |
| C12 | Cada valor individual ≥ R$ 0,01, com até 2 casas | 422 `VALOR_INDIVIDUAL_INVALIDO` |
| C13 | Participantes do rateio devem ser membros do grupo, sem repetição e pelo menos 1 | 422 `PARTICIPANTE_NAO_MEMBRO` / `PARTICIPANTE_DUPLICADO` / `PARTICIPANTES_VAZIO` |
| C14 | `pagoPorId` (quem pagou) é opcional (padrão: autor) e precisa ser membro | 422 `PAGADOR_NAO_MEMBRO` |
| C15 | Apenas o **autor** da despesa ou o **ADMIN** do grupo pode editar/excluir | 403 `ACESSO_NEGADO` |
| C16 | Despesa **QUITADA** não pode ser editada nem excluída **por ninguém** | 409 `DESPESA_QUITADA` |
| C17 | Quitar (`PATCH .../quitar`): autor ou ADMIN; também permitido em grupo FECHADO (acerto após o fechamento); irreversível | 200; 403; 409 `DESPESA_JA_QUITADA` |
| C18 | Na edição (PUT, substituição completa) o autor original é mantido; o limite de desconto > 50% é avaliado pelo papel de quem está editando | — |

**Arredondamento (determinístico):** todos os cálculos são em centavos inteiros.

- IGUALITARIO: cada um recebe `piso(líquido / n)`; os centavos que sobram vão, um a um, para os **primeiros participantes na ordem enviada**. Ex.: R$ 100,00 / 3 = 33,34 · 33,33 · 33,33.
- PERCENTUAL: cada parte = `piso(líquido × percentual)`; sobras de centavo, uma a uma, na ordem de `divisoes`.

**Ordem das validações** (útil para saber qual erro esperar quando há mais de um problema):

- Criar: `401 → 404 grupo → 403 não participante → 409 grupo FECHADO → 400 estrutura → 422 valor/desconto fora do limite → 403 desconto > 50% sem ser ADMIN → 422 valor líquido → 422 pagador → 422 rateio`
- Editar/Excluir: `401 → 404 grupo → 403 não participante → 404 despesa → 409 grupo FECHADO → 409 despesa QUITADA → 403 não é autor nem ADMIN → (editar) mesmas validações da criação`

### D. Balanço e acerto de contas (`GET /api/grupos/:id/balanco`)

| # | Regra |
|---|---|
| D1 | `totalGasto` = soma dos valores líquidos de **todas** as despesas do grupo (inclui quitadas) |
| D2 | Por membro: `totalPago` (o que pagou) e `totalDevido` (o que deveria pagar), considerando **apenas despesas não quitadas** |
| D3 | `saldo = totalPago − totalDevido` → **positivo = tem a receber**; **negativo = deve pagar**; `situacao`: `A_RECEBER`, `A_PAGAR` ou `QUITE`. A soma dos saldos é sempre 0 |
| D4 | `transferencias`: lista simplificada "quem paga quanto para quem". Algoritmo guloso: o maior devedor paga ao maior credor até zerar (no máximo N−1 transferências). Desempate por nome |
| D5 | `totalPendente` e `totalQuitado` separam o que ainda compõe os saldos do que já foi acertado |

## Referência da API

Documentação completa e interativa em **http://localhost:3001/api-docs** (clique em **Authorize** e cole o token).

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| GET | `/api/health` | Health-check | — |
| POST | `/api/test/reset` | Restaura o banco para o seed | — |
| POST | `/api/auth/register` | Cadastrar usuário | — |
| POST | `/api/auth/login` | Login (JWT 2h) | — |
| GET | `/api/auth/me` | Usuário autenticado | ✔ |
| GET | `/api/grupos` | Grupos do usuário (status, papel, totais) | ✔ |
| POST | `/api/grupos` | Criar grupo | ✔ |
| GET | `/api/grupos/:id` | Detalhar grupo | ✔ membro |
| DELETE | `/api/grupos/:id` | Excluir grupo | ✔ ADMIN |
| PATCH | `/api/grupos/:id/fechar` | Fechar grupo | ✔ ADMIN |
| GET | `/api/grupos/:id/membros` | Listar membros | ✔ membro |
| POST | `/api/grupos/:id/membros` | Adicionar membro por e-mail | ✔ ADMIN |
| DELETE | `/api/grupos/:id/membros/:usuarioId` | Remover membro | ✔ ADMIN |
| GET | `/api/grupos/:id/despesas` | Listar despesas | ✔ membro |
| POST | `/api/grupos/:id/despesas` | Criar despesa | ✔ membro |
| GET | `/api/grupos/:id/despesas/:despesaId` | Detalhar despesa | ✔ membro |
| PUT | `/api/grupos/:id/despesas/:despesaId` | Editar despesa | ✔ autor ou ADMIN |
| DELETE | `/api/grupos/:id/despesas/:despesaId` | Excluir despesa | ✔ autor ou ADMIN |
| PATCH | `/api/grupos/:id/despesas/:despesaId/quitar` | Marcar como quitada | ✔ autor ou ADMIN |
| GET | `/api/grupos/:id/balanco` | Balanço e transferências | ✔ membro |

Exemplo rápido com `curl`:

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ana@rateiojusto.com","senha":"Senha@123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

curl -s -X POST http://localhost:3001/api/grupos/660000000000000000000001/despesas \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"descricao":"Pedágio","valorTotal":45,"tipoRateio":"IGUALITARIO"}'
```

## Guia para automação (data-testid)

Convenção: `contexto-elemento-tipo` em inglês e kebab-case (ex.: `login-email-input`, `expense-submit-button`). Elementos repetidos levam o **ID** do recurso no final (ex.: `group-card-660000000000000000000001`). Alguns elementos expõem também atributos `data-*` com o valor bruto (`data-status`, `data-role`, `data-value`, `data-valid`, `data-settled`, `data-split-type`).

| Tela | Principais `data-testid` |
|---|---|
| Login | `login-form`, `login-email-input`, `login-password-input`, `login-submit-button`, `login-email-error`, `login-password-error`, `login-error-alert`, `login-success-alert`, `login-session-alert`, `login-register-link` |
| Cadastro | `register-form`, `register-name-input`, `register-email-input`, `register-password-input`, `register-password-confirm-input`, `register-{campo}-error`, `register-password-rules`, `register-password-rule-{tamanho\|maiuscula\|numero\|especial}` (com `data-valid`), `register-submit-button`, `register-error-alert`, `register-login-link` |
| Navbar | `navbar`, `navbar-user-name`, `navbar-logout-button` |
| Dashboard | `dashboard-page`, `dashboard-create-group-button`, `dashboard-filter-{todos\|aberto\|fechado}-button`, `dashboard-group-list`, `dashboard-empty-state`, `dashboard-success-alert`, `dashboard-error-alert`, `group-card-{id}`, `group-card-{id}-name`, `group-card-{id}-status-badge`, `group-card-{id}-role-badge`, `group-card-{id}-members-count` |
| Modal novo grupo | `create-group-modal`, `create-group-name-input`, `create-group-description-input`, `create-group-name-error`, `create-group-submit-button`, `create-group-cancel-button`, `create-group-error-alert`, `create-group-modal-close-button` |
| Detalhes do grupo | `group-details-page`, `group-name`, `group-status-badge`, `group-role-badge`, `group-tab-expenses`, `group-tab-members`, `group-tab-balance`, `delete-group-button`, `delete-group-modal`, `group-error-page`, `group-error-alert` |
| Aba Despesas | `expenses-section`, `expense-create-button`, `expenses-group-closed-alert`, `expenses-success-alert`, `expenses-table`, `expenses-empty-state`, `expense-row-{id}` (+ `-date`, `-payer`, `-split-type`, `-total`, `-discount`, `-net`, `-settled-badge`, `-edit-button`, `-delete-button`, `-settle-button`, `-toggle-details-button`, `-details`, `-share-{usuarioId}`), `delete-expense-modal`, `settle-expense-modal` |
| Formulário de despesa | `expense-modal`, `expense-form` (com `data-mode`), `expense-description-input`, `expense-date-input`, `expense-amount-input`, `expense-discount-input`, `expense-payer-select`, `expense-net-amount`, `expense-split-type-{igualitario\|percentual\|valor_exato}-radio`, `expense-split-section-{tipo}`, `expense-participant-checkbox-{usuarioId}`, `expense-percentage-input-{usuarioId}`, `expense-percentage-total`, `expense-exact-input-{usuarioId}`, `expense-exact-total`, `expense-submit-button`, `expense-cancel-button`, `expense-form-error-alert`, `expense-{campo}-error` |
| Aba Membros | `members-section`, `members-count`, `add-member-form`, `add-member-email-input`, `add-member-submit-button`, `add-member-email-error`, `members-success-alert`, `members-error-alert`, `members-list`, `member-row-{usuarioId}`, `member-role-badge-{usuarioId}`, `member-remove-button-{usuarioId}`, `remove-member-modal`, `members-admin-only-info` |
| Aba Balanço | `balance-section`, `balance-total-spent`, `balance-total-pending`, `balance-total-settled`, `balance-members-table`, `balance-row-{usuarioId}` (+ `-paid`, `-owed`, `-balance`, `-status`), `balance-transfers-list`, `balance-transfer-{n}` (+ `-from`, `-to`, `-amount`), `balance-no-transfers`, `close-group-button`, `close-group-modal` |
| Modais (padrão) | `{modal}`, `{modal}-title`, `{modal}-message`, `{modal}-confirm-button`, `{modal}-cancel-button`, `{modal}-close-button`, `{modal}-error-alert`, `{modal}-overlay` |

Dicas:

- A aba pode ser aberta direto pela URL: `/grupos/{id}?aba=membros`.
- O botão **Fechar Grupo** (`close-group-button`) só aparece para o ADMIN de grupo ABERTO.
- Os botões de editar/excluir despesa só aparecem para o autor ou ADMIN, em grupo ABERTO e despesa não quitada. Para validar os 403/409 correspondentes, use a API.
- O formulário de despesa só bloqueia campos vazios ou não numéricos. As regras de negócio (limites, somas, permissões) são validadas pela API e exibidas em `expense-form-error-alert`, o que permite testar as mensagens do backend pela interface.
- Rode `POST /api/test/reset` antes de cada suíte para partir de um estado conhecido.

## Banco de dados em memória

As regras do projeto pedem **um banco em memória no estilo mongodb-memory-server**, e a estrutura sugerida citava um arquivo `database.sqlite`. Como as duas coisas são incompatíveis (SQLite grava em arquivo; o mongodb-memory-server é MongoDB em memória), a escolha foi seguir a regra explícita:

- usamos o **mongodb-memory-server** com **Mongoose**; nenhum arquivo `database.sqlite` é criado;
- a cada start a base é recriada e populada pelo `backend/src/database/seed.js`;
- isso garante **isolamento e reprodutibilidade** para testes (nada persiste entre execuções) e dispensa instalar banco;
- para depuração, é possível apontar para um MongoDB real com `MONGODB_URI` (opcional).

## Variáveis de ambiente

Todas opcionais (veja `backend/.env.example`). Defina-as no shell antes de iniciar a API.

| Variável | Padrão | Descrição |
|---|---|---|
| `PORT` | `3001` | Porta da API |
| `JWT_SECRET` | `rateiojusto-segredo-dev` | Segredo de assinatura do JWT |
| `JWT_EXPIRES_IN` | `2h` | Validade do token (ex.: `10s` para testar expiração) |
| `BCRYPT_ROUNDS` | `10` | Custo do hash (reduzir acelera testes de carga em cadastro/login) |
| `CORS_ORIGIN` | `*` | Origem permitida no CORS |
| `ENABLE_TEST_ROUTES` | `true` fora de produção | Habilita `POST /api/test/reset` |
| `MONGODB_URI` | — | Usa um MongoDB real em vez do em memória |
| `VITE_API_PROXY` (frontend) | `http://localhost:3001` | Para onde o Vite encaminha `/api` |
