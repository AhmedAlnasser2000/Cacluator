import type {
  CapabilityId,
  GuideArticle,
  GuideExample,
  GuideHomeEntry,
  GuideModeRef,
  ModeId,
} from '../../../types/calculator';
import { GUIDE_DOMAIN_CAPABILITY, GUIDE_DOMAINS, getActiveGuideDomains } from '../domains';

type GuideExampleDraft = Omit<GuideExample, 'steps'> & { steps?: string[] };
type GuideArticleDraft = Omit<GuideArticle, 'whatItIs' | 'howToUse' | 'examples'> & {
  whatItIs?: string[];
  whatItMeans?: string[];
  howToUse?: string[];
  examples: GuideExampleDraft[];
};

function defineGuideExample(example: GuideExampleDraft): GuideExample {
  return {
    steps: example.steps ?? [
      'Open the matching tool from the launcher or Guide example card.',
      'Load the example into the target editor.',
      'Press EXE or F1 when you are ready to run it.',
    ],
    ...example,
  };
}

function defineGuideArticle(article: GuideArticleDraft): GuideArticle {
  return {
    whatItIs: article.whatItIs ?? [article.summary],
    howToUse: article.howToUse ?? [
      'Open the matching tool or guide article for this topic.',
      'Use the worked examples to load a ready-made expression into the right editor.',
      'Press EXE or F1 when the expression is ready.',
    ],
    ...article,
    examples: article.examples.map(defineGuideExample),
  };
}

