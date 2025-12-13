import type { Metadata } from "next";
import type React from "react";
import "../styles/globals.css";

export const metadata: Metadata = {
	title: "Epiminds Carpentry",
	description: "Professional carpentry services and furniture",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className="font-sans antialiased">{children}</body>
		</html>
	);
}
