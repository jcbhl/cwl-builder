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

function render_workflow(path: string){
  const file_contents = fs.readFileSync(path, 'utf8');
  
  const sample = function() {
    if(path.endsWith('json')){
      return JSON.parse(file_contents);
    } else if (path.endsWith('cwl')){
      return yaml.parse(file_contents);
    }
  }();

  if(!sample){
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


function find_cwl_files() {
  const tool_dir_name = "cwltools";
  const home = os.homedir();
  const home_entries = fs.readdirSync(home);

  if (!home_entries.includes(tool_dir_name)) {
    console.log("did not find dir");
    return [];
  }

  const cwl_dir = pathlib.resolve(home, tool_dir_name);
  const files = fs.readdirSync(cwl_dir).filter((val) => { return val.endsWith('cwl'); });
  return files;
}

const open_button = document.getElementById('open-button')!;

open_button.addEventListener('click', async () => {
  const path = (await ipcRenderer.invoke("showDialog"))[0];
  console.log(`async call returned ${path}`);
  const file_list = document.getElementById('file-list')!;
  
  file_list.replaceChildren();

  const files = fs.readdirSync(path);

  for(const file of files){
    const e = document.createElement("li");
    e.textContent = file;
    e.addEventListener('dblclick', function(e) {
      // @ts-ignore
      // factor out upper render logic into function that inits with hardcoded string but then fires with e
      // but need to get full string to combine with `path` above 
      render_workflow(pathlib.resolve(path, this.textContent));
    });
    file_list.appendChild(e);
  }
});
