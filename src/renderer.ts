import './index.css';
import fs from 'fs';
import pathlib from 'path';
import yaml from 'yaml';
import os from 'os';
import { WorkflowFactory } from 'cwlts/models';
import { SelectionPlugin, SVGArrangePlugin, SVGEdgeHoverPlugin, SVGNodeMovePlugin, SVGPortDragPlugin, Workflow, ZoomPlugin } from 'cwl-svg';
import "cwl-svg/src/assets/styles/themes/rabix-dark/theme.scss";
import "cwl-svg/src/plugins/port-drag/theme.dark.scss";
import "cwl-svg/src/plugins/selection/theme.dark.scss";
import { dialog, ipcRenderer, OpenDialogSyncOptions } from 'electron';
import { V1StepModel, V1WorkflowInputParameterModel, V1WorkflowOutputParameterModel } from 'cwlts/models/v1.0'
import {StepModel} from 'cwlts/models/generic';

function render_workflow(path: string) {
  const file_contents = fs.readFileSync(path, 'utf8');

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
  // workflow.getPlugin(SelectionPlugin).registerOnSelectionChange((node) => {
  //   const s = node
  // });

  // @ts-ignore
  window["wf"] = workflow;
}

render_workflow(os.homedir() + "/cwltools/cl-tools/workflow/basic.cwl");
let workflow: Workflow;

const button = document.getElementById('reserialize');
if (button) {
  button.addEventListener('click',
    (_) => {
      const selection = workflow.getPlugin(SelectionPlugin).getSelection();
      console.log("selection:");
      selection.forEach((val, key, map) => {
        console.log(val);
        console.log(key);

        const node = workflow.model.findById(key);
        if (!node) {
          console.log(`did not find node ${key}`);
        }
        console.log(`found node ${node}`);
      })
    });
}

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
        setupFileList(pathlib.resolve(path, this.textContent));
      }

    } else if (file.isFile()) {
      callback = function (e: MouseEvent) {
        render_workflow(pathlib.resolve(path, this.textContent!));
      }
    } else {
      throw new Error("found dirent with strange type");
    }

    e.addEventListener('dblclick', callback);
    file_list.appendChild(e);
  }
}


// @ts-ignore
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

function updateNodeData(node: any) {
  console.log('------------------------');
  const node_data = document.getElementById('node-data')!;
  for(const [k,v] of Object.entries(node)){
    console.log(`${k} : ${v}`);
  }
  
  if (node instanceof StepModel) {
    // node_data.appen

  // } else if (node instanceof V1WorkflowInputParameterModel) {

  // } else if (node instanceof V1WorkflowOutputParameterModel) {

  // } else {
  //   throw new Error(`Found unexpected node type ${node.constructor.name}`);
  }
}