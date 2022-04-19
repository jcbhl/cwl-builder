#!/usr/bin/env cwl-runner

cwlVersion: v1.0
class: CommandLineTool
baseCommand: sort
stdout: sort_output.txt
inputs:
  f:
    type: File
    inputBinding:
      position: 1

outputs: 
  example_out:
    type: stdout
    
