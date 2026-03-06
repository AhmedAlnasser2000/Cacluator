import { MathEditor } from '../../components/MathEditor';
import { SignedNumberInput } from '../../components/SignedNumberInput';
import type { MathfieldElement } from 'mathlive';
import type { VirtualKeyboardLayout } from 'mathlive';
import type { MutableRefObject, RefObject } from 'react';
import type { VectorNotationPreset } from '../../lib/linear-algebra-workbench';

type VectorWorkspaceProps = {
  vectorA: number[];
  vectorB: number[];
  vectorNotationLatex: string;
  vectorKeyboardLayouts: readonly VirtualKeyboardLayout[];
  vectorNotationFieldRef: RefObject<MathfieldElement | null>;
  activeFieldRef: MutableRefObject<MathfieldElement | null>;
  onOpenGuideMode: (mode: 'vector') => void;
  onOpenGuideArticle: (articleId: string) => void;
  onSetVectorCell: (vectorId: 'A' | 'B', index: number, value: number) => void;
  onLoadVectorNotationPreset: (preset: VectorNotationPreset) => void;
  onCopyText: (text: string, message: string) => Promise<void>;
  onSetVectorNotationLatex: (latex: string) => void;
};

function VectorWorkspace({
  vectorA,
  vectorB,
  vectorNotationLatex,
  vectorKeyboardLayouts,
  vectorNotationFieldRef,
  activeFieldRef,
  onOpenGuideMode,
  onOpenGuideArticle,
  onSetVectorCell,
  onLoadVectorNotationPreset,
  onCopyText,
  onSetVectorNotationLatex,
}: VectorWorkspaceProps) {
  return (
    <section className="mode-panel">
      <div className="linear-algebra-panel-header">
        <div className="linear-algebra-panel-copy">
          <strong>Vector Workspace</strong>
          <p>
            Run vector operations with the numeric inputs below. Use the notation pad for
            structured vector forms, operator drafting, and copying.
          </p>
        </div>
        <div className="linear-algebra-badge-row">
          <span className="equation-badge">Operational mode</span>
          <span className="equation-origin-badge">MatrixVec keyboard</span>
        </div>
      </div>
      <div className="guide-related-links">
        <button className="guide-chip" onClick={() => onOpenGuideMode('vector')}>Guide: Vector mode</button>
        <button className="guide-chip" onClick={() => onOpenGuideArticle('linear-algebra-matrix-vector')}>Guide: Linear Algebra</button>
      </div>
      <div className="grid-two">
        <div className="editor-card">
          <strong>Vector A</strong>
          <div className="vector-grid">
            {vectorA.map((value, index) => (
              <SignedNumberInput key={`va-${index}`} value={value} onValueChange={(nextValue) => onSetVectorCell('A', index, nextValue)} />
            ))}
          </div>
        </div>
        <div className="editor-card">
          <strong>Vector B</strong>
          <div className="vector-grid">
            {vectorB.map((value, index) => (
              <SignedNumberInput key={`vb-${index}`} value={value} onValueChange={(nextValue) => onSetVectorCell('B', index, nextValue)} />
            ))}
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
            <li>Dot, cross, norm, angle, addition, and subtraction run directly in Vector mode.</li>
            <li>Vector A and Vector B remain numeric inputs for the dedicated operations.</li>
          </ul>
        </div>
        <div className="editor-card linear-algebra-info-card">
          <div className="card-title-row">
            <strong>Notation Pad</strong>
            <span className="equation-origin-badge">Template-only</span>
          </div>
          <ul className="guide-bullets">
            <li>Draft vector notation, copy operator forms, and reuse the current A/B vectors.</li>
            <li>Free-form symbolic vector algebra is still out of scope for this milestone.</li>
          </ul>
        </div>
      </div>
      <div className="editor-card notation-pad-card">
        <div className="card-title-row">
          <strong>Vector Notation Pad</strong>
          <span className="equation-badge">Template-only</span>
        </div>
        <div className="quick-template-grid">
          <button onClick={() => onLoadVectorNotationPreset('vectorA')}>Use A</button>
          <button onClick={() => onLoadVectorNotationPreset('vectorB')}>Use B</button>
          <button onClick={() => onLoadVectorNotationPreset('add')}>A+B</button>
          <button onClick={() => onLoadVectorNotationPreset('dot')}>A·B</button>
          <button onClick={() => onLoadVectorNotationPreset('cross')}>A×B</button>
          <button onClick={() => onLoadVectorNotationPreset('normA')}>‖A‖</button>
          <button onClick={() => onLoadVectorNotationPreset('normB')}>‖B‖</button>
          <button onClick={() => void onCopyText(vectorNotationLatex, 'Vector notation copied')}>Copy Pad</button>
        </div>
        <MathEditor
          ref={vectorNotationFieldRef}
          className="secondary-mathfield"
          value={vectorNotationLatex}
          onChange={onSetVectorNotationLatex}
          modeId="vector"
          screenHint="vector"
          keyboardLayouts={vectorKeyboardLayouts}
          onFocus={(field) => {
            activeFieldRef.current = field;
          }}
          placeholder="Use MatrixVec templates here"
        />
        <div className="notation-pad-footer">
          <p className="equation-hint">Use Vector mode for dot, cross, norms, and angle. The notation pad is for structured template entry and reuse.</p>
          <button className="guide-chip" onClick={() => onSetVectorNotationLatex('')}>Clear Pad</button>
        </div>
      </div>
    </section>
  );
}

export { VectorWorkspace };
