"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import fallbackStockData from "@/data/stock.json";
import { Package, TreePine, Wrench, Palette, Database, FileJson, RefreshCw } from "lucide-react";
import useSWR from "swr";

type StockData = typeof fallbackStockData & { source?: string };

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("en-GB", {
		style: "currency",
		currency: "GBP",
	}).format(amount);
}

function getStockStatusBadge(status: string) {
	switch (status.toLowerCase()) {
		case "in stock":
			return <Badge variant="success">{status}</Badge>;
		case "low stock":
			return <Badge variant="warning">{status}</Badge>;
		case "out of stock":
			return <Badge variant="destructive">{status}</Badge>;
		case "made to order":
			return <Badge variant="secondary">{status}</Badge>;
		case "available":
			return <Badge variant="success">{status}</Badge>;
		case "booked":
			return <Badge variant="warning">{status}</Badge>;
		default:
			return <Badge variant="outline">{status}</Badge>;
	}
}

export default function StockPage() {
	const { data, error, isLoading, mutate } = useSWR<StockData>("/api/stock", fetcher, {
		fallbackData: fallbackStockData as StockData,
		revalidateOnFocus: false,
	});

	const stockData = data || fallbackStockData;
	const { products, materials, services, decorators } = stockData;

	return (
		<div className="container mx-auto py-8 px-4">
			<div className="mb-8 flex items-start justify-between">
				<div>
					<h1 className="text-4xl font-bold mb-2">Stock Inventory</h1>
					<p className="text-muted-foreground">
						Complete inventory of products, materials, services, and decorators
					</p>
					<div className="flex items-center gap-2 mt-2">
						{stockData.source === "database" ? (
							<Badge variant="success" className="gap-1">
								<Database className="h-3 w-3" />
								Live from Database
							</Badge>
						) : stockData.source === "json-fallback" ? (
							<Badge variant="warning" className="gap-1">
								<FileJson className="h-3 w-3" />
								JSON Fallback
							</Badge>
						) : (
							<Badge variant="secondary" className="gap-1">
								<FileJson className="h-3 w-3" />
								Static Data
							</Badge>
						)}
						{isLoading && (
							<Badge variant="outline" className="gap-1">
								<RefreshCw className="h-3 w-3 animate-spin" />
								Loading...
							</Badge>
						)}
						<button
							onClick={() => mutate()}
							className="text-xs text-muted-foreground hover:text-foreground transition-colors"
							title="Refresh data"
						>
							<RefreshCw className="h-4 w-4" />
						</button>
					</div>
				</div>
				<ThemeToggle />
			</div>

			<Tabs defaultValue="products" className="w-full">
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="products" className="flex items-center gap-2">
						<Package className="h-4 w-4" />
						Products
					</TabsTrigger>
					<TabsTrigger value="materials" className="flex items-center gap-2">
						<TreePine className="h-4 w-4" />
						Materials
					</TabsTrigger>
					<TabsTrigger value="services" className="flex items-center gap-2">
						<Wrench className="h-4 w-4" />
						Services
					</TabsTrigger>
					<TabsTrigger value="decorators" className="flex items-center gap-2">
						<Palette className="h-4 w-4" />
						Decorators
					</TabsTrigger>
				</TabsList>

				<TabsContent value="products" className="mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Furniture Products</CardTitle>
							<CardDescription>
								Complete catalog of available furniture items with pricing and lead times
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Product Name</TableHead>
										<TableHead>Design Type</TableHead>
										<TableHead>Category</TableHead>
										<TableHead>Material</TableHead>
										<TableHead>Price</TableHead>
										<TableHead>Lead Time</TableHead>
										<TableHead>Stock Status</TableHead>
										<TableHead>Dimensions (cm)</TableHead>
										<TableHead>Upsell Opportunities</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{products.map((product) => (
										<TableRow key={product.id}>
											<TableCell className="font-medium">
												<div>
													<div>{product.name}</div>
													<div className="text-xs text-muted-foreground">
														{product.description}
													</div>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant="outline">{product.designType}</Badge>
											</TableCell>
											<TableCell>{product.category}</TableCell>
											<TableCell>
												{product.material}
												{"materialOptions" in product && product.materialOptions && (
													<div className="text-xs text-muted-foreground mt-1">
														Options: {product.materialOptions.join(", ")}
													</div>
												)}
											</TableCell>
											<TableCell className="font-semibold">
												{formatCurrency(product.price)}
												{"notes" in product && product.notes && (
													<div className="text-xs text-muted-foreground mt-1 font-normal">
														*{product.notes}
													</div>
												)}
											</TableCell>
											<TableCell>{product.leadTimeDays} days</TableCell>
											<TableCell>
												{getStockStatusBadge(product.stockStatus)}
												{product.quantityAvailable > 0 && (
													<div className="text-xs text-muted-foreground mt-1">
														Qty: {product.quantityAvailable}
													</div>
												)}
											</TableCell>
											<TableCell>
												{typeof product.dimensions.length === "string" ? (
													<span className="text-muted-foreground">
														{product.dimensions.length} × {product.dimensions.width} ×{" "}
														{product.dimensions.height}
													</span>
												) : (
													<>
														{product.dimensions.length} × {product.dimensions.width} ×{" "}
														{product.dimensions.height}
													</>
												)}
												{"requiresMeasurement" in product && product.requiresMeasurement && (
													<Badge variant="warning" className="ml-2 text-xs">
														Requires Measurement
													</Badge>
												)}
												{"features" in product && product.features && (
													<div className="text-xs text-muted-foreground mt-2">
														<strong>Features:</strong> {product.features.join(", ")}
													</div>
												)}
											</TableCell>
											<TableCell>
												{product.upsellOpportunities.length > 0 ? (
													<div className="space-y-1">
														{product.upsellOpportunities.map((upsell, idx) => (
															<div key={idx} className="text-xs">
																<span className="font-medium">{upsell.name}</span>
																<div className="text-muted-foreground">
																	{upsell.reason}
																</div>
															</div>
														))}
													</div>
												) : (
													<span className="text-muted-foreground text-xs">
														None
													</span>
												)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="materials" className="mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Timber & Materials</CardTitle>
							<CardDescription>
								Available wood types and materials with pricing and availability
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Wood Type</TableHead>
										<TableHead>Grade</TableHead>
										<TableHead>Price per Unit</TableHead>
										<TableHead>Availability</TableHead>
										<TableHead>Lead Time</TableHead>
										<TableHead>Quantity Available</TableHead>
										<TableHead>Suitable For</TableHead>
										<TableHead>Characteristics</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{materials.map((material) => (
										<TableRow key={material.id}>
											<TableCell className="font-medium">{material.woodType}</TableCell>
											<TableCell>
												<Badge variant="outline">{material.grade}</Badge>
											</TableCell>
											<TableCell className="font-semibold">
												{formatCurrency(material.pricePerUnit)} / {material.unit}
											</TableCell>
											<TableCell>{getStockStatusBadge(material.availability)}</TableCell>
											<TableCell>{material.leadTimeDays} days</TableCell>
											<TableCell>
												{material.quantityAvailable > 0 ? (
													<span>{material.quantityAvailable} {material.unit}s</span>
												) : (
													<span className="text-muted-foreground">0</span>
												)}
											</TableCell>
											<TableCell>
												<div className="flex flex-wrap gap-1">
													{material.suitableFor.map((use, idx) => (
														<Badge key={idx} variant="secondary" className="text-xs">
															{use}
														</Badge>
													))}
												</div>
											</TableCell>
											<TableCell>
												<div className="flex flex-wrap gap-1">
													{material.characteristics.map((char, idx) => (
														<span key={idx} className="text-xs text-muted-foreground">
															{char}
															{idx < material.characteristics.length - 1 && ", "}
														</span>
													))}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="services" className="mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Services</CardTitle>
							<CardDescription>
								Available services with pricing and lead times
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{services.map((service) => (
									<Card key={service.id}>
										<CardHeader>
											<CardTitle className="text-lg">{service.name}</CardTitle>
											<CardDescription>{service.description}</CardDescription>
										</CardHeader>
										<CardContent className="space-y-4">
											<div>
												<div className="text-sm text-muted-foreground">Price per Job</div>
												<div className="text-2xl font-bold">
													{formatCurrency(service.pricePerJob)}
												</div>
											</div>
											<div>
												<div className="text-sm text-muted-foreground">Lead Time</div>
												<div className="font-medium">{service.leadTimeDays} days</div>
											</div>
											<div>
												<div className="text-sm text-muted-foreground mb-2">
													Availability
												</div>
												{getStockStatusBadge(service.availability)}
											</div>
											<div>
												<div className="text-sm text-muted-foreground mb-2">
													Suitable For
												</div>
												<div className="flex flex-wrap gap-1">
													{service.suitableFor.map((item, idx) => (
														<Badge key={idx} variant="outline" className="text-xs">
															{item}
														</Badge>
													))}
												</div>
											</div>
											<div>
												<div className="text-sm text-muted-foreground mb-2">Includes</div>
												<ul className="list-disc list-inside text-sm space-y-1">
													{service.includes.map((item, idx) => (
														<li key={idx} className="text-muted-foreground">
															{item}
														</li>
													))}
												</ul>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="decorators" className="mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Available Decorators</CardTitle>
							<CardDescription>
								Professional decorators with specialties, pricing, and availability
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
								{decorators.map((decorator) => (
									<Card key={decorator.id}>
										<CardHeader>
											<CardTitle className="text-lg">{decorator.name}</CardTitle>
											<CardDescription>
												<Badge variant="secondary">{decorator.specialty}</Badge>
											</CardDescription>
										</CardHeader>
										<CardContent className="space-y-4">
											<div>
												<div className="text-sm text-muted-foreground">Price per Job</div>
												<div className="text-2xl font-bold">
													{formatCurrency(decorator.pricePerJob)}
												</div>
											</div>
											<div className="grid grid-cols-2 gap-4">
												<div>
													<div className="text-sm text-muted-foreground">Lead Time</div>
													<div className="font-medium">{decorator.leadTimeDays} days</div>
												</div>
												<div>
													<div className="text-sm text-muted-foreground">Experience</div>
													<div className="font-medium">{decorator.experience}</div>
												</div>
											</div>
											<div>
												<div className="text-sm text-muted-foreground mb-2">
													Availability
												</div>
												{getStockStatusBadge(decorator.availability)}
											</div>
											<div>
												<div className="text-sm text-muted-foreground mb-2">Rating</div>
												<div className="flex items-center gap-2">
													<span className="font-semibold">{decorator.rating}</span>
													<span className="text-muted-foreground text-sm">/ 5.0</span>
												</div>
											</div>
											<div>
												<div className="text-sm text-muted-foreground mb-2">Services</div>
												<ul className="list-disc list-inside text-sm space-y-1">
													{decorator.services.map((service, idx) => (
														<li key={idx} className="text-muted-foreground">
															{service}
														</li>
													))}
												</ul>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
