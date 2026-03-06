/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MatrixOperation, NumericSolveInterval, VectorOperation } from '../../types/calculator';

export function createModeActionHandlers(deps: any) {
  const {
    isCalculateToolOpen,
    calculateRouteMeta,
    calculateWorkbenchExpression,
    calculateScreen,
    integralWorkbench,
    limitWorkbench,
    setDisplayOutcome,
    startTransition,
    runCalculateMode,
    settings,
    ansLatex,
    commitOutcome,
    retitleOutcome,
    trigLeafScreenForContext,
    trigScreen,
    isTrigDraftFocused,
    isTrigMenuOpen,
    trigRouteMeta,
    buildTrigDraftForScreen,
    trigDraftState,
    setTrigDraftState,
    trigDraftStateForScreen,
    trigDraftStyle,
    serializeTrigRequest,
    trigIdentityState,
    runTrigonometryCoreDraft,
    trigRequestToScreen,
    isStatisticsDraftFocused,
    isStatisticsMenuOpen,
    statisticsLeafScreenForContext,
    statisticsScreen,
    statisticsRouteMeta,
    buildStatisticsDraftForScreen,
    statisticsDraftState,
    setStatisticsDraftState,
    statisticsDraftStateForScreen,
    runStatisticsCoreDraft,
    statisticsWorkingSource,
    statisticsRequestToWorkingSource,
    setStatisticsWorkingSource,
    statisticsRequestToScreen,
    isGeometryMenuOpen,
    isGeometryDraftFocused,
    geometryDraftState,
    buildGeometryDraftForScreen,
    geometryScreen,
    geometryRouteMeta,
    setGeometryDraftState,
    geometryDraftStateForScreen,
    runGeometryCoreDraft,
    runEquationMode,
    equationScreen,
    equationLatex,
    quadraticCoefficients,
    cubicCoefficients,
    quarticCoefficients,
    system2,
    system3,
    isSimultaneousEquationScreen,
    equationInputLatex,
    equationNumericSolvePanel,
    currentMode,
    displayOutcome,
    advancedCalcWorkbenchExpression,
    advancedCalcRouteMeta,
    isAdvancedCalcMenuOpen,
    runAdvancedCalcMode,
    advancedCalcScreen,
    advancedIndefiniteIntegral,
    advancedDefiniteIntegral,
    advancedImproperIntegral,
    advancedFiniteLimit,
    advancedInfiniteLimit,
    maclaurinState,
    taylorState,
    partialDerivativeState,
    firstOrderOdeState,
    secondOrderOdeState,
    numericIvpState,
    runMatrixMode,
    matrixA,
    matrixB,
    runVectorMode,
    vectorA,
    vectorB,
    runTableMode,
    tablePrimaryLatex,
    tableSecondaryLatex,
    tableSecondaryEnabled,
    tableStart,
    tableEnd,
    tableStep,
    setTableResponse,
    switchToEquationWithLatex,
  } = deps;

function runCalculateWorkbenchAction() {
  if (!isCalculateToolOpen || !calculateRouteMeta) {
    return;
  }

  const generated = calculateWorkbenchExpression.latex.trim();
  if (!generated) {
    const screenTitle =
      calculateScreen === 'derivativePoint'
        ? 'Derivative at Point'
        : calculateRouteMeta.label;
    const error =
      calculateScreen === 'derivative'
        ? 'Enter an expression in x before differentiating.'
        : calculateScreen === 'derivativePoint'
          ? 'Enter an expression in x and a numeric point before evaluating the derivative.'
          : calculateScreen === 'integral'
            ? integralWorkbench.kind === 'indefinite'
              ? 'Enter an integrand in x before evaluating the integral.'
              : 'Enter an integrand in x and numeric bounds before evaluating the integral.'
            : limitWorkbench.targetKind === 'finite'
              ? 'Enter an expression in x and a numeric target before evaluating the limit.'
              : 'Enter an expression in x before evaluating the limit at infinity.';
    setDisplayOutcome({
      kind: 'error',
      title: screenTitle,
      error,
      warnings: [],
    });
    return;
  }

  startTransition(() => {
    const outcome = runCalculateMode({
      action: 'evaluate',
      latex: generated,
      angleUnit: settings.angleUnit,
      outputStyle: settings.outputStyle,
      ansLatex,
      limitDirection: calculateWorkbenchExpression.limitDirection,
      limitTargetKind:
        calculateScreen === 'limit' ? limitWorkbench.targetKind : undefined,
    });

    commitOutcome(retitleOutcome(outcome, calculateRouteMeta.label), generated, 'calculate');
  });
}

function runTrigAction() {
  const screenHint = trigLeafScreenForContext(trigScreen);
  const editorFocused = isTrigDraftFocused();

  if (isTrigMenuOpen && !editorFocused) {
    return;
  }

  startTransition(() => {
    const inputLatex =
      !isTrigMenuOpen && trigRouteMeta?.focusTarget === 'guidedForm' && !editorFocused
        ? buildTrigDraftForScreen(trigScreen).trim()
        : trigDraftState.rawLatex.trim();

    if (!inputLatex) {
      setDisplayOutcome({
        kind: 'error',
        title: trigRouteMeta?.label ?? 'Trigonometry',
        error: 'Enter a Trigonometry request or use a guided trig tool before evaluating.',
        warnings: [],
      });
      return;
    }

    if (!editorFocused || trigDraftState.rawLatex.trim() !== inputLatex) {
      setTrigDraftState(trigDraftStateForScreen(screenHint, inputLatex, 'guided'));
    }

    const executionLatex =
      screenHint === 'identityConvert' && trigDraftStyle(inputLatex) !== 'structured'
        ? serializeTrigRequest({
            kind: 'identityConvert',
            expressionLatex: inputLatex,
            targetForm: trigIdentityState.targetForm,
          })
        : inputLatex;

    const { outcome, parsed } = runTrigonometryCoreDraft(executionLatex, {
      screenHint,
      angleUnit: settings.angleUnit,
      identityTargetForm: trigIdentityState.targetForm,
    });

    const replayScreen = parsed.ok
      ? trigRequestToScreen(parsed.request, screenHint)
      : screenHint;

    commitOutcome(outcome, executionLatex, 'trigonometry', { trigScreen: replayScreen });
  });
}

function runStatisticsAction() {
  const editorFocused = isStatisticsDraftFocused();
  if (isStatisticsMenuOpen && !editorFocused) {
    return;
  }

  startTransition(() => {
    const screenHint = statisticsLeafScreenForContext(statisticsScreen);
    const inputLatex =
      !editorFocused && statisticsRouteMeta?.focusTarget === 'guidedForm'
        ? buildStatisticsDraftForScreen(screenHint)
        : statisticsDraftState.rawLatex.trim();

    if (!inputLatex) {
      setDisplayOutcome({
        kind: 'error',
        title: statisticsRouteMeta?.label ?? 'Statistics',
        error: 'Enter a Statistics request or use a guided statistics tool before evaluating.',
        warnings: [],
      });
      return;
    }

    if (!editorFocused || statisticsDraftState.rawLatex.trim() !== inputLatex) {
      setStatisticsDraftState(statisticsDraftStateForScreen(screenHint, inputLatex, 'guided'));
    }

    const { outcome, parsed } = runStatisticsCoreDraft(inputLatex, {
      screenHint,
      workingSourceHint: statisticsWorkingSource,
    });
    if (parsed.ok) {
      const nextSource = statisticsRequestToWorkingSource(parsed.request, statisticsWorkingSource);
      if (nextSource) {
        setStatisticsWorkingSource(nextSource);
      }
    }
    const replayScreen = parsed.ok
      ? statisticsRequestToScreen(parsed.request, screenHint)
      : screenHint;

    commitOutcome(outcome, inputLatex, 'statistics', { statisticsScreen: replayScreen });
  });
}

function runGeometryAction() {
  if (isGeometryMenuOpen && !isGeometryDraftFocused()) {
    return;
  }

  startTransition(() => {
    const inputLatex = isGeometryDraftFocused()
      ? geometryDraftState.rawLatex.trim()
      : buildGeometryDraftForScreen(geometryScreen);

    if (!inputLatex) {
      setDisplayOutcome({
        kind: 'error',
        title: geometryRouteMeta?.label ?? 'Geometry',
        error: 'Enter a Geometry request or use a guided tool before evaluating.',
        warnings: [],
      });
      return;
    }

    if (!isGeometryDraftFocused()) {
      setGeometryDraftState(
        geometryDraftStateForScreen(geometryScreen, inputLatex, 'guided'),
      );
    }

    const { outcome } = runGeometryCoreDraft(inputLatex, geometryScreen);
    commitOutcome(outcome, inputLatex, 'geometry');
  });
}

function runEquationAction() {
  startTransition(() => {
    const outcome = runEquationMode({
      equationScreen,
      equationLatex,
      quadraticCoefficients,
      cubicCoefficients,
      quarticCoefficients,
      system2,
      system3,
      angleUnit: settings.angleUnit,
      outputStyle: settings.outputStyle,
      ansLatex,
    });

    commitOutcome(
      outcome,
      isSimultaneousEquationScreen(equationScreen) ? 'linear-system' : equationInputLatex,
      'equation',
    );
  });
}

function runEquationNumericSolveAction() {
  if (equationScreen !== 'symbolic') {
    return;
  }

  startTransition(() => {
    const interval: NumericSolveInterval = {
      start: equationNumericSolvePanel.start,
      end: equationNumericSolvePanel.end,
      subdivisions: equationNumericSolvePanel.subdivisions,
    };

    const outcome = runEquationMode({
      equationScreen,
      equationLatex,
      quadraticCoefficients,
      cubicCoefficients,
      quarticCoefficients,
      system2,
      system3,
      angleUnit: settings.angleUnit,
      outputStyle: settings.outputStyle,
      ansLatex,
      numericInterval: interval,
    });

    commitOutcome(
      outcome,
      equationInputLatex,
      'equation',
      outcome.kind === 'success' && outcome.solveBadges?.includes('Numeric Interval')
        ? { numericInterval: interval }
        : {},
    );
  });
}

function shouldShowEquationNumericSolvePanel() {
  if (equationScreen !== 'symbolic') {
    return false;
  }

  if (!shouldAllowEquationNumericSolve()) {
    return false;
  }

  if (equationNumericSolvePanel.enabled) {
    return true;
  }

  if (currentMode !== 'equation' || displayOutcome?.kind !== 'error') {
    return false;
  }

  return ![
    'Enter an equation containing x.',
    'Equation mode solves for x.',
    'Equation mode currently solves only = equations.',
    'This equation contains an indefinite integral',
    'This equation requires a trig rewrite outside the supported pre-solve set',
  ].some((fragment) => displayOutcome.error.includes(fragment));
}

function shouldAllowEquationNumericSolve() {
  if (equationScreen !== 'symbolic') {
    return false;
  }

  if (currentMode !== 'equation' || !displayOutcome || displayOutcome.kind === 'prompt') {
    return true;
  }

  return !(displayOutcome.solveBadges ?? []).includes('Range Guard');
}

function runAdvancedCalcAction() {
  const generated = advancedCalcWorkbenchExpression.trim();
  if (!generated || !advancedCalcRouteMeta || isAdvancedCalcMenuOpen) {
    setDisplayOutcome({
      kind: 'error',
      title: advancedCalcRouteMeta?.label ?? 'Advanced Calc',
      error: advancedCalcRouteMeta
        ? `Fill the ${advancedCalcRouteMeta.label.toLowerCase()} inputs before evaluating.`
        : 'Choose an Advanced Calc tool before evaluating.',
      warnings: [],
    });
    return;
  }

  startTransition(() => {
    void runAdvancedCalcMode({
      screen: advancedCalcScreen,
      indefiniteIntegral: advancedIndefiniteIntegral,
      definiteIntegral: advancedDefiniteIntegral,
      improperIntegral: advancedImproperIntegral,
      finiteLimit: advancedFiniteLimit,
      infiniteLimit: advancedInfiniteLimit,
      maclaurin: maclaurinState,
      taylor: taylorState,
      partialDerivative: partialDerivativeState,
      firstOrderOde: firstOrderOdeState,
      secondOrderOde: secondOrderOdeState,
      numericIvp: numericIvpState,
    }).then((outcome) => {
      commitOutcome(outcome, generated, 'advancedCalculus');
    });
  });
}

function runMatrixAction(operation: MatrixOperation) {
  const outcome = runMatrixMode({ operation, matrixA, matrixB });
  commitOutcome(outcome, operation, 'matrix');
}

function runVectorAction(operation: VectorOperation) {
  const outcome = runVectorMode({
    operation,
    vectorA,
    vectorB,
    angleUnit: settings.angleUnit,
  });
  commitOutcome(outcome, operation, 'vector');
}

function runTableAction() {
  const result = runTableMode({
    primaryLatex: tablePrimaryLatex,
    secondaryLatex: tableSecondaryLatex,
    secondaryEnabled: tableSecondaryEnabled,
    start: tableStart,
    end: tableEnd,
    step: tableStep,
  });

  setTableResponse(result.response);
  commitOutcome(result.outcome, tablePrimaryLatex, 'table');
}

function openPromptTarget() {
  if (displayOutcome?.kind !== 'prompt' || displayOutcome.targetMode !== 'equation') {
    return;
  }

  switchToEquationWithLatex(displayOutcome.carryLatex);
}

return {
  runCalculateWorkbenchAction,
  runTrigAction,
  runStatisticsAction,
  runGeometryAction,
  runEquationAction,
  runEquationNumericSolveAction,
  shouldShowEquationNumericSolvePanel,
  shouldAllowEquationNumericSolve,
  runAdvancedCalcAction,
  runMatrixAction,
  runVectorAction,
  runTableAction,
  openPromptTarget,
};
}
