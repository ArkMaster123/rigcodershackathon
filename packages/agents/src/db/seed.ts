import dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../../../.env.local") });

import { pool, initializeStockDB } from "./schema";

// Stock data to seed
const stockData = {
	products: [
		{
			id: "prod-001",
			name: "Oak Dining Table",
			description: "Handcrafted solid oak dining table with traditional joinery",
			design_type: "Traditional",
			category: "Dining",
			price: 2499.99,
			lead_time_days: 42,
			material: "Oak",
			dimensions_length: "200",
			dimensions_width: "90",
			dimensions_height: "75",
			stock_status: "In Stock",
			quantity_available: 3,
			weight_capacity: 150,
			complexity: "Medium",
			upsells: [
				{ id: "prod-002", name: "Matching Oak Chairs", reason: "Complete the dining set" },
				{ id: "prod-015", name: "Table Runner Set", reason: "Protect and enhance the table" },
			],
		},
		{
			id: "prod-002",
			name: "Matching Oak Chairs",
			description: "Set of 4 handcrafted oak dining chairs with upholstered seats",
			design_type: "Traditional",
			category: "Dining",
			price: 1299.99,
			lead_time_days: 35,
			material: "Oak",
			dimensions_length: "45",
			dimensions_width: "50",
			dimensions_height: "95",
			stock_status: "In Stock",
			quantity_available: 2,
			weight_capacity: 120,
			complexity: "Low",
			upsells: [{ id: "prod-001", name: "Oak Dining Table", reason: "Complete the dining set" }],
		},
		{
			id: "prod-003",
			name: "Modern Teak Coffee Table",
			description: "Contemporary coffee table with clean lines and hidden storage",
			design_type: "Modern",
			category: "Living Room",
			price: 1899.99,
			lead_time_days: 28,
			material: "Teak",
			dimensions_length: "120",
			dimensions_width: "60",
			dimensions_height: "40",
			stock_status: "Low Stock",
			quantity_available: 1,
			weight_capacity: 50,
			complexity: "Medium",
			upsells: [{ id: "prod-004", name: "Matching Side Tables", reason: "Create a cohesive living room set" }],
		},
		{
			id: "prod-004",
			name: "Matching Side Tables",
			description: "Pair of modern teak side tables with drawer storage",
			design_type: "Modern",
			category: "Living Room",
			price: 899.99,
			lead_time_days: 28,
			material: "Teak",
			dimensions_length: "50",
			dimensions_width: "50",
			dimensions_height: "55",
			stock_status: "In Stock",
			quantity_available: 4,
			weight_capacity: 30,
			complexity: "Low",
			upsells: [{ id: "prod-003", name: "Modern Teak Coffee Table", reason: "Create a cohesive living room set" }],
		},
		{
			id: "prod-005",
			name: "Custom Bookshelf Unit",
			description: "Floor-to-ceiling bookshelf with adjustable shelves",
			design_type: "Custom",
			category: "Storage",
			price: 3299.99,
			lead_time_days: 56,
			material: "Pine",
			dimensions_length: "180",
			dimensions_width: "40",
			dimensions_height: "240",
			stock_status: "Made to Order",
			quantity_available: 0,
			weight_capacity: 200,
			complexity: "High",
			upsells: [{ id: "svc-001", name: "Custom Installation Service", reason: "Professional installation for large items" }],
		},
		{
			id: "prod-006",
			name: "Walnut Bed Frame",
			description: "Solid walnut bed frame with integrated storage drawers",
			design_type: "Contemporary",
			category: "Bedroom",
			price: 4299.99,
			lead_time_days: 49,
			material: "Walnut",
			dimensions_length: "210",
			dimensions_width: "160",
			dimensions_height: "50",
			stock_status: "In Stock",
			quantity_available: 2,
			weight_capacity: 300,
			complexity: "High",
			upsells: [
				{ id: "prod-007", name: "Matching Nightstands", reason: "Complete the bedroom set" },
				{ id: "svc-002", name: "Premium Finishing Service", reason: "Enhance the natural wood grain" },
			],
		},
		{
			id: "prod-007",
			name: "Matching Nightstands",
			description: "Pair of walnut nightstands with drawer and shelf",
			design_type: "Contemporary",
			category: "Bedroom",
			price: 1199.99,
			lead_time_days: 42,
			material: "Walnut",
			dimensions_length: "50",
			dimensions_width: "40",
			dimensions_height: "60",
			stock_status: "In Stock",
			quantity_available: 3,
			weight_capacity: 25,
			complexity: "Medium",
			upsells: [{ id: "prod-006", name: "Walnut Bed Frame", reason: "Complete the bedroom set" }],
		},
		{
			id: "prod-008",
			name: "Cherry Wood Desk",
			description: "Executive desk with multiple drawers and cable management",
			design_type: "Traditional",
			category: "Office",
			price: 3499.99,
			lead_time_days: 63,
			material: "Cherry",
			dimensions_length: "180",
			dimensions_width: "80",
			dimensions_height: "75",
			stock_status: "Made to Order",
			quantity_available: 0,
			weight_capacity: 100,
			complexity: "High",
			upsells: [{ id: "prod-009", name: "Matching Desk Chair", reason: "Complete the office setup" }],
		},
		{
			id: "prod-009",
			name: "Matching Desk Chair",
			description: "Ergonomic office chair with cherry wood accents",
			design_type: "Traditional",
			category: "Office",
			price: 899.99,
			lead_time_days: 35,
			material: "Cherry",
			dimensions_length: "60",
			dimensions_width: "60",
			dimensions_height: "120",
			stock_status: "In Stock",
			quantity_available: 5,
			weight_capacity: 150,
			complexity: "Medium",
			upsells: [{ id: "prod-008", name: "Cherry Wood Desk", reason: "Complete the office setup" }],
		},
		{
			id: "prod-010",
			name: "Maple Kitchen Island",
			description: "Custom kitchen island with butcher block top and storage",
			design_type: "Custom",
			category: "Kitchen",
			price: 5499.99,
			lead_time_days: 70,
			material: "Maple",
			dimensions_length: "150",
			dimensions_width: "90",
			dimensions_height: "90",
			stock_status: "Made to Order",
			quantity_available: 0,
			weight_capacity: 200,
			complexity: "High",
			upsells: [
				{ id: "svc-001", name: "Custom Installation Service", reason: "Professional installation for kitchen items" },
				{ id: "svc-002", name: "Premium Finishing Service", reason: "Food-safe finish for kitchen surfaces" },
			],
		},
		{
			id: "prod-011",
			name: "Fitted Wardrobe",
			description: "Custom fitted wardrobe made to measure for your space. Available in multiple materials and finishes with adjustable shelving and hanging rails",
			design_type: "Custom",
			category: "Bedroom",
			price: 4299.99,
			lead_time_days: 56,
			material: "Multiple Options",
			material_options: ["Oak", "Walnut", "Cherry", "Maple", "Pine"],
			dimensions_length: "Custom",
			dimensions_width: "Custom",
			dimensions_height: "Floor to Ceiling",
			stock_status: "Made to Order",
			quantity_available: 0,
			requires_measurement: true,
			features: ["Adjustable shelving", "Hanging rails", "Drawer options", "Mirror doors (optional)", "Lighting options", "Shoe storage", "Custom interior layout"],
			weight_capacity: 500,
			complexity: "High",
			notes: "Price is base price. Final price depends on dimensions, material choice, and custom features. Consultation and measurement required before order.",
			upsells: [
				{ id: "svc-005", name: "Custom Measurements", reason: "Required for fitted wardrobe - on-site measurement service" },
				{ id: "svc-001", name: "Custom Installation Service", reason: "Professional installation for fitted furniture" },
				{ id: "svc-002", name: "Premium Finishing Service", reason: "Custom finish to match your bedroom decor" },
				{ id: "svc-004", name: "Design Consultation", reason: "Expert advice on layout and storage solutions" },
				{ id: "prod-006", name: "Matching Bed Frame", reason: "Complete the bedroom set with coordinated furniture" },
				{ id: "prod-007", name: "Matching Nightstands", reason: "Create a cohesive bedroom design" },
			],
		},
	],
	materials: [
		{ id: "mat-001", wood_type: "Oak", grade: "Premium", price_per_unit: 45.5, unit: "board foot", availability: "In Stock", lead_time_days: 7, quantity_available: 500, suitable_for: ["Dining", "Living Room", "Office"], characteristics: ["Durable", "Heavy", "Traditional grain"] },
		{ id: "mat-002", wood_type: "Teak", grade: "Premium", price_per_unit: 68.75, unit: "board foot", availability: "Low Stock", lead_time_days: 14, quantity_available: 120, suitable_for: ["Outdoor", "Living Room", "Kitchen"], characteristics: ["Weather resistant", "Durable", "Natural oils"] },
		{ id: "mat-003", wood_type: "Walnut", grade: "Premium", price_per_unit: 52.0, unit: "board foot", availability: "In Stock", lead_time_days: 10, quantity_available: 350, suitable_for: ["Bedroom", "Office", "Living Room"], characteristics: ["Rich color", "Fine grain", "Premium finish"] },
		{ id: "mat-004", wood_type: "Cherry", grade: "Premium", price_per_unit: 48.25, unit: "board foot", availability: "In Stock", lead_time_days: 7, quantity_available: 400, suitable_for: ["Office", "Dining", "Traditional"], characteristics: ["Warm tone", "Smooth finish", "Ages beautifully"] },
		{ id: "mat-005", wood_type: "Maple", grade: "Premium", price_per_unit: 38.5, unit: "board foot", availability: "In Stock", lead_time_days: 5, quantity_available: 600, suitable_for: ["Kitchen", "Modern", "Light finish"], characteristics: ["Light color", "Hard", "Food safe"] },
		{ id: "mat-006", wood_type: "Pine", grade: "Standard", price_per_unit: 22.0, unit: "board foot", availability: "In Stock", lead_time_days: 3, quantity_available: 800, suitable_for: ["Storage", "Budget", "Custom"], characteristics: ["Lightweight", "Easy to work", "Cost effective"] },
		{ id: "mat-007", wood_type: "Mahogany", grade: "Premium", price_per_unit: 75.0, unit: "board foot", availability: "Out of Stock", lead_time_days: 21, quantity_available: 0, suitable_for: ["Luxury", "Traditional", "High-end"], characteristics: ["Rich red tone", "Premium", "Limited availability"] },
	],
	services: [
		{ id: "svc-001", name: "Custom Installation Service", description: "Professional installation for large furniture items", price_per_job: 299.99, lead_time_days: 3, availability: "Available", suitable_for: ["Large items", "Complex assembly", "Floor-to-ceiling units"], includes: ["Assembly", "Placement", "Leveling", "Basic adjustments"] },
		{ id: "svc-002", name: "Premium Finishing Service", description: "Custom wood finishing and staining service", price_per_job: 449.99, lead_time_days: 7, availability: "Available", suitable_for: ["Custom finishes", "Color matching", "Premium projects"], includes: ["Sanding", "Staining", "Sealing", "Quality inspection"] },
		{ id: "svc-003", name: "White Glove Delivery", description: "Premium delivery service with setup and removal of packaging", price_per_job: 199.99, lead_time_days: 2, availability: "Available", suitable_for: ["Premium customers", "Fragile items", "Time-sensitive"], includes: ["Careful handling", "Room placement", "Packaging removal", "Basic setup"] },
		{ id: "svc-004", name: "Design Consultation", description: "One-on-one consultation with our design expert", price_per_job: 149.99, lead_time_days: 1, availability: "Available", suitable_for: ["Custom projects", "Space planning", "Design decisions"], includes: ["1-hour consultation", "Design recommendations", "Material selection", "Follow-up notes"] },
		{ id: "svc-005", name: "Custom Measurements", description: "On-site measurement service for custom furniture", price_per_job: 99.99, lead_time_days: 1, availability: "Available", suitable_for: ["Custom orders", "Fitted furniture", "Precise requirements"], includes: ["Site visit", "Detailed measurements", "Photography", "Technical drawings"] },
		{ id: "svc-006", name: "Restoration Service", description: "Professional restoration of antique or damaged furniture", price_per_job: 599.99, lead_time_days: 14, availability: "Available", suitable_for: ["Antique furniture", "Damaged items", "Vintage pieces"], includes: ["Assessment", "Repair", "Refinishing", "Hardware replacement"] },
	],
	decorators: [
		{ id: "dec-001", name: "Sarah Mitchell", specialty: "Traditional & Classic", price_per_job: 799.99, lead_time_days: 5, availability: "Available", experience: "15 years", rating: 4.9, services: ["Color consultation", "Furniture placement", "Accessory selection", "Room styling"] },
		{ id: "dec-002", name: "James Chen", specialty: "Modern & Contemporary", price_per_job: 899.99, lead_time_days: 7, availability: "Available", experience: "12 years", rating: 4.8, services: ["Space planning", "Modern aesthetics", "Minimalist design", "Tech integration"] },
		{ id: "dec-003", name: "Emma Rodriguez", specialty: "Rustic & Farmhouse", price_per_job: 749.99, lead_time_days: 6, availability: "Available", experience: "10 years", rating: 4.7, services: ["Rustic styling", "Vintage finds", "Natural materials", "Cozy spaces"] },
		{ id: "dec-004", name: "Michael Thompson", specialty: "Luxury & High-End", price_per_job: 1299.99, lead_time_days: 10, availability: "Available", experience: "20 years", rating: 5.0, services: ["Luxury design", "Premium materials", "Custom solutions", "Full project management"] },
		{ id: "dec-005", name: "Lisa Park", specialty: "Scandinavian & Minimalist", price_per_job: 849.99, lead_time_days: 5, availability: "Booked", experience: "8 years", rating: 4.6, services: ["Scandinavian design", "Light colors", "Functional spaces", "Natural light"] },
	],
};