const GUIDE_ARTICLE_DRAFTS: GuideArticleDraft[] = [
  {
    id: 'basics-keyboard',
    domainId: 'basics',
    title: 'Keyboard and Editor Basics',
    summary: 'Learn how the curated keyboard, main keypad, and editor placeholders work together.',
    whatItIs: [
      'The main keypad is the fast everyday entry surface for digits, operators, and mode-level actions.',
      'The curated virtual keyboard is the structured notation surface for textbook templates such as fractions, roots, powers, Greek variables, and advanced domain pages.',
      'The editor keeps placeholders and textbook layout intact so you can move through structure instead of typing raw parser text.',
    ],
    howToUse: [
      'Use the main keypad for fast numeric and operator entry, then open the virtual keyboard when you need a structured template.',
      'Insert a template first, then move through its placeholders instead of typing parser-like text by hand.',
      'Use Copy Expr, Edit Expr, Paste, Copy Result, and To Editor to move work between display cards and editors without retyping.',
    ],
    concepts: [
      'Use the main keypad for everyday entry and the virtual keyboard for structured notation.',
      'Only active milestone pages appear on the virtual keyboard.',
      'Insert templates first, then move through placeholders instead of typing raw parser text.',
    ],
    whereToFindIt: [
      'Main keypad for digits and core operators',
      'Virtual keyboard pages: Core, Letters, Greek, and active domain pages',
      'Display action buttons: Copy Expr, Edit Expr, Paste, Copy Result, To Editor',
    ],
    bestModes: ['calculate', 'equation', 'table'],
    symbols: ['symbol-fraction', 'symbol-sqrt', 'symbol-power', 'symbol-ans', 'symbol-pi'],
    examples: [
      {
        id: 'basics-fraction',
        title: 'Build a textbook fraction',
        explanation: 'Use the fraction template so the editor keeps numerator and denominator structured.',
        steps: [
          'Open Calculate and focus the main editor.',
          'Insert the fraction template from the curated keyboard instead of typing a slash by hand.',
          'Fill the numerator and denominator placeholders, then press EXE when you are ready.',
        ],
        expected: 'The expression loads into Calculate as a stacked fraction template.',
        launch: {
          kind: 'load-expression',
          targetMode: 'calculate',
          latex: '\\frac{1}{3}+\\frac{1}{6}',
          label: 'Load in Calculate',
        },
      },
      {
        id: 'basics-sqrt',
        title: 'Insert a square root template',
        explanation: 'Use the root template rather than typing plain ASCII forms.',
        steps: [
          'Open Calculate and place the cursor where the radical should go.',
          'Insert the square-root template from the virtual keyboard.',
          'Fill the placeholder under the radical and continue editing from there.',
        ],
        expected: 'The expression loads into Calculate with a proper radical.',
        launch: {
          kind: 'load-expression',
          targetMode: 'calculate',
          latex: '\\sqrt{16}+\\sqrt{9}',
          label: 'Load in Calculate',
        },
      },
    ],
    pitfalls: [
      'Do not type parser-like text such as sqrt() when a structured symbol exists.',
      'Use Equation mode for solving; Calculate will redirect equations instead of solving them directly.',
      'Only active milestone pages are visible. Hidden pages are not deleted; they are gated for later milestones.',
    ],
    exactVsNumeric: [
      'Exact textbook output stays primary when available.',
      'Numeric lines appear as approximations or via the Numeric action when supported.',
    ],
    relatedArticleIds: ['basics-output'],
  },
  {
    id: 'basics-output',
    domainId: 'basics',
    title: 'Exact Output, Numeric Output, and Clipboard Ergonomics',
    summary: 'Understand exact versus approximate results and how to reuse expressions or results quickly.',
    whatItIs: [
      'The result area can show exact symbolic output, approximate numeric output, warnings, and provenance badges.',
      'Clipboard actions are built into the display cards so you can reuse an expression or result without retyping it.',
    ],
    howToUse: [
      'Read the title, badges, and warning lines before deciding whether the result is exact or approximate.',
      'Use Copy Expr or Copy Result when you want to reuse the current math as-is.',
      'Use Edit Expr or To Editor when you want to continue working on the expression inside an editor.',
    ],
    concepts: [
      'Exact output is the first-class result surface when the engine can provide it.',
      'Approximation lines appear when numeric output is meaningful or when a fallback is used.',
      'Display actions let you copy expressions, copy results, paste from the system clipboard, or send content back into an editor.',
    ],
    whereToFindIt: [
      'Top display cards and result cards in the main calculator shell',
      'Output style toggle in the status strip',
    ],
    bestModes: ['calculate', 'equation', 'table'],
    symbols: ['symbol-equal', 'symbol-less-equal', 'symbol-greater-equal'],
    examples: [
      {
        id: 'basics-copy-reuse',
        title: 'Reuse a result in Equation',
        explanation: 'A solved or transformed expression can be sent back into an editor for faster follow-up work.',
        steps: [
          'Open the example in Equation > Symbolic.',
          'Solve or transform it, then use To Editor or Copy Expr from the display card.',
          'Continue editing the loaded expression instead of rebuilding it manually.',
        ],
        expected: 'The example opens Equation > Symbolic with a reusable expression.',
        launch: {
          kind: 'load-expression',
          targetMode: 'equation',
          equationScreen: 'symbolic',
          latex: 'x^2-5x+6=0',
          label: 'Open in Equation',
        },
      },
    ],
    pitfalls: [
      'A warning line means the result may be numeric fallback, not a closed-form symbolic result.',
      'Copying or loading content does not evaluate it automatically.',
    ],
    exactVsNumeric: [
      'Use Numeric when you specifically want decimal output.',
      'Warnings explain when the app falls back to numeric behavior.',
    ],
    relatedArticleIds: ['basics-keyboard'],
  },
  {
    id: 'algebra-manipulation',
    domainId: 'algebra',
    title: 'Algebra Manipulation',
    summary: 'Use Simplify, Factor, Expand, and Numeric with structured algebra notation.',
    whatItIs: [
      'Algebra Manipulation is the everyday symbolic workspace for rewriting expressions without solving them.',
      'It covers simplification, factoring, expansion, and precedence-aware normalization before numeric evaluation.',
    ],
    whatItMeans: [
      'BIDMAS means grouping before powers, powers before unary signs, multiply or divide before add or subtract, and relations after arithmetic.',
      'Factoring in Calcwiz now tries symbolic like-term grouping first, then symbolic common factors, then numeric factors.',
    ],
    howToUse: [
      'Open Calculate, enter a structured algebra expression, then use F1 Simplify, F2 Factor, F3 Expand, or F4 Numeric.',
      'Use grouping symbols when you want to change the normal BIDMAS order on purpose.',
      'Expect Factor to group shared symbols such as u or x before it falls back to coefficient-only factoring.',
    ],
    concepts: [
      'Simplify normalizes algebraic expressions.',
      'BIDMAS is enforced internally before symbolic rules run.',
      'Factor now includes symbolic like-term grouping, symbolic common-factor extraction, and difference-of-squares fallback.',
      'Expand distributes grouped products and powers when the engine supports it.',
    ],
    whereToFindIt: [
      'Virtual keyboard pages: Algebra and Relations',
      'Calculate soft keys: F1 Simplify, F2 Factor, F3 Expand, F4 Numeric',
    ],
    bestModes: ['calculate'],
    symbols: ['symbol-abs', 'symbol-group-power', 'symbol-nth-root', 'symbol-square', 'symbol-cube'],
    examples: [
      {
        id: 'algebra-factor-common',
        title: 'Factor a symbolic common factor',
        explanation: 'The factor path handles symbolic patterns such as ab+ac, not only numeric-looking trinomials.',
        expected: 'The expression loads into Calculate so you can press F2 to factor it.',
        launch: {
          kind: 'load-expression',
          targetMode: 'calculate',
          latex: 'ab+ac',
          label: 'Load in Calculate',
        },
      },
      {
        id: 'algebra-diff-squares',
        title: 'Factor a difference of squares',
        explanation: 'Difference-of-squares factoring is supported by the custom symbolic fallback.',
        expected: 'The expression loads into Calculate ready for F2.',
        launch: {
          kind: 'load-expression',
          targetMode: 'calculate',
          latex: 'x^2-y^2',
          label: 'Load in Calculate',
        },
      },
    ],
    pitfalls: [
      'Grouped powers matter. (x+1)^2 is not the same as x^2+1.',
      'Factoring does not always mean extracting a numeric GCD first; symbolic grouping is tried before numeric factoring.',
      'Visible relation symbols other than = are notation-only in the current algebra milestone.',
    ],
    exactVsNumeric: [
      'Factoring is symbolic-first.',
      'Use Numeric if you want decimal evaluation after a symbolic manipulation.',
    ],
    relatedArticleIds: ['algebra-equations'],
  },
  {
    id: 'algebra-equations',
    domainId: 'algebra',
    title: 'Equation Solving and Relation Symbols',
    summary: 'Learn when to use Equation mode, when Calculate redirects, and how the guarded symbolic-plus-numeric solve path behaves today.',
    concepts: [
      'Equation mode owns symbolic solving and interval-based numeric solving for single-variable real equations in x.',
      'Calculate redirects top-level equations into Equation instead of solving in place.',
      'The guarded solver tries exact symbolic solving first, then bounded rewrites or substitution families (including selected exp/log families such as e^(2x)-5e^x+6=0, ln(2x+1)=3, 2log(x)-1=0, and ln(x)+ln(x+1)=2), and only then bracket-first interval numeric solving (with residual-checked local-minimum recovery) when you provide an interval.',
      'Selected impossible real equations are rejected early through exact range checks before symbolic-family matching or numeric interval solving.',
      'Relations such as ≠, <, >, ≤, and ≥ are available for notation but not for general inequality solving yet.',
    ],
    whereToFindIt: [
      'Equation app: Symbolic, Polynomial, and Simultaneous branches',
      'Relations page for =, ≠, <, >, ≤, and ≥',
    ],
    bestModes: ['equation', 'calculate'],
    symbols: ['symbol-equal', 'symbol-not-equal', 'symbol-less', 'symbol-greater', 'symbol-less-equal', 'symbol-greater-equal'],
    examples: [
      {
        id: 'algebra-equation-symbolic',
        title: 'Open a symbolic equation',
        explanation: 'Use Equation > Symbolic for standard equations in x.',
        expected: 'The equation opens directly in Equation > Symbolic.',
        launch: {
          kind: 'load-expression',
          targetMode: 'equation',
          equationScreen: 'symbolic',
          latex: 'x^2-5x+6=0',
          label: 'Open in Equation',
        },
      },
      {
        id: 'algebra-equation-poly',
        title: 'Open a polynomial example',
        explanation: 'Guided polynomial flows live under Equation > Polynomial.',
        expected: 'The polynomial opens in Equation > Symbolic for direct solving or replay.',
        launch: {
          kind: 'load-expression',
          targetMode: 'equation',
          equationScreen: 'symbolic',
          latex: 'x^4+4x^3-5x^2+13x+44=0',
          label: 'Open in Equation',
        },
      },
    ],
    pitfalls: [
      'Typing = in Calculate does not make Calculate a solver.',
      'Interval numeric solving is explicit; it only runs when you open Numeric Solve in Equation > Symbolic.',
      'Bounded same-base and mixed constant-base log-combine sums are included in this milestone. Difference, ratio, and power log transforms remain deferred.',
      'Inequality notation is visible before inequality-solving workflows exist.',
    ],
    exactVsNumeric: [
      'Equation results prefer exact symbolic output.',
      'Polynomial branches may show numeric fallback roots when exact symbolic solving fails.',
    ],
    relatedArticleIds: ['algebra-manipulation'],
  },
  {
    id: 'discrete-operators',
    domainId: 'discrete',
    title: 'Finite Sums, Products, and Factorial',
    summary: 'Use the Discrete page for bounded sums, bounded products, and factorial.',
    concepts: [
      '∑ evaluates finite sums with explicit bounds.',
      '∏ evaluates finite products with explicit bounds.',
      '! is exact for non-negative integers in this milestone.',
    ],
    whereToFindIt: [
      'Virtual keyboard page: Discrete',
      'Calculate for direct evaluation',
    ],
    bestModes: ['calculate', 'equation'],
    symbols: ['symbol-sum', 'symbol-product', 'symbol-factorial'],
    examples: [
      {
        id: 'discrete-sum',
        title: 'Finite sum of k',
        explanation: 'Use the sum template with an index, bounds, and body.',
        expected: 'The example opens in Calculate and is ready for EXE.',
        launch: {
          kind: 'load-expression',
          targetMode: 'calculate',
          latex: '\\sum_{k=1}^{5}{k}',
          label: 'Load in Calculate',
        },
      },
      {
        id: 'discrete-product',
        title: 'Finite product',
        explanation: 'Use the product template for repeated multiplication across a bounded index.',
        expected: 'The example opens in Calculate and evaluates exactly.',
        launch: {
          kind: 'load-expression',
          targetMode: 'calculate',
          latex: '\\prod_{k=1}^{4}{k}',
          label: 'Load in Calculate',
        },
      },
    ],
    pitfalls: [
      'Σ on the Greek page is a letter. ∑ on the Discrete page is the summation operator.',
      'Factorial is restricted to non-negative integers in this milestone.',
    ],
    exactVsNumeric: [
      'Discrete Core is exact and integer-focused.',
      'Invalid domains return controlled errors instead of raw parser failures.',
    ],
    relatedArticleIds: ['discrete-combinatorics'],
  },
  {
    id: 'discrete-combinatorics',
    domainId: 'discrete',
    title: 'Combinations and Permutations',
    summary: 'Use nCr when order does not matter and nPr when it does.',
    concepts: [
      'nCr counts combinations.',
      'nPr counts permutations.',
      'Both require non-negative integer arguments and r ≤ n.',
    ],
    whereToFindIt: [
      'Virtual keyboard page: Combinatorics',
      'Calculate for direct exact evaluation',
    ],
    bestModes: ['calculate'],
    symbols: ['symbol-ncr', 'symbol-npr'],
    examples: [
      {
        id: 'discrete-ncr',
        title: 'Combination count',
        explanation: 'Use nCr when you are choosing items and order does not matter.',
        expected: 'The example opens in Calculate and evaluates exactly.',
        launch: {
          kind: 'load-expression',
          targetMode: 'calculate',
          latex: '\\operatorname{nCr}(5,2)',
          label: 'Load in Calculate',
        },
      },
      {
        id: 'discrete-npr',
        title: 'Permutation count',
        explanation: 'Use nPr when order matters.',
        expected: 'The example opens in Calculate and evaluates exactly.',
        launch: {
          kind: 'load-expression',
          targetMode: 'calculate',
          latex: '\\operatorname{nPr}(5,2)',
          label: 'Load in Calculate',
        },
      },
    ],
    pitfalls: [
      'nCr and nPr are not general symbolic combinatorics in this milestone.',
      'Negative or non-integer arguments return controlled errors.',
    ],
    exactVsNumeric: [
      'Combinatorics in this milestone is exact and domain-validated.',
    ],
    relatedArticleIds: ['discrete-operators'],
  },
  {
    id: 'calculus-derivatives',
    domainId: 'calculus',
    title: 'Derivatives and Derivative at a Point',
    summary: 'Use Calculus for d/dx and derivative-at-point, and Functions for sin, cos, tan, log, and ln.',
    whatItIs: [
      'A derivative turns a function into a new function that describes its rate of change.',
      'A derivative at a point gives the slope of that changing function at one numeric x-value.',
    ],
    whatItMeans: [
      'A plain derivative answers how a function is changing in general.',
      'A derivative at a point answers how fast that function is changing at one chosen location.',
      'The sum rule differentiates term by term, while the product rule, quotient rule, and chain rule explain how combined functions change.',
    ],
    howToUse: [
      'Open the launcher item Calculus, then choose Derivative or Derivative at Point.',
      'Enter the body of the function in x, and add a numeric point only when you need one slope value.',
      'Press EXE or F1, then read the badge and warning area to see whether the result stayed symbolic or used numeric fallback.',
      'For multivariable expressions, use partial-derivative notation in Advanced Calc when you need the derivative with respect to x, y, or z while treating the other variables as constants.',
    ],
    concepts: [
      'd/dx returns a derivative expression.',
      'd/dx| evaluates the derivative at one numeric point.',
      'Calcwiz supports addition, subtraction, product, quotient, chain, log, ln, trig, and affine-inner derivative rules inside the symbolic engine.',
      'First-order partial derivatives in x, y, and z are supported for explicit multivariable expressions.',
      'Functions are inserted as structured notation, not plain text.',
    ],
    whereToFindIt: [
      'Menu > Calculus > Calculus',
      'Virtual keyboard pages: Calculus and Functions',
      'Calculate or the Calculus page for direct derivative evaluation',
    ],
    bestModes: ['calculate', 'equation', 'table'],
    symbols: ['symbol-derivative', 'symbol-derivative-point', 'symbol-sin', 'symbol-cos', 'symbol-tan', 'symbol-log', 'symbol-ln'],
    examples: [
      {
        id: 'calc-derivative',
        title: 'Differentiate a polynomial',
        explanation: 'Use d/dx when you want a symbolic derivative expression.',
        steps: [
          'Open Calculus > Derivative.',
          'Enter x^3+2x as the body.',
          'Press EXE or F1 to return the symbolic derivative.',
        ],
        expected: 'The expression opens in Calculate ready for EXE.',
        launch: {
          kind: 'load-expression',
          targetMode: 'calculate',
          calculateScreen: 'derivative',
          calculateSeed: {
            bodyLatex: 'x^3+2x',
          },
          latex: '\\frac{d}{dx}\\left(x^3+2x\\right)',
          label: 'Open in Derivative Tool',
        },
        copyLatex: '\\frac{d}{dx}\\left(x^3+2x\\right)',
      },
      {
        id: 'calc-derivative-point',
        title: 'Derivative at x=3',
        explanation: 'Use the derivative-at-point template when you need a numeric slope at one point.',
        steps: [
          'Open Calculus > Derivative at Point.',
          'Enter x^2 as the body and 3 as the point.',
          'Press EXE or F1 to evaluate the slope at that point.',
        ],
        expected: 'The expression opens in Calculate ready for EXE.',
        launch: {
          kind: 'load-expression',
          targetMode: 'calculate',
          calculateScreen: 'derivativePoint',
          calculateSeed: {
            bodyLatex: 'x^2',
            point: '3',
          },
          latex: '\\left.\\frac{d}{dx}\\left(x^2\\right)\\right|_{x=3}',
          label: 'Open in Derivative Tool',
        },
      },
      {
        id: 'calc-partial-derivative',
        title: 'Partial derivative with respect to x',
        explanation: 'Use partial-derivative notation when the expression contains more than one variable and you only want the x-change.',
        steps: [
          'Open Advanced Calc > Partials > First Order.',
          'Leave the variable on ∂/∂x and enter x^2y+y^3 as the body.',
          'Press EXE or F1 to evaluate the first-order partial derivative.',
        ],
        expected: 'The partial derivative treats y as a constant and returns 2xy.',
        launch: {
          kind: 'open-tool',
          targetMode: 'advancedCalculus',
          advancedCalcScreen: 'partialDerivative',
          advancedCalcSeed: {
            bodyLatex: 'x^2y+y^3',
            variable: 'x',
          },
          label: 'Open in Advanced Calc',
        },
      },
    ],
    pitfalls: [
      'd/dx and d/dx| are different tools with different outputs.',
      'If symbolic differentiation is unavailable at a point, the app may use numeric fallback with a warning.',
    ],
    exactVsNumeric: [
      'Derivatives prefer symbolic exact output.',
      'Derivative-at-point can fall back numerically when needed.',
    ],
    relatedArticleIds: ['calculus-integrals-limits'],
  },
  {
    id: 'calculus-integrals-limits',
    domainId: 'calculus',
    title: 'Integrals and Limits',
    summary: 'Use symbolic antiderivatives when available, plus stronger finite and infinite-target limit handling.',
    whatItIs: [
      'The core Calculus page is the approachable workflow for indefinite integrals, definite integrals, and common limits.',
      'It is meant for everyday single-variable work in x before you move to Advanced Calc.',
    ],
    whatItMeans: [
      'An indefinite integral asks for a family of antiderivatives, so it stays symbolic-only.',
      'A definite integral asks for the accumulated value between bounds, so numeric fallback can make sense there.',
      'A limit asks what a function is approaching near a target, from both sides or one side when needed.',
    ],
    howToUse: [
      'Open the launcher item Calculus, then choose Integral or Limit.',
      'Use Indefinite for symbolic antiderivatives and Definite when you have numeric bounds.',
      'Use Finite, +infinity, or -infinity targets for limits, then choose a direction only when the target is finite.',
    ],
    concepts: [
      'The ∫ symbol is for indefinite integrals and stays symbolic-only in this milestone.',
      'Some antiderivatives are handled by app-owned symbolic rules when the engine leaves them unresolved.',
      'The ∫ab template is for definite integrals with numeric bounds and may fall back numerically.',
      'The limit workbench now supports finite targets and ±∞ in this milestone.',
      'Core limits can stabilize removable singularities and supported one-sided mismatch cases before numeric fallback.',
    ],
    whereToFindIt: [
      'Menu > Calculus > Calculus',
      'Virtual keyboard page: Calculus',
      'Functions page for sin, cos, tan, log, and ln',
    ],
    bestModes: ['calculate', 'table'],
    symbols: ['symbol-integral', 'symbol-definite-integral', 'symbol-limit'],
    examples: [
      {
        id: 'calc-integral-indefinite',
        title: 'Rule-based indefinite integral',
        explanation: 'Simple single-variable antiderivatives can now succeed through the app-owned rule layer.',
        steps: [
          'Open Calculus > Integral.',
          'Leave the tool on Indefinite and enter sin(2x+1) as the integrand.',
          'Press EXE or F1 to request a symbolic antiderivative.',
        ],
        expected: 'The integral opens in Calculate > Integral and returns a symbolic antiderivative.',
        launch: {
          kind: 'load-expression',
          targetMode: 'calculate',
          calculateScreen: 'integral',
          calculateSeed: {
            kind: 'indefinite',
            bodyLatex: '\\sin(2x+1)',
          },
          latex: '\\int \\sin(2x+1) \\, dx',
          label: 'Open in Integral Tool',
        },
      },
      {
        id: 'calc-integral-definite',
        title: 'Definite integral with fallback',
        explanation: 'Definite integrals can use controlled numeric fallback when the engine does not return a symbolic result.',
        steps: [
          'Open Calculus > Integral and switch to Definite.',
          'Enter sin(x^2) as the body with lower bound 0 and upper bound 1.',
          'Press EXE or F1 and check the warning area if numeric fallback was required.',
        ],
        expected: 'The expression opens in Calculate ready for EXE.',
        launch: {
          kind: 'load-expression',
          targetMode: 'calculate',
          calculateScreen: 'integral',
          calculateSeed: {
            kind: 'definite',
            bodyLatex: '\\sin(x^2)',
            lower: '0',
            upper: '1',
          },
          latex: '\\int_0^1 \\sin(x^2) \\, dx',
          label: 'Open in Integral Tool',
        },
      },
      {
        id: 'calc-limit',
        title: 'Finite removable-singularity limit',
        explanation: 'Finite targets still work, including common removable-singularity style limits.',
        steps: [
          'Open Calculus > Limit.',
          'Keep the target kind on Finite, enter sin(x)/x, and set the target to 0.',
          'Press EXE or F1 to evaluate the two-sided limit.',
        ],
        expected: 'The expression opens in Calculate > Limit with a finite target.',
        launch: {
          kind: 'load-expression',
          targetMode: 'calculate',
          calculateScreen: 'limit',
          calculateSeed: {
            bodyLatex: '\\frac{\\sin(x)}{x}',
            target: '0',
            direction: 'two-sided',
            targetKind: 'finite',
          },
          latex: '\\lim_{x\\to 0}\\left(\\frac{\\sin(x)}{x}\\right)',
          label: 'Open in Limit Tool',
        },
      },
      {
        id: 'calc-limit-infinity',
        title: 'Rational limit at +infinity',
        explanation: 'The limit workbench now supports ±∞ targets for common rational end behavior.',
        steps: [
          'Open Calculus > Limit.',
          'Switch the target kind to +infinity and enter (3x^2+1)/(2x^2-5).',
          'Press EXE or F1 to evaluate the end behavior.',
        ],
        expected: 'The expression opens in Calculate > Limit with a +infinity target.',
        launch: {
          kind: 'load-expression',
          targetMode: 'calculate',
          calculateScreen: 'limit',
          calculateSeed: {
            bodyLatex: '\\frac{3x^2+1}{2x^2-5}',
            direction: 'two-sided',
            targetKind: 'posInfinity',
          },
          latex: '\\lim_{x\\to \\infty}\\left(\\frac{3x^2+1}{2x^2-5}\\right)',
          label: 'Open in Limit Tool',
        },
      },
    ],
    pitfalls: [
      'A numeric-fallback warning means the result is an approximation, not a closed-form symbolic answer.',
      'Indefinite integrals are still symbolic-only even when some extra rule-based antiderivatives are now supported.',
      'Some limits remain too unstable for this milestone and still return controlled errors.',
    ],
    exactVsNumeric: [
      'Simple antiderivatives prefer exact symbolic output, including some rule-based symbolic results.',
      'Definite integrals and limits may fall back to numeric approximations when exact evaluation is unavailable.',
    ],
    relatedArticleIds: ['calculus-derivatives'],
  },
  {
    id: 'linear-algebra-matrix-vector',
    domainId: 'linearAlgebra',
    title: 'Matrix and Vector Notation',
    summary: 'Use the MatrixVec keyboard page and notation pads for structured notation, but rely on Matrix and Vector modes for actual operations.',
    whatItIs: [
      'Matrix and Vector are dedicated numeric workspaces for linear-algebra operations in this app.',
      'The notation pads are drafting surfaces for structured textbook notation, copying, and reuse.',
    ],
    whatItMeans: [
      'det(A) means the determinant of A, which is a scalar tied to properties like invertibility.',
      'A transpose means swapping rows and columns.',
      'A inverse means the matrix that undoes A when the inverse exists.',
      'A dot B is the dot product, A cross B is the cross product, and norm(A) is the length of a vector.',
    ],
    howToUse: [
      'Open Matrix for matrix operations and Vector for vector operations.',
      'Use the quick notation-pad buttons when you want to draft or copy A, B, and common operator forms.',
      'Treat the notation pads as structured drafting surfaces, not as a promise of full free-form symbolic matrix CAS.',
    ],
    concepts: [
      'Matrix and Vector modes are the operational tools for matrix and vector calculations in this milestone.',
      'The MatrixVec keyboard page inserts structured notation templates and operator symbols.',
      'Notation pads in Matrix and Vector help you draft, copy, and reuse structured linear-algebra expressions without promising full free-form matrix CAS.',
      'Quick actions can load the current Matrix A/B or Vector A/B values into the notation pad for reuse.',
    ],
    whereToFindIt: [
      'Virtual keyboard page: MatrixVec',
      'Matrix mode notation pad',
      'Vector mode notation pad',
    ],
    bestModes: ['matrix', 'vector'],
    symbols: [
      'symbol-matrix-template',
      'symbol-vector-template',
      'symbol-transpose',
      'symbol-det',
      'symbol-inverse',
      'symbol-dot',
      'symbol-cross',
      'symbol-norm',
    ],
    examples: [
      {
        id: 'linear-open-matrix',
        title: 'Open Matrix mode',
        explanation: 'Use Matrix mode for determinant, inverse, transpose, multiplication, and reusing the current A/B values inside the notation pad.',
        steps: [
          'Open Matrix from the launcher.',
          'Enter the numeric values for Matrix A and Matrix B.',
          'Use the soft keys or the notation-pad quick buttons to run or draft the operation you want.',
        ],
        expected: 'Matrix mode opens and keeps the notation pad available for template entry and copy/reuse.',
        launch: {
          kind: 'open-tool',
          targetMode: 'matrix',
          label: 'Open Matrix',
        },
      },
      {
        id: 'linear-open-vector',
        title: 'Open Vector mode',
        explanation: 'Use Vector mode for dot, cross, norm, angle, and reusing the current vectors inside textbook notation.',
        steps: [
          'Open Vector from the launcher.',
          'Enter the numeric values for Vector A and Vector B.',
          'Run dot, cross, norm, or angle from Vector mode, then use the notation pad when you want to copy the structured form.',
        ],
        expected: 'Vector mode opens and keeps the notation pad available for template entry and copy/reuse.',
        launch: {
          kind: 'open-tool',
          targetMode: 'vector',
          label: 'Open Vector',
        },
      },
    ],
    pitfalls: [
      'The MatrixVec keyboard page is notation-first. It does not turn Calculate into a full symbolic matrix CAS.',
      'Use Matrix for matrix operations and Vector for vector operations instead of expecting free-form editor evaluation everywhere.',
    ],
    exactVsNumeric: [
      'Matrix and Vector modes use their dedicated operation flows.',
      'Notation pads are primarily for structured entry, copying, and reuse.',
    ],
    relatedArticleIds: [],
  },
  {
    id: 'advanced-integrals',
    domainId: 'advancedCalculus',
    title: 'Advanced Integrals',
    summary: 'Use Advanced Calc for harder antiderivatives, stronger symbolic rules, and improper integral workflows.',
    whatItIs: [
      'Advanced Integrals is the heavier-duty single-variable integral workspace in Advanced Calc.',
      'It covers harder symbolic antiderivatives and supported improper integral workflows that go beyond the core Calculus page.',
    ],
    whatItMeans: [
      'An antiderivative is a function whose derivative gives back the original integrand.',
      'An improper integral uses an infinite bound or a problematic endpoint, so convergence matters before a value can make sense.',
      'u-substitution works when an inner expression appears together with its derivative, while integration by parts is useful for supported products such as polynomial-times-exponential or polynomial-times-trig forms.',
    ],
    howToUse: [
      'Open Advanced Calc > Integrals, then choose Indefinite, Definite, or Improper.',
      'Use Indefinite when you want a symbolic antiderivative only.',
      'Use Definite or Improper when numeric fallback is acceptable and you need a bounded or infinite-bound accumulated value.',
      'Try Advanced Calc when the core Calculus page cannot resolve a nested integrand, a supported substitution pattern, or a supported integration-by-parts pattern.',
    ],
    concepts: [
      'Indefinite integrals remain symbolic-only, but Advanced Calc tries a wider rule engine before failing.',
      'Definite and improper integrals may fall back numerically when exact symbolic evaluation is unavailable.',
      'Improper integral bounds can include finite values and infinity-bound transforms.',
      'Supported symbolic strategies include substitution, integration by parts, inverse-trig primitives, and narrow trig-substitution families.',
    ],
    whereToFindIt: [
      'Menu > Calculus > Advanced Calc',
      'Advanced Calc > Integrals > Indefinite, Definite, or Improper',
      'Virtual keyboard pages: Core, Algebra, Calculus, Functions, and Series',
    ],
    bestModes: ['advancedCalculus', 'calculate'],
    symbols: ['symbol-integral', 'symbol-definite-integral', 'symbol-ln'],
    examples: [
      {
        id: 'advanced-int-arctan',
        title: 'Inverse-trig antiderivative',
        explanation: 'Advanced Calc can resolve some inverse-trig primitives that the simpler Calculus page may leave unresolved.',
        steps: [
          'Open Advanced Calc > Integrals > Indefinite.',
          'Enter 1/(1+x^2) as the integrand.',
          'Press EXE or F1 and read the provenance badge to confirm the result stayed symbolic.',
        ],
        expected: 'The example opens in Advanced Calc > Indefinite Integral and returns an arctan antiderivative.',
        launch: {
          kind: 'load-expression',
          targetMode: 'advancedCalculus',
          advancedCalcScreen: 'indefiniteIntegral',
          advancedCalcSeed: { bodyLatex: '\\frac{1}{1+x^2}' },
          latex: '\\int \\frac{1}{1+x^2}\\,dx',
          label: 'Open in Advanced Calc',
        },
      },
      {
        id: 'advanced-int-improper',
        title: 'Improper convergent integral',
        explanation: 'Improper integrals can use transformed numeric fallback when exact symbolic evaluation is not available.',
        steps: [
          'Open Advanced Calc > Integrals > Improper.',
          'Leave the lower bound as 0 and the upper bound as +infinity for 1/(1+x^2).',
          'Press EXE or F1 and check whether the provenance badge says symbolic or numeric fallback.',
        ],
        expected: 'The example opens in Advanced Calc > Improper Integral with a supported convergent case.',
        launch: {
          kind: 'load-expression',
          targetMode: 'advancedCalculus',
          advancedCalcScreen: 'improperIntegral',
          advancedCalcSeed: {
            bodyLatex: '\\frac{1}{1+x^2}',
            lowerKind: 'finite',
            lower: '0',
            upperKind: 'posInfinity',
            upper: '',
          },
          latex: '\\int_0^{\\infty}\\frac{1}{1+x^2}\\,dx',
          label: 'Open in Advanced Calc',
        },
      },
    ],
    pitfalls: [
      'Advanced Calc is still x-only in this phase.',
      'Indefinite integrals still do not use numeric fallback; unresolved cases fail cleanly.',
      'Improper integrals may still diverge or fail if the transformed numeric problem is unstable.',
    ],
    exactVsNumeric: [
      'Indefinite integrals prefer exact symbolic output or rule-based symbolic output.',
      'Definite and improper integrals may show numeric fallback warnings when symbolic evaluation is unavailable.',
    ],
    relatedArticleIds: ['advanced-limits', 'advanced-series'],
  },
  {
    id: 'advanced-limits',
    domainId: 'advancedCalculus',
    title: 'Advanced Limits',
    summary: "Use Advanced Calc for stronger finite and infinite-target limits, including capped L'Hopital on supported ratio forms.",
    whatItIs: [
      'Advanced Limits is the stronger single-variable limit workspace for harder finite and infinite-target cases.',
      'It sits above the core Calculus limit tool and adds more symbolic and heuristic handling before numeric fallback.',
    ],
    whatItMeans: [
      'A removable singularity is a point where the formula looks broken even though the nearby behavior approaches a finite value.',
      'A one-sided mismatch means the left and right behavior do not approach the same answer.',
      'An infinite-target limit studies end behavior as x grows without bound.',
      "A supported L'Hopital pass differentiates the numerator and denominator of a ratio only when the form is genuinely indeterminate and still within the engine's capped rule set.",
    ],
    howToUse: [
      'Open Advanced Calc > Limits, then choose Finite Target or Infinite Target.',
      'Use left, right, or two-sided analysis only on finite targets.',
      'Read the provenance badge and warnings together to tell whether the answer was symbolic, heuristic, or numeric fallback.',
      "Use Advanced Calc for supported 0/0 or infinity-over-infinity cases before expecting a general theorem-prover style limit engine.",
    ],
    concepts: [
      'Advanced Calc handles finite targets, +∞, and -∞.',
      "Supported finite ratio forms can use a capped symbolic L'Hopital pass before numeric fallback.",
      'Infinite-target heuristics cover common rational end behavior and some growth comparisons.',
      'Logarithm and exponential dominance are handled only in a narrow supported heuristic set.',
    ],
    whereToFindIt: [
      'Menu > Calculus > Advanced Calc',
      'Advanced Calc > Limits > Finite Target or Infinite Target',
    ],
    bestModes: ['advancedCalculus', 'calculate'],
    symbols: ['symbol-limit', 'symbol-sin', 'symbol-cos', 'symbol-log', 'symbol-ln'],
    examples: [
      {
        id: 'advanced-limit-removable',
        title: 'Removable-singularity ratio',
        explanation: 'Supported 0/0 ratio forms can stabilize through symbolic or heuristic resolution.',
        steps: [
          'Open Advanced Calc > Limits > Finite Target.',
          'Enter (1-cos(x))/x^2 and keep the target at 0.',
          'Press EXE or F1, then read the result badge and warning area together.',
        ],
        expected: 'The example opens in Advanced Calc > Finite Limit and resolves to a finite value.',
        launch: {
          kind: 'load-expression',
          targetMode: 'advancedCalculus',
          advancedCalcScreen: 'finiteLimit',
          advancedCalcSeed: {
            bodyLatex: '\\frac{1-\\cos(x)}{x^2}',
            target: '0',
            direction: 'two-sided',
          },
          latex: '\\lim_{x\\to 0}\\left(\\frac{1-\\cos(x)}{x^2}\\right)',
          label: 'Open in Advanced Calc',
        },
      },
      {
        id: 'advanced-limit-infinity',
        title: 'Infinite-target rational limit',
        explanation: 'Advanced Calc can reason about some rational end behavior at infinity before numeric fallback.',
        steps: [
          'Open Advanced Calc > Limits > Infinite Target.',
          'Set the target to +infinity and enter (3x^2+1)/(2x^2-5).',
          'Press EXE or F1 to resolve the dominant end behavior.',
        ],
        expected: 'The example opens in Advanced Calc > Infinite Limit and resolves near the dominant coefficient ratio.',
        launch: {
          kind: 'load-expression',
          targetMode: 'advancedCalculus',
          advancedCalcScreen: 'infiniteLimit',
          advancedCalcSeed: {
            bodyLatex: '\\frac{3x^2+1}{2x^2-5}',
            targetKind: 'posInfinity',
          },
          latex: '\\lim_{x\\to \\infty}\\left(\\frac{3x^2+1}{2x^2-5}\\right)',
          label: 'Open in Advanced Calc',
        },
      },
    ],
    pitfalls: [
      'Advanced Calc still uses capped supported rules, not a general symbolic limit theorem prover.',
      'Mismatch and unbounded behavior still return controlled messages instead of fake results.',
    ],
    exactVsNumeric: [
      'Exact symbolic or heuristic-symbolic results are preferred first.',
      'Numeric fallback appears only after the supported symbolic and heuristic layers fail.',
    ],
    relatedArticleIds: ['advanced-integrals', 'advanced-series'],
  },
  {
    id: 'advanced-series',
    domainId: 'advancedCalculus',
    title: 'Maclaurin and Taylor Series',
    summary: 'Generate single-variable polynomial series with numeric center support in Advanced Calc.',
    whatItIs: [
      'Series tools build polynomial approximations of a function around a chosen center.',
      'Maclaurin is the centered-at-zero version, while Taylor uses a numeric center you choose.',
    ],
    whatItMeans: [
      'Maclaurin means Taylor series around 0.',
      'The order controls how many terms of the approximation you keep; higher order usually gives a better local match.',
    ],
    howToUse: [
      'Open Advanced Calc > Series and choose Maclaurin or Taylor.',
      'Enter the body, keep Maclaurin centered at 0, or set a numeric center for Taylor.',
      'Choose an order from 1 to 8, then press EXE or F1 to build the series.',
    ],
    concepts: [
      'Maclaurin is the Taylor series centered at 0.',
      'Taylor series in this phase require a numeric finite center.',
      'Series order stays between 1 and 8 in this phase.',
    ],
    whereToFindIt: [
      'Menu > Calculus > Advanced Calc',
      'Advanced Calc > Series > Maclaurin or Taylor',
      'Virtual keyboard page: Series',
    ],
    bestModes: ['advancedCalculus'],
    symbols: ['symbol-sin', 'symbol-cos', 'symbol-ln'],
    examples: [
      {
        id: 'advanced-series-maclaurin',
        title: 'Maclaurin of sin(x)',
        explanation: 'Maclaurin quickly builds the centered-at-zero series for supported functions.',
        steps: [
          'Open Advanced Calc > Series > Maclaurin.',
          'Enter sin(x) and choose order 5.',
          'Press EXE or F1 to generate the polynomial series.',
        ],
        expected: 'The example opens in Advanced Calc > Maclaurin and returns a polynomial series.',
        launch: {
          kind: 'load-expression',
          targetMode: 'advancedCalculus',
          advancedCalcScreen: 'maclaurin',
          advancedCalcSeed: {
            bodyLatex: '\\sin(x)',
            kind: 'maclaurin',
            center: '0',
            order: 5,
          },
          latex: '\\operatorname{Maclaurin}(\\sin(x),5)',
          label: 'Open in Advanced Calc',
        },
      },
      {
        id: 'advanced-series-taylor',
        title: 'Taylor around x=1',
        explanation: 'Taylor uses a numeric center and a bounded order in this phase.',
        steps: [
          'Open Advanced Calc > Series > Taylor.',
          'Enter x^3+2x, set the center to 1, and choose order 4.',
          'Press EXE or F1 to generate the Taylor polynomial.',
        ],
        expected: 'The example opens in Advanced Calc > Taylor with center 1 and order 4.',
        launch: {
          kind: 'load-expression',
          targetMode: 'advancedCalculus',
          advancedCalcScreen: 'taylor',
          advancedCalcSeed: {
            bodyLatex: 'x^3+2x',
            kind: 'taylor',
            center: '1',
            order: 4,
          },
          latex: '\\operatorname{Taylor}(x^3+2x,1,4)',
          label: 'Open in Advanced Calc',
        },
      },
    ],
    pitfalls: [
      'Taylor center must be numeric in this phase.',
      'Laurent or asymptotic series are out of scope in this release.',
    ],
    exactVsNumeric: [
      'Series output is symbolic polynomial notation when supported.',
      'Unsupported centers or functions fail with a controlled message.',
    ],
    relatedArticleIds: ['advanced-limits'],
  },
  {
    id: 'advanced-partials',
    domainId: 'advancedCalculus',
    title: 'Partial Derivatives',
    summary: 'Use Advanced Calc > Partials for first-order symbolic partial derivatives in x, y, or z.',
    whatItIs: [
      'Partial derivatives measure how a multivariable expression changes with respect to one variable at a time.',
      'The Partials tool in Advanced Calc is the guided first-order workspace for expressions that explicitly use x, y, or z.',
    ],
    whatItMeans: [
      'Taking a partial derivative with respect to x means x is allowed to vary while the other variables such as y and z are treated as constants.',
      'A first-order partial derivative answers how fast the expression changes in one chosen variable without asking for mixed or higher-order derivatives.',
    ],
    howToUse: [
      'Open Advanced Calc > Partials > First Order.',
      'Choose the variable chip for ∂/∂x, ∂/∂y, or ∂/∂z, then enter the multivariable body expression.',
      'Press EXE or F1 to evaluate the first-order partial derivative, then use To Editor or Copy Expr if you want to reuse the generated form.',
    ],
    concepts: [
      'Partial derivatives are first-order only in this milestone.',
      'Variables not being differentiated are treated as constants.',
      'The same symbolic derivative rules apply after the chosen variable is fixed.',
    ],
    whereToFindIt: [
      'Menu > Calculus > Advanced Calc',
      'Advanced Calc > Partials > First Order',
      'Virtual keyboard page: Calculus for ∂/∂x, ∂/∂y, and ∂/∂z',
    ],
    bestModes: ['advancedCalculus'],
    symbols: ['symbol-partial-x', 'symbol-partial-y', 'symbol-partial-z'],
    examples: [
      {
        id: 'advanced-partials-x',
        title: 'Differentiate with respect to x',
        explanation: 'Use ∂/∂x when x changes and the other variables stay constant.',
        steps: [
          'Open Advanced Calc > Partials > First Order.',
          'Leave the variable on ∂/∂x and enter x^2y+y^3 as the body.',
          'Press EXE or F1 and read the symbolic result.',
        ],
        expected: 'The tool treats y as a constant and returns 2xy.',
        launch: {
          kind: 'open-tool',
          targetMode: 'advancedCalculus',
          advancedCalcScreen: 'partialDerivative',
          advancedCalcSeed: {
            bodyLatex: 'x^2y+y^3',
            variable: 'x',
          },
          label: 'Open in Advanced Calc',
        },
        copyLatex: '\\frac{\\partial}{\\partial x}\\left(x^2y+y^3\\right)',
      },
      {
        id: 'advanced-partials-y',
        title: 'Differentiate with respect to y',
        explanation: 'Switch the variable chip when you want the y-change instead of the x-change.',
        steps: [
          'Open Advanced Calc > Partials > First Order.',
          'Choose ∂/∂y and enter x^2y+y^3 as the body.',
          'Press EXE or F1 to treat x as a constant and differentiate in y.',
        ],
        expected: 'The tool returns x^2+3y^2.',
        launch: {
          kind: 'open-tool',
          targetMode: 'advancedCalculus',
          advancedCalcScreen: 'partialDerivative',
          advancedCalcSeed: {
            bodyLatex: 'x^2y+y^3',
            variable: 'y',
          },
          label: 'Open in Advanced Calc',
        },
        copyLatex: '\\frac{\\partial}{\\partial y}\\left(x^2y+y^3\\right)',
      },
    ],
    pitfalls: [
      'The Partials tool is limited to first-order partial derivatives in x, y, or z.',
      'Mixed partials, higher-order partials, and multivariable integrals are out of scope in this milestone.',
    ],
    exactVsNumeric: [
      'Partial derivatives are symbolic-first in this milestone.',
      'If a symbolic form is unsupported, the tool fails with a controlled message instead of switching to numeric fallback.',
    ],
    relatedArticleIds: ['calculus-derivatives', 'advanced-integrals'],
  },
  {
    id: 'advanced-odes',
    domainId: 'advancedCalculus',
    title: 'ODE Workflows',
    summary: 'Advanced Calc also includes guided ODE flows for supported first-order, second-order, and numeric IVP cases.',
    whatItIs: [
      'The ODE section is the guided differential-equation workspace inside Advanced Calc.',
      'It combines narrow symbolic ODE classes with a separate numeric IVP tool when you need approximation-backed results.',
    ],
    whatItMeans: [
      'A first-order ODE involves the first derivative only.',
      'A second-order ODE involves the second derivative and often uses coefficient-based forms.',
      'A numeric IVP solves from a starting x and y value across a numeric range instead of trying to produce a full symbolic family.',
    ],
    howToUse: [
      'Open Advanced Calc > ODE and choose the symbolic or numeric tool that matches your problem.',
      'Use First Order or Second Order only when the equation fits the supported guided classes.',
      'Use Numeric IVP when you have numeric initial values and want a reliable approximate solution trace.',
    ],
    concepts: [
      'First-order symbolic support is narrow and guided: separable, linear, and limited exact-style cases.',
      'Second-order symbolic support focuses on constant-coefficient forms with a limited forcing set.',
      'Numeric IVP solving uses the Rust backend in the desktop runtime and a local fallback in browser preview.',
    ],
    whereToFindIt: [
      'Menu > Calculus > Advanced Calc',
      'Advanced Calc > ODE > First Order, Second Order, or Numeric IVP',
    ],
    bestModes: ['advancedCalculus'],
    symbols: ['symbol-derivative', 'symbol-equal'],
    examples: [
      {
        id: 'advanced-ode-first',
        title: 'First-order separable ODE',
        explanation: 'Start with a supported separable form before moving to harder ODE classes.',
        steps: [
          'Open Advanced Calc > ODE > First Order.',
          'Keep the classification on separable and enter dy/dx on the left with xy on the right.',
          'Press EXE or F1 to request a symbolic family of solutions.',
        ],
        expected: 'The example opens in Advanced Calc > First Order and returns a symbolic family of solutions.',
        launch: {
          kind: 'open-tool',
          targetMode: 'advancedCalculus',
          advancedCalcScreen: 'odeFirstOrder',
          advancedCalcSeed: {
            lhsLatex: '\\frac{dy}{dx}',
            rhsLatex: 'xy',
            classification: 'separable',
          },
          label: 'Open in Advanced Calc',
        },
      },
      {
        id: 'advanced-ode-numeric',
        title: 'Numeric IVP',
        explanation: 'Use Numeric IVP when you want a reliable final value and sample trace for a supported first-order ODE.',
        steps: [
          'Open Advanced Calc > ODE > Numeric IVP.',
          'Enter x+y as the RHS with x0=0, y0=1, xEnd=1, and a step such as 0.1.',
          'Press EXE or F1 and read the numeric result as an approximation-backed solution.',
        ],
        expected: 'The example opens in Advanced Calc > Numeric IVP and is ready for EXE.',
        launch: {
          kind: 'open-tool',
          targetMode: 'advancedCalculus',
          advancedCalcScreen: 'odeNumericIvp',
          advancedCalcSeed: {
            bodyLatex: 'x+y',
            x0: '0',
            y0: '1',
            xEnd: '1',
            step: '0.1',
            method: 'rk45',
          },
          label: 'Open in Advanced Calc',
        },
      },
    ],
    pitfalls: [
      'ODE support is guided and intentionally narrow; unsupported classes fail cleanly.',
      'Numeric IVP requires numeric initial values and a supported RHS expression.',
    ],
    exactVsNumeric: [
      'Symbolic ODE flows return symbolic families when they fit the supported classes.',
      'Numeric IVP is explicitly numeric and returns an approximation-backed solution trace.',
    ],
    relatedArticleIds: ['advanced-integrals', 'advanced-limits'],
  },
  {
    id: 'trig-functions',
    domainId: 'trigonometry',
    title: 'Trig Functions and Inverse Trig',
    summary: 'Use the shared Trigonometry editor for single trig and inverse-trig expressions with angle-unit awareness.',
    whatItIs: [
      'The Functions tool is the bounded trig calculator for sin, cos, tan, asin, acos, and atan.',
      'It prefers exact special-angle output first and falls back to numeric values when the angle is not a supported exact case.',
    ],
    whatItMeans: [
      'Exact special-angle output means Calcwiz recognizes angles such as 30 degrees or pi/6 and returns a textbook value like 1/2.',
      'Inverse trig returns principal values only, so asin, acos, and atan stay within their standard principal ranges.',
    ],
    howToUse: [
      'Open Trigonometry > Functions and use the top Trigonometry editor for one supported trig expression.',
      'Keep the angle unit on DEG, RAD, or GRAD depending on how the argument should be interpreted.',
      'Press EXE or F1 to evaluate the expression and read the exact line first when one is available.',
    ],
    concepts: [
      'Special angles are exact-first.',
      'Inverse trig returns principal values.',
      'The first release is intentionally bounded to single supported trig expressions.',
    ],
    whereToFindIt: [
      'Menu > Shape Math > Trigonometry',
      'Trigonometry > Functions',
      'Virtual keyboard pages: Trig and Angles',
    ],
    bestModes: ['trigonometry', 'calculate'],
    symbols: ['symbol-sin', 'symbol-cos', 'symbol-tan', 'symbol-asin', 'symbol-acos', 'symbol-atan', 'symbol-degree', 'symbol-pi'],
    examples: [
      {
        id: 'trig-functions-sin',
        title: 'Evaluate sin(30)',
        explanation: 'Special angles return exact values before numeric fallback.',
        expected: 'The example opens Trigonometry > Functions and returns 1/2.',
        launch: {
          kind: 'load-expression',
          targetMode: 'trigonometry',
          trigScreen: 'functions',
          latex: '\\sin\\left(30\\right)',
          label: 'Open in Trigonometry',
        },
      },
      {
        id: 'trig-functions-asin',
        title: 'Evaluate asin(1/2)',
        explanation: 'Inverse trig returns the principal value in the current angle unit.',
        expected: 'The example opens Trigonometry > Functions and returns the principal angle.',
        launch: {
          kind: 'load-expression',
          targetMode: 'trigonometry',
          trigScreen: 'functions',
          latex: '\\arcsin\\left(\\frac{1}{2}\\right)',
          label: 'Open in Trigonometry',
        },
      },
    ],
    pitfalls: [
      'The first release expects one supported trig expression, not a full symbolic trig CAS expression tree.',
      'Angle unit matters for direct trig functions. 30 in DEG is not the same as 30 in RAD.',
    ],
    exactVsNumeric: [
      'Exact special-angle output is preferred first.',
      'Numeric fallback appears when the input is not one of the supported exact cases.',
    ],
    relatedArticleIds: ['trig-special-angles', 'trig-equations'],
  },
  {
    id: 'trig-identities',
    domainId: 'trigonometry',
    title: 'Trig Identities',
    summary: 'Use the shared Trigonometry editor for bounded identity simplification and conversion.',
    concepts: [
      'The first release supports a bounded set of Pythagorean, product-to-sum, sum-to-product, double-angle, and half-angle conversions.',
      'This is a conversion workbench, not a general theorem prover.',
      'The top Trigonometry editor is the canonical draft surface, while presets and target-form chips act as guided helpers below it.',
    ],
    whereToFindIt: [
      'Menu > Shape Math > Trigonometry',
      'Trigonometry > Identities > Simplify or Convert Form',
    ],
    bestModes: ['trigonometry'],
    symbols: ['symbol-product-to-sum', 'symbol-sum-to-product', 'symbol-sin', 'symbol-cos'],
    examples: [
      {
        id: 'trig-identities-simplify',
        title: 'Simplify sin^2(x)+cos^2(x)',
        explanation: 'The Pythagorean identity collapses to 1.',
        expected: 'The example opens Trigonometry > Identity Simplify and returns 1.',
        launch: {
          kind: 'open-tool',
          targetMode: 'trigonometry',
          trigScreen: 'identitySimplify',
          trigSeed: {
            expressionLatex: '\\sin^2\\left(x\\right)+\\cos^2\\left(x\\right)',
            targetForm: 'simplified',
          },
          label: 'Open in Trigonometry',
        },
      },
      {
        id: 'trig-identities-convert',
        title: 'Convert sin(A)sin(B) to sum form',
        explanation: 'Product-to-sum conversion rewrites a product into cosine terms.',
        expected: 'The example opens Trigonometry > Identity Convert and returns a sum form.',
        launch: {
          kind: 'open-tool',
          targetMode: 'trigonometry',
          trigScreen: 'identityConvert',
          trigSeed: {
            expressionLatex: '\\sin\\left(A\\right)\\sin\\left(B\\right)',
            targetForm: 'productToSum',
          },
          label: 'Open in Trigonometry',
        },
      },
    ],
    pitfalls: [
      'Unsupported identities fail cleanly instead of pretending to prove an equivalence.',
      'The current release is conversion-first and intentionally shallow.',
    ],
    exactVsNumeric: [
      'Identity tools are symbolic and do not fall back to decimal approximations.',
    ],
    relatedArticleIds: ['trig-functions'],
  },
  {
    id: 'trig-equations',
    domainId: 'trigonometry',
    title: 'Trig Equations',
    summary: 'Solve bounded one-variable trig equations from the shared Trigonometry editor, including selected exact rewrite, affine-argument, substitution, and square-split families.',
    concepts: [
      'The current solver focuses on sin(x)=c, cos(x)=c, tan(x)=c, affine arguments such as sin(x+30)=1/2 and cos(2x-pi/3)=0, selected exact rewrites such as sin(x)cos(x)=1/2 or 2cos^2(x)-1=0, bounded mixed linear forms such as a*sin(A)+b*cos(A)=c, bounded two-term sum-to-product normalization for sin/cos sums and differences, and bounded single-carrier substitution families such as 2sin^2(x)-3sin(x)+1=0.',
      'The same shared solve backend also resolves selected bounded exp/log equation families in this screen, including bounded same-base and mixed constant-base log normalization paths, so Equation and Trigonometry stay aligned on solve behavior and badges.',
      'Selected impossible real equations such as sin(x^2)=5 or sin(x)+cos(x)=3 are rejected by exact range guards before solve handoff.',
      'Principal solutions are shown first and the periodic family is described in a warning line.',
      'When exact trig solving stops short, Trigonometry can send the equation into Equation mode for bracket-first interval numeric solving.',
    ],
    whereToFindIt: [
      'Menu > Shape Math > Trigonometry',
      'Trigonometry > Equations > Solve Trig Equation',
    ],
    bestModes: ['trigonometry', 'equation'],
    symbols: ['symbol-sin', 'symbol-cos', 'symbol-tan', 'symbol-equal'],
    examples: [
      {
        id: 'trig-equations-basic',
        title: 'Solve sin(x)=1/2',
        explanation: 'This returns the principal degree solutions and the periodic family note.',
        expected: 'The example opens Trigonometry > Solve Trig Equation and returns the common textbook answers.',
        launch: {
          kind: 'open-tool',
          targetMode: 'trigonometry',
          trigScreen: 'equationSolve',
          trigSeed: {
            equationLatex: '\\sin\\left(x\\right)=\\frac{1}{2}',
          },
          label: 'Open in Trigonometry',
        },
      },
      {
        id: 'trig-equations-scaled',
        title: 'Solve sin(2x)=0',
        explanation: 'Scaled arguments are supported in the bounded first release.',
        expected: 'The example opens Trigonometry > Solve Trig Equation and divides the special-angle solutions by 2.',
        launch: {
          kind: 'open-tool',
          targetMode: 'trigonometry',
          trigScreen: 'equationSolve',
          trigSeed: {
            equationLatex: '\\sin\\left(2x\\right)=0',
          },
          label: 'Open in Trigonometry',
        },
      },
      {
        id: 'trig-equations-rewrite',
        title: 'Solve sin(x)cos(x)=1/2',
        explanation: 'Selected exact rewrite families are reduced automatically before solve.',
        expected: 'The example opens Trigonometry > Solve Trig Equation and rewrites the equation through a bounded double-angle form before solving.',
        launch: {
          kind: 'open-tool',
          targetMode: 'trigonometry',
          trigScreen: 'equationSolve',
          trigSeed: {
            equationLatex: '\\sin\\left(x\\right)\\cos\\left(x\\right)=\\frac{1}{2}',
          },
          label: 'Open in Trigonometry',
        },
      },
      {
        id: 'trig-equations-substitution',
        title: 'Solve 2sin^2(x)-3sin(x)+1=0',
        explanation: 'Bounded single-carrier substitution can reduce selected polynomial-in-sin forms before solve.',
        expected: 'The example opens Trigonometry > Solve Trig Equation and substitutes t=sin(x) before solving the resulting quadratic.',
        launch: {
          kind: 'open-tool',
          targetMode: 'trigonometry',
          trigScreen: 'equationSolve',
          trigSeed: {
            equationLatex: '2\\sin^2\\left(x\\right)-3\\sin\\left(x\\right)+1=0',
          },
          label: 'Open in Trigonometry',
        },
      },
    ],
    pitfalls: [
      'General periodic-solution theory is intentionally bounded in the first release.',
      'Only supported one-variable forms in x and selected exact rewrite or substitution families are accepted.',
      'Bounded log-combine sums are included, including mixed constant-base normalization, while broader log identities and transform search remain out of scope for this milestone.',
    ],
    exactVsNumeric: [
      'Special-angle equations return exact principal values when recognized.',
      'If exact trig solving stops short, send the equation to Equation mode for bracket-first interval numeric solving.',
    ],
    relatedArticleIds: ['trig-functions', 'trig-special-angles'],
  },
  {
    id: 'trig-triangles',
    domainId: 'trigonometry',
    title: 'Right Triangles, Sine Rule, and Cosine Rule',
    summary: 'Use guided triangle builders that seed the shared Trigonometry editor for practical numeric solving.',
    concepts: [
      'Right Triangle expects exactly two known values, with at least one side.',
      'Sine Rule needs a matching side-angle pair and enough extra data to define the triangle.',
      'Cosine Rule supports SSS and SAS workflows in the first release.',
    ],
    whereToFindIt: [
      'Menu > Shape Math > Trigonometry',
      'Trigonometry > Triangles',
    ],
    bestModes: ['trigonometry'],
    symbols: ['symbol-sine-rule', 'symbol-cosine-rule'],
    examples: [
      {
        id: 'trig-triangles-right',
        title: 'Solve a 3-4-5 right triangle',
        explanation: 'Right Triangle fills in the missing hypotenuse and acute angles.',
        expected: 'The example opens Trigonometry > Right Triangle with side a and side b prefilled.',
        launch: {
          kind: 'open-tool',
          targetMode: 'trigonometry',
          trigScreen: 'rightTriangle',
          trigSeed: {
            knownSideA: '3',
            knownSideB: '4',
            knownSideC: '',
            knownAngleA: '',
            knownAngleB: '',
          },
          label: 'Open in Trigonometry',
        },
      },
      {
        id: 'trig-triangles-sine',
        title: 'Use the sine rule',
        explanation: 'A matching side-angle pair plus one extra side is enough for a bounded sine-rule solve.',
        expected: 'The example opens Trigonometry > Sine Rule with a guided numeric triangle case.',
        launch: {
          kind: 'open-tool',
          targetMode: 'trigonometry',
          trigScreen: 'sineRule',
          trigSeed: {
            sideA: '7',
            sideB: '10',
            angleA: '30',
          },
          label: 'Open in Trigonometry',
        },
      },
    ],
    pitfalls: [
      'Triangle tools are numeric workbenches and do not imply symbolic proof generation.',
      'Sine-rule SSA cases can be ambiguous; the first release warns and chooses the principal acute solution.',
    ],
    exactVsNumeric: [
      'Triangle tools are numeric and formula-driven.',
    ],
    relatedArticleIds: ['trig-functions'],
  },
  {
    id: 'trig-special-angles',
    domainId: 'trigonometry',
    title: 'Angle Conversion and Special Angles',
    summary: 'Use the shared Trigonometry editor, the angle-convert tool, and the special-angle table for degree, radian, and exact trig-value workflows.',
    concepts: [
      'The special-angle table covers the standard first-quadrant exact values and their radian forms.',
      'Angle Convert handles degree, radian, and grad conversion without needing a network service or graphing mode.',
    ],
    whereToFindIt: [
      'Menu > Shape Math > Trigonometry',
      'Trigonometry > Angle Convert',
      'Trigonometry > Special Angles',
    ],
    bestModes: ['trigonometry'],
    symbols: ['symbol-degree', 'symbol-pi'],
    examples: [
      {
        id: 'trig-special-convert',
        title: 'Convert 30 degrees to radians',
        explanation: 'Angle Convert shows the exact radian form for standard special angles.',
        expected: 'The example opens Trigonometry > Angle Convert with 30 degrees selected.',
        launch: {
          kind: 'open-tool',
          targetMode: 'trigonometry',
          trigScreen: 'angleConvert',
          trigSeed: {
            value: '30',
            from: 'deg',
            to: 'rad',
          },
          label: 'Open in Trigonometry',
        },
      },
      {
        id: 'trig-special-reference',
        title: 'Open the special-angle evaluator',
        explanation: 'The Special Angles screen also lets you evaluate a supported special-angle trig expression directly.',
        expected: 'The example opens Trigonometry > Special Angles with a ready-made exact-value expression.',
        launch: {
          kind: 'load-expression',
          targetMode: 'trigonometry',
          trigScreen: 'specialAngles',
          latex: '\\cos\\left(\\frac{\\pi}{3}\\right)',
          label: 'Open in Trigonometry',
        },
      },
    ],
    pitfalls: [
      'Only the curated special-angle set is exact-first in the first release.',
      'Grad conversion is numeric rather than symbolic.',
    ],
    exactVsNumeric: [
      'Exact pi-based radian output is preferred for supported special-angle conversions.',
      'General conversions fall back to decimal output when needed.',
    ],
    relatedArticleIds: ['trig-functions', 'trig-equations'],
  },
  {
    id: 'statistics-descriptive',
    domainId: 'statistics',
    title: 'Descriptive Statistics',
    summary: 'Use Statistics for dataset entry, descriptive summaries, and hybrid dataset or frequency-table workflows.',
    concepts: [
      'Data Entry stores a reusable list of numeric values for the current statistics session.',
      'Descriptive can evaluate either the raw dataset or a manual value-frequency table.',
      'Frequency works with grouped counts from the dataset or from rows you edit directly.',
      'The top Statistics editor is the canonical request surface, while the dataset and table controls below it are guided builders.',
    ],
    whereToFindIt: [
      'Menu > Data > Statistics',
      'Statistics > Data Entry',
      'Statistics > Descriptive',
      'Statistics > Frequency',
    ],
    bestModes: ['statistics'],
    symbols: [],
    examples: [
      {
        id: 'statistics-descriptive-home',
        title: 'Open Statistics descriptive tools',
        explanation: 'Statistics now has a dedicated top-level home with a reusable dataset workflow.',
        expected: 'The example opens Statistics > Descriptive.',
        launch: {
          kind: 'open-tool',
          targetMode: 'statistics',
          statisticsScreen: 'descriptive',
          label: 'Open in Statistics',
        },
      },
    ],
    pitfalls: [
      'Dataset and frequency-table views do not live-sync automatically after manual edits; use the explicit import or expand actions when you want to switch representations.',
      'Descriptive output now includes both population spread and sample spread so inference can reuse the same source safely.',
    ],
    exactVsNumeric: [
      'These workflows are numeric and summary-driven rather than symbolic.',
    ],
    relatedArticleIds: ['statistics-probability', 'statistics-inference', 'statistics-regression'],
  },
  {
    id: 'statistics-probability',
    domainId: 'statistics',
    title: 'Probability and Distributions',
    summary: 'Use Statistics > Probability for bounded binomial, normal, and Poisson workflows.',
    concepts: [
      'Binomial supports PMF and CDF from n, p, and x.',
      'Normal supports bounded PDF and CDF from mean, standard deviation, and x.',
      'Poisson supports PMF and CDF from lambda and x.',
      'These are numeric distribution tools, not symbolic probability manipulation.',
    ],
    whereToFindIt: [
      'Menu > Data > Statistics',
      'Statistics > Probability',
    ],
    bestModes: ['statistics'],
    symbols: [],
    examples: [
      {
        id: 'statistics-probability-binomial',
        title: 'Open the Binomial tool',
        explanation: 'The bounded binomial workflow evaluates PMF or CDF from n, p, and x.',
        expected: 'The example opens Statistics > Probability > Binomial.',
        launch: {
          kind: 'open-tool',
          targetMode: 'statistics',
          statisticsScreen: 'binomial',
          label: 'Open in Statistics',
        },
      },
    ],
    pitfalls: [
      'This first pass focuses on one-point PDF or CDF style requests rather than interval or inverse workflows.',
    ],
    relatedArticleIds: ['statistics-descriptive', 'statistics-inference'],
  },
  {
    id: 'statistics-inference',
    domainId: 'statistics',
    title: 'Inference and Mean t Tools',
    summary: 'Use Statistics > Inference > Mean for one-sample mean confidence intervals and two-sided t tests from the active dataset or frequency table.',
    concepts: [
      'Inference adds a bounded one-sample mean workflow on top of the existing dataset and frequency-table sources.',
      'This milestone is t-first: it uses sample standard deviation, requires n at least 2, and does not add a known-sigma z branch.',
      'The guided builder can use either the dataset or the manual frequency table, but source sync stays explicit rather than live.',
      'Mean inference requests stay structured so replay and history remain self-describing.',
    ],
    whereToFindIt: [
      'Menu > Data > Statistics',
      'Statistics > Inference',
      'Statistics > Inference > Mean',
    ],
    bestModes: ['statistics'],
    symbols: [],
    examples: [
      {
        id: 'statistics-inference-mean',
        title: 'Open mean inference',
        explanation: 'The first inferential tool covers one-sample mean confidence intervals and two-sided t tests.',
        expected: 'The example opens Statistics > Inference > Mean.',
        launch: {
          kind: 'open-tool',
          targetMode: 'statistics',
          statisticsScreen: 'meanInference',
          label: 'Open in Statistics',
        },
      },
    ],
    pitfalls: [
      'This pass does not add one-proportion tests, categorical workflows, or regression inference.',
      'Mean inference only accepts structured requests such as meanInference(values={12,15,18}, mode=ci, level=0.95).',
    ],
    relatedArticleIds: ['statistics-descriptive', 'statistics-probability'],
  },
  {
    id: 'statistics-regression',
    domainId: 'statistics',
    title: 'Regression and Correlation',
    summary: 'Use Statistics for bounded linear regression and Pearson correlation from point sets, with quality summaries for fit strength and residual size.',
    concepts: [
      'Regression fits a least-squares line and reports slope, intercept, r, r^2, point count, SSE, and residual-size diagnostics.',
      'Correlation reports Pearson r, r^2, point count, and a bounded quality summary tied to sample size and strength.',
      'Both tools use the shared top Statistics editor while the point rows below it stay as guided builders.',
      'Correlation strength describes linear association in this sample; it does not prove causation.',
    ],
    whereToFindIt: [
      'Menu > Data > Statistics',
      'Statistics > Regression',
      'Statistics > Correlation',
    ],
    bestModes: ['statistics'],
    symbols: [],
    examples: [
      {
        id: 'statistics-regression-open',
        title: 'Open the Regression tool',
        explanation: 'Regression works from a bounded point-set workflow.',
        expected: 'The example opens Statistics > Regression.',
        launch: {
          kind: 'open-tool',
          targetMode: 'statistics',
          statisticsScreen: 'regression',
          label: 'Open in Statistics',
        },
      },
    ],
    pitfalls: [
      'This pass is linear-only and correlation-only; it does not add multivariable regression or deeper inferential regression workflows.',
      'Small samples can make a line look cleaner than it really is, so read the quality summary before trusting the fit.',
      'Correlation strength is not causation and is not a prediction guarantee.',
    ],
    relatedArticleIds: ['statistics-descriptive', 'statistics-inference'],
  },
  {
    id: 'geometry-shapes-2d',
    domainId: 'geometry',
    title: '2D Shapes',
    summary: 'Use Geometry > 2D Shapes for square and rectangle area, perimeter, and diagonal workflows.',
    concepts: [
      'Square needs one side length and returns area, perimeter, and diagonal.',
      'Rectangle needs width and height and returns area, perimeter, and diagonal.',
      'These are formula-first numeric workbenches rather than sketching or theorem tools.',
    ],
    whereToFindIt: [
      'Menu > Shape Math > Geometry',
      'Geometry > 2D Shapes',
    ],
    bestModes: ['geometry'],
    symbols: ['symbol-geometry-area', 'symbol-geometry-perimeter'],
    examples: [
      {
        id: 'geometry-square',
        title: 'Solve a square from one side',
        explanation: 'This returns area, perimeter, and diagonal from side length.',
        expected: 'The example opens Geometry > Square with a side length ready to evaluate.',
        launch: {
          kind: 'open-tool',
          targetMode: 'geometry',
          geometryScreen: 'square',
          geometrySeed: {
            side: '4',
          },
          label: 'Open in Geometry',
        },
      },
      {
        id: 'geometry-rectangle',
        title: 'Solve a rectangle',
        explanation: 'Rectangle returns area, perimeter, and diagonal from width and height.',
        expected: 'The example opens Geometry > Rectangle with width and height prefilled.',
        launch: {
          kind: 'open-tool',
          targetMode: 'geometry',
          geometryScreen: 'rectangle',
          geometrySeed: {
            width: '8',
            height: '5',
          },
          label: 'Open in Geometry',
        },
      },
    ],
    pitfalls: [
      'The first release is formula-first and does not include freehand sketching or proof tools.',
    ],
    exactVsNumeric: [
      'These tools are numeric and formula-driven in the first release.',
    ],
    relatedArticleIds: ['geometry-triangles', 'geometry-circles'],
  },
  {
    id: 'geometry-solids-3d',
    domainId: 'geometry',
    title: '3D Solids',
    summary: 'Use Geometry > 3D Solids for cube, cuboid, cylinder, cone, and sphere formulas.',
    concepts: [
      'Each solid tool is numeric and formula-driven.',
      'You can stay in the guided form or edit the structured Geometry request in the top editor.',
      'Cone accepts a radius plus either a height or a slant-height pairing that satisfies the cone relation.',
      'Solve-missing templates cover bounded inverse workflows for cone and cuboid with explicit one-unknown rules.',
    ],
    whereToFindIt: [
      'Menu > Shape Math > Geometry',
      'Geometry > 3D Solids',
    ],
    bestModes: ['geometry'],
    symbols: ['symbol-geometry-volume'],
    examples: [
      {
        id: 'geometry-cylinder',
        title: 'Solve a cylinder',
        explanation: 'Cylinder returns volume plus curved and total surface area.',
        expected: 'The example opens Geometry > Cylinder with radius and height filled in.',
        launch: {
          kind: 'open-tool',
          targetMode: 'geometry',
          geometryScreen: 'cylinder',
          geometrySeed: {
            radius: '3',
            height: '8',
          },
          label: 'Open in Geometry',
        },
      },
      {
        id: 'geometry-cone',
        title: 'Solve a cone',
        explanation: 'Cone uses radius and a valid height/slant pair to compute volume and total surface area.',
        expected: 'The example opens Geometry > Cone with a 3-4-5 style setup.',
        launch: {
          kind: 'open-tool',
          targetMode: 'geometry',
          geometryScreen: 'cone',
          geometrySeed: {
            radius: '3',
            height: '4',
            slantHeight: '5',
          },
          label: 'Open in Geometry',
        },
      },
    ],
    pitfalls: [
      'These tools do not attempt symbolic solid geometry or CAD-style modeling.',
    ],
    exactVsNumeric: [
      'Outputs are numeric formulas in the first release.',
    ],
    relatedArticleIds: ['geometry-shapes-2d'],
  },
  {
    id: 'geometry-triangles',
    domainId: 'geometry',
    title: 'Triangle Formulas',
    summary: 'Use Geometry > Triangles for direct base-height area or Heron-formula area from three sides.',
    concepts: [
      'Triangle Area expects base and perpendicular height.',
      'Heron expects three sides that satisfy the triangle inequality.',
      'You can keep the guided form or edit the structured Geometry request in the top editor.',
      'Heron solve-missing supports one unknown side plus area and can return one or two real branches.',
      'For trig-linked triangle solving, use the dedicated Trigonometry app instead of these area-only tools.',
    ],
    whereToFindIt: [
      'Menu > Shape Math > Geometry',
      'Geometry > Triangles',
    ],
    bestModes: ['geometry', 'trigonometry'],
    symbols: ['symbol-geometry-area', 'symbol-heron'],
    examples: [
      {
        id: 'geometry-triangle-area',
        title: 'Solve triangle area from base and height',
        explanation: 'This is the direct area formula workflow.',
        expected: 'The example opens Geometry > Triangle Area with a numeric case loaded.',
        launch: {
          kind: 'open-tool',
          targetMode: 'geometry',
          geometryScreen: 'triangleArea',
          geometrySeed: {
            base: '10',
            height: '6',
          },
          label: 'Open in Geometry',
        },
      },
      {
        id: 'geometry-heron',
        title: 'Use Heron\'s formula',
        explanation: 'This computes triangle area from three side lengths.',
        expected: 'The example opens Geometry > Heron with 5, 6, and 7 prefilled.',
        launch: {
          kind: 'open-tool',
          targetMode: 'geometry',
          geometryScreen: 'triangleHeron',
          geometrySeed: {
            a: '5',
            b: '6',
            c: '7',
          },
          label: 'Open in Geometry',
        },
      },
    ],
    pitfalls: [
      'These triangle tools are area-only. Use Trigonometry for sine rule, cosine rule, and right-triangle solving.',
    ],
    exactVsNumeric: [
      'Outputs are numeric and formula-driven.',
    ],
    relatedArticleIds: ['geometry-shapes-2d', 'trig-triangles'],
  },
  {
    id: 'geometry-circles',
    domainId: 'geometry',
    title: 'Circles, Arcs, and Sectors',
    summary: 'Use Geometry > Circles for circle area/circumference and arc-sector workflows.',
    concepts: [
      'Circle returns diameter, circumference, and area from radius.',
      'Arc and Sector uses radius plus a central angle with degree, radian, or grad input.',
      'Arc/Sector solve-missing supports one unknown (radius or angle) from exactly one known relation (arc or sector).',
    ],
    whereToFindIt: [
      'Menu > Shape Math > Geometry',
      'Geometry > Circles',
    ],
    bestModes: ['geometry'],
    symbols: ['symbol-circle-area', 'symbol-circumference'],
    examples: [
      {
        id: 'geometry-circle',
        title: 'Solve a circle from radius',
        explanation: 'This returns diameter, circumference, and area from one radius.',
        expected: 'The example opens Geometry > Circle with a radius prefilled.',
        launch: {
          kind: 'open-tool',
          targetMode: 'geometry',
          geometryScreen: 'circle',
          geometrySeed: {
            radius: '3',
          },
          label: 'Open in Geometry',
        },
      },
      {
        id: 'geometry-sector',
        title: 'Solve an arc and sector',
        explanation: 'This uses radius and central angle to compute arc length and sector area.',
        expected: 'The example opens Geometry > Arc and Sector with a 60-degree case.',
        launch: {
          kind: 'open-tool',
          targetMode: 'geometry',
          geometryScreen: 'arcSector',
          geometrySeed: {
            radius: '4',
            angle: '60',
            angleUnit: 'deg',
          },
          label: 'Open in Geometry',
        },
      },
    ],
    pitfalls: [
      'Arc and sector tools are numeric workbenches, not symbolic circle-theorem solvers.',
    ],
    exactVsNumeric: [
      'Outputs are numeric in the first release, even when the input angle is a special angle.',
    ],
    relatedArticleIds: ['geometry-shapes-2d'],
  },
  {
    id: 'geometry-coordinate',
    domainId: 'geometry',
    title: 'Coordinate Geometry',
    summary: 'Use Geometry > Coordinate Geometry for distance, midpoint, slope, and line-equation workflows.',
    concepts: [
      'Distance and midpoint use two points directly.',
      'Slope reports undefined for vertical lines.',
      'Line Equation builds slope-intercept, point-slope, or standard form from two distinct points.',
      'Line Equation solve-missing accepts one unknown coordinate plus exactly one constraint (slope, distance, or midpoint).',
    ],
    whereToFindIt: [
      'Menu > Shape Math > Geometry',
      'Geometry > Coordinate Geometry',
    ],
    bestModes: ['geometry'],
    symbols: ['symbol-point', 'symbol-distance', 'symbol-midpoint', 'symbol-slope', 'symbol-line-standard'],
    examples: [
      {
        id: 'geometry-distance',
        title: 'Find a distance between two points',
        explanation: 'Distance uses the standard coordinate-distance formula.',
        expected: 'The example opens Geometry > Distance with a 3-4-5 point pair.',
        launch: {
          kind: 'open-tool',
          targetMode: 'geometry',
          geometryScreen: 'distance',
          geometrySeed: {
            p1: { x: '0', y: '0' },
            p2: { x: '3', y: '4' },
          },
          label: 'Open in Geometry',
        },
      },
      {
        id: 'geometry-line',
        title: 'Build a line equation',
        explanation: 'Line Equation converts two points into the selected line form.',
        expected: 'The example opens Geometry > Line Equation with two points and a slope-intercept target form.',
        launch: {
          kind: 'open-tool',
          targetMode: 'geometry',
          geometryScreen: 'lineEquation',
          geometrySeed: {
            p1: { x: '1', y: '2' },
            p2: { x: '3', y: '6' },
            form: 'slope-intercept',
          },
          label: 'Open in Geometry',
        },
      },
    ],
    pitfalls: [
      'Two identical points do not define a line.',
      'Vertical lines are reported as x = constant instead of forcing an invalid finite-slope form.',
      'For lineEquation solve-missing handoff, Equation mode uses x as a placeholder and reports which coordinate it represents.',
    ],
    exactVsNumeric: [
      'Coordinate tools are numeric and notation-driven rather than symbolic-proof workflows.',
    ],
    relatedArticleIds: ['geometry-triangles'],
  },
];

