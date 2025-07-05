"use client";

import { ModeToggle } from "./ModeToggle";

export default function Nav() {
	return (
		<div className="w-full h-10 bg-secondary flex justify-between items-center px-5">
			<span className="text-primary">Nav Bar</span>
			<ModeToggle />
		</div>
	);
}
