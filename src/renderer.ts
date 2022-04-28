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
import { StepModel, WorkflowInputParameterModel, WorkflowOutputParameterModel, CommandLineToolModel } from 'cwlts/models/generic';

let workflow: Workflow;
let workflow_path: string;

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
  const svgRoot = document.getElementById('svg') as any;

  workflow = new Workflow({
    model: factory,
    svgRoot: svgRoot,
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
      }
      console.log(`node type is ${node.constructor.name}`);
      updateNodeData(node);
    })
  });

  // @ts-ignore
  window["wf"] = workflow;
}

render_workflow(os.homedir() + "/cwltools/cl-tools/workflow/basic.cwl");

const open_button = document.getElementById('open-button')!;

open_button.addEventListener('click', async () => {
  const path = (await ipcRenderer.invoke("showDialog"))[0];
  if (path) {
    setupFileList(path);
  }
});


function setupFileList(path: string) {
  const file_list = document.getElementById('file-list')!;

  file_list.replaceChildren();

  const files = fs.readdirSync(path, { withFileTypes: true });

  for (const file of files) {
    const e = document.createElement("li");
    e.textContent = file.name;

    var callback;
    if (file.isDirectory()) {
      callback = function (e: MouseEvent) {
        const path_to_file = pathlib.join(path, this.textContent);
        setupFileList(path_to_file);
      }

    } else if (file.isFile()) {
      callback = function (e: MouseEvent) {
        const path_to_file = pathlib.join(path, this.textContent);

        const filetype = getFileType(path_to_file);
        if(filetype == "CommandLineTool"){
          const tool = parseCliTool(path_to_file)!;
          workflow.model.addStepFromProcess(tool.serialize());

        } else if (filetype == "Workflow"){
          render_workflow(path_to_file);
        }
      }
    } else {
      throw new Error("found dirent with strange type");
    }

    e.addEventListener('dblclick', callback);
    file_list.appendChild(e);
  }
}


function updateNodeData(node: any) {
  console.log('------------------------');
  const node_data = document.getElementById('node-data')!;

  // for (const [k, v] of Object.entries(node)) {
  //   console.log(`${k} : ${v}`);
  // }

  if (node instanceof StepModel) {
    // FIXME: more advanced workflows (like the JSON sample) have a JS object (SBDraft2CommandLineToolModel)
    // loaded in to `node.run`, while the basic yaml workflow only has node.runPath set with the tool path.
    const path_to_workflow_dir = workflow_path.substring(0, workflow_path.lastIndexOf('/'));
    const path_to_tool = pathlib.join(path_to_workflow_dir, node.runPath);

    const factory = parseCliTool(path_to_tool)!;

    console.log(`Tool has command ${factory.baseCommand} with arguments ${factory.arguments} and inputs ${factory.inputs}`);
    node_data.replaceChildren();

    const label1 = document.createElement('h2');
    label1.textContent = "tool:";
    const field1 = document.createElement('p');
    field1.textContent = factory.baseCommand.toString();

    node_data.appendChild(label1);
    node_data.appendChild(field1);
  } else if (node instanceof WorkflowInputParameterModel) {

  } else if (node instanceof WorkflowOutputParameterModel) {

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

function getFileType(path: string){
  const sample = parseJsonOrYaml(path);

  if (!sample) {
    console.log(`error in parsing file at path ${path}`);
    return;
  }

  if(sample.class == "Workflow") return "Workflow";
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