export const GUIDE_ARTICLES: GuideArticle[] = GUIDE_ARTICLE_DRAFTS.map(defineGuideArticle);

export const GUIDE_MODE_REFS: GuideModeRef[] = [
  {
    modeId: 'calculate',
    title: 'Calculate',
    summary: 'Use Calculate for everyday algebra, direct expression evaluation, discrete operators, and the entry-level Calculus workbench.',
    bestFor: [
      'Simplify, factor, expand, numeric evaluation',
      'Discrete sums/products/factorials and combinatorics',
      'Direct textbook expressions and quick symbolic manipulation',
      'Core Calculus tools when you want the simpler derivative / integral / limit workflow',
    ],
    avoidFor: [
      'Top-level equation solving with =',
      'Simultaneous systems',
      'Harder advanced-calculus tasks better suited to Advanced Calc',
    ],
    articleIds: ['basics-keyboard', 'algebra-manipulation', 'discrete-operators', 'calculus-derivatives', 'calculus-integrals-limits'],
  },
  {
    modeId: 'equation',
    title: 'Equation',
    summary: 'Best for symbolic equations, guided polynomial solving, and simultaneous systems.',
    bestFor: [
      'Symbolic equations in x',
      'Quadratic, cubic, and quartic guided flows',
      '2x2 and 3x3 simultaneous systems',
    ],
    avoidFor: [
      'General direct numeric calculation that does not involve solving',
    ],
    articleIds: ['algebra-equations'],
  },
  {
    modeId: 'matrix',
    title: 'Matrix',
    summary: 'Use Matrix for actual numeric matrix operations; use the notation pad only for drafting and copy/reuse.',
    bestFor: [
      'A+B, A-B, A×B',
      'det(A), inverse, transpose',
    ],
    avoidFor: [
      'General symbolic algebra',
      'Free-form equation solving',
      'Assuming the notation pad is full symbolic matrix CAS',
    ],
    articleIds: ['linear-algebra-matrix-vector'],
  },
  {
    modeId: 'vector',
    title: 'Vector',
    summary: 'Use Vector for actual numeric vector operations; use the notation pad for drafting and copy/reuse.',
    bestFor: [
      'Dot product, cross product, norms, and angle',
      'Reusing Vector A and B inside structured notation',
    ],
    avoidFor: [
      'General symbolic algebra',
      'Matrix workflows',
      'Treating the notation pad as full free-form symbolic vector CAS',
    ],
    articleIds: ['linear-algebra-matrix-vector'],
  },
  {
    modeId: 'table',
    title: 'Table',
    summary: 'Use Table when you want sampled values over a range instead of one-off evaluation.',
    bestFor: [
      'Function tables over start/end/step ranges',
      'Comparing f(x) and optional g(x)',
    ],
    avoidFor: [
      'Equation solving',
      'General algebra transformations',
    ],
    articleIds: ['calculus-derivatives', 'calculus-integrals-limits'],
  },
  {
    modeId: 'advancedCalculus',
    title: 'Advanced Calc',
    summary: 'Use Advanced Calc for harder single-variable calculus, stronger limits, series work, and guided ODE workflows.',
    bestFor: [
      'Single-variable advanced integrals and improper integrals',
      'Finite and infinite-target limits',
      'Maclaurin and Taylor series',
      'First-order partial derivatives in x, y, or z',
      'Guided ODE workflows',
    ],
    avoidFor: [
      'Everyday arithmetic and light algebra',
      'General multivariable calculus',
      'Tasks that fit the simpler core Calculus page',
    ],
    articleIds: ['advanced-integrals', 'advanced-limits', 'advanced-series', 'advanced-partials', 'advanced-odes'],
  },
  {
    modeId: 'trigonometry',
    title: 'Trigonometry',
    summary: 'Use Trigonometry for trig functions, identities, equations, triangles, and angle conversion.',
    bestFor: [
      'Exact special-angle trig values and inverse trig principal values',
      'Bounded identity simplification and conversion',
      'Trig equations in x with periodic-family notes',
      'Right triangles, sine rule, cosine rule, and angle conversion',
    ],
    avoidFor: [
      'Graphing or unit-circle visualization',
      'Hyperbolic or complex trig in the first release',
      'General symbolic theorem proving',
    ],
    articleIds: ['trig-functions', 'trig-identities', 'trig-equations', 'trig-triangles', 'trig-special-angles'],
  },
  {
    modeId: 'statistics',
    title: 'Statistics',
    summary: 'Use Statistics for dataset entry, descriptive summaries, frequency tables, bounded probability tools, first-pass mean inference, and point-set regression or correlation.',
    bestFor: [
      'Reusable pasted datasets',
      'Descriptive summaries such as mean, median, spread, and standard deviation',
      'Frequency summaries from repeated values',
      'One-sample mean confidence intervals and two-sided t tests',
      'Probability and regression tools under one app shell',
    ],
    avoidFor: [
      'Symbolic algebra or equation solving',
      'Graphing-oriented data exploration',
      'Categorical statistics or broader inferential-statistics workflows in the first pass',
    ],
    articleIds: ['statistics-descriptive', 'statistics-probability', 'statistics-inference', 'statistics-regression'],
  },
  {
    modeId: 'geometry',
    title: 'Geometry',
    summary: 'Use Geometry for formula-first shapes, circle work, triangle area tools, and coordinate geometry.',
    bestFor: [
      '2D shapes such as squares and rectangles',
      '3D solids such as cylinders, cones, and spheres',
      'Triangle area and Heron-formula workflows',
      'Distance, midpoint, slope, and line equations from points',
    ],
    avoidFor: [
      'Symbolic proof work or theorem-heavy geometry',
      'Trig triangle solving better handled in Trigonometry',
      'Graphing or sketch-based CAD workflows',
    ],
    articleIds: ['geometry-shapes-2d', 'geometry-solids-3d', 'geometry-triangles', 'geometry-circles', 'geometry-coordinate'],
  },
];

