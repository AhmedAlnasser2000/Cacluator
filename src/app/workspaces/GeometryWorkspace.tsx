import type { Dispatch, RefObject, SetStateAction } from 'react';
import { SignedNumberDraftInput } from '../../components/SignedNumberDraftInput';
import { GeneratedPreviewCard } from '../components/GeneratedPreviewCard';
import type {
  ArcSectorState,
  CircleState,
  ConeState,
  CubeState,
  CuboidState,
  CylinderState,
  DistanceState,
  GeometryScreen,
  LineEquationState,
  MidpointState,
  RectangleState,
  SlopeState,
  SphereState,
  SquareState,
  TriangleAreaState,
  TriangleHeronState,
} from '../../types/calculator';

type GeometryRouteMetaLike = {
  breadcrumb: string[];
  label: string;
  description: string;
};

type GeometryMenuEntryLike = {
  id: string;
  hotkey: string;
  label: string;
  description: string;
  target: GeometryScreen;
};

type GeometryWorkspaceProps = {
  routeMeta: GeometryRouteMetaLike | null;
  screen: GeometryScreen;
  isMenuOpen: boolean;
  menuPanelRef: RefObject<HTMLDivElement | null>;
  menuEntries: GeometryMenuEntryLike[];
  currentMenuIndex: number;
  menuFooterText: string;
  onOpenScreen: (screen: GeometryScreen) => void;
  onHoverMenuIndex: (
    screen: 'home' | 'shapes2dHome' | 'shapes3dHome' | 'triangleHome' | 'circleHome' | 'coordinateHome',
    index: number,
  ) => void;
  onOpenToolGuide: () => void;
  onOpenModeGuide: () => void;
  workbenchExpression: string;
  onUseInGeometry: () => void;
  onCopyExpression: () => void;
  squareState: SquareState;
  setSquareState: Dispatch<SetStateAction<SquareState>>;
  squareSideRef: RefObject<HTMLInputElement | null>;
  rectangleState: RectangleState;
  setRectangleState: Dispatch<SetStateAction<RectangleState>>;
  rectangleWidthRef: RefObject<HTMLInputElement | null>;
  triangleAreaState: TriangleAreaState;
  setTriangleAreaState: Dispatch<SetStateAction<TriangleAreaState>>;
  triangleAreaBaseRef: RefObject<HTMLInputElement | null>;
  triangleHeronState: TriangleHeronState;
  setTriangleHeronState: Dispatch<SetStateAction<TriangleHeronState>>;
  triangleHeronARef: RefObject<HTMLInputElement | null>;
  circleState: CircleState;
  setCircleState: Dispatch<SetStateAction<CircleState>>;
  circleRadiusRef: RefObject<HTMLInputElement | null>;
  arcSectorState: ArcSectorState;
  setArcSectorState: Dispatch<SetStateAction<ArcSectorState>>;
  arcSectorRadiusRef: RefObject<HTMLInputElement | null>;
  cubeState: CubeState;
  setCubeState: Dispatch<SetStateAction<CubeState>>;
  cubeSideRef: RefObject<HTMLInputElement | null>;
  cuboidState: CuboidState;
  setCuboidState: Dispatch<SetStateAction<CuboidState>>;
  cuboidLengthRef: RefObject<HTMLInputElement | null>;
  cylinderState: CylinderState;
  setCylinderState: Dispatch<SetStateAction<CylinderState>>;
  cylinderRadiusRef: RefObject<HTMLInputElement | null>;
  coneState: ConeState;
  setConeState: Dispatch<SetStateAction<ConeState>>;
  coneRadiusRef: RefObject<HTMLInputElement | null>;
  sphereState: SphereState;
  setSphereState: Dispatch<SetStateAction<SphereState>>;
  sphereRadiusRef: RefObject<HTMLInputElement | null>;
  distanceState: DistanceState;
  setDistanceState: Dispatch<SetStateAction<DistanceState>>;
  distanceP1XRef: RefObject<HTMLInputElement | null>;
  midpointState: MidpointState;
  setMidpointState: Dispatch<SetStateAction<MidpointState>>;
  midpointP1XRef: RefObject<HTMLInputElement | null>;
  slopeState: SlopeState;
  setSlopeState: Dispatch<SetStateAction<SlopeState>>;
  slopeP1XRef: RefObject<HTMLInputElement | null>;
  lineEquationState: LineEquationState;
  setLineEquationState: Dispatch<SetStateAction<LineEquationState>>;
  lineEquationP1XRef: RefObject<HTMLInputElement | null>;
  lineFormLabels: Array<[LineEquationState['form'], string]>;
};

