/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/application-architecture#main-and-renderer-processes
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';
import fs from 'fs';
import path from 'path';
import os from 'os';
import cwl, { WorkflowFactory } from 'cwlts/models';
import svg, { SelectionPlugin, SVGArrangePlugin, SVGEdgeHoverPlugin, SVGNodeMovePlugin, SVGPortDragPlugin, Workflow, ZoomPlugin } from 'cwl-svg';
import "cwl-svg/src/assets/styles/themes/rabix-dark/theme.scss";
import "cwl-svg/src/plugins/port-drag/theme.dark.scss";
import "cwl-svg/src/plugins/selection/theme.dark.scss";

const sample = JSON.parse(fs.readFileSync(os.homedir() + "/cwltools/rna-seq-alignment.json", 'utf8'));
const wf = WorkflowFactory.from(sample);
const svgRoot = document.getElementById('svg') as any;

const workflow = new Workflow({
  model: wf,
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

// workflow.getPlugin(SVGArrangePlugin).arrange();
window["wf"] = workflow;

const button = document.getElementById('file-list-update');
if (button) {
  button.addEventListener('click', (_) => {
    const files = find_cwl_files();
  })
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