export function getGuideArticle(articleId: string) {
  return GUIDE_ARTICLES.find((article) => article.id === articleId);
}

export function getGuideArticlesForDomain(domainId: GuideArticle['domainId']) {
  return GUIDE_ARTICLES.filter((article) => article.domainId === domainId);
}

export function getGuideModeRef(modeId: Exclude<ModeId, 'guide'>) {
  return GUIDE_MODE_REFS.find((mode) => mode.modeId === modeId);
}

export function getGuideHomeEntries(enabledCapabilities: readonly CapabilityId[]): GuideHomeEntry[] {
  const activeDomains = getActiveGuideDomains(enabledCapabilities);
  const domainEntries = activeDomains.map((domain, index) => ({
    id: domain.id,
    hotkey: `${index + 1}`,
    title: domain.title,
    description: domain.summary,
  }));

  return [
    ...domainEntries,
    {
      id: 'symbolLookup',
      hotkey: `${domainEntries.length + 1}`,
      title: 'Symbol Lookup',
      description: 'Search active symbols, operators, and keyboard pages.',
    },
    {
      id: 'modeGuide',
      hotkey: `${domainEntries.length + 2}`,
      title: 'Mode Guide',
      description: 'Learn when to use each active math app, including Advanced Calc, Trigonometry, Statistics, and Geometry.',
    },
  ];
}

