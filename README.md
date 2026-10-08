# Support Helper

Assistente local de suporte técnico. O operador monta uma pasta com manuais e atendimentos anteriores
(`.txt`, `.md`, `.docx`, `.odt`, `.pdf`), informa o token de uma IA (OpenAI, Anthropic, Gemini ou Cursor) e faz
perguntas em um chat. A IA responde **somente com base nesses documentos**, citando a fonte de cada informação.

Tudo roda no computador do operador: os documentos, o índice e o token nunca saem da máquina
(apenas os trechos relevantes à pergunta são enviados ao provedor de IA escolhido).

## Estrutura

```
backend/   API em Python (FastAPI) + índice vetorial local (ChromaDB)
frontend/  Interface web em React (Vite + TypeScript)
start.ps1  Sobe backend e frontend de uma vez (Windows)
```

## Requisitos

- Windows 10/11
- [Python 3.12+](https://www.python.org/downloads/) (testado com 3.14) — marque "Add python.exe to PATH" na instalação
- [Node.js 20+](https://nodejs.org/)

## Primeira execução

Na raiz do projeto, no PowerShell:

```powershell
.\start.ps1
```

O script cria o ambiente virtual Python em `backend\.venv`, instala as dependências do backend e do frontend,
e abre duas janelas: backend em `http://127.0.0.1:8000` e frontend em `http://localhost:5173`.

Na primeira indexação o ChromaDB baixa o modelo de embeddings (~80 MB) para `%USERPROFILE%\.cache\chroma`.
Depois disso a indexação funciona offline.

> Se o PowerShell bloquear o script, execute uma vez:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

### Executando manualmente

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Frontend (outra janela):

```powershell
cd frontend
npm install
npm run dev
```

## Como usar

O seletor **PT-BR / EN** no topo das telas muda o idioma da interface e também o idioma em que a IA responde.
A escolha fica salva no navegador.

1. Abra `http://localhost:5173` e vá em **Configurações** (ícone de engrenagem).
2. Escolha o provedor de IA, o modelo (lista pronta ou "Outro" para digitar um identificador) e cole o token de API.
3. Informe o caminho da pasta com os documentos (subpastas são incluídas) e clique em **Salvar**.
4. Clique em **Reindexar** e aguarde o status voltar para "Ocioso".
5. Volte ao **Chat** e faça perguntas. Cada resposta traz as fontes usadas; clique em uma fonte para ver o trecho.
6. Quando uma conversa for útil para o futuro, clique em **Salvar chat na base de conhecimento**. Um arquivo
   `.md` é criado em `<pasta da base>\atendimentos\` e indexado na hora.

Sempre que adicionar ou alterar documentos na pasta, clique em **Reindexar**. A indexação é incremental:
só arquivos novos ou modificados são reprocessados.

### Usando a API key do Cursor

Além de OpenAI, Anthropic e Gemini, o provedor **Cursor** usa a sua chave de usuário do Cursor
(gerada em [cursor.com/dashboard → Integrations](https://cursor.com/dashboard/integrations)) por meio do
`cursor-sdk`. Como o SDK do Cursor é um SDK de agentes, o Support Helper cria um agente local **sem nenhuma
ferramenta** (`tools=[]`): ele não lê nem altera arquivos, não executa comandos e só responde com texto a partir
dos trechos da base de conhecimento. O agente roda em uma pasta vazia dentro dos dados do app.

Modelos sugeridos: `composer-2.5` (padrão) e `auto`. A primeira resposta após iniciar o backend leva alguns
segundos a mais porque o SDK sobe um processo auxiliar (`cursor-sdk-bridge`), encerrado junto com o backend.

## Onde ficam os dados do aplicativo

`%LOCALAPPDATA%\SupportHelper\` (normalmente `C:\Users\<usuario>\AppData\Local\SupportHelper`)

- `config.json` — provedor, modelo, token e caminho da base
- `chroma\` — índice vetorial
- `index_manifest.json` — controle de quais arquivos já foram indexados
- `cursor_workspace\` — pasta vazia usada como diretório de trabalho do agente do Cursor

Para "zerar" o índice, pare o backend e apague a pasta `chroma` e o arquivo `index_manifest.json`.

## Limitações atuais

- Imagens dentro dos documentos são ignoradas; PDFs escaneados (só imagem) ficam sem texto e aparecem
  em "Sem texto extraível" nas configurações.
- Arquivos `.doc` (Word antigo) não são lidos: salve como `.docx`.
- Fontes remotas (Google Drive, AWS S3) ainda não são suportadas. Uma alternativa é apontar para a pasta
  sincronizada localmente pelo cliente do Drive/OneDrive.

## API

| Método | Rota                        | Descrição                                  |
| ------ | --------------------------- | ------------------------------------------ |
| GET    | `/api/health`               | Verifica se o backend está no ar           |
| GET    | `/api/settings`             | Configurações (token mascarado)            |
| PUT    | `/api/settings`             | Salva configurações                        |
| POST   | `/api/chat`                 | Pergunta -> resposta com fontes            |
| GET    | `/api/knowledge/status`     | Status do índice                           |
| POST   | `/api/knowledge/reindex`    | Dispara reindexação incremental            |
| POST   | `/api/knowledge/save-chat`  | Salva a conversa como `.md` e indexa       |

Documentação interativa em `http://127.0.0.1:8000/docs`.
