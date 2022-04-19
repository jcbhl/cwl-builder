#!/usr/bin/env cwl-runner

cwlVersion: v1.0
class: Workflow
inputs:
  f: File

outputs:
  list:
    type: stdout

steps:
  sort:
    run: sort.cwl
    in:
      tarfile: tarball
      extractfile: name_of_file_to_extract
    out: [extracted_file]

  uniq:
    run: arguments.cwl
    in:
      src: untar/extracted_file
    out: [classfile]

