import "./index.css";
import "codemirror/lib/codemirror.css";
import "codemirror/lib/codemirror.js";
import "codemirror/mode/yaml/yaml";
import "codemirror/addon/lint/lint.css";
import "codemirror/addon/lint/lint";
import "codemirror/addon/lint/yaml-lint";
import "codemirror/theme/darcula.css";
import "codemirror/keymap/vim";
import fs from "fs";
import pathlib from "path";
import yaml from "yaml";
import { WorkflowFactory, CommandLineToolFactory } from "cwlts/models";
import {
  DeletionPlugin,
  SVGValidatePlugin,
  SelectionPlugin,
  SVGArrangePlugin,
  SVGEdgeHoverPlugin,
  SVGNodeMovePlugin,
  SVGPortDragPlugin,
  Workflow,
  ZoomPlugin,
} from "cwl-svg";
import "cwl-svg/src/assets/styles/themes/rabix-dark/theme.scss";
import "cwl-svg/src/plugins/port-drag/theme.dark.scss";
import "cwl-svg/src/plugins/selection/theme.dark.scss";
import { ipcRenderer } from "electron";
import codemirror from "codemirror";
import {
  StepModel,
  WorkflowInputParameterModel,
  WorkflowOutputParameterModel,
  CommandLineToolModel,
  WorkflowStepInputModel,
  WorkflowStepOutputModel,
} from "cwlts/models/generic";
import { getToolTemplate, getWorkflowTemplate } from "./templates";
import Split from "split.js";
import { setupComponents } from "./components";
import { getRootDir } from "./root_dir";

// @ts-ignore
window.jsyaml = require("js-yaml");

Split(["#sidebar", "#righthalf-container"], { sizes: [30, 70] });

enum ScreenState {
  workflow,
  editor,
}

let open_dir: string;
let workflow: Workflow;
let workflow_path: string;
let current_screen = ScreenState.workflow;
let cached_pane: HTMLElement;

render_workflow(pathlib.join(getRootDir(), "cwl_examples/workflow/basic.cwl"));
setupFileList(pathlib.join(getRootDir(), "cwl_examples"));
setupHeaderButtons();
setupSwapButton();
setupComponents();

function render_workflow(path: string) {
  workflow_path = path;
  console.log(`new workflow path is ${path}`);

  const sample = parseJsonOrYaml(path);

  if (!sample) {
    console.log(`error in parsing file at path ${path}`);
    return;
  }

  const factory = WorkflowFactory.from(sample);
  const svgRoot = document.getElementById("svg")!;
  svgRoot.addEventListener("contextmenu", () => {
    workflow.getPlugin(DeletionPlugin).deleteSelection();
  });

  workflow = new Workflow({
    model: factory,
    svgRoot: svgRoot as any,
    plugins: [
      new SVGArrangePlugin(),
      new SVGEdgeHoverPlugin(),
      new SVGNodeMovePlugin({
        movementSpeed: 10,
      }),
      new SVGPortDragPlugin(),
      new SelectionPlugin(),
      new ZoomPlugin(),
      new DeletionPlugin(),
      new SVGValidatePlugin(),
    ],
    editingEnabled: true,
  });

  workflow.getPlugin(SVGArrangePlugin).arrange();
  workflow.fitToViewport();

  workflow
    .getPlugin(SelectionPlugin)
    .registerOnSelectionChange(selectionCallback);

  // @ts-ignore
  window["wf"] = workflow;
  // @ts-ignore
  cached_pane = null;
}

function setupFileList(path: string) {
  open_dir = path;

  const file_list = document.getElementById("file-list-root")!;
  file_list.replaceChildren();

  const files = fs.readdirSync(path, { withFileTypes: true });
  draw_file_list(files, file_list, path);
  fs.watch(open_dir).on("change", () => {
    setupFileList(open_dir);
  });
}

function draw_file_list(files: fs.Dirent[], root: HTMLElement, path: string) {
  for (const file of files) {
    const e = document.createElement("li");
    root.appendChild(e);
    e.textContent = file.name;

    if (file.isDirectory()) {
      e.style.fontWeight = "bold";
      const ul = document.createElement("ul");
      ul.style.marginLeft = "15px";

      root.appendChild(ul);
      const subdir_path = pathlib.join(path, file.name);
      draw_file_list(
        fs.readdirSync(subdir_path, { withFileTypes: true }),
        ul,
        subdir_path
      );
    } else if (file.isFile()) {
      e.addEventListener("dblclick", function (e: MouseEvent) {
        switchToWorkflow();
        const path_to_file = pathlib.join(path, this.textContent!);

        const filetype = getFileType(path_to_file);
        if (filetype == "CommandLineTool") {
          const tool = parseCliTool(path_to_file)!;
          addNewTool(tool, path_to_file);
        } else if (filetype == "Workflow") {
          workflow.destroy();
          render_workflow(path_to_file);
        }
      });
    } else {
      throw new Error("found dirent with strange type");
    }
  }
}

function parseCliTool(path: string) {
  const parsed = parseJsonOrYaml(path);

  if (!parsed) {
    console.log(`error in parsing file at path ${path}`);
    return;
  }

  const factory = CommandLineToolFactory.from(parsed);
  return factory;
}

