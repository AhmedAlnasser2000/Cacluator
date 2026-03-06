export function formatSolveSummaryText(text: string) {
  return text
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)')
    .replace(/\\left/g, '')
    .replace(/\\right/g, '')
    .replace(/\\ln\b/g, 'ln')
    .replace(/\\log\b/g, 'log')
    .replace(/\\sin\b/g, 'sin')
    .replace(/\\cos\b/g, 'cos')
    .replace(/\\tan\b/g, 'tan')
    .replace(/\\pi\b/g, 'pi')
    .replace(/\\cdot/g, '*')
    .replace(/\\times/g, '*')
    .replace(/\^\{([^{}]+)\}/g, '^($1)')
    .replace(/\{([^{}]+)\}/g, '($1)')
    .replace(/\\/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
