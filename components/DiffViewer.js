"use client";

import { useTheme } from "next-themes";
import { useRef, useState } from "react";
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
import Image from "next/image";

export default function DiffViewer() {
  const { theme } = useTheme();
  const [comparisonSets, setComparisonSets] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [selectedSet, setSelectedSet] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sourceFiles, setSourceFiles] = useState([]);
  const [targetFiles, setTargetFiles] = useState([]);
  const [cursorPos, setCursorPos] = useState({
    line: 1,
    column: 1,
    selLength: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [activeSrc, setActiveSrc] = useState(null);
  const [activeTgt, setActiveTgt] = useState(null);
  const [mergedComparisonSet, setMergedComparisonSet] = useState([]);
  const [isMerged, setIsMerged] = useState(false);

  const readFileContent = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({ name: file.name, content: reader?.result });
      reader.readAsText(file);
    });
  };

  const compareMultiple = (files, line, start, end) => {
    return toast.promise(
      new Promise(async (resolve, reject) => {
        try {
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
          resolve(`${sets.length} set(s) of files found.`);
        } catch (err) {
          reject("Error while comparing files.");
        }
      }),
      {
        loading: "Comparing files...",
        success: (msg) => msg,
        error: (msg) => msg,
      },
    );
  };

  const compareSourcesWithTargets = (line, start, end) => {
    return toast.promise(
      new Promise(async (resolve, reject) => {
        try {
          const sources = await Promise.all(sourceFiles.map(readFileContent));
          const targets = await Promise.all(targetFiles.map(readFileContent));
          const sets = [];

          for (let i = 0; i < sources.length; i++) {
            const src = sources[i];
            const srcLines = src.content.split("\n");
            const identifier = srcLines[line]?.slice(start, end);

            for (let tgt of targets) {
              const tgtLines = tgt.content.split("\n");
              const targetIdentifier = tgtLines[line]?.slice(start, end);

              if (identifier && identifier === targetIdentifier) {
                sets.push([src, tgt]);
                break;
              }
            }
          }

          setComparisonSets(sets);
          resolve(`${sets.length} set(s) of files found.`);
        } catch (err) {
          reject("Error while comparing files.");
        }
      }),
      {
        loading: "Comparing files...",
        success: (msg) => msg,
        error: (msg) => msg,
      },
    );
  };

  const compareMerged = () => {
    return toast.promise(
      new Promise(async (resolve, reject) => {
        try {
          let srcLines = "";
          let tgtLines = "";

          for (let i = 0; i < comparisonSets.length; i++) {
            const src = comparisonSets[i][0];
            const tgt = comparisonSets[i][1];
            srcLines += src.content;
            tgtLines += tgt.content;
          }

          const set = [
            [
              { name: "Merged Source", content: srcLines },
              { name: "Merged Target", content: tgtLines },
            ],
          ];

          setMergedComparisonSet(set);
          resolve(`Files merged.`);
        } catch (err) {
          console.log(err);
          reject("Error while merging files.", err);
        }
      }),
      {
        loading: "Merging files...",
        success: (msg) => msg,
        error: (msg) => msg,
      },
    );
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

  const handleCompareLines = (src, trg) => {
    const searchTerms = searchTerm
      .toLowerCase()
      .split(",")
      .map((term) => term.trim())
      .filter((term) => term.length > 0);

    const sortBySearchTerms = (lines) => {
      const matched = [];

      searchTerms.forEach((term) => {
        const matchedLines = lines.filter((line) =>
          line.toLowerCase().startsWith(term),
        );
        matched.push(...matchedLines);
      });

      return matched;
    };

    const srcLines = (src?.content || "").split("\n");
    const tgtLines = (trg?.content || "").split("\n");

    const newSrcContent = sortBySearchTerms(srcLines).join("\n");
    const newTrgContent = sortBySearchTerms(tgtLines).join("\n");

    setActiveSrc({ ...src, content: newSrcContent });
    setActiveTgt({ ...trg, content: newTrgContent });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div>
      <div className="bg-secondary/50 fixed top-0 z-10 flex h-14 w-full items-center justify-between gap-4 px-5 backdrop-blur-xs">
        {/* <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-xl font-bold text-transparent">
          Compare
        </span> */}

        <div className="rounded-sm bg-white px-1">
          <Image
            src={"/logo_color.png"}
            alt={"tranistics logo"}
            height={40}
            width={100}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-start gap-1">
            <Button
              size="sm"
              className="bg-green-600 text-sm text-black hover:bg-green-800 hover:text-white dark:bg-green-700 dark:text-amber-100 dark:hover:bg-green-800 dark:hover:text-white"
              onClick={() => document.getElementById("source-upload").click()}
            >
              {sourceFiles.length
                ? `${sourceFiles.length} file(s) selected`
                : "Upload Source Files"}
            </Button>

            <input
              id="source-upload"
              type="file"
              multiple
              hidden
              onChange={(e) => setSourceFiles([...e.target.files])}
            />
          </div>

          <div className="flex flex-col items-start gap-1">
            <Button
              size="sm"
              className="bg-yellow-300 text-sm text-black hover:bg-yellow-700 hover:text-white dark:bg-yellow-700 dark:text-amber-100 dark:hover:bg-yellow-800 dark:hover:text-white"
              onClick={() => document.getElementById("target-upload").click()}
            >
              {targetFiles.length
                ? `${targetFiles.length} file(s) selected`
                : "Upload Target Files"}
            </Button>

            <input
              id="target-upload"
              type="file"
              multiple
              hidden
              onChange={(e) => setTargetFiles([...e.target.files])}
            />
          </div>

          {sourceFiles.length > 0 && targetFiles.length > 0 && (
            <Button
              size="sm"
              className="ml-20"
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
        </div>

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

      {comparisonSets.length > 0 || mergedComparisonSet.length > 0 ? (
        <div className="mt-10 p-4">
          <div className="mb-2 flex items-center justify-between">
            <div></div>
            <Button
              size="sm"
              onClick={() => {
                setIsMerged(!isMerged);
                !isMerged && compareMerged();
              }}
            >
              {isMerged ? "Unmerge" : "Merge"}
            </Button>
          </div>
          <table className="w-full table-fixed border text-sm">
            <thead className="bg-accent text-left">
              <tr>
                <th className="w-1/12 p-2 text-center">#</th>
                <th className="w-4.5/12 p-2">Source File</th>
                <th className="w-4.5/12 p-2">Target File</th>
                <th className="w-1/12 p-2">Action</th>
                <th className="w-1/12 p-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {(!isMerged ? comparisonSets : mergedComparisonSet)
                .map((pair, index) => ({ index, pair }))
                .sort((a, b) => {
                  const aMatch =
                    a.pair[0].content?.trimEnd() ===
                    a.pair[1].content?.trimEnd();
                  const bMatch =
                    b.pair[0].content?.trimEnd() ===
                    b.pair[1].content?.trimEnd();
                  return aMatch === bMatch ? 0 : aMatch ? -1 : 1;
                })
                .map(({ index, pair }, serial) => {
                  const [src, tgt] = pair;
                  const isMatch =
                    src.content?.trimEnd() === tgt.content?.trimEnd();
                  const isChecked = selectedSet === index;

                  return (
                    <tr
                      key={index}
                      className="border-t hover:bg-green-100 dark:hover:bg-green-950"
                    >
                      <td className="flex items-center justify-center gap-2 py-4 text-sm text-wrap">
                        <input type="checkbox" checked={isChecked} readOnly />
                        <span>{serial + 1}</span>
                      </td>
                      <td className="p-2 text-xs text-wrap">
                        {` ${src.name} (${src?.content?.split("\n")?.length - 1})`}
                      </td>
                      <td className="p-2 text-xs text-wrap">
                        {` ${tgt.name} (${tgt?.content?.split("\n")?.length - 1})`}
                      </td>
                      <td className="text-xs">
                        <Sheet
                          open={sheetOpen && selectedSet === index}
                          onOpenChange={setSheetOpen}
                        >
                          <SheetTrigger asChild>
                            <Button
                              className="h-6 cursor-pointer rounded-sm text-xs"
                              onClick={() => {
                                setSelectedSet(index);
                                setActiveSrc(src);
                                setActiveTgt(tgt);
                                setSheetOpen(true);
                              }}
                            >
                              View
                            </Button>
                          </SheetTrigger>
                          <SheetContent className="w-full min-w-[95%]">
                            <SheetHeader>
                              <SheetTitle className="mb-2">
                                <div className="mt-1 mb-4 flex items-center gap-2">
                                  <Input
                                    className="h-6 w-32 px-2 py-1 text-xs"
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      setSearchTerm(value);
                                      if (value.length === 0) {
                                        setActiveSrc({
                                          ...src,
                                          content: src.content || "",
                                        });
                                        setActiveTgt({
                                          ...tgt,
                                          content: tgt.content || "",
                                        });
                                      }
                                    }}
                                    placeholder="Line starts with..."
                                  />
                                  <Button
                                    onClick={() => handleCompareLines(src, tgt)}
                                    className="bg-primary h-6 w-20 rounded px-3 py-1 text-sm"
                                  >
                                    Compare
                                  </Button>
                                  {searchTerm && (
                                    <Button
                                      onClick={() => {
                                        setSearchTerm("");
                                        setActiveSrc({
                                          ...src,
                                          content: src.content || "",
                                        });
                                        setActiveTgt({
                                          ...tgt,
                                          content: tgt.content || "",
                                        });
                                      }}
                                      className="bg-primary h-6 w-20 rounded px-3 py-1 text-sm"
                                    >
                                      Clear
                                    </Button>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <span className="truncate">{src.name}</span>
                                  <span className="truncate">{tgt.name}</span>
                                </div>
                              </SheetTitle>
                              <DiffEditor
                                height="80vh"
                                theme="custom-diff-theme"
                                language="plaintext"
                                original={activeSrc?.content?.trimEnd() || ""}
                                modified={activeTgt?.content?.trimEnd() || ""}
                                options={{
                                  readOnly: false,
                                  wordWrap: "off",
                                  scrollBeyondLastLine: false,
                                  renderWhitespace: "all",
                                  minimap: false,
                                  renderIndicators: false,
                                  // diffAlgorithm: "advanced",
                                }}
                                onMount={(editor, monaco) => {
                                  const original = editor.getOriginalEditor();
                                  const modified = editor.getModifiedEditor();

                                  // Shared cursor update function (debounced with requestAnimationFrame)
                                  let animationFrameId;

                                  const updateCursorInfo = (paneEditor) => {
                                    if (animationFrameId)
                                      cancelAnimationFrame(animationFrameId);

                                    animationFrameId = requestAnimationFrame(
                                      () => {
                                        const position =
                                          paneEditor.getPosition();
                                        const selection =
                                          paneEditor.getSelection();
                                        const text = paneEditor
                                          .getModel()
                                          .getValueInRange(selection);

                                        setCursorPos({
                                          line: position.lineNumber,
                                          column: position.column,
                                          selLength: text.length,
                                        });
                                      },
                                    );
                                  };

                                  // Attach to both editors
                                  [original, modified].forEach((paneEditor) => {
                                    paneEditor.onDidChangeCursorPosition(() =>
                                      updateCursorInfo(paneEditor),
                                    );
                                    paneEditor.onDidChangeCursorSelection(() =>
                                      updateCursorInfo(paneEditor),
                                    );
                                  });

                                  monaco.editor.defineTheme(
                                    "custom-diff-theme",
                                    {
                                      base:
                                        theme === "light" ? "vs" : "vs-dark",
                                      inherit: true,
                                      rules: [],
                                      colors:
                                        theme === "light"
                                          ? {
                                              // Light mode
                                              "diffEditor.insertedTextBackground":
                                                "#eab308",
                                              "diffEditor.removedTextBackground":
                                                "#eab308",
                                              "diffEditor.insertedLineBackground":
                                                "#fef9c3",
                                              "diffEditor.removedLineBackground":
                                                "#fef9c3",

                                              // full selection override
                                              // "editor.selectionBackground":
                                              //   "#86efac",
                                              // "editor.selectionHighlightBackground":
                                              //   "#86efac80",
                                              // "editor.inactiveSelectionBackground":
                                              //   "#86efac40",
                                              // "editor.selectionForeground":
                                              //   "#000000",
                                              // "editor.selectionBorder":
                                              //   "#00000000",
                                              // "editor.selectionHighlightBorder":
                                              //   "#00000000",
                                            }
                                          : {
                                              // Dark mode
                                              "diffEditor.insertedTextBackground":
                                                "#b08900",
                                              "diffEditor.removedTextBackground":
                                                "#b08900",
                                              "diffEditor.insertedLineBackground":
                                                "#4a3d01",
                                              "diffEditor.removedLineBackground":
                                                "#4a3d01",

                                              // full selection override
                                              // "editor.selectionBackground":
                                              //   "#22c55e",
                                              // "editor.selectionHighlightBackground":
                                              //   "#22c55e80",
                                              // "editor.inactiveSelectionBackground":
                                              //   "#22c55e40",
                                              // "editor.selectionForeground":
                                              //   "#000000",
                                              // "editor.selectionBorder":
                                              //   "#00000000",
                                              // "editor.selectionHighlightBorder":
                                              //   "#00000000",
                                            },
                                    },
                                  );

                                  monaco.editor.setTheme("custom-diff-theme");
                                }}
                              />
                              <div className="text-primary text-right text-xs">
                                {cursorPos.selLength !== 0 &&
                                  `Sel: ${cursorPos.selLength}, `}
                                Ln: {cursorPos.line}, Col: {cursorPos.column}
                              </div>
                            </SheetHeader>
                          </SheetContent>
                        </Sheet>
                      </td>
                      <td className="p-2 text-xs">
                        {isMatch ? (
                          <span className="rounded-sm px-4 py-1 text-green-700">
                            Match
                          </span>
                        ) : (
                          <span className="rounded-sm px-2 py-1 text-red-700">
                            Different
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      ) : null}

      <IdentifierDialog
        open={showDialog}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />
    </div>
  );
}