function getFileType(path: string) {
  const sample = parseJsonOrYaml(path);

  if (!sample) {
    console.log(`error in parsing file at path ${path}`);
    return;
  }

  if (sample.class == "Workflow") return "Workflow";
  else if (sample.class == "CommandLineTool") return "CommandLineTool";
  else return "Unknown";
}

function parseJsonOrYaml(path: string) {
  const file_contents = fs.readFileSync(path, "utf8");
  if (path.endsWith("json")) {
    return JSON.parse(file_contents);
  } else if (path.endsWith("cwl")) {
    return yaml.parse(file_contents);
  } else {
    throw new Error("found unrecognized file format");
  }
}

function addNewTool(tool: CommandLineToolModel, path: string) {
  const step = workflow.model.addStepFromProcess(tool.serialize());
  step.label = tool.label ?? tool.baseCommand[0].toString();
  if (tool.id) {
    workflow.model.changeStepId(step, tool.id);
  }

  if (!step.runPath) {
    console.log(`updating path to tool to be ${path}`);
    const model = workflow.model.findById(step.id) as StepModel;
    if (!model) {
      console.log("did not find model");
    }
    model.runPath = path;
  }

  step.in.forEach((val: WorkflowStepInputModel) => {
    if (val.type.isNullable) {
      val.label = "OPTIONAL: " + val.label;
    }
    workflow.model.includePort(val);
  });
}

function setupHeaderButtons() {
  const open_button = document.getElementById("open-button")!;
  open_button.addEventListener("click", async () => {
    const res = await ipcRenderer.invoke("showOpenDialog");
    if (res) {
      const path = res[0];
      setupFileList(path);
    }
  });

  const save_button = document.getElementById("save-button")!;
  save_button.addEventListener("click", async () => {
    const res = await ipcRenderer.invoke("showSaveDialog", workflow_path);
    if (typeof res == "string") {
      fs.writeFileSync(res, yaml.stringify(workflow.model.serialize()));
      alert("saved!");
    }
  });

  const newtool_button = document.getElementById("newtool-button")!;
  newtool_button.addEventListener("click", async () => {
    const res = await ipcRenderer.invoke("showSaveDialog", workflow_path);
    if (typeof res == "string") {
      fs.writeFileSync(res, getToolTemplate());
      setupFileList(open_dir);
    }
  });

  const newworkflow_button = document.getElementById("newworkflow-button")!;
  newworkflow_button.addEventListener("click", async () => {
    const res = await ipcRenderer.invoke("showSaveDialog", workflow_path);
    if (typeof res == "string") {
      fs.writeFileSync(res, getWorkflowTemplate());
      workflow.destroy();
      setupFileList(open_dir);
      render_workflow(res);
    }
  });
}

// FIXME add something here
function selectionCallback(node: SVGElement | null) {
  const selection = workflow.getPlugin(SelectionPlugin).getSelection();

  selection.forEach((val, key, map) => {
    if (val == "edge") {
      return;
    }
    const node = workflow.model.findById(key);
    if (!node) {
      console.log(`did not find node ${key}`);
      return;
    }
  });
}

function getScreenState() {
  return current_screen;
}

function setupSwapButton() {
  const button = document.getElementById("swap-button")!;
  button.addEventListener("click", () => {
    const righthalf = document.getElementById("righthalf-content")!;
    if (getScreenState() == ScreenState.workflow) {
      switchToEditor();
    } else {
      switchToWorkflow();
    }
  });
}

function switchToWorkflow() {
  if (current_screen == ScreenState.workflow) {
    return;
  }

  const righthalf = document.getElementById("righthalf-content")!;

  const cm = document.getElementById("codemirror-container")!;
  const to_cache = cm.parentNode!.removeChild(cm);
  righthalf.appendChild(cached_pane);
  cached_pane = to_cache;

  current_screen = ScreenState.workflow;
}

// FIXME improve synchronization with svg model
function switchToEditor() {
  if (current_screen == ScreenState.editor) {
    return;
  }

  const righthalf = document.getElementById("righthalf-content")!;
  const svgroot = document.getElementById("svg")!;
  const to_cache = svgroot.parentNode!.removeChild(svgroot);

  if (cached_pane) {
    righthalf.appendChild(cached_pane);
    cached_pane = to_cache;
    current_screen = ScreenState.editor;
    return;
  }

  cached_pane = to_cache;

  const container = document.createElement("div");
  container.setAttribute("id", "codemirror-container");
  container.style.height = "100%";
  container.style.overflow = "clip";

  const editor = document.createElement("textarea");
  editor.textContent = yaml.stringify(workflow.model.serialize());
  container.appendChild(editor);

  righthalf.appendChild(container);
  const cm = codemirror.fromTextArea(editor, {
    theme: "darcula",
    lineNumbers: true,
    // keyMap: "vim",
    dragDrop: false,
    mode: "yaml",
    lint: true,
    gutters: ["CodeMirror-lint-markers"],
    indentWithTabs: false,
    tabSize: 2,
    extraKeys: {
      // yaml does not use tab characters.
      Tab: function (cm) {
        cm.replaceSelection("  ", "end");
      },
    },
  });

  current_screen = ScreenState.editor;
}
