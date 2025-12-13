import Link from "next/link";

export default function HomePage() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-background">
			<div className="text-center space-y-4">
				<h1 className="text-4xl font-bold">Epiminds Carpentry</h1>
				<p className="text-muted-foreground">Welcome to our carpentry services</p>
				<div className="flex gap-4 justify-center mt-8">
					<Link
						href="/stock"
						className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
					>
						View Stock
					</Link>
				</div>
			</div>
		</div>
	);
}
