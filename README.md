# Meu Kanban

Aplicação Kanban com Java 25, Spring Boot, Spring Security, Spring Data JPA, MySQL e frontend responsivo em HTML/CSS/JavaScript.

## Funcionalidades

- Quadro Kanban com arrastar e soltar.
- Cadastro, edição e exclusão de tarefas.
- Busca por título/descrição e filtros por status e prioridade.
- Ordenação por prioridade dentro das colunas.
- Datas de início e conclusão gerenciadas no backend.
- Cadastro de conta, login por usuário/senha e logout.
- Senhas com hash BCrypt (custo 12), sessões de servidor e proteção CSRF.
- Isolamento das tarefas por usuário autenticado.
- Cabeçalhos de segurança, política CSP e mensagens de erro sem detalhes internos.

## Requisitos

- JDK 25.
- MySQL 8.0 ou superior.
- Maven (ou Maven Wrapper, caso seja incluído no repositório).

## Executar localmente

Configure variáveis de ambiente antes de iniciar:

- `DB_URL`: URL JDBC do banco `kanban_db`.
- `DB_USERNAME`: usuário MySQL da aplicação.
- `DB_PASSWORD`: senha desse usuário.
- `DDL_AUTO=update` apenas no ambiente de desenvolvimento.
- `COOKIE_SECURE=false` apenas para desenvolvimento em localhost HTTP.

Exemplo de URL local: `jdbc:mysql://localhost:3306/kanban_db`.

Inicie a aplicação com Maven ou pelo Spring Tools. Abra `/login.html`, crie uma conta em `/register.html` e entre com as credenciais.

Nunca comite senhas reais, tokens, arquivos `.env` ou credenciais do banco. Use variáveis de ambiente ou o gerenciador de segredos do ambiente de deploy.

## Migração do banco antes do deploy

**Faça backup do banco antes de alterar o schema.** A migração em `database/migration/V1__users_and_task_ownership.sql` cria a tabela de usuários e adiciona a relação de proprietário às tarefas. Revise e execute o script em uma cópia/staging antes da produção.

Tarefas antigas ficam com `user_id = NULL` e, intencionalmente, não são exibidas a nenhuma conta. Depois de criar a conta que deve ser proprietária dos dados antigos, atribua as tarefas antigas a essa conta com uma operação administrativa revisada. Exemplo para ser executado somente após confirmar o usuário correto:

```sql
UPDATE tb_task
SET user_id = (SELECT id FROM tb_user WHERE username = 'USUARIO_CONFIRMADO')
WHERE user_id IS NULL;
```

Substitua `USUARIO_CONFIRMADO` pelo usuário real. Confirme antes quantas tarefas serão afetadas e faça backup. Não execute essa atualização se houver dados que devam continuar isolados.

## Configuração de produção

Ative o perfil `prod` (`SPRING_PROFILES_ACTIVE=prod`) e configure os segredos no provedor de hospedagem:

- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.
- HTTPS obrigatório e `COOKIE_SECURE=true`.
- Use um usuário de banco com privilégios mínimos, limitado ao schema da aplicação.
- Não exponha o MySQL diretamente à internet.
- Use HTTPS em todas as rotas, inclusive login.
- Configure backups automáticos e teste a restauração.
- Mantenha JDK, dependências e imagem/runtime atualizados.
- Configure monitoramento, limites de requisição e alertas de falha.
- Faça deploy primeiro em staging e teste cadastro, login, logout, CSRF e isolamento entre duas contas.

O perfil de produção usa `ddl-auto=validate`: o schema deve ser migrado antes de iniciar. Não use `update` como estratégia de migração em produção.

## Observações de segurança

A aplicação usa sessão no servidor, cookie de sessão HttpOnly/SameSite, CSRF para operações que alteram dados, BCrypt para senhas, validação no servidor e autorização por proprietário da tarefa. A segurança real em produção também depende de HTTPS, configuração do proxy, gestão de segredos, atualização de dependências, backups e testes de segurança. Antes de disponibilizar cadastro público, implemente ou configure proteção contra abuso/rate limiting no proxy ou na aplicação.
