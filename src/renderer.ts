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
  const file_contents = fs.readFileSync(path, 'utf8');
  workflow_path = path;

  const sample = function () {
    if (path.endsWith('json')) {
      return JSON.parse(file_contents);
    } else if (path.endsWith('cwl')) {
      return yaml.parse(file_contents);
    }
  }();

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
        setupFileList(pathlib.join(path, this.textContent));
      }

    } else if (file.isFile()) {
      callback = function (e: MouseEvent) {
        render_workflow(pathlib.join(path, this.textContent!));
      }
    } else {
      throw new Error("found dirent with strange type");
    }

    // FIXME check if the yaml contains commandlinetool or workflow
    e.addEventListener('dblclick', callback);
    file_list.appendChild(e);
  }
}


function updateNodeData(node: any) {
  console.log('------------------------');
  const node_data = document.getElementById('node-data')!;

  for (const [k, v] of Object.entries(node)) {
    console.log(`${k} : ${v}`);
  }

  if (node instanceof StepModel) {
    // it looks like the json has node.run set to a JS object(SBDraft2CommandLineToolModel), while the basic yaml workflow just has node.runPath set
    console.log(node.run);

    const path_to_workflow_dir = workflow_path.substring(0, workflow_path.lastIndexOf('/'));
    const absolute_path = pathlib.join(path_to_workflow_dir, node.runPath);

    const factory = parseCliTool(absolute_path)!;

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
  const file_contents = fs.readFileSync(path, 'utf-8');

  const parsed = function () {
    if (path.endsWith('json')) {
      return JSON.parse(file_contents);
    } else if (path.endsWith('cwl')) {
      return yaml.parse(file_contents);
    }
  }();

  if (!parsed) {
    console.log(`error in parsing file at path ${path}`);
    return;
  }

  const factory = CommandLineToolFactory.from(parsed);
  return factory;
}