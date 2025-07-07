"use client";

import { useTheme } from "next-themes";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import IdentifierDialog from "./IdentifierDialog";
import { DiffEditor } from "@monaco-editor/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "./ui/button";
import { ModeToggle } from "./ModeToggle";
import { Input } from "./ui/input";

export default function DiffViewer() {
  const { theme } = useTheme();
  const [comparisonSets, setComparisonSets] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sourceFiles, setSourceFiles] = useState([]);
  const [targetFiles, setTargetFiles] = useState([]);

  const readFileContent = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ name: file.name, content: reader.result });
      reader.readAsText(file);
    });
  };

  const compareMultiple = async (files, line, start, end) => {
    const contents = await Promise.all(files.map(readFileContent));
    const sets = [];
    const used = new Set();

    for (let i = 0; i < contents.length; i++) {
      if (used.has(i)) continue;
      const lines = contents[i].content.split("\n");
      const identifier = lines[line]?.slice(start, end);

      for (let j = i + 1; j < contents.length; j++) {
        if (used.has(j)) continue;

        if (contents[j].content.includes(identifier)) {
          sets.push([contents[i], contents[j]]);
          used.add(i);
          used.add(j);
          break;
        }
      }
    }

    setComparisonSets(sets);
    if (sets.length > 0) {
      toast.success(`${sets.length} set(s) of files found.`);
    } else {
      toast.error("No matching identifier found in remaining files.");
    }
  };

  const compareSourcesWithTargets = async (line, start, end) => {
    const sources = await Promise.all(sourceFiles.map(readFileContent));
    const targets = await Promise.all(targetFiles.map(readFileContent));
    const sets = [];

    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      const lines = src.content.split("\n");
      const identifier = lines[line]?.slice(start, end);

      for (let tgt of targets) {
        if (tgt.content.includes(identifier)) {
          sets.push([src, tgt]);
          break;
        }
      }
    }

    setComparisonSets(sets);
    if (sets.length > 0) {
      toast.success(`${sets.length} set(s) of files found.`);
    } else {
      toast.error("No matching identifier found in target files.");
    }
  };

  const onDrop = async (acceptedFiles) => {
    setComparisonSets([]);
    if (acceptedFiles.length > 2) {
      setPendingFiles(acceptedFiles);
      setShowDialog(true);
    } else if (acceptedFiles.length === 2) {
      const content1 = await readFileContent(acceptedFiles[0]);
      const content2 = await readFileContent(acceptedFiles[1]);
      setComparisonSets([[content1, content2]]);
    } else if (acceptedFiles.length === 1) {
      toast.info("Drop at least 2 files to compare.");
    }
  };

  const handleDialogConfirm = async ({ line, start, end }) => {
    setShowDialog(false);

    if (sourceFiles.length && targetFiles.length) {
      await compareSourcesWithTargets(line, start, end);
      return;
    }
    await compareMultiple(pendingFiles, line, start, end);
    setPendingFiles([]);
  };

  const handleDialogCancel = () => {
    setShowDialog(false);
    setPendingFiles([]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div>
      <div className="bg-secondary/50 fixed top-0 z-10 flex h-10 w-full items-center justify-between gap-4 px-5 backdrop-blur-xs">
        {/* <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-xl font-bold text-transparent">
          Compare
        </span> */}

        <div className="px-1 bg-white rounded-sm">
          <Image src={"/logo_color.png"} height={40} width={100} />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-nowrap">
            Source Files
            <Input
              type="file"
              multiple
              onChange={(e) => setSourceFiles([...e.target.files])}
              className="bg-green-200 text-xs dark:bg-green-900"
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold text-nowrap">
            Target Files
            <Input
              type="file"
              multiple
              onChange={(e) => setTargetFiles([...e.target.files])}
              className="bg-yellow-200 text-xs dark:bg-yellow-800"
            />
          </label>
        </div>

        {sourceFiles.length > 0 && targetFiles.length > 0 && (
          <Button
            size="sm"
            className="cursor-pointer"
            onClick={() => {
              if (!sourceFiles.length || !targetFiles.length) {
                toast.error("Upload both source and target files first.");
                return;
              }
              setShowDialog(true);
            }}
          >
            Compare
          </Button>
        )}
        <ModeToggle />
      </div>

      {!comparisonSets || comparisonSets.length === 0 ? (
        <div
          {...getRootProps()}
          className={`m-2 mt-12 cursor-pointer border-2 border-dashed border-gray-400 p-4 ${
            comparisonSets.length === 0 ? "h-[90vh]" : "h-[30px]"
          } flex items-center justify-center`}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-center text-lg">Drop the files here ...</p>
          ) : (
            <p className="text-center text-lg">
              Drag and drop files to compare
            </p>
          )}
        </div>
      ) : null}

      {comparisonSets.length > 0 && (
        <div className="mt-8 p-4">
          {/* <h2 className="text-md font-semibold mb-2">Comparison Sets</h2> */}
          <table className="w-full table-fixed border text-sm">
            <thead className="bg-accent text-left">
              <tr>
                <th className="w-5/12 p-2">Source File</th>
                <th className="w-5/12 p-2">Target File</th>
                <th className="w-1/12 p-2">Action</th>
                <th className="w-1/12 p-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {comparisonSets.map(([src, tgt], i) => (
                <tr key={i} className="hover:bg-accent border-t">
                  <td className="p-2 text-xs text-wrap">{src.name}</td>
                  <td className="p-2 text-xs text-wrap">{tgt.name}</td>
                  <td className="text-xs">
                    <Sheet
                      open={sheetOpen && selectedSet === i}
                      onOpenChange={setSheetOpen}
                    >
                      <SheetTrigger asChild>
                        <Button
                          className="h-6 cursor-pointer rounded-sm text-xs"
                          onClick={() => {
                            setSelectedSet(i);
                            setSheetOpen(true);
                          }}
                        >
                          View
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-full min-w-[95%]">
                        <SheetHeader>
                          <SheetTitle className="mb-2 grid grid-cols-2 gap-2 text-xs">
                            <span>
                              {src.name?.length > 83
                                ? src.name.slice(0, 83) + "..."
                                : src.name}
                            </span>
                            <span>
                              {tgt.name?.length > 83
                                ? tgt.name.slice(0, 83) + "..."
                                : tgt.name}
                            </span>
                          </SheetTitle>
                          <DiffEditor
                            height="90vh"
                            theme={theme === "light" ? "vs-light" : "vs-dark"}
                            language="plaintext"
                            original={src.content}
                            modified={tgt.content}
                            // onMount={(editor, monaco) => {
                            // 	monaco.editor.defineTheme("custom-diff-theme", {
                            // 		base: theme === "light" ? "vs" : "vs-dark",
                            // 		inherit: true,
                            // 		rules: [],
                            // 		colors: {
                            // 			"diffEditor.insertedTextBackground":
                            // 				"#00000000",
                            // 			"diffEditor.removedTextBackground":
                            // 				"#00000000",
                            // 			"diffEditor.insertedTextBorder": "#dc2626",
                            // 			"diffEditor.removedTextBorder": "#dc2626",
                            // 			"editorOverviewRuler.insertedForeground":
                            // 				"#00000000",
                            // 			"editorOverviewRuler.deletedForeground":
                            // 				"#00000000",
                            // 			"editorGutter.modifiedBackground":
                            // 				"#00000000",
                            // 			"editorGutter.addedBackground": "#00000000",
                            // 			"editorGutter.deletedBackground": "#00000000",
                            // 		},
                            // 	});

                            // 	monaco.editor.setTheme("custom-diff-theme"); // 👈 apply the theme
                            // }}
                            options={{
                              readOnly: false,
                              wordWrap: "off",
                              scrollBeyondLastLine: false,
                              renderWhitespace: "all",
                              minimap: { enabled: false },
                              renderIndicators: false,
                              diffAlgorithm: "advanced",
                              // ignoreTrimWhitespace: false,
                            }}
                          />
                        </SheetHeader>
                      </SheetContent>
                    </Sheet>
                  </td>

                  <td className="p-2 text-xs">
                    {src.content === tgt.content ? (
                      <span className="rounded-sm bg-green-600 px-4 py-1 text-white">
                        Match
                      </span>
                    ) : (
                      <span className="rounded-sm bg-red-600 px-2 py-1 text-white">
                        Different
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <IdentifierDialog
        open={showDialog}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />
    </div>
  );
}