function GeometryPreviewCard({
  title,
  subtitle,
  emptyTitle,
  emptyDescription,
  workbenchExpression,
  onUseInGeometry,
  onCopyExpression,
}: {
  title: string;
  subtitle: string;
  emptyTitle: string;
  emptyDescription: string;
  workbenchExpression: string;
  onUseInGeometry: () => void;
  onCopyExpression: () => void;
}) {
  return (
    <GeneratedPreviewCard
      title={title}
      subtitle={subtitle}
      latex={workbenchExpression}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      onToEditor={onUseInGeometry}
      toEditorLabel="Use in Geometry"
      onCopyExpr={onCopyExpression}
    />
  );
}

function GeometryWorkspace({
  routeMeta,
  screen,
  isMenuOpen,
  menuPanelRef,
  menuEntries,
  currentMenuIndex,
  menuFooterText,
  onOpenScreen,
  onHoverMenuIndex,
  onOpenToolGuide,
  onOpenModeGuide,
  workbenchExpression,
  onUseInGeometry,
  onCopyExpression,
  squareState,
  setSquareState,
  squareSideRef,
  rectangleState,
  setRectangleState,
  rectangleWidthRef,
  triangleAreaState,
  setTriangleAreaState,
  triangleAreaBaseRef,
  triangleHeronState,
  setTriangleHeronState,
  triangleHeronARef,
  circleState,
  setCircleState,
  circleRadiusRef,
  arcSectorState,
  setArcSectorState,
  arcSectorRadiusRef,
  cubeState,
  setCubeState,
  cubeSideRef,
  cuboidState,
  setCuboidState,
  cuboidLengthRef,
  cylinderState,
  setCylinderState,
  cylinderRadiusRef,
  coneState,
  setConeState,
  coneRadiusRef,
  sphereState,
  setSphereState,
  sphereRadiusRef,
  distanceState,
  setDistanceState,
  distanceP1XRef,
  midpointState,
  setMidpointState,
  midpointP1XRef,
  slopeState,
  setSlopeState,
  slopeP1XRef,
  lineEquationState,
  setLineEquationState,
  lineEquationP1XRef,
  lineFormLabels,
}: GeometryWorkspaceProps) {
  if (!routeMeta) {
    return null;
  }

  return (
    <section className={`mode-panel ${isMenuOpen ? 'geometry-menu-panel' : 'geometry-panel'}`}>
      <div className="equation-panel-header geometry-panel-header">
        <div className="equation-panel-copy">
          <div className="equation-breadcrumbs">
            {routeMeta.breadcrumb.map((segment) => (
              <span key={`${screen}-${segment}`} className="equation-breadcrumb">
                {segment}
              </span>
            ))}
          </div>
          <div className="card-title-row">
            <strong>{routeMeta.label}</strong>
            <span className="equation-badge">Geometry</span>
          </div>
          <p className="equation-hint geometry-panel-subtitle">{routeMeta.description}</p>
          <div className="guide-related-links">
            <button className="guide-chip" onClick={onOpenToolGuide}>
              Guide: This tool
            </button>
            <button className="guide-chip" onClick={onOpenModeGuide}>Guide: Geometry</button>
          </div>
        </div>
      </div>

      {isMenuOpen ? (
        <>
          <div
            ref={menuPanelRef}
            className="launcher-list equation-menu-list geometry-menu-list"
            tabIndex={-1}
          >
            {menuEntries.map((entry, index) => (
              <button
                key={entry.id}
                className={`launcher-entry equation-menu-entry geometry-menu-entry ${index === currentMenuIndex ? 'is-selected' : ''}`}
                onClick={() => onOpenScreen(entry.target)}
                onMouseEnter={() => onHoverMenuIndex(screen as 'home' | 'shapes2dHome' | 'shapes3dHome' | 'triangleHome' | 'circleHome' | 'coordinateHome', index)}
              >
                <span className="launcher-entry-hotkey">{entry.hotkey}</span>
                <span className="launcher-entry-content">
                  <strong>{entry.label}</strong>
                  <small>{entry.description}</small>
                </span>
              </button>
            ))}
          </div>
          <div className="equation-menu-help geometry-menu-footer">
            <span>{menuFooterText}</span>
          </div>
        </>
      ) : screen === 'square' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Square</strong>
              <span className="equation-badge">One side</span>
            </div>
            <label className="range-field">
              <span>Side s</span>
              <SignedNumberDraftInput
                ref={squareSideRef}
                value={squareState.side}
                onValueChange={(side) => setSquareState((currentState) => ({ ...currentState, side }))}
              />
            </label>
          </div>
          <GeometryPreviewCard
            title="Square Summary"
            subtitle="Area, perimeter, and diagonal from one side"
            emptyTitle="Side needed"
            emptyDescription="Enter a positive side length before evaluating."
            workbenchExpression={workbenchExpression}
            onUseInGeometry={onUseInGeometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'rectangle' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Rectangle</strong>
              <span className="equation-badge">Width and height</span>
            </div>
            <div className="polynomial-grid" data-columns={2}>
              <label className="range-field">
                <span>Width</span>
                <SignedNumberDraftInput
                  ref={rectangleWidthRef}
                  value={rectangleState.width}
                  onValueChange={(width) => setRectangleState((currentState) => ({ ...currentState, width }))}
                />
              </label>
              <label className="range-field">
                <span>Height</span>
                <SignedNumberDraftInput
                  value={rectangleState.height}
                  onValueChange={(height) => setRectangleState((currentState) => ({ ...currentState, height }))}
                />
              </label>
            </div>
          </div>
          <GeometryPreviewCard
            title="Rectangle Summary"
            subtitle="Area, perimeter, and diagonal from width and height"
            emptyTitle="Dimensions needed"
            emptyDescription="Enter positive width and height values before evaluating."
            workbenchExpression={workbenchExpression}
            onUseInGeometry={onUseInGeometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'triangleArea' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Triangle Area</strong>
              <span className="equation-badge">Base and height</span>
            </div>
            <div className="polynomial-grid" data-columns={2}>
              <label className="range-field">
                <span>Base</span>
                <SignedNumberDraftInput
                  ref={triangleAreaBaseRef}
                  value={triangleAreaState.base}
                  onValueChange={(base) => setTriangleAreaState((currentState) => ({ ...currentState, base }))}
                />
              </label>
              <label className="range-field">
                <span>Height</span>
                <SignedNumberDraftInput
                  value={triangleAreaState.height}
                  onValueChange={(height) => setTriangleAreaState((currentState) => ({ ...currentState, height }))}
                />
              </label>
            </div>
          </div>
          <GeometryPreviewCard
            title="Triangle Summary"
            subtitle="Direct area formula"
            emptyTitle="Measurements needed"
            emptyDescription="Enter positive base and height values before evaluating."
            workbenchExpression={workbenchExpression}
            onUseInGeometry={onUseInGeometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'triangleHeron' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Heron</strong>
              <span className="equation-badge">Three sides</span>
            </div>
            <div className="polynomial-grid" data-columns={3}>
              <label className="range-field">
                <span>a</span>
                <SignedNumberDraftInput
                  ref={triangleHeronARef}
                  value={triangleHeronState.a}
                  onValueChange={(a) => setTriangleHeronState((currentState) => ({ ...currentState, a }))}
                />
              </label>
              <label className="range-field">
                <span>b</span>
                <SignedNumberDraftInput
                  value={triangleHeronState.b}
                  onValueChange={(b) => setTriangleHeronState((currentState) => ({ ...currentState, b }))}
                />
              </label>
              <label className="range-field">
                <span>c</span>
                <SignedNumberDraftInput
                  value={triangleHeronState.c}
                  onValueChange={(c) => setTriangleHeronState((currentState) => ({ ...currentState, c }))}
                />
              </label>
            </div>
          </div>
          <GeometryPreviewCard
            title="Heron Summary"
            subtitle="Area from three sides"
            emptyTitle="Sides needed"
            emptyDescription="Enter three positive side lengths before evaluating."
            workbenchExpression={workbenchExpression}
            onUseInGeometry={onUseInGeometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'circle' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Circle</strong>
              <span className="equation-badge">Radius</span>
            </div>
            <label className="range-field">
              <span>Radius r</span>
              <SignedNumberDraftInput
                ref={circleRadiusRef}
                value={circleState.radius}
                onValueChange={(radius) => setCircleState((currentState) => ({ ...currentState, radius }))}
              />
            </label>
          </div>
          <GeometryPreviewCard
            title="Circle Summary"
            subtitle="Diameter, circumference, and area from radius"
            emptyTitle="Radius needed"
            emptyDescription="Enter a positive radius before evaluating."
            workbenchExpression={workbenchExpression}
            onUseInGeometry={onUseInGeometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'arcSector' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Arc and Sector</strong>
              <span className="equation-badge">Radius and angle</span>
            </div>
            <div className="polynomial-grid" data-columns={2}>
              <label className="range-field">
                <span>Radius r</span>
                <SignedNumberDraftInput
                  ref={arcSectorRadiusRef}
                  value={arcSectorState.radius}
                  onValueChange={(radius) => setArcSectorState((currentState) => ({ ...currentState, radius }))}
                />
              </label>
              <label className="range-field">
                <span>Angle</span>
                <SignedNumberDraftInput
                  value={arcSectorState.angle}
                  onValueChange={(angle) => setArcSectorState((currentState) => ({ ...currentState, angle }))}
                />
              </label>
            </div>
            <div className="guide-chip-row">
              {(['deg', 'rad', 'grad'] as const).map((unit) => (
                <button
                  key={`geometry-angle-${unit}`}
                  className={`guide-chip ${arcSectorState.angleUnit === unit ? 'is-active' : ''}`}
                  onClick={() => setArcSectorState((currentState) => ({ ...currentState, angleUnit: unit }))}
                >
                  {unit.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <GeometryPreviewCard
            title="Arc and Sector Summary"
            subtitle="Arc length and sector area from radius and central angle"
            emptyTitle="Measurements needed"
            emptyDescription="Enter a positive radius and angle before evaluating."
            workbenchExpression={workbenchExpression}
            onUseInGeometry={onUseInGeometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'cube' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Cube</strong>
              <span className="equation-badge">One side</span>
            </div>
            <label className="range-field">
              <span>Side s</span>
              <SignedNumberDraftInput
                ref={cubeSideRef}
                value={cubeState.side}
                onValueChange={(side) => setCubeState((currentState) => ({ ...currentState, side }))}
              />
            </label>
          </div>
          <GeometryPreviewCard
            title="Cube Summary"
            subtitle="Volume, surface area, and space diagonal from one side"
            emptyTitle="Side needed"
            emptyDescription="Enter a positive side length before evaluating."
            workbenchExpression={workbenchExpression}
            onUseInGeometry={onUseInGeometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'cuboid' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Cuboid</strong>
              <span className="equation-badge">Length, width, and height</span>
            </div>
            <div className="polynomial-grid" data-columns={3}>
              <label className="range-field">
                <span>Length</span>
                <SignedNumberDraftInput
                  ref={cuboidLengthRef}
                  value={cuboidState.length}
                  onValueChange={(length) => setCuboidState((currentState) => ({ ...currentState, length }))}
                />
              </label>
              <label className="range-field">
                <span>Width</span>
                <SignedNumberDraftInput
                  value={cuboidState.width}
                  onValueChange={(width) => setCuboidState((currentState) => ({ ...currentState, width }))}
                />
              </label>
              <label className="range-field">
                <span>Height</span>
                <SignedNumberDraftInput
                  value={cuboidState.height}
                  onValueChange={(height) => setCuboidState((currentState) => ({ ...currentState, height }))}
                />
              </label>
            </div>
          </div>
          <GeometryPreviewCard
            title="Cuboid Summary"
            subtitle="Volume, surface area, and space diagonal from three dimensions"
            emptyTitle="Dimensions needed"
            emptyDescription="Enter positive length, width, and height values before evaluating."
            workbenchExpression={workbenchExpression}
            onUseInGeometry={onUseInGeometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'cylinder' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Cylinder</strong>
              <span className="equation-badge">Radius and height</span>
            </div>
            <div className="polynomial-grid" data-columns={2}>
              <label className="range-field">
                <span>Radius r</span>
                <SignedNumberDraftInput
                  ref={cylinderRadiusRef}
                  value={cylinderState.radius}
                  onValueChange={(radius) => setCylinderState((currentState) => ({ ...currentState, radius }))}
                />
              </label>
              <label className="range-field">
                <span>Height h</span>
                <SignedNumberDraftInput
                  value={cylinderState.height}
                  onValueChange={(height) => setCylinderState((currentState) => ({ ...currentState, height }))}
                />
              </label>
            </div>
          </div>
          <GeometryPreviewCard
            title="Cylinder Summary"
            subtitle="Volume plus curved and total surface area"
            emptyTitle="Measurements needed"
            emptyDescription="Enter a positive radius and height before evaluating."
            workbenchExpression={workbenchExpression}
            onUseInGeometry={onUseInGeometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'cone' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Cone</strong>
              <span className="equation-badge">Radius with height/slant</span>
            </div>
            <div className="polynomial-grid" data-columns={3}>
              <label className="range-field">
                <span>Radius r</span>
                <SignedNumberDraftInput
                  ref={coneRadiusRef}
                  value={coneState.radius}
                  onValueChange={(radius) => setConeState((currentState) => ({ ...currentState, radius }))}
                />
              </label>
              <label className="range-field">
                <span>Height h</span>
                <SignedNumberDraftInput
                  value={coneState.height}
                  onValueChange={(height) => setConeState((currentState) => ({ ...currentState, height }))}
                />
              </label>
              <label className="range-field">
                <span>Slant l</span>
                <SignedNumberDraftInput
                  value={coneState.slantHeight}
                  onValueChange={(slantHeight) => setConeState((currentState) => ({ ...currentState, slantHeight }))}
                />
              </label>
            </div>
            <p className="equation-hint geometry-note">
              Enter radius with either height or slant height. If you enter both,
              they must satisfy l^2 = r^2 + h^2.
            </p>
          </div>
          <GeometryPreviewCard
            title="Cone Summary"
            subtitle="Volume and total surface area from a valid cone setup"
            emptyTitle="Measurements needed"
            emptyDescription="Enter a positive radius and at least one valid height/slant value before evaluating."
            workbenchExpression={workbenchExpression}
            onUseInGeometry={onUseInGeometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'sphere' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Sphere</strong>
              <span className="equation-badge">Radius</span>
            </div>
            <label className="range-field">
              <span>Radius r</span>
              <SignedNumberDraftInput
                ref={sphereRadiusRef}
                value={sphereState.radius}
                onValueChange={(radius) => setSphereState((currentState) => ({ ...currentState, radius }))}
              />
            </label>
          </div>
          <GeometryPreviewCard
            title="Sphere Summary"
            subtitle="Volume and surface area from radius"
            emptyTitle="Radius needed"
            emptyDescription="Enter a positive radius before evaluating."
            workbenchExpression={workbenchExpression}
            onUseInGeometry={onUseInGeometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'distance' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Distance</strong>
              <span className="equation-badge">Two points</span>
            </div>
            <div className="geometry-point-grid">
              <div className="geometry-point-card">
                <div className="card-title-row">
                  <strong>P1</strong>
                  <span className="equation-badge">x, y</span>
                </div>
                <label className="range-field">
                  <span>x</span>
                  <SignedNumberDraftInput
                    ref={distanceP1XRef}
                    value={distanceState.p1.x}
                    onValueChange={(x) => setDistanceState((currentState) => ({
                      ...currentState,
                      p1: { ...currentState.p1, x },
                    }))}
                  />
                </label>
                <label className="range-field">
                  <span>y</span>
                  <SignedNumberDraftInput
                    value={distanceState.p1.y}
                    onValueChange={(y) => setDistanceState((currentState) => ({
                      ...currentState,
                      p1: { ...currentState.p1, y },
                    }))}
                  />
                </label>
              </div>
              <div className="geometry-point-card">
                <div className="card-title-row">
                  <strong>P2</strong>
                  <span className="equation-badge">x, y</span>
                </div>
                <label className="range-field">
                  <span>x</span>
                  <SignedNumberDraftInput
                    value={distanceState.p2.x}
                    onValueChange={(x) => setDistanceState((currentState) => ({
                      ...currentState,
                      p2: { ...currentState.p2, x },
                    }))}
                  />
                </label>
                <label className="range-field">
                  <span>y</span>
                  <SignedNumberDraftInput
                    value={distanceState.p2.y}
                    onValueChange={(y) => setDistanceState((currentState) => ({
                      ...currentState,
                      p2: { ...currentState.p2, y },
                    }))}
                  />
                </label>
              </div>
            </div>
          </div>
          <GeometryPreviewCard
            title="Distance Request"
            subtitle="Distance formula between two points"
            emptyTitle="Point pair needed"
            emptyDescription="Enter both points before evaluating the distance."
            workbenchExpression={workbenchExpression}
            onUseInGeometry={onUseInGeometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'midpoint' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Midpoint</strong>
              <span className="equation-badge">Two points</span>
            </div>
            <div className="geometry-point-grid">
              <div className="geometry-point-card">
                <div className="card-title-row">
                  <strong>P1</strong>
                  <span className="equation-badge">x, y</span>
                </div>
                <label className="range-field">
                  <span>x</span>
                  <SignedNumberDraftInput
                    ref={midpointP1XRef}
                    value={midpointState.p1.x}
                    onValueChange={(x) => setMidpointState((currentState) => ({
                      ...currentState,
                      p1: { ...currentState.p1, x },
                    }))}
                  />
                </label>
                <label className="range-field">
                  <span>y</span>
                  <SignedNumberDraftInput
                    value={midpointState.p1.y}
                    onValueChange={(y) => setMidpointState((currentState) => ({
                      ...currentState,
                      p1: { ...currentState.p1, y },
                    }))}
                  />
                </label>
              </div>
              <div className="geometry-point-card">
                <div className="card-title-row">
                  <strong>P2</strong>
                  <span className="equation-badge">x, y</span>
                </div>
                <label className="range-field">
                  <span>x</span>
                  <SignedNumberDraftInput
                    value={midpointState.p2.x}
                    onValueChange={(x) => setMidpointState((currentState) => ({
                      ...currentState,
                      p2: { ...currentState.p2, x },
                    }))}
                  />
                </label>
                <label className="range-field">
                  <span>y</span>
                  <SignedNumberDraftInput
                    value={midpointState.p2.y}
                    onValueChange={(y) => setMidpointState((currentState) => ({
                      ...currentState,
                      p2: { ...currentState.p2, y },
                    }))}
                  />
                </label>
              </div>
            </div>
          </div>
          <GeometryPreviewCard
            title="Midpoint Request"
            subtitle="Midpoint formula between two points"
            emptyTitle="Point pair needed"
            emptyDescription="Enter both points before evaluating the midpoint."
            workbenchExpression={workbenchExpression}
            onUseInGeometry={onUseInGeometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'slope' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Slope</strong>
              <span className="equation-badge">Two points</span>
            </div>
            <div className="geometry-point-grid">
              <div className="geometry-point-card">
                <div className="card-title-row">
                  <strong>P1</strong>
                  <span className="equation-badge">x, y</span>
                </div>
                <label className="range-field">
                  <span>x</span>
                  <SignedNumberDraftInput
                    ref={slopeP1XRef}
                    value={slopeState.p1.x}
                    onValueChange={(x) => setSlopeState((currentState) => ({
                      ...currentState,
                      p1: { ...currentState.p1, x },
                    }))}
                  />
                </label>
                <label className="range-field">
                  <span>y</span>
                  <SignedNumberDraftInput
                    value={slopeState.p1.y}
                    onValueChange={(y) => setSlopeState((currentState) => ({
                      ...currentState,
                      p1: { ...currentState.p1, y },
                    }))}
                  />
                </label>
              </div>
              <div className="geometry-point-card">
                <div className="card-title-row">
                  <strong>P2</strong>
                  <span className="equation-badge">x, y</span>
                </div>
                <label className="range-field">
                  <span>x</span>
                  <SignedNumberDraftInput
                    value={slopeState.p2.x}
                    onValueChange={(x) => setSlopeState((currentState) => ({
                      ...currentState,
                      p2: { ...currentState.p2, x },
                    }))}
                  />
                </label>
                <label className="range-field">
                  <span>y</span>
                  <SignedNumberDraftInput
                    value={slopeState.p2.y}
                    onValueChange={(y) => setSlopeState((currentState) => ({
                      ...currentState,
                      p2: { ...currentState.p2, y },
                    }))}
                  />
                </label>
              </div>
            </div>
          </div>
          <GeometryPreviewCard
            title="Slope Request"
            subtitle="Slope from two points, with undefined handled for vertical lines"
            emptyTitle="Point pair needed"
            emptyDescription="Enter both points before evaluating the slope."
            workbenchExpression={workbenchExpression}
            onUseInGeometry={onUseInGeometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : screen === 'lineEquation' ? (
        <div className="grid-two">
          <div className="editor-card">
            <div className="card-title-row">
              <strong>Line Equation</strong>
              <span className="equation-badge">Two distinct points</span>
            </div>
            <div className="geometry-point-grid">
              <div className="geometry-point-card">
                <div className="card-title-row">
                  <strong>P1</strong>
                  <span className="equation-badge">x, y</span>
                </div>
                <label className="range-field">
                  <span>x</span>
                  <SignedNumberDraftInput
                    ref={lineEquationP1XRef}
                    value={lineEquationState.p1.x}
                    onValueChange={(x) => setLineEquationState((currentState) => ({
                      ...currentState,
                      p1: { ...currentState.p1, x },
                    }))}
                  />
                </label>
                <label className="range-field">
                  <span>y</span>
                  <SignedNumberDraftInput
                    value={lineEquationState.p1.y}
                    onValueChange={(y) => setLineEquationState((currentState) => ({
                      ...currentState,
                      p1: { ...currentState.p1, y },
                    }))}
                  />
                </label>
              </div>
              <div className="geometry-point-card">
                <div className="card-title-row">
                  <strong>P2</strong>
                  <span className="equation-badge">x, y</span>
                </div>
                <label className="range-field">
                  <span>x</span>
                  <SignedNumberDraftInput
                    value={lineEquationState.p2.x}
                    onValueChange={(x) => setLineEquationState((currentState) => ({
                      ...currentState,
                      p2: { ...currentState.p2, x },
                    }))}
                  />
                </label>
                <label className="range-field">
                  <span>y</span>
                  <SignedNumberDraftInput
                    value={lineEquationState.p2.y}
                    onValueChange={(y) => setLineEquationState((currentState) => ({
                      ...currentState,
                      p2: { ...currentState.p2, y },
                    }))}
                  />
                </label>
              </div>
            </div>
            <div className="guide-chip-row">
              {lineFormLabels.map(([form, label]) => (
                <button
                  key={form}
                  className={`guide-chip ${lineEquationState.form === form ? 'is-active' : ''}`}
                  onClick={() => setLineEquationState((currentState) => ({ ...currentState, form }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <GeometryPreviewCard
            title="Line Request"
            subtitle="Slope-intercept, point-slope, or standard form from two points"
            emptyTitle="Point pair needed"
            emptyDescription="Enter two distinct points and choose the target form before evaluating."
            workbenchExpression={workbenchExpression}
            onUseInGeometry={onUseInGeometry}
            onCopyExpression={onCopyExpression}
          />
        </div>
      ) : null}
    </section>
  );
}

export { GeometryWorkspace };
