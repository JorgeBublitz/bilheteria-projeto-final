import { criarBilheteria } from "./bilheteria.ts";
import { Evento } from "./dominio.ts";
import { criarPagamentoFalso } from "./pagamento.ts";
import { criarServidor } from "./servidor.ts";

const eventos = [
  new Evento(1, "Show de Rock", 100, 100),
  new Evento(2, "Peça de Teatro", 80, 60),
  new Evento(3, "Stand-up Comedy", 60, 40),
];

const pagar = criarPagamentoFalso({
  latenciaMs: 80,
  taxaDeFalha: 0.1,
});

const bilheteria = criarBilheteria({
  eventos,
  pagar,
  limitePagamentoMs: 500,
});

criarServidor(bilheteria).listen(3000, () => {
  console.log("Bilheteria no ar em http://localhost:3000");
});
