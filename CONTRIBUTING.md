# Guia de Contribuição 🤝

Obrigado por considerar contribuir com o **Guia de Compras Hardware**! Para mantermos a alta qualidade, organização e previsibilidade no ciclo de desenvolvimento, estabelecemos algumas regras fundamentais detalhadas abaixo.

---

## Regras de Git e Versionamento

### O que NUNCA fazer
- ❌ **NUNCA** execute `git push --force` nas branches `main` ou `develop`. Se o histórico precisar ser reescrito, apenas o mantenedor principal do repositório poderá fazê-lo de forma controlada.
- ❌ **NUNCA** faça commits diretos na branch `main` ou `develop`. Todo o desenvolvimento deve ocorrer em branches de *feature* dedicadas.

### O que SEMPRE fazer
- ✅ **Branch Naming**: Todas as novas branches devem seguir os prefixos de padrão:
  - `feature/` - Para novas funcionalidades (ex: `feature/busca-avancada`)
  - `fix/` - Para correção de bugs (ex: `fix/corrigir-filtro-preco`)
  - `docs/` - Para atualizações em documentação (ex: `docs/atualizar-readme`)
  - `test/` - Para novos testes ou correção de testes existentes
  - `chore/` - Para atualizações de dependências, tarefas de build, etc.
- ✅ **Conventional Commits**: Suas mensagens de commit DEVEM seguir o padrão do [Conventional Commits](https://www.conventionalcommits.org/).
  - Exemplos: `feat: add search component`, `fix: correctly parse gpu prices`, `docs: update setup steps`, `refactor: optimize filter functions`.
- ✅ **Pull Requests (PRs)**: Todo PR deve ter uma descrição clara contendo o contexto do **O que** foi feito e o **Por que** daquela implementação.
- ✅ **Squash Merge**: Ao aprovar e mesclar (merge) um PR na branch principal, utilize a estratégia de "Squash and Merge" para manter a história de commits linear e limpa.
- ✅ **Limpeza**: Delete as branches de feature logo após serem mergeadas.

---

## Qualidade de Código

- ✅ **Testes são Obrigatórios**: Todo novo código, função ou componente *deve* ser acompanhado por seus respectivos testes de unidade ou integração utilizando Vitest.
- ❌ **Nunca burle testes falhos**: A fonte da verdade sobre o comportamento esperado da aplicação são os testes. Se um teste falhar, *conserte o código da aplicação*, não apague ou comente o teste.
- ✅ **Validação Pré-push**: Antes de enviar (push) seu código, sempre execute `npm run check && npm test` na sua máquina. O PR só será aprovado caso estas verificações passem.
- ✅ **TypeScript Strict**: O projeto opera sob regras restritas de tipagem (`strict: true`). O uso de `any` é estritamente proibido, a menos que seja 100% necessário e venha acompanhado de comentários explicando o motivo.
- ✅ **Idioma Base**: Textos que aparecem para o usuário (*content*) devem ser em **Português do Brasil (PT-BR)**. Todo o código (variáveis, funções, componentes) deve ser escrito em **Inglês**.

---

## Filosofia de Testes

- **Teste Comportamento, não Implementação**: Foque em testar o que a função retorna dado certo *input*, ou o que o componente renderiza no DOM. Evite testar estado interno que pode ser refatorado futuramente sem mudar o comportamento.
- **A Fonte da Verdade**: Quando um teste falha após uma alteração no código, partimos da premissa de que *o código está errado*.
- **Atualização de Testes**: Se o comportamento do sistema realmente mudou e um teste de fato precisa ser alterado para refletir a nova regra de negócio, essa deve ser uma decisão consciente e amplamente documentada na mensagem de commit/PR.
- **Meta de Cobertura**: Exigimos cobertura para todas as funções de `utils` e validação do *rendering* base de componentes críticos (tabelas, filtros, cards).

---

## Fluxo de Trabalho (Workflow)

Seguimos um formato adaptado do Git Flow:

```text
main (produção — deployvel)
 └── develop (integração — staging)
      └── feature/nome-da-funcionalidade (desenvolvimento)
```

1. Crie sua branch sempre a partir da `develop`.
2. Desenvolva as funcionalidades.
3. Abra o PR apontando de volta para a `develop`.
4. (Administradores) Releases são feitos ao mesclar a `develop` na `main`.

---

## Checklist Pré-push

Antes de abrir um Pull Request ou fazer o push da sua branch, certifique-se de que:

- [ ] `npm run check` passa sem erros de TypeScript.
- [ ] `npm test` roda todas as suítes com sucesso.
- [ ] Não há `console.log`, `debugger` ou código morto/comentado no seu PR.
- [ ] O histórico local usa mensagens no padrão Conventional Commits.
- [ ] A sua branch de trabalho está sincronizada com as mudanças mais recentes da `develop` (faça um `rebase` se necessário).

Boa codificação! 🚀
