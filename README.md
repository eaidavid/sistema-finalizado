# ERP Contratos & Obras

O **ERP Contratos & Obras** é uma plataforma corporativa robusta desenvolvida para otimizar processos de contratação, assinaturas digitais, controle analítico de obras, medição de custos operacionais e auditoria de vistorias técnicas em campo.

## Status de Entrega

Esta versão está preparada para demonstração local e cobre os pontos centrais do teste técnico:
- autenticação multi-tenant com emissão de token de sessão no login;
- contratos com templates, assinatura eletrônica, renovação, encerramento e geração de aditivo;
- obras com roteiro, custos, vistorias e ordens de compra;
- dashboard e relatórios alimentados pelo banco local;
- parametrização de empresa e gestão de usuários por tenant.

### Banco de dados

- Ambiente local atual: `SQLite` via Prisma para subir rápido e demonstrar o fluxo fim a fim.
- Alvo de produção solicitado no teste: `PostgreSQL + pgvector`.
- O repositório já inclui `.env.example` com `DATABASE_URL` e uma baseline de migration em `prisma/migrations/`.

---

## 🌟 O que é a plataforma?

Projetada com uma abordagem **Multi-tenant rígida e isolada**, a plataforma permite que construtoras, incorporadoras e prestadoras de serviços gerenciem em um único local seus documentos vitais, garantindo que colaboradores (`USER`) e diretores administrativos (`ADMIN`) operem apenas dentro do escopo de sua própria companhia, com privilégios específicos e segurança estrita certificada.

---

## 🛠️ Módulos e Funcionalidades Principais

### 📄 1. Administração de Modelos e Contratos
- **Criação de Modelos**: Permite aos administradores criar minutas e modelos de contratos de serviços parametrizáveis.
- **Assinaturas Digitais Avançadas**: Gere solicitações de assinatura e envie aos terceiros por canais integrados (E-mail, WhatsApp ou Ambos).
- **Rigor de Estados**: Rastreie do status de *Minuta*, passando por *Assinaturas Pendentes*, até *Contrato Ativo* ou *Vencendo/Vencido*.

### 🚧 2. Gestão Analítica de Canteiros de Obras
- **Abertura de Canteiros**: Registro central de obras ativas ligados a contratos específicos de fornecimento.
- **Controle Orçamentário Estrito**: Acompanhe o gráfico e os desvios de orçamento planejado versus custos realmente executados.
- **Roteiros Técnicos Integrados**: Geração automática de roteiros e vistorias necessárias correspondentes do projeto de obras.

### 💸 3. Fluxos de Compras e Lançamentos Financeiros
- **Ordens de Compra (OCs)**: Criação de pedidos de insumos vinculados ao CNPJ pagador da empresa para evitar fraudes ou desvios de verbas operacionais.
- **Lançamento de Custos Diretos**: Apontamento ágil por categoria de despesas (Material, Mão de Obra, Impostos, etc.) atualizando em tempo real a saúde do projeto.

---

## 🔒 Arquitetura de Segurança Avançada

Desenvolvida com as melhores práticas recomendadas pela **OWASP**, a aplicação possui camadas severas de proteção:

1. **Autenticação Avançada (Login Real)**: Sem logins simulados ou facilistas. As credenciais de e-mail e senha são autenticadas via consulta criptografada server-side com validações estritas aos tenants do banco de dados.
2. **Autorização Hierárquica**:
   - **Administradores (`ADMIN`)**: Têm permissão para cadastrar canteiros, associar novas empresas, alterar premissas financeiras e criar minutas contratuais.
   - **Colaboradores (`USER`)**: Têm acesso restrito em formato leitura/escrita para operações do dia a dia (lançamento de custos, vistorias e OCs), sendo bloqueados no front-end e barrados no back-end (via filtro `verifyAdmin()`) para ações gerenciais.
3. **Isolamento de Dados (Tenant Isolation)**: Cada requisição ao servidor transporta os cabeçalhos de autenticação de domínio, garantindo que dados de uma construtora jamais sejam conhecidos ou consultados por usuários de outras marcas parceiras.
4. **Proteção Contra Ataques Comuns**: Integração de cabeçalhos contra Clickjacking (`X-Frame-Options: SAMEORIGIN`), XSS e vazamento de tipos de mídia.

---

## 📂 Organização do Projeto

```text
├── DEPLOY.md            # Guia completo de instalação e colocação no ar
├── package.json         # Dependências do ecossistema e scripts de automatização
├── prisma/
│   ├── schema.prisma    # Modelagem relacional e integridade de restrições do banco
│   └── dev.db           # Banco de dados local portátil integrado (SQLite)
├── server.ts            # Bootloader Express principal e middleware de isolamento
├── server/
│   ├── api.ts           # Endpoints back-end de negócios e filtros de privilégio ADMIN
│   └── seed.ts          # Banco de dados pré-modelado com contas reais para demonstração
└── src/
    ├── App.tsx          # Componente mestre de roteamento estrito de visualização
    ├── store.ts         # Centralização do estado e sessão de autenticação ativa
    ├── components/      # Componentes e visões otimizadas do painel (Obras, Contratos, etc.)
    └── index.css        # Estilos aplicados de ponta com Tailwind CSS
```

---

## 🚀 Como Executar e Implantar

Todas as instruções necessárias para instalar dependências, popular o banco de dados com usuários de demonstração e implantar a aplicação em servidores de produção estão detalhadamente documentadas no arquivo:

👉 **[Consulte o Guia de Implantação e Transição de Ambiente (DEPLOY.md)](./DEPLOY.md)**
