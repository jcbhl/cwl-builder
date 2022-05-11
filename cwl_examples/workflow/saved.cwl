class: Workflow
cwlVersion: v1.0
inputs:
  - id: zip_file
    type: File
    sbg:x: 0
    sbg:y: 6.5
  - id: search_string
    type: string
    sbg:x: 0
    sbg:y: 114.5
  - id: output_filename
    type: string?
    sbg:x: 468.9921875
    sbg:y: 0
  - id: uncompress_file_1
    sbg:x: 95.7725830078125
    sbg:y: -139.25
outputs:
  - id: occurences
    outputSource:
      - wc/count
    type: File
    sbg:x: 975.420166015625
    sbg:y: 61
  - id: uncompress_file
    outputSource:
      - untar/uncompress_file
      - uncompress_file_1
    type: null
    sbg:x: 275.7725830078125
    sbg:y: -61.25
  - id: uncompress_file_2
    outputSource:
      - uncompress_file_1
    type: null
    sbg:x: 288.7725830078125
    sbg:y: -201.25
steps:
  - id: untar
    in:
      - id: compress_file
        source: zip_file
    out:
      - id: uncompress_file
    run: ../tar/tar.cwl
    sbg:x: 181.4140625
    sbg:y: 61
  - id: grep
    in:
      - id: extended
        default: true
      - id: search_file
        source: untar/uncompress_file
      - id: search_string
        source: search_string
    out:
      - id: occurences
    run: ../grep/grep.cwl
    sbg:x: 468.9921875
    sbg:y: 114.5
  - id: wc
    in:
      - id: input_file
        source: grep/occurences
      - id: output_filename
        source: output_filename
    out:
      - id: count
    run: ../wc/wc.cwl
    sbg:x: 733.3780517578125
    sbg:y: 54
requirements:
  - undefined: MultipleInputFeatureRequirement
  - class: InlineJavascriptRequirement
  - class: StepInputExpressionRequirement
