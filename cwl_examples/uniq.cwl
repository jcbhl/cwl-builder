#!/usr/bin/env cwl-runner

cwlVersion: v1.0
class: CommandLineTool
baseCommand: uniq
arguments: ["-c"]
stdout: uniq_output.txt
inputs:
  f:
    type: File
    inputBinding:
      position: 1

outputs: 
  example_out:
    type: stdout
    
