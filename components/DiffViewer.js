"use client";

import { DiffEditor } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import Nav from "./Nav";
import { useState } from "react";
import { useDropzone } from "react-dropzone";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import IdentifierDialog from "./IdentifierDialog";

export default function DiffViewer() {
	const { theme } = useTheme();
	const [oldValue, setOldValue] = useState("");
	const [newValue, setNewValue] = useState("");
	const [comparisonSets, setComparisonSets] = useState([]);
	const [selectedIndex, setSelectedIndex] = useState(null);

	const [showDialog, setShowDialog] = useState(false);
	const [pendingFiles, setPendingFiles] = useState([]);

	const readFileContent = (file) => {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result);
			reader.readAsText(file);
		});
	};

	const compareMultiple = async (files, line, start, end) => {
		const contents = await Promise.all(files.map(readFileContent));
		const sets = [];
		const used = new Set();

		for (let i = 0; i < contents.length; i++) {
			if (used.has(i)) continue;

			const lines = contents[i].split("\n");
			const identifier = lines[line]?.slice(start, end);

			for (let j = i + 1; j < contents.length; j++) {
				if (used.has(j)) continue;

				if (contents[j].includes(identifier)) {
					sets.push([
						{ name: files[i].name, content: contents[i] },
						{ name: files[j].name, content: contents[j] },
					]);
					used.add(i);
					used.add(j);
					break;
				}
			}
		}

		setComparisonSets(sets);
		if (sets.length > 0) {
			setOldValue(sets[0][0].content);
			setNewValue(sets[0][1].content);
			setSelectedIndex(0);
			toast.success(`${sets.length} set(s) of files found.`);
		} else {
			toast.error("No matching identifier found in remaining files.");
		}
	};

	const onDrop = async (acceptedFiles) => {
		setComparisonSets([]);
		setSelectedIndex(null);

		if (acceptedFiles.length === 1) {
			const content = await readFileContent(acceptedFiles[0]);
			oldValue ? setNewValue(content) : setOldValue(content);
		} else if (acceptedFiles.length === 2) {
			const content1 = await readFileContent(acceptedFiles[0]);
			const content2 = await readFileContent(acceptedFiles[1]);
			setOldValue(content1);
			setNewValue(content2);
			setComparisonSets([
				[
					{ name: acceptedFiles[0].name, content: content1 },
					{ name: acceptedFiles[1].name, content: content2 },
				],
			]);
			setSelectedIndex(0);
		} else {
			setPendingFiles(acceptedFiles);
			setShowDialog(true);
		}
	};

	const handleDialogConfirm = async ({ line, start, end }) => {
		setShowDialog(false);
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
			<Nav />

			{!oldValue || !newValue ? (
				<div
					{...getRootProps()}
					className={`border-2 border-dashed border-gray-400 p-4 m-2 cursor-pointer ${
						!oldValue && !newValue ? "h-[90vh]" : "h-[30px]"
					}  flex justify-center items-center`}
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

			{comparisonSets.length > 1 && (
				<div className="p-4 flex gap-2 items-center">
					<label className="font-semibold text-sm text-nowrap">
						Select comparison set:
					</label>
					<Select
						onValueChange={(val) => {
							const index = parseInt(val, 10);
							setSelectedIndex(index);
							setOldValue(comparisonSets[index][0].content);
							setNewValue(comparisonSets[index][1].content);
						}}
						value={selectedIndex !== null ? String(selectedIndex) : undefined}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Choose file pair to compare" />
						</SelectTrigger>
						<SelectContent>
							{comparisonSets.map(([a, b], i) => (
								<SelectItem key={i} value={String(i)}>
									{i + 1}: {a.name} ⟷ {b.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			)}

			{oldValue || newValue ? (
				<DiffEditor
					height="92vh"
					theme={theme === "light" ? "vs-light" : "vs-dark"}
					language="plaintext"
					original={oldValue}
					modified={newValue}
					loading={
						<div className="flex items-center justify-center h-full">
							Comparing...
						</div>
					}
					options={{
						readOnly: false,
						wordWrap: "off",
						scrollBeyondLastLine: false,
						renderWhitespace: "all",
						minimap: { enabled: false },
					}}
				/>
			) : null}

			<IdentifierDialog
				open={showDialog}
				onConfirm={handleDialogConfirm}
				onCancel={handleDialogCancel}
			/>
		</div>
	);
}
