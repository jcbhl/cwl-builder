import './index.css';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import os from 'os';
import { WorkflowFactory } from 'cwlts/models';
import { SelectionPlugin, SVGArrangePlugin, SVGEdgeHoverPlugin, SVGNodeMovePlugin, SVGPortDragPlugin, Workflow, ZoomPlugin } from 'cwl-svg';
import "cwl-svg/src/assets/styles/themes/rabix-dark/theme.scss";
import "cwl-svg/src/plugins/port-drag/theme.dark.scss";
import "cwl-svg/src/plugins/selection/theme.dark.scss";

const file_contents = fs.readFileSync(os.homedir() + "/cwltools/cl-tools/workflow/basic.cwl", 'utf8');
const sample = yaml.parse(file_contents);
const factory = WorkflowFactory.from(sample);

const svgRoot = document.getElementById('svg') as any;

const workflow = new Workflow({
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

// @ts-ignore
window["wf"] = workflow;



const button = document.getElementById('reserialize');
if (button) {
  const fn = async (_: MouseEvent) => {

    for(const x of workflow.model.gatherValidConnectionPoints('step.out')){
      console.log(`${x.label}`);
    }

    console.log(workflow.model.warnings);
    for(const x of workflow.model.warnings){
      console.log(`found error = ${x}`);
    }
    // const res = await factory.updateValidity(IssueEvent);
    console.log(factory.serialize());
    // console.log(`factory.validate: ${res}`);
  }
  button.addEventListener('click', fn);
}


function find_cwl_files() {
  const tool_dir_name = "cwltools";
  const home = os.homedir();
  const home_entries = fs.readdirSync(home);

  if (!home_entries.includes(tool_dir_name)) {
    console.log("did not find dir");
    return [];
  }

  const cwl_dir = path.resolve(home, tool_dir_name);
  const files = fs.readdirSync(cwl_dir).filter((val) => { return val.endsWith('cwl'); });
  return files;
}