export async function seedDatabase() {
	console.log("🌱 Starting database seed...");

	// Initialize tables first
	await initializeStockDB();

	const client = await pool.connect();

	try {
		// Clear existing data
		console.log("🗑️ Clearing existing data...");
		await client.query("DELETE FROM upsell_opportunities");
		await client.query("DELETE FROM orders");
		await client.query("DELETE FROM products");
		await client.query("DELETE FROM materials");
		await client.query("DELETE FROM services");
		await client.query("DELETE FROM decorators");

		// Insert products
		console.log("📦 Inserting products...");
		for (const product of stockData.products) {
			await client.query(
				`INSERT INTO products (id, name, description, design_type, category, price, lead_time_days, material, material_options, dimensions_length, dimensions_width, dimensions_height, stock_status, quantity_available, requires_measurement, features, weight_capacity, complexity, notes)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
				[
					product.id,
					product.name,
					product.description,
					product.design_type,
					product.category,
					product.price,
					product.lead_time_days,
					product.material,
					product.material_options || null,
					product.dimensions_length,
					product.dimensions_width,
					product.dimensions_height,
					product.stock_status,
					product.quantity_available,
					product.requires_measurement || false,
					product.features || null,
					product.weight_capacity,
					product.complexity,
					product.notes || null,
				]
			);

			// Insert upsells
			if (product.upsells) {
				for (const upsell of product.upsells) {
					await client.query(
						`INSERT INTO upsell_opportunities (product_id, upsell_product_id, upsell_name, reason)
						 VALUES ($1, $2, $3, $4)`,
						[product.id, upsell.id, upsell.name, upsell.reason]
					);
				}
			}
		}

		// Insert materials
		console.log("🪵 Inserting materials...");
		for (const material of stockData.materials) {
			await client.query(
				`INSERT INTO materials (id, wood_type, grade, price_per_unit, unit, availability, lead_time_days, quantity_available, suitable_for, characteristics)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
				[
					material.id,
					material.wood_type,
					material.grade,
					material.price_per_unit,
					material.unit,
					material.availability,
					material.lead_time_days,
					material.quantity_available,
					material.suitable_for,
					material.characteristics,
				]
			);
		}

		// Insert services
		console.log("🔧 Inserting services...");
		for (const service of stockData.services) {
			await client.query(
				`INSERT INTO services (id, name, description, price_per_job, lead_time_days, availability, suitable_for, includes)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
				[
					service.id,
					service.name,
					service.description,
					service.price_per_job,
					service.lead_time_days,
					service.availability,
					service.suitable_for,
					service.includes,
				]
			);
		}

		// Insert decorators
		console.log("🎨 Inserting decorators...");
		for (const decorator of stockData.decorators) {
			await client.query(
				`INSERT INTO decorators (id, name, specialty, price_per_job, lead_time_days, availability, experience, rating, services)
				 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
				[
					decorator.id,
					decorator.name,
					decorator.specialty,
					decorator.price_per_job,
					decorator.lead_time_days,
					decorator.availability,
					decorator.experience,
					decorator.rating,
					decorator.services,
				]
			);
		}

		console.log("✅ Database seeded successfully!");
		console.log(`   - ${stockData.products.length} products`);
		console.log(`   - ${stockData.materials.length} materials`);
		console.log(`   - ${stockData.services.length} services`);
		console.log(`   - ${stockData.decorators.length} decorators`);
	} catch (error) {
		console.error("❌ Error seeding database:", error);
		throw error;
	} finally {
		client.release();
	}
}

// Run if called directly
if (require.main === module) {
	console.log("DB connection string available:", !!process.env.DB);
	seedDatabase()
		.then(() => {
			pool.end();
			process.exit(0);
		})
		.catch((err) => {
			console.error("Seed failed:", err);
			pool.end();
			process.exit(1);
		});
}
