"use client";

import { DiffEditor } from "@monaco-editor/react";
import { useTheme } from "next-themes";

export default function DiffViewer({ oldValue, newValue }) {
	const { theme } = useTheme();
	return (
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
				readOnly: true,
				wordWrap: "off",
				scrollBeyondLastLine: false,
				renderWhitespace: "all",
				minimap: { enabled: false },
			}}
		/>
	);
}
