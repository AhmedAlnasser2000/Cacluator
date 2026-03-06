import { MathEditor } from '../../components/MathEditor';
import { SignedNumberInput } from '../../components/SignedNumberInput';
import type { MathfieldElement } from 'mathlive';
import type { VirtualKeyboardLayout } from 'mathlive';
import type { MutableRefObject, RefObject } from 'react';
import type { MatrixNotationPreset } from '../../lib/linear-algebra-workbench';

type MatrixWorkspaceProps = {
  matrixA: number[][];
  matrixB: number[][];
  matrixNotationLatex: string;
  matrixKeyboardLayouts: readonly VirtualKeyboardLayout[];
  matrixNotationFieldRef: RefObject<MathfieldElement | null>;
  activeFieldRef: MutableRefObject<MathfieldElement | null>;
  onOpenGuideMode: (mode: 'matrix') => void;
  onOpenGuideArticle: (articleId: string) => void;
  onSetMatrixCell: (matrixId: 'A' | 'B', row: number, column: number, value: number) => void;
  onLoadMatrixNotationPreset: (preset: MatrixNotationPreset) => void;
  onCopyText: (text: string, message: string) => Promise<void>;
  onSetMatrixNotationLatex: (latex: string) => void;
};

function MatrixWorkspace({
  matrixA,
  matrixB,
  matrixNotationLatex,
  matrixKeyboardLayouts,
  matrixNotationFieldRef,
  activeFieldRef,
  onOpenGuideMode,
  onOpenGuideArticle,
  onSetMatrixCell,
  onLoadMatrixNotationPreset,
  onCopyText,
  onSetMatrixNotationLatex,
}: MatrixWorkspaceProps) {
  return (
    <section className="mode-panel">
      <div className="linear-algebra-panel-header">
        <div className="linear-algebra-panel-copy">
          <strong>Matrix Workspace</strong>
          <p>
            Run matrix operations with the numeric grids below. Use the notation pad for
            structured templates, copying, and drafting expressions.
          </p>
        </div>
        <div className="linear-algebra-badge-row">
          <span className="equation-badge">Operational mode</span>
          <span className="equation-origin-badge">MatrixVec keyboard</span>
        </div>
      </div>
      <div className="guide-related-links">
        <button className="guide-chip" onClick={() => onOpenGuideMode('matrix')}>Guide: Matrix mode</button>
        <button className="guide-chip" onClick={() => onOpenGuideArticle('linear-algebra-matrix-vector')}>Guide: Linear Algebra</button>
      </div>
      <div className="grid-two">
        <div className="editor-card">
          <strong>Matrix A</strong>
          <div className="matrix-grid" data-columns={2}>
            {matrixA.map((row, rowIndex) =>
              row.map((value, columnIndex) => (
                <SignedNumberInput key={`ma-${rowIndex}-${columnIndex}`} value={value} onValueChange={(nextValue) => onSetMatrixCell('A', rowIndex, columnIndex, nextValue)} />
              )),
            )}
          </div>
        </div>
        <div className="editor-card">
          <strong>Matrix B</strong>
          <div className="matrix-grid" data-columns={2}>
            {matrixB.map((row, rowIndex) =>
              row.map((value, columnIndex) => (
                <SignedNumberInput key={`mb-${rowIndex}-${columnIndex}`} value={value} onValueChange={(nextValue) => onSetMatrixCell('B', rowIndex, columnIndex, nextValue)} />
              )),
            )}
          </div>
        </div>
      </div>
      <div className="grid-two linear-algebra-info-grid">
        <div className="editor-card linear-algebra-info-card">
          <div className="card-title-row">
            <strong>Runs Here</strong>
            <span className="equation-badge">Executable</span>
          </div>
          <ul className="guide-bullets">
            <li>Add, subtract, multiply, transpose, determinant, and inverse.</li>
            <li>Matrix A and Matrix B stay numeric and directly feed the soft-key operations.</li>
          </ul>
        </div>
        <div className="editor-card linear-algebra-info-card">
          <div className="card-title-row">
            <strong>Notation Pad</strong>
            <span className="equation-origin-badge">Template-only</span>
          </div>
          <ul className="guide-bullets">
            <li>Use it to draft matrix notation, copy expressions, and reuse the current A/B values.</li>
            <li>It does not turn Calculate into a full free-form symbolic matrix CAS.</li>
          </ul>
        </div>
      </div>
      <div className="editor-card notation-pad-card">
        <div className="card-title-row">
          <strong>Matrix Notation Pad</strong>
          <span className="equation-badge">Template-only</span>
        </div>
        <div className="quick-template-grid">
          <button onClick={() => onLoadMatrixNotationPreset('matrixA')}>Use A</button>
          <button onClick={() => onLoadMatrixNotationPreset('matrixB')}>Use B</button>
          <button onClick={() => onLoadMatrixNotationPreset('add')}>A+B</button>
          <button onClick={() => onLoadMatrixNotationPreset('multiply')}>AB</button>
          <button onClick={() => onLoadMatrixNotationPreset('detA')}>det(A)</button>
          <button onClick={() => onLoadMatrixNotationPreset('transposeA')}>Aᵀ</button>
          <button onClick={() => onLoadMatrixNotationPreset('inverseA')}>A⁻¹</button>
          <button onClick={() => void onCopyText(matrixNotationLatex, 'Matrix notation copied')}>Copy Pad</button>
        </div>
        <MathEditor
          ref={matrixNotationFieldRef}
          className="secondary-mathfield"
          value={matrixNotationLatex}
          onChange={onSetMatrixNotationLatex}
          modeId="matrix"
          screenHint="matrix"
          keyboardLayouts={matrixKeyboardLayouts}
          onFocus={(field) => {
            activeFieldRef.current = field;
          }}
          placeholder="Use MatrixVec templates here"
        />
        <div className="notation-pad-footer">
          <p className="equation-hint">Use Matrix mode for operations. The notation pad is for structured template entry and copying, not full free-form matrix CAS.</p>
          <button className="guide-chip" onClick={() => onSetMatrixNotationLatex('')}>Clear Pad</button>
        </div>
      </div>
    </section>
  );
}

export { MatrixWorkspace };
