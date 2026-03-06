import { ComputeEngine } from '@cortex-js/compute-engine';
import { equationToZeroFormLatex } from '../domain-guards';
import { normalizeAst } from '../../symbolic-engine/normalize';
import { termKey } from '../../symbolic-engine/patterns';

const ce = new ComputeEngine();

function equationStateKey(latex: string) {
  try {
    const zeroFormLatex = equationToZeroFormLatex(latex);
    const zeroFormNode = normalizeAst(ce.parse(zeroFormLatex).json);
    const directKey = termKey(zeroFormNode);
    const negatedKey = termKey(normalizeAst(['Negate', zeroFormNode]));
    return directKey < negatedKey ? directKey : negatedKey;
  } catch {
    return latex.replace(/\\left|\\right/g, '').replace(/\s+/g, '');
  }
}

export { equationStateKey };
