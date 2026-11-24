# Bilheteria concorrente

Projeto final de Paradigmas de Linguagens de Programação. Enunciado completo no Blackboard.

Os arquivos de `src/` que vocês escrevem já existem, vazios; o `tipos.ts` e o `servidor.ts` vêm prontos. O que vai em cada um está no passo
indicado do enunciado:

| Arquivo | Passo do enunciado |
| :--- | :--- |
| `src/tipos.ts` (pronto) | 1: os tipos |
| `src/regras.ts` | 2: meia-entrada |
| `src/preco.ts` | 3: preço (funcional) |
| `src/dominio.ts` | 4: evento e erros (orientado a objetos) |
| `src/bilheteria.ts` | 5: a venda, onde a concorrência aparece |
| `src/servidor.ts` (pronto) e `src/main.ts` | 6: ligar o servidor |

Não alterem `src/pagamento.ts`, `src/servidor.ts`, `src/bench.ts` nem `testes/`: a correção usa os originais.

Para começar, sigam o `GUIA.md`. Depois dele, os comandos são:

```bash
npm install
npm test          # correção automática: mostra os pontos
npm start         # serviço em http://localhost:3000
npm run bench     # com o serviço no ar: 200 pedidos simultâneos no evento 1, dois por poltrona
```

Exemplo de pedido:

```bash
curl -X POST localhost:3000/reservas -H 'Content-Type: application/json' \
  -d '{"eventoId":1,"ingressos":[{"nome":"Ana","idade":20,"estudante":true,"pcd":false,"poltrona":7}]}'
```

---

## Preencham (avaliado no vídeo)

**Link do vídeo:** _(adicionar o link do YouTube não listado ou Google Drive antes da entrega)_

### Integrantes

| Nome | Usuário do GitHub | Parte principal |
| :--- | :--- | :--- |
| Jorge Bublitz | @JorgeBublitz | Regras, Preço (Funcional), Domínio (OO), Bilheteria (Concorrente), Servidor (`main.ts`) e Bench |

### Decisões

1. **Concorrência.** Como vocês garantem que duas pessoas não ficam com a mesma poltrona? Onde estava o
   `await` perigoso?

   O `await` perigoso está na chamada da operadora de pagamento (`await comTempoLimite(this.#pagar(total), this.#limitePagamentoMs)`). Enquanto um pedido aguarda a resposta da operadora, o event loop do Node.js continua atendendo outros pedidos concorrentes. Para evitar que duas pessoas comprem ou sejam cobradas pela mesma poltrona, a marcação das poltronas (`evento.reservar(poltronas)`) acontece **de forma síncrona antes do `await`**. Como o trecho síncrono não é interrompido no Node.js, o primeiro pedido marca a poltrona imediatamente e qualquer outro pedido concorrente para a mesma poltrona recebe `PoltronaOcupadaErro` (409) antes mesmo de acionar a operadora. Se o pagamento falhar ou exceder o tempo limite (`comTempoLimite` com `Promise.race`), o bloco `catch` devolve as poltronas com `evento.liberar(poltronas)` e lança `PagamentoErro` (502).

2. **OO.** O que o `Evento` esconde e por quê? Por que o `reservar` é tudo ou nada? Por que os erros são uma hierarquia de classes?

   A classe `Evento` encapsula a lista de poltronas vendidas no campo privado `#vendidas`, expondo apenas a leitura da quantidade restante via `get disponivel()` e `info()`. Isso impede que código externo altere o estado interno diretamente, furando validações (como vender poltrona repetida ou fora do intervalo). O método `reservar` é **tudo ou nada** porque valida todas as poltronas (lista não vazia, sem duplicatas, dentro de `1..capacidade` e nenhuma já vendida) antes de gravar qualquer alteração em `#vendidas` — assim, uma família que compra 3 poltronas juntas não corre o risco de reservar apenas 2 se a terceira já estiver ocupada. Já os erros formam uma hierarquia herdando de `ErroDeNegocio` (que estende `Error` e guarda `status`) para que cada erro carregue seu próprio código HTTP (`400`, `404`, `409`, `502`), permitindo que o `servidor.ts` trate todos eles de forma polimórfica com um único `if (erro instanceof ErroDeNegocio)`.

