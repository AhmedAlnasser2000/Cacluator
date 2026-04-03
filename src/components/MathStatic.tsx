import { convertLatexToMarkup } from 'mathlive';
import type { SymbolicDisplayPrefs } from '../lib/symbolic-display';
import { normalizeSymbolicDisplayLatex } from '../lib/symbolic-display';

type MathStaticProps = {
  latex?: string;
  className?: string;
  block?: boolean;
  emptyLabel?: string;
  displayPrefs?: SymbolicDisplayPrefs;
};

export function MathStatic({
  latex,
  className,
  block = true,
  emptyLabel,
  displayPrefs,
}: MathStaticProps) {
  if (!latex) {
    return emptyLabel ? <div className={className}>{emptyLabel}</div> : null;
  }

  const displayLatex = normalizeSymbolicDisplayLatex(latex, displayPrefs) ?? latex;

  const markup = convertLatexToMarkup(displayLatex, {
    defaultMode: block ? 'math' : 'inline-math',
  });

  return (
    <div
      aria-label={displayLatex}
      data-raw-latex={latex}
      className={className}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
