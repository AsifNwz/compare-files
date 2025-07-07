"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function IdentifierDialog({ open, onConfirm, onCancel }) {
  const [line, setLine] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Enter identifier position</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <Input
              type="number"
              placeholder="Line number (starting from 1)"
              value={line}
              onChange={(e) => setLine(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Start index"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
            <Input
              type="number"
              placeholder="End index"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} className={"cursor-pointer"}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const lineNum = parseInt(line, 10) - 1;
              const startNum = parseInt(start, 10);
              const endNum = parseInt(end, 10);
              onConfirm({ line: lineNum, start: startNum, end: endNum });
            }}
            className={"cursor-pointer"}
          >
            Compare
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
