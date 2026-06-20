# Guia de Implantação e Transição de Ambiente (DEPLOY)

Este arquivo contém as instruções e procedimentos necessários para configurar, inicializar e colocar o **ERP Contratos & Obras** no ar em produção de forma segura.

---

## 📋 Pré-requisitos de Ambiente
- **Node.js**: Versão `18.18.x` ou superior.
- **npm**: Versão `9.x` ou superior (instalado nativamente com o Node.js).
- **Banco de Dados**: SQLite habilitado localmente como padrão (armazenado em `prisma/dev.db`). Caso opte por PostgreSQL, consulte a seção de Banco de Dados.

---

## 🛠️ Instalação Passo a Passo

### 1. Extração e Instalação
Após extrair os arquivos do pacote ZIP em seu ambiente local ou servidor:
```bash
# Navegue até o diretório do projeto
cd erp-contratos-obras

# Instale os pacotes e dependências requisitadas
npm install
```

### 2. Configuração de Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` no diretório raiz do projeto:
```bash
cp .env.example .env
```
Preencha as variáveis corporativas:
- `PORT`: Porta HTTP do serviço local ou do container.
- `APP_URL`: Endereço final onde a aplicação estará hospedada.
- `SESSION_SECRET`: Segredo usado para assinar os tokens de sessão do SaaS local.
- `DATABASE_URL`: Conexão do Prisma. Em desenvolvimento local o padrão é `file:./dev.db`.
- `GEMINI_API_KEY`: Sua chave privada da API do Gemini (necessária caso queira utilizar recursos inteligentes de inteligência artificial de leitura e categorização de contratos).

### 3. Sincronização do Banco de Dados (Prisma)
Para preparar as tabelas necessárias da aplicação no SQLite e sincronizar com o modelo de dados:
```bash
npx prisma db push
```
Isso criará o novo arquivo de banco local `prisma/dev.db` com todas as chaves e colunas necessárias, incluindo suporte nativo a senhas e níveis de acesso (Roles).

Se quiser aplicar o histórico versionado em vez de apenas sincronizar o schema, utilize:
```bash
npx prisma migrate dev
```

---

## 🚀 Como Executar em Produção

Produção exige os arquivos compilados de maneira limpa para garantir performance e segurança.

### 1. Execute o Build do Projeto
```bash
npm run build
```
O build efetuará duas operações:
- O front-end React será otimizado de forma estática dentro da pasta `/dist`.
- O back-end em Express será unificado e empacotado em um único arquivo otimizado `dist/server.cjs` com o `esbuild`. Isso remove gargalos do carregamento de arquivos concorrentes.

### 2. Iniciar o ERP em Produção
```bash
npm start
```
A aplicação estará executando na porta **3000** (`http://localhost:3000`), pronta para acesso geral ou direcionada ao tráfego do servidor através de Nginx ou controle de processos via `PM2`.

---

## 💡 Transição para PostgreSQL (Altamente Recomendado para Produção Escalonável)
Para projetos de larga escala ou onde você não queira gerenciar arquivos temporários de SQLite no disco do contêiner, altere o arquivo `prisma/schema.prisma`:

1. Altere o provedor do banco de dados:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
2. Defina o endereço de acesso a seu banco PostgreSQL em `.env`:
```env
DATABASE_URL="postgresql://usuario:senha@host:port/nome_db?schema=public"
```
3. Gere o histórico de migrações e aplique sobre a nova conexão ativa:
```bash
npx prisma migrate dev --name init
```
