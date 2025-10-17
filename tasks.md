# Instructions

Implement the first task, run tests, remove the item from this file and then stop.

Note: This file may change while work is being done - new items may be added.

# Tasks

- Line number selection should reset when submitting an annotation. An update in highlight module will probably be required too. And also in GitDiff.tsx

  client/src/components/FilePreview.tsx:
  55: const [selectedLineNumbers, setSelectedLineNumbers] = useState<number[]>([]);

- Remove this line

  client/src/components/FilePreview.tsx:
  284: <footer className="text-xs text-slate-500">
  285: Use Back to files or your browser history to return to the project

- I don’t need project name or label here. But I want a relative path to be displayed here with an icon to copy it.

  client/src/components/FilePreview.tsx:
  210: <p className="text-xs uppercase tracking-wider text-slate-500">
  211: {projectName || "Project"}
  216: <div className="sm:text-right">
  217: <p>{formatBytes(selectedFile.size)}</p>

- Review claude output transformer

- Review API paths
