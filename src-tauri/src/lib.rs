use mathexpr::{Executable, Expression};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, fs, path::PathBuf, sync::Mutex};
use tauri::{Manager, State};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum ModeId {
    Calculate,
    Equation,
    Matrix,
    Vector,
    Table,
    Guide,
    AdvancedCalculus,
    Trigonometry,
    Statistics,
    Geometry,
}

impl Default for ModeId {
    fn default() -> Self {
        Self::Calculate
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum AngleUnit {
    Deg,
    Rad,
    Grad,
}

impl Default for AngleUnit {
    fn default() -> Self {
        Self::Deg
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum OutputStyle {
    Exact,
    Decimal,
    Both,
}

impl Default for OutputStyle {
    fn default() -> Self {
        Self::Both
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
enum MathNotationDisplay {
    Rendered,
    PlainText,
    Latex,
}

impl Default for MathNotationDisplay {
    fn default() -> Self {
        Self::Rendered
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct Settings {
    angle_unit: AngleUnit,
    output_style: OutputStyle,
    math_notation_display: MathNotationDisplay,
    history_enabled: bool,
    auto_switch_to_equation: bool,
    ui_scale: i32,
    math_scale: i32,
    result_scale: i32,
    high_contrast: bool,
    symbolic_display_mode: String,
    flatten_nested_roots_when_safe: bool,
    approx_digits: i32,
    numeric_notation_mode: String,
    scientific_notation_style: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            angle_unit: AngleUnit::Deg,
            output_style: OutputStyle::Both,
            math_notation_display: MathNotationDisplay::Rendered,
            history_enabled: true,
            auto_switch_to_equation: false,
            ui_scale: 100,
            math_scale: 100,
            result_scale: 100,
            high_contrast: false,
            symbolic_display_mode: "auto".into(),
            flatten_nested_roots_when_safe: true,
            approx_digits: 6,
            numeric_notation_mode: "decimal".into(),
            scientific_notation_style: "times10".into(),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsPatch {
    angle_unit: Option<AngleUnit>,
    output_style: Option<OutputStyle>,
    math_notation_display: Option<MathNotationDisplay>,
    history_enabled: Option<bool>,
    auto_switch_to_equation: Option<bool>,
    ui_scale: Option<i32>,
    math_scale: Option<i32>,
    result_scale: Option<i32>,
    high_contrast: Option<bool>,
    symbolic_display_mode: Option<String>,
    flatten_nested_roots_when_safe: Option<bool>,
    approx_digits: Option<i32>,
    numeric_notation_mode: Option<String>,
    scientific_notation_style: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MathDocument {
    latex: String,
    math_json: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EvaluateRequest {
    mode: ModeId,
    document: MathDocument,
    angle_unit: AngleUnit,
    output_style: OutputStyle,
    variables: HashMap<String, String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct EvaluateResponse {
    exact_latex: Option<String>,
    approx_text: Option<String>,
    normalized_math_json: Option<serde_json::Value>,
    warnings: Vec<String>,
    error: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MenuNode {
    id: String,
    label: String,
    hotkey: Option<String>,
    children: Option<Vec<MenuNode>>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LauncherLaunchTarget {
    mode: ModeId,
    calculate_screen: Option<String>,
    equation_screen: Option<String>,
    advanced_calc_screen: Option<String>,
    trig_screen: Option<String>,
    statistics_screen: Option<String>,
    geometry_screen: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LauncherAppEntry {
    id: String,
    label: String,
    description: String,
    hotkey: String,
    launch: LauncherLaunchTarget,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LauncherCategory {
    id: String,
    label: String,
    description: String,
    hotkey: String,
    entries: Vec<LauncherAppEntry>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct HistoryEntry {
    id: String,
    mode: ModeId,
    input_latex: String,
    resolved_input_latex: Option<String>,
    result_latex: Option<String>,
    approx_text: Option<String>,
    calculate_screen: Option<String>,
    calculate_seed: Option<serde_json::Value>,
    advanced_calc_screen: Option<String>,
    advanced_calc_seed: Option<serde_json::Value>,
    geometry_screen: Option<String>,
    trig_screen: Option<String>,
    statistics_screen: Option<String>,
    numeric_interval: Option<NumericSolveInterval>,
    timestamp: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NumericSolveInterval {
    start: String,
    end: String,
    subdivisions: i64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MatrixRequest {
    operation: String,
    matrix_a: Vec<Vec<f64>>,
    matrix_b: Option<Vec<Vec<f64>>>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MatrixResponse {
    result_latex: Option<String>,
    approx_text: Option<String>,
    warnings: Vec<String>,
    error: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VectorRequest {
    operation: String,
    vector_a: Vec<f64>,
    vector_b: Option<Vec<f64>>,
    angle_unit: AngleUnit,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct VectorResponse {
    result_latex: Option<String>,
    approx_text: Option<String>,
    warnings: Vec<String>,
    error: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableRow {
    x: String,
    primary: String,
    secondary: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableRequest {
    primary_expression: MathDocument,
    secondary_expression: Option<MathDocument>,
    variable: String,
    start: f64,
    end: f64,
    step: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TableResponse {
    headers: Vec<String>,
    rows: Vec<TableRow>,
    warnings: Vec<String>,
    error: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NumericOdeRequest {
    expression: String,
    x0: f64,
    y0: f64,
    x_end: f64,
    step: f64,
    method: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NumericOdePoint {
    x: f64,
    y: f64,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct NumericOdeResponse {
    final_x: f64,
    final_y: f64,
    samples: Vec<NumericOdePoint>,
    warnings: Vec<String>,
    error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModeState {
    active_mode: ModeId,
    menu: Vec<MenuNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppBootstrap {
    current_mode: ModeId,
    settings: Settings,
    mode_tree: Vec<MenuNode>,
    history_count: usize,
    version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PersistedState {
    current_mode: ModeId,
    settings: Settings,
    history: Vec<HistoryEntry>,
}

impl Default for PersistedState {
    fn default() -> Self {
        Self {
            current_mode: ModeId::Calculate,
            settings: Settings::default(),
            history: Vec::new(),
        }
    }
}

struct AppState {
    storage_dir: PathBuf,
    state: Mutex<PersistedState>,
}

impl AppState {
    fn load(storage_dir: PathBuf) -> Result<Self, String> {
        fs::create_dir_all(&storage_dir).map_err(|error| error.to_string())?;
        let file_path = storage_dir.join("calculator-state.json");
        let persisted = match fs::read_to_string(&file_path) {
            Ok(contents) => serde_json::from_str::<PersistedState>(&contents).unwrap_or_default(),
            Err(_) => PersistedState::default(),
        };

        Ok(Self {
            storage_dir,
            state: Mutex::new(persisted),
        })
    }

    fn file_path(&self) -> PathBuf {
        self.storage_dir.join("calculator-state.json")
    }

    fn save_snapshot(&self, snapshot: &PersistedState) -> Result<(), String> {
        let contents = serde_json::to_string_pretty(snapshot).map_err(|error| error.to_string())?;
        fs::write(self.file_path(), contents).map_err(|error| error.to_string())
    }
}

fn menu_children(items: &[(&str, &str, &str)]) -> Vec<MenuNode> {
    items
        .iter()
        .map(|(id, label, hotkey)| MenuNode {
            id: (*id).to_string(),
            label: (*label).to_string(),
            hotkey: Some((*hotkey).to_string()),
            children: None,
        })
        .collect()
}

fn mode_tree() -> Vec<MenuNode> {
    vec![
        MenuNode {
            id: "calculate".into(),
            label: "Calculate".into(),
            hotkey: Some("Ctrl+1".into()),
            children: Some(menu_children(&[
                ("simplify", "Simplify", "F1"),
                ("factor", "Factor", "F2"),
                ("expand", "Expand", "F3"),
                ("numeric", "Numeric", "F4"),
                ("clear", "Clear", "F5"),
                ("history", "History", "F6"),
            ])),
        },
        MenuNode {
            id: "equation".into(),
            label: "Equation".into(),
            hotkey: Some("Ctrl+2".into()),
            children: Some(menu_children(&[
                ("solve", "Solve", "F1"),
                ("symbolic", "Symbolic", "F2"),
                ("linear2", "2x2", "F3"),
                ("linear3", "3x3", "F4"),
                ("clear", "Clear", "F5"),
                ("history", "History", "F6"),
            ])),
        },
        MenuNode {
            id: "matrix".into(),
            label: "Matrix".into(),
            hotkey: Some("Ctrl+3".into()),
            children: Some(menu_children(&[
                ("add", "A+B", "F1"),
                ("subtract", "A-B", "F2"),
                ("multiply", "A×B", "F3"),
                ("det", "det(A)", "F4"),
                ("inverse", "A⁻¹", "F5"),
                ("transpose", "Aᵀ", "F6"),
            ])),
        },
        MenuNode {
            id: "vector".into(),
            label: "Vector".into(),
            hotkey: Some("Ctrl+4".into()),
            children: Some(menu_children(&[
                ("dot", "Dot", "F1"),
                ("cross", "Cross", "F2"),
                ("norm", "‖A‖", "F3"),
                ("angle", "∠", "F4"),
                ("add", "A+B", "F5"),
                ("subtract", "A-B", "F6"),
            ])),
        },
        MenuNode {
            id: "table".into(),
            label: "Table".into(),
            hotkey: Some("Ctrl+5".into()),
            children: Some(menu_children(&[
                ("build", "Build", "F1"),
                ("toggleSecondary", "g(x)", "F2"),
                ("clear", "Clear", "F3"),
                ("history", "History", "F4"),
            ])),
        },
        MenuNode {
            id: "guide".into(),
            label: "Guide".into(),
            hotkey: Some("Ctrl+6".into()),
            children: Some(menu_children(&[
                ("open", "Open", "F1"),
                ("search", "Search", "F2"),
                ("symbols", "Symbols", "F3"),
                ("modes", "Modes", "F4"),
                ("back", "Back", "F5"),
                ("exit", "Exit", "F6"),
            ])),
        },
        MenuNode {
            id: "advancedCalculus".into(),
            label: "Advanced Calc".into(),
            hotkey: Some("Ctrl+8".into()),
            children: Some(menu_children(&[
                ("open", "Open", "F1"),
                ("guide", "Guide", "F2"),
                ("back", "Back", "F5"),
                ("exit", "Exit", "F6"),
            ])),
        },
        MenuNode {
            id: "trigonometry".into(),
            label: "Trigonometry".into(),
            hotkey: Some("Ctrl+9".into()),
            children: Some(menu_children(&[
                ("open", "Open", "F1"),
                ("guide", "Guide", "F2"),
                ("back", "Back", "F5"),
                ("exit", "Exit", "F6"),
            ])),
        },
        MenuNode {
            id: "statistics".into(),
            label: "Statistics".into(),
            hotkey: Some("Ctrl+Shift+1".into()),
            children: Some(menu_children(&[
                ("open", "Open", "F1"),
                ("guide", "Guide", "F2"),
                ("back", "Back", "F5"),
                ("exit", "Exit", "F6"),
            ])),
        },
        MenuNode {
            id: "geometry".into(),
            label: "Geometry".into(),
            hotkey: Some("Ctrl+Shift+2".into()),
            children: Some(menu_children(&[
                ("open", "Open", "F1"),
                ("guide", "Guide", "F2"),
                ("back", "Back", "F5"),
                ("exit", "Exit", "F6"),
            ])),
        },
    ]
}

fn launcher_categories() -> Vec<LauncherCategory> {
    vec![
        LauncherCategory {
            id: "core".into(),
            label: "Core".into(),
            description: "Core calculator and equation work".into(),
            hotkey: "1".into(),
            entries: vec![
                LauncherAppEntry {
                    id: "calculate".into(),
                    label: "Calculate".into(),
                    description: "Exact and numeric textbook calculations".into(),
                    hotkey: "1".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Calculate,
                        ..LauncherLaunchTarget::default()
                    },
                },
                LauncherAppEntry {
                    id: "equation".into(),
                    label: "Equation".into(),
                    description: "Symbolic, polynomial, and simultaneous systems".into(),
                    hotkey: "2".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Equation,
                        equation_screen: Some("home".into()),
                        ..LauncherLaunchTarget::default()
                    },
                },
                LauncherAppEntry {
                    id: "table".into(),
                    label: "Table".into(),
                    description: "Function tables over a range".into(),
                    hotkey: "3".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Table,
                        ..LauncherLaunchTarget::default()
                    },
                },
            ],
        },
        LauncherCategory {
            id: "linear".into(),
            label: "Linear".into(),
            description: "Matrix and vector workflows".into(),
            hotkey: "2".into(),
            entries: vec![
                LauncherAppEntry {
                    id: "matrix".into(),
                    label: "Matrix".into(),
                    description: "Matrix operations and transforms".into(),
                    hotkey: "1".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Matrix,
                        ..LauncherLaunchTarget::default()
                    },
                },
                LauncherAppEntry {
                    id: "vector".into(),
                    label: "Vector".into(),
                    description: "Vector operations and angles".into(),
                    hotkey: "2".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Vector,
                        ..LauncherLaunchTarget::default()
                    },
                },
            ],
        },
        LauncherCategory {
            id: "calculus".into(),
            label: "Calculus".into(),
            description: "Guided calculus surfaces".into(),
            hotkey: "3".into(),
            entries: vec![
                LauncherAppEntry {
                    id: "calculus".into(),
                    label: "Calculus".into(),
                    description: "Guided derivatives, integrals, and limits".into(),
                    hotkey: "1".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Calculate,
                        calculate_screen: Some("calculusHome".into()),
                        ..LauncherLaunchTarget::default()
                    },
                },
                LauncherAppEntry {
                    id: "advancedCalculus".into(),
                    label: "Advanced Calc".into(),
                    description: "Harder integrals, limits, series, and ODE workflows".into(),
                    hotkey: "2".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::AdvancedCalculus,
                        advanced_calc_screen: Some("home".into()),
                        ..LauncherLaunchTarget::default()
                    },
                },
            ],
        },
        LauncherCategory {
            id: "shapeMath".into(),
            label: "Shape Math".into(),
            description: "Trig and geometry workflows".into(),
            hotkey: "4".into(),
            entries: vec![
                LauncherAppEntry {
                    id: "trigonometry".into(),
                    label: "Trigonometry".into(),
                    description: "Trig functions, identities, equations, and triangle solvers"
                        .into(),
                    hotkey: "1".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Trigonometry,
                        trig_screen: Some("home".into()),
                        ..LauncherLaunchTarget::default()
                    },
                },
                LauncherAppEntry {
                    id: "geometry".into(),
                    label: "Geometry".into(),
                    description: "Formula-first shapes, circles, triangles, and coordinate tools"
                        .into(),
                    hotkey: "2".into(),
                    launch: LauncherLaunchTarget {
                        mode: ModeId::Geometry,
                        geometry_screen: Some("home".into()),
                        ..LauncherLaunchTarget::default()
                    },
                },
            ],
        },
        LauncherCategory {
            id: "data".into(),
            label: "Data".into(),
            description: "Dataset and probability workflows".into(),
            hotkey: "5".into(),
            entries: vec![LauncherAppEntry {
                id: "statistics".into(),
                label: "Statistics".into(),
                description:
                    "Dataset entry, descriptive statistics, probability, and regression basics"
                        .into(),
                hotkey: "1".into(),
                launch: LauncherLaunchTarget {
                    mode: ModeId::Statistics,
                    statistics_screen: Some("home".into()),
                    ..LauncherLaunchTarget::default()
                },
            }],
        },
    ]
}

fn menu_for_mode(mode: &ModeId) -> Vec<MenuNode> {
    let id = match mode {
        ModeId::Calculate => "calculate",
        ModeId::Equation => "equation",
        ModeId::Matrix => "matrix",
        ModeId::Vector => "vector",
        ModeId::Table => "table",
        ModeId::Guide => "guide",
        ModeId::AdvancedCalculus => "advancedCalculus",
        ModeId::Trigonometry => "trigonometry",
        ModeId::Statistics => "statistics",
        ModeId::Geometry => "geometry",
    };

    mode_tree()
        .into_iter()
        .find(|node| node.id == id)
        .and_then(|node| node.children)
        .unwrap_or_default()
}

fn frontend_engine_warning() -> Vec<String> {
    vec![
    "Version 1 uses the TypeScript symbolic adapter for CAS operations while Rust owns persistence and shell state."
      .into(),
  ]
}

fn compile_ode_expression(expression: &str) -> Result<Executable, String> {
    Expression::parse(expression)
        .map_err(|error| error.to_string())?
        .compile(&["x", "y"])
        .map_err(|error| error.to_string())
}

fn eval_ode_expression(expr: &Executable, x: f64, y: f64) -> Result<f64, String> {
    let value = expr.eval(&[x, y]).map_err(|error| error.to_string())?;
    if value.is_finite() {
        Ok(value)
    } else {
        Err("The numeric ODE solver encountered a non-finite step.".into())
    }
}

fn rk4_step(expr: &Executable, x: f64, y: f64, h: f64) -> Result<f64, String> {
    let k1 = eval_ode_expression(expr, x, y)?;
    let k2 = eval_ode_expression(expr, x + h / 2.0, y + (h * k1) / 2.0)?;
    let k3 = eval_ode_expression(expr, x + h / 2.0, y + (h * k2) / 2.0)?;
    let k4 = eval_ode_expression(expr, x + h, y + h * k3)?;
    Ok(y + (h / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4))
}

fn solve_ode_rk4(
    request: &NumericOdeRequest,
    expr: &Executable,
) -> Result<NumericOdeResponse, String> {
    let direction = if request.x_end >= request.x0 {
        1.0
    } else {
        -1.0
    };
    let step = request.step.abs() * direction;
    let mut x = request.x0;
    let mut y = request.y0;
    let mut samples = vec![NumericOdePoint { x, y }];

    while (direction > 0.0 && x < request.x_end - 1e-12)
        || (direction < 0.0 && x > request.x_end + 1e-12)
    {
        let h = if (request.x_end - x).abs() < step.abs() {
            request.x_end - x
        } else {
            step
        };
        y = rk4_step(expr, x, y, h)?;
        x += h;
        samples.push(NumericOdePoint { x, y });
    }

    Ok(NumericOdeResponse {
        final_x: x,
        final_y: y,
        samples,
        warnings: Vec::new(),
        error: None,
    })
}

fn solve_ode_rk45(
    request: &NumericOdeRequest,
    expr: &Executable,
) -> Result<NumericOdeResponse, String> {
    let direction = if request.x_end >= request.x0 {
        1.0
    } else {
        -1.0
    };
    let tolerance = 1e-6;
    let mut h = request
        .step
        .abs()
        .min((request.x_end - request.x0).abs())
        .max(1e-6)
        * direction;
    let mut x = request.x0;
    let mut y = request.y0;
    let mut samples = vec![NumericOdePoint { x, y }];
    let mut warnings = Vec::new();
    let mut guard = 0usize;

    while ((direction > 0.0 && x < request.x_end - 1e-12)
        || (direction < 0.0 && x > request.x_end + 1e-12))
        && guard < 100_000
    {
        guard += 1;
        let remaining = request.x_end - x;
        if remaining.abs() < h.abs() {
            h = remaining;
        }

        let y_full = rk4_step(expr, x, y, h)?;
        let y_half = rk4_step(expr, x, y, h / 2.0)?;
        let y_half_twice = rk4_step(expr, x + h / 2.0, y_half, h / 2.0)?;
        let error = (y_half_twice - y_full).abs();
        let scale = y.abs().max(y_half_twice.abs()).max(1.0);

        if error <= tolerance * scale || h.abs() <= 1e-8 {
            x += h;
            y = y_half_twice;
            samples.push(NumericOdePoint { x, y });
            let growth = if error == 0.0 {
                2.0
            } else {
                (0.9 * (tolerance * scale / error).powf(0.2)).clamp(0.5, 2.0)
            };
            h *= growth;
        } else {
            h *= 0.5;
        }
    }

    if guard >= 100_000 {
        warnings.push("Adaptive ODE solver reached its step limit.".into());
    }

    Ok(NumericOdeResponse {
        final_x: x,
        final_y: y,
        samples,
        warnings,
        error: None,
    })
}

fn solve_numeric_ode(request: NumericOdeRequest) -> Result<NumericOdeResponse, String> {
    if request.expression.trim().is_empty() {
        return Err(
            "Numeric IVP requires a supported RHS expression and numeric initial values.".into(),
        );
    }
    if !request.x0.is_finite()
        || !request.y0.is_finite()
        || !request.x_end.is_finite()
        || !request.step.is_finite()
        || request.step <= 0.0
    {
        return Err(
            "Numeric IVP requires a supported RHS expression and numeric initial values.".into(),
        );
    }

    let expr = compile_ode_expression(&request.expression)?;
    match request.method.as_str() {
        "rk4" => solve_ode_rk4(&request, &expr),
        "rk45" => solve_ode_rk45(&request, &expr),
        _ => Err("Unsupported ODE method.".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compiles_supported_numeric_ode_math_surface() {
        let expr = compile_ode_expression(
            "sin(x)+cos(y)+tan(x)+exp(x)+pow(x,2)+ln(abs(y)+1)+sqrt(abs(x))+log(abs(y)+1)",
        )
        .expect("supported ODE expression should compile");

        let value = eval_ode_expression(&expr, 0.5, -1.25).expect("expression should evaluate");
        assert!(value.is_finite());
    }

    #[test]
    fn rejects_non_finite_numeric_ode_steps() {
        let expr = compile_ode_expression("sqrt(-1)").expect("expression should compile");
        let error = eval_ode_expression(&expr, 0.0, 0.0).expect_err("NaN step should fail");
        assert_eq!(
            error,
            "The numeric ODE solver encountered a non-finite step."
        );
    }

    #[test]
    fn solves_simple_numeric_ode_with_compiled_expression() {
        let response = solve_numeric_ode(NumericOdeRequest {
            expression: "y".into(),
            x0: 0.0,
            y0: 1.0,
            x_end: 1.0,
            step: 0.1,
            method: "rk4".into(),
        })
        .expect("simple IVP should solve");

        assert_eq!(response.samples.first().map(|point| point.x), Some(0.0));
        let final_x = response
            .samples
            .last()
            .map(|point| point.x)
            .expect("solver should emit at least one sample");
        assert!((final_x - 1.0).abs() < 1e-12);
        assert!(response.final_y.is_finite());
        assert!(response.final_y > 2.0 && response.final_y < 3.0);
    }
}

#[tauri::command]
fn boot_app(state: State<'_, AppState>) -> Result<AppBootstrap, String> {
    let snapshot = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?
        .clone();

    Ok(AppBootstrap {
        current_mode: snapshot.current_mode,
        settings: snapshot.settings,
        mode_tree: mode_tree(),
        history_count: snapshot.history.len(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

#[tauri::command]
fn get_mode_tree() -> Vec<MenuNode> {
    mode_tree()
}

#[tauri::command]
fn get_launcher_categories() -> Vec<LauncherCategory> {
    launcher_categories()
}

#[tauri::command]
fn set_mode(mode_id: ModeId, state: State<'_, AppState>) -> Result<ModeState, String> {
    let mut snapshot = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?;
    snapshot.current_mode = mode_id.clone();
    let clone = snapshot.clone();
    drop(snapshot);
    state.save_snapshot(&clone)?;

    Ok(ModeState {
        active_mode: mode_id.clone(),
        menu: menu_for_mode(&mode_id),
    })
}

#[tauri::command]
fn evaluate_math(req: EvaluateRequest) -> EvaluateResponse {
    if req.document.latex.trim().is_empty() {
        return EvaluateResponse {
            warnings: frontend_engine_warning(),
            error: Some("Enter an expression before evaluating.".into()),
            ..EvaluateResponse::default()
        };
    }

    EvaluateResponse {
        exact_latex: Some(req.document.latex),
        approx_text: None,
        normalized_math_json: req.document.math_json,
        warnings: frontend_engine_warning(),
        error: None,
    }
}

#[tauri::command]
fn solve_expression(req: EvaluateRequest) -> EvaluateResponse {
    if req.document.latex.trim().is_empty() {
        return EvaluateResponse {
            warnings: frontend_engine_warning(),
            error: Some("Enter an equation before solving.".into()),
            ..EvaluateResponse::default()
        };
    }

    EvaluateResponse {
        exact_latex: Some(req.document.latex),
        approx_text: None,
        normalized_math_json: req.document.math_json,
        warnings: frontend_engine_warning(),
        error: None,
    }
}

#[tauri::command]
fn matrix_command(_req: MatrixRequest) -> MatrixResponse {
    MatrixResponse {
        warnings: frontend_engine_warning(),
        error: None,
        ..MatrixResponse::default()
    }
}

#[tauri::command]
fn vector_command(_req: VectorRequest) -> VectorResponse {
    VectorResponse {
        warnings: frontend_engine_warning(),
        error: None,
        ..VectorResponse::default()
    }
}

#[tauri::command]
fn generate_table(_req: TableRequest) -> TableResponse {
    TableResponse {
        warnings: frontend_engine_warning(),
        error: None,
        ..TableResponse::default()
    }
}

#[tauri::command]
fn save_settings(patch: SettingsPatch, state: State<'_, AppState>) -> Result<Settings, String> {
    let mut snapshot = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?;

    if let Some(angle_unit) = patch.angle_unit {
        snapshot.settings.angle_unit = angle_unit;
    }
    if let Some(output_style) = patch.output_style {
        snapshot.settings.output_style = output_style;
    }
    if let Some(math_notation_display) = patch.math_notation_display {
        snapshot.settings.math_notation_display = math_notation_display;
    }
    if let Some(history_enabled) = patch.history_enabled {
        snapshot.settings.history_enabled = history_enabled;
    }
    if let Some(auto_switch_to_equation) = patch.auto_switch_to_equation {
        snapshot.settings.auto_switch_to_equation = auto_switch_to_equation;
    }
    if let Some(ui_scale) = patch.ui_scale {
        snapshot.settings.ui_scale = ui_scale;
    }
    if let Some(math_scale) = patch.math_scale {
        snapshot.settings.math_scale = math_scale;
    }
    if let Some(result_scale) = patch.result_scale {
        snapshot.settings.result_scale = result_scale;
    }
    if let Some(high_contrast) = patch.high_contrast {
        snapshot.settings.high_contrast = high_contrast;
    }
    if let Some(symbolic_display_mode) = patch.symbolic_display_mode {
        snapshot.settings.symbolic_display_mode = symbolic_display_mode;
    }
    if let Some(flatten_nested_roots_when_safe) = patch.flatten_nested_roots_when_safe {
        snapshot.settings.flatten_nested_roots_when_safe = flatten_nested_roots_when_safe;
    }
    if let Some(approx_digits) = patch.approx_digits {
        snapshot.settings.approx_digits = approx_digits.clamp(0, 20);
    }
    if let Some(numeric_notation_mode) = patch.numeric_notation_mode {
        snapshot.settings.numeric_notation_mode = numeric_notation_mode;
    }
    if let Some(scientific_notation_style) = patch.scientific_notation_style {
        snapshot.settings.scientific_notation_style = scientific_notation_style;
    }

    let settings = snapshot.settings.clone();
    let clone = snapshot.clone();
    drop(snapshot);
    state.save_snapshot(&clone)?;
    Ok(settings)
}

#[tauri::command]
fn append_history(entry: HistoryEntry, state: State<'_, AppState>) -> Result<(), String> {
    let mut snapshot = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?;
    snapshot.history.push(entry);
    if snapshot.history.len() > 80 {
        let overflow = snapshot.history.len() - 80;
        snapshot.history.drain(0..overflow);
    }
    let clone = snapshot.clone();
    drop(snapshot);
    state.save_snapshot(&clone)
}

#[tauri::command]
fn load_history(state: State<'_, AppState>) -> Result<Vec<HistoryEntry>, String> {
    Ok(state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?
        .history
        .clone())
}

#[tauri::command]
fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    let mut snapshot = state
        .state
        .lock()
        .map_err(|_| "Calculator state is currently unavailable.".to_string())?;
    snapshot.history.clear();
    let clone = snapshot.clone();
    drop(snapshot);
    state.save_snapshot(&clone)
}

#[tauri::command]
fn solve_ode_numeric(request: NumericOdeRequest) -> Result<NumericOdeResponse, String> {
    solve_numeric_ode(request)
}

#[tauri::command]
fn sample_ode_solution(request: NumericOdeRequest) -> Result<NumericOdeResponse, String> {
    solve_numeric_ode(request)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .setup(|app| {
            let storage_dir = app
                .path()
                .app_data_dir()
                .map_err(|error| tauri::Error::Io(std::io::Error::other(error.to_string())))?;

            app.manage(
                AppState::load(storage_dir)
                    .map_err(|error| tauri::Error::Io(std::io::Error::other(error)))?,
            );
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            boot_app,
            get_mode_tree,
            get_launcher_categories,
            set_mode,
            evaluate_math,
            solve_expression,
            matrix_command,
            vector_command,
            generate_table,
            save_settings,
            append_history,
            load_history,
            clear_history,
            solve_ode_numeric,
            sample_ode_solution
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