export const getActiveGuideHomeEntries = getGuideHomeEntries;
export { getActiveGuideDomains };

export function getGuideArticlesForMode(modeId: Exclude<ModeId, 'guide'>) {
  const articleIds = getGuideModeRef(modeId)?.articleIds ?? [];
  return articleIds
    .map((articleId) => getGuideArticle(articleId))
    .filter((article): article is GuideArticle => Boolean(article));
}

export function getActiveGuideArticles(enabledCapabilities: readonly CapabilityId[]) {
  const activeDomainIds = new Set(
    getActiveGuideDomains(enabledCapabilities).map((domain) => domain.id),
  );

  return GUIDE_ARTICLES.filter((article) => activeDomainIds.has(article.domainId));
}

export function getActiveGuideModeRefs(enabledCapabilities: readonly CapabilityId[]) {
  const activeArticleIds = new Set(getActiveGuideArticles(enabledCapabilities).map((article) => article.id));
  return GUIDE_MODE_REFS.map((mode) => ({
    ...mode,
    articleIds: mode.articleIds.filter((articleId) => activeArticleIds.has(articleId)),
  }));
}

export function getDomainTitle(domainId: GuideArticle['domainId']) {
  return GUIDE_DOMAINS.find((domain) => domain.id === domainId)?.title ?? domainId;
}

export function guideArticleIsActive(article: GuideArticle, enabledCapabilities: readonly CapabilityId[]) {
  return enabledCapabilities.includes(GUIDE_DOMAIN_CAPABILITY[article.domainId]);
}