3. **Funcional.** O que ganhamos com `preco.ts` puro? Como vocês testariam ele sem subir o servidor?

   Com funções puras e imutáveis em `preco.ts` (sem estado compartilhado, sem mutação dos arrays de entrada e usando `map`, `reduce` e fábricas de funções como `valorDoIngresso` e `aplicarTaxa`), o resultado depende exclusivamente dos parâmetros recebidos. Isso elimina efeitos colaterais, facilita a composição e reutilização (como injetar diferentes regras de meia-entrada em `montarIngressos`) e torna o código previsível mesmo em um ambiente concorrente. Para testar sem subir o servidor, basta importar diretamente as funções (`valorDoIngresso`, `aplicarTaxa`, `montarIngressos`, `calcularTotal`) em um script de teste unitário, passar dados de entrada (inclusive congelados com `Object.freeze`) e verificar os valores retornados com `assert`.

4. **Se fosse em outro paradigma.** Escolham uma das partes e expliquem como ficaria em outro
   paradigma, e se ficaria melhor ou pior.

   Se a parte de cálculo de preço (`preco.ts`) fosse feita no paradigma **imperativo/orientado a objetos**, teríamos uma classe (ex.: `CalculadoraDePreco`) mantendo estado mutável interno (como um acumulador `this.subtotal` e um array `this.ingressos` preenchido com `for` e `.push()`). Para esse problema, ficaria **pior**: regras de cálculo e transformação de listas são naturalmente declarativas e sem estado; introduzir mutação e estado interno aumentaria a chance de bugs ao reaproveitar a mesma instância entre vários pedidos concorrentes e exigiria mais código para obter o mesmo resultado.

5. **Concorrente × paralelo.** O Node roda o JavaScript numa linha só: os pedidos de vocês são
   concorrentes, não paralelos. O que mudaria se a venda rodasse em vários núcleos ao mesmo tempo?

   No Node.js (single-thread com event loop), o trecho síncrono de verificação e marcação em `evento.reservar(poltronas)` executa de forma atômica em relação a outros pedidos, porque nenhuma outra requisição roda até que a atual chegue a um `await`. Se a venda rodasse em **paralelo** em vários núcleos/threads compartilhando a mesma memória (ou em múltiplas instâncias de servidor), duas threads poderiam verificar simultaneamente que a poltrona 5 está livre e ambas marcá-la como vendida (condição de corrida / *race condition*). Nesse cenário, precisaríamos de mecanismos de sincronização explícitos — como *mutex*/*locks*, operações atômicas ou transações com bloqueio/constraint de unicidade em um banco de dados compartilhado.

### Resultados do bench

| Cenário | Pedidos | Tempo (ms) | Vendidos | Poltrona ocupada | Falha de pagamento |
| :--- | ---: | ---: | ---: | ---: | ---: |
| Padrão (`main.ts`) | 200 | 371 | 86 | 100 | 14 |

O bench ocupa as poltronas do evento 1: para rodar de novo, parem o `npm start` (Ctrl+C) e subam outra
vez.

O que os números mostram: os 200 pedidos simultâneos (2 disputando cada uma das 100 poltronas do evento 1) terminaram em 371 ms (~539 pedidos/s), o que comprova que os pedidos rodaram de forma concorrente sem esperar um pelo outro — se fossem sequenciais, 100 cobranças de 80 ms levariam pelo menos 8.000 ms. Exatamente 100 pedidos foram recusados imediatamente com status `409` (a segunda tentativa de cada poltrona), 86 vendas foram concluídas com sucesso (`201`) e 14 falharam na operadora (`502`, próximo à taxa de falha de 10%). Ao final, o evento 1 ficou com exatamente 14 poltronas disponíveis, confirmando que todas as poltronas de pagamentos recusados foram devolvidas corretamente e nenhuma poltrona foi vendida duas vezes.
