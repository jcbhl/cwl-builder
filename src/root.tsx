import * as React from 'react';
import Split from 'react-split'
import fs from 'fs';
import yaml from 'yaml';
import os from 'os';
import { SelectionPlugin, Workflow, SVGArrangePlugin, SVGEdgeHoverPlugin, SVGNodeMovePlugin, SVGPortDragPlugin, ZoomPlugin } from 'cwl-svg';
import { WorkflowFactory, StepModel, WorkflowInputParameterModel, WorkflowOutputParameterModel } from 'cwlts/models';

let workflow: Workflow;

export default function App() {
  return <Split className="split"
    sizes={[25, 75]}
    minSize={100}
    expandToMin={false}
    gutterSize={10}
    gutterAlign="center"
    snapOffset={30}
    dragInterval={1}
    direction="horizontal"
    cursor="col-resize">
    <h1>left</h1>
    <CwlView />

  </Split>
}


interface CwlProps{
  path?: string,
}

function CwlView(props: CwlProps) {
  React.useEffect(() => {
  const sample = parseJsonOrYaml(os.homedir() + "/cwltools/cl-tools/workflow/basic.cwl");
  const factory = WorkflowFactory.from(sample);
  const svgRoot = document.getElementById('svg')!;
  // svgRoot.addEventListener('contextmenu', (e) => {
  //   const selection = workflow.getPlugin(SelectionPlugin).getSelection();
  //   if (selection?.size > 0) {
  //     selection.forEach((val, key, map) => {
  //       if (val == "edge") {
  //         return;
  //       }
  //       const node = workflow.model.findById(key);
  //       if (!node) {
  //         console.log(`did not find node ${key}`);
  //         return;
  //       }
  //       if (node instanceof StepModel) {
  //         workflow.model.removeStep(node);
  //       } else if (node instanceof WorkflowInputParameterModel) {
  //         workflow.model.removeInput(node);
  //       } else if (node instanceof WorkflowOutputParameterModel) {
  //         workflow.model.removeOutput(node);
  //       } else {
  //         throw new Error(`removing a node of unknown type: ${node.constructor.name}`);
  //       }
  //     });
  //   }
  // })

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

  // if (is_first_draw) {
  //   workflow.getPlugin(SVGArrangePlugin).arrange();
  //   workflow.fitToViewport();
  // }

  // workflow.getPlugin(SelectionPlugin).registerOnSelectionChange((node: SVGElement | null) => {
  //   const selection = workflow.getPlugin(SelectionPlugin).getSelection();

  //   if (selection.size == 0) {
  //     updateNodeData(null);
  //   }

  //   selection.forEach((val, key, map) => {
  //     if (val == "edge") {
  //       return;
  //     }
  //     const node = workflow.model.findById(key);
  //     if (!node) {
  //       console.log(`did not find node ${key}`);
  //       return;
  //     }
  //     updateNodeData(node);
  //   })
  // });

  // @ts-ignore
  window["wf"] = workflow;


  });
  return <div id='svg-container' className="h-screen">
    <svg id="svg" className="cwl-workflow h-screen"></svg>
  </div>;
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