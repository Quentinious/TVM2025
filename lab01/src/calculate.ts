// in lab01 pnpm jet
// pnpm run build


import { Dict, MatchResult, Semantics } from "ohm-js";
import grammar, { AddMulActionDict } from "./addmul.ohm-bundle";

export const addMulSemantics: AddMulSemantics = grammar.createSemantics() as AddMulSemantics;

const addMulCalc = 
{
  AddExpr_plus(a, _plus, b) 
  {
    return a.calculate() + b.calculate();
  },
  MulExpr_times(a, _times, b) {
    return a.calculate() * b.calculate();
  },
  PriExpr_parens(_open, e, _close) {
    return e.calculate();
  },
  number(chars) {
    return parseInt(this.sourceString, 10);
  }
} satisfies AddMulActionDict<number>;

addMulSemantics.addOperation<number>("calculate()", addMulCalc);

interface AddMulDict extends Dict {
  calculate(): number;
}

interface AddMulSemantics extends Semantics {
  (match: MatchResult): AddMulDict;
}
