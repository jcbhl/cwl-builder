import './index.css';
import fs from 'fs';
import pathlib from 'path';
import yaml from 'yaml';
import os from 'os';
import { WorkflowFactory, CommandLineToolFactory } from 'cwlts/models';
import { SelectionPlugin, SVGArrangePlugin, SVGEdgeHoverPlugin, SVGNodeMovePlugin, SVGPortDragPlugin, Workflow, ZoomPlugin } from 'cwl-svg';
import "cwl-svg/src/assets/styles/themes/rabix-dark/theme.scss";
import "cwl-svg/src/plugins/port-drag/theme.dark.scss";
import "cwl-svg/src/plugins/selection/theme.dark.scss";
import { dialog, ipcRenderer, OpenDialogSyncOptions } from 'electron';
import { StepModel, WorkflowInputParameterModel, WorkflowOutputParameterModel, CommandLineToolModel, WorkflowStepInputModel, WorkflowStepOutputModel } from 'cwlts/models/generic';
import { InputParameterModel } from 'cwlts/models/generic/InputParameterModel';
import { inspect } from 'util';

let workflow: Workflow;
let workflow_path: string;

render_workflow(os.homedir() + "/cwltools/cl-tools/workflow/basic.cwl");
setupFileList(os.homedir() + "/cwltools");

const open_button = document.getElementById('open-button')!;
open_button.addEventListener('click', async () => {
  const res = await ipcRenderer.invoke("showOpenDialog");
  if (res) {
    const path = res[0];
    setupFileList(path);
  }
});

const save_button = document.getElementById('save-button')!;
save_button.addEventListener('click', async () => {
  const res = await ipcRenderer.invoke("showSaveDialog", workflow_path);
  if (typeof res == "string") {
    fs.writeFileSync(res, yaml.stringify(workflow.model.serialize()));
    alert("saved!");
  }
});

function render_workflow(path: string) {
  if (workflow) {
    workflow.destroy();
  }
  workflow_path = path;

  const sample = parseJsonOrYaml(path);

  if (!sample) {
    console.log(`error in parsing file at path ${path}`);
    return;
  }

  const factory = WorkflowFactory.from(sample);
  const svgRoot = document.getElementById('svg')!;
  svgRoot.addEventListener('contextmenu', (e) => {
    const selection = workflow.getPlugin(SelectionPlugin).getSelection();
    if (selection?.size > 0) {
      selection.forEach((val, key, map) => {
        if (val == "edge") {
          return;
        }
        const node = workflow.model.findById(key);
        if (!node) {
          console.log(`did not find node ${key}`);
          return;
        }
        if (node instanceof StepModel) {
          workflow.model.removeStep(node);
        } else if (node instanceof WorkflowInputParameterModel) {
          workflow.model.removeInput(node);
        } else if (node instanceof WorkflowOutputParameterModel) {
          workflow.model.removeOutput(node);
        } else {
          throw new Error(`removing a node of unknown type: ${node.constructor.name}`);
        }
      });
    }
  })

  workflow = new Workflow({
    model: factory,
    svgRoot: svgRoot as any,
    plugins: [
      new SVGArrangePlugin(),
      new SVGEdgeHoverPlugin(),
      new SVGNodeMovePlugin({
        movementSpeed: 10
      }),
      new SVGPortDragPlugin(),
      new SelectionPlugin(),
      new ZoomPlugin(),
    ]
  });

  workflow.getPlugin(SVGArrangePlugin).arrange();
  workflow.fitToViewport();

  workflow.getPlugin(SelectionPlugin).registerOnSelectionChange((node: SVGElement | null) => {
    if (!node) {
      return;
    }

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
      updateNodeData(node);
    })
  });

  // @ts-ignore
  window["wf"] = workflow;
}



function setupFileList(path: string) {
  const file_list = document.getElementById('file-list-root')!;

  file_list.replaceChildren();

  const files = fs.readdirSync(path, { withFileTypes: true });

  draw_file_list(files, file_list, path);
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
      draw_file_list(fs.readdirSync(subdir_path, { withFileTypes: true }), ul, subdir_path);
    } else if (file.isFile()) {
      e.addEventListener('dblclick', function (e: MouseEvent) {
        const path_to_file = pathlib.join(path, this.textContent!);

        const filetype = getFileType(path_to_file);
        if (filetype == "CommandLineTool") {
          const tool = parseCliTool(path_to_file)!;
          addNewTool(tool);
        } else if (filetype == "Workflow") {
          render_workflow(path_to_file);
        }
      });
    } else {
      throw new Error("found dirent with strange type");
    }
  }
}


function updateNodeData(node: any) {
  const node_data = document.getElementById('node-data')!;
  node_data.replaceChildren();

  if (node instanceof StepModel) {
    const label1 = document.createElement('h2');
    label1.textContent = "tool:";
    const field1 = document.createElement('pre');

    if (!node.run) {
      const path_to_workflow_dir = workflow_path.substring(0, workflow_path.lastIndexOf('/'));
      const path_to_tool = pathlib.join(path_to_workflow_dir, node.runPath);

      const factory = parseCliTool(path_to_tool)!;

      field1.textContent = JSON.stringify(factory.serialize(), null, "\t");
    } else {
      field1.textContent = JSON.stringify(node.run.serialize(), null, "\t");
    }
    node_data.appendChild(label1);
    node_data.appendChild(field1);
  } else if (node instanceof WorkflowInputParameterModel || node instanceof WorkflowOutputParameterModel) {
    const label = document.createElement('h2');
    if (node instanceof WorkflowInputParameterModel) {
      label.textContent = "input:";
    } else {
      label.textContent = "output:";
    }
    node_data.appendChild(label);

    const fields = document.createElement('pre');
    fields.textContent = JSON.stringify(node.serialize(), null, "\t");
    node_data.appendChild(fields);
  } else {
    throw new Error(`Found unexpected node type ${node.constructor.name}`);
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
  const file_contents = fs.readFileSync(path, 'utf8');
  if (path.endsWith('json')) {
    return JSON.parse(file_contents);
  } else if (path.endsWith('cwl')) {
    return yaml.parse(file_contents);
  } else {
    throw new Error("found unrecognized file format");
  }
}

function addNewTool(tool: CommandLineToolModel) {
  const step = workflow.model.addStepFromProcess(tool.serialize());
  step.label = tool.label ?? tool.baseCommand[0].toString();
  if (tool.id) {
    workflow.model.changeStepId(step, tool.id);
  }

  step.in.forEach((val: WorkflowStepInputModel) => {
    if (val.type.isNullable) {
      val.label = "OPTIONAL: " + val.label;
    }
    workflow.model.includePort(val);
  })
}