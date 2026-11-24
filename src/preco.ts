import type { Ingresso, Pessoa, TipoIngresso } from "./tipos.ts";

const arredondar = (valor: number): number => Math.round(valor * 100) / 100;

export function valorDoIngresso(precoBase: number): (tipo: TipoIngresso) => number {
  return (tipo: TipoIngresso): number =>
    tipo === "meia" ? arredondar(precoBase / 2) : precoBase;
}

export function aplicarTaxa(percentual: number): (valor: number) => number {
  return (valor: number): number => arredondar(valor * (1 + percentual));
}

export function montarIngressos(
  precoBase: number,
  pessoas: readonly Pessoa[],
  temDireitoAMeia: (pessoa: Pessoa) => boolean,
): Ingresso[] {
  const calcularValor = valorDoIngresso(precoBase);

  return pessoas.map((pessoa) => {
    const tipo: TipoIngresso = temDireitoAMeia(pessoa) ? "meia" : "inteira";
    return {
      nome: pessoa.nome,
      poltrona: pessoa.poltrona,
      tipo,
      valor: calcularValor(tipo),
    };
  });
}

export function calcularTotal(ingressos: readonly Ingresso[]): number {
  const subtotal = ingressos.reduce((soma, ingresso) => soma + ingresso.valor, 0);
  return aplicarTaxa(0.1)(subtotal);
}
