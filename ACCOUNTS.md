# Contas e Credenciais de Demonstração (ERP Contratos & Obras)

Para validar a autenticação rígida e o isolamento multi-tenant do sistema, utilize as credenciais de demonstração pré-configuradas no banco de dados abaixo. 

---

## 🏢 1. Tenant: ACME Construtora & Reformas
*Esta corporação possui projetos cadastrados em andamento, vistorias agendadas e controle de ordens de compra.*

### 🔑 Usuário Administrador (Acesso Total)
- **Nome**: Ricardo Silva
- **Cargo**: Diretor Administrativo Geral
- **E-mail Corporativo**: `admin@acme.com.br`
- **Senha**: `senha123`
- **Role/Nível**: `ADMIN`
- **O que pode testar**: Cadastrar novos canteiros de obras, atualizar verbas, criar novos modelos de contratos para assinatura e preencher ordens de compras sem restrições.

### 🔑 Usuário Colaborador (Acesso Operacional Restrito)
- **Nome**: Ana Costa
- **Cargo**: Gestora de Canteiro
- **E-mail Corporativo**: `gestor@acme.com.br`
- **Senha**: `senha123`
- **Role/Nível**: `USER`
- **O que pode testar**: Registrar relatórios de vistorias técnicas, inserir ordens de compra e custos reais. Ações administrativas como "Cadastrar Novo Canteiro" estarão ocultas no front-end e barradas por segurança no back-end.

---

## 🏢 2. Tenant: Inova Empreendimentos
*Outra corporação totalmente isolada no ecossistema ERP. Nenhum dado do canteiro ou contratos da ACME será visível para este usuário.*

### 🔑 Usuário Administrador (Acesso Total)
- **Nome**: Marcelo Rebelo
- **Cargo**: Diretor Comercial
- **E-mail Corporativo**: `admin@inova.com.br`
- **Senha**: `senha123`
- **Role/Nível**: `ADMIN`
- **O que pode testar**: Comportamento de herança multi-tenant (garante que ele só visualize os canteiros e minutas vinculados estritamente à Inova Empreendimentos corporativa).

---

## 🔐 3. Registrando uma Nova Empresa Independente
Você também pode clicar na aba **"Registrar Nova Empresa"** diretamente no menu de login para registrar sua própria construtora em tempo de execução:
1. Informe o Nome da Construtora e o CNPJ Comercial.
2. Defina os dados do Diretor Administrador (Nome, E-mail corporativo de sua escolha e crie sua própria **Senha personalizada**).
3. O sistema cria o espaço isolado e inicia sua sessão instantaneamente com acesso de administrador total (`ADMIN`).
