# `cwl-builder`
`cwl-builder` is a workflow builder focusing on common requirements within neuroimaging pipelines. It is a desktop app written in Electron/Typescript and can be used to build end-to-end data processing workflows (ideally in the future, without ever touching a text editor).

## Installation
`cwl-builder` uses yarn as the package manager and is developed against node.js stable (v16.14.2). To install and run locally,


```bash
node --version # should be v16.14
git clone https://github.com/jcbhl/cwl-builder.git
cd cwl-builder
yarn install
yarn start
```

## Demo
Double-clicking on a workflow in the file list will open it, while double-clicking on a tool will add it to the graph as a node.

To delete a node from the graph, select a node and right click.

The top-right button swaps to a text editor view of the current workflow.

![ui](/assets/demo_ui.jpg)

