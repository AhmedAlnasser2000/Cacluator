import { MathStatic } from '../../components/MathStatic';

export type GeneratedPreviewCardProps = {
  title: string;
  subtitle: string;
  latex: string;
  emptyTitle: string;
  emptyDescription: string;
  onCopyExpr: () => void;
  onToEditor: () => void;
  toEditorLabel?: string;
  toEditorDisabled?: boolean;
};

export function GeneratedPreviewCard({
  title,
  subtitle,
  latex,
  emptyTitle,
  emptyDescription,
  onCopyExpr,
  onToEditor,
  toEditorLabel = 'To Editor',
  toEditorDisabled = false,
}: GeneratedPreviewCardProps) {
  return (
    <div className="editor-card generated-preview-card">
      <div className="card-title-row">
        <strong>{title}</strong>
        <span className="equation-subtitle">{subtitle}</span>
      </div>
      {latex ? (
        <>
          <MathStatic className="polynomial-preview-math" latex={latex} />
          <div className="display-card-actions">
            <button onClick={onToEditor} disabled={toEditorDisabled}>{toEditorLabel}</button>
            <button onClick={onCopyExpr}>Copy Expr</button>
          </div>
        </>
      ) : (
        <div className="generated-preview-empty">
          <strong>{emptyTitle}</strong>
          <p>{emptyDescription}</p>
        </div>
      )}
    </div>
  );
}
