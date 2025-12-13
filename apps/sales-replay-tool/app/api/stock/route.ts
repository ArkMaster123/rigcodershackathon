import { Pool } from "pg";
import { NextResponse } from "next/server";

// Create connection pool
const connectionString = process.env.DB || process.env.SOCIALS_DB || "";

const pool = new Pool({
	connectionString: connectionString.replace("?sslmode=require", ""),
	ssl: connectionString.includes("sslmode=require")
		? { rejectUnauthorized: false }
		: false,
	max: 5,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 10000,
});

export async function GET() {
	try {
		// Get products with upsells
		const productsResult = await pool.query(`
			SELECT 
				p.*,
				COALESCE(
					json_agg(
						json_build_object(
							'productId', u.upsell_product_id,
							'name', u.upsell_name,
							'reason', u.reason
						)
					) FILTER (WHERE u.id IS NOT NULL),
					'[]'
				) as upsell_opportunities
			FROM products p
			LEFT JOIN upsell_opportunities u ON p.id = u.product_id
			GROUP BY p.id
			ORDER BY p.name
		`);

		// Get materials
		const materialsResult = await pool.query(`
			SELECT * FROM materials ORDER BY wood_type
		`);

		// Get services
		const servicesResult = await pool.query(`
			SELECT * FROM services ORDER BY name
		`);

		// Get decorators
		const decoratorsResult = await pool.query(`
			SELECT * FROM decorators ORDER BY rating DESC, name
		`);

		// Transform to frontend format
		const products = productsResult.rows.map((p) => ({
			id: p.id,
			name: p.name,
			description: p.description,
			designType: p.design_type,
			category: p.category,
			price: parseFloat(p.price),
			leadTimeDays: p.lead_time_days,
			material: p.material,
			materialOptions: p.material_options,
			dimensions: {
				length: p.dimensions_length,
				width: p.dimensions_width,
				height: p.dimensions_height,
			},
			unit: p.unit,
			stockStatus: p.stock_status,
			quantityAvailable: p.quantity_available,
			requiresMeasurement: p.requires_measurement,
			features: p.features,
			upsellOpportunities: p.upsell_opportunities,
			weightCapacity: p.weight_capacity,
			complexity: p.complexity,
			notes: p.notes,
		}));

		const materials = materialsResult.rows.map((m) => ({
			id: m.id,
			woodType: m.wood_type,
			grade: m.grade,
			pricePerUnit: parseFloat(m.price_per_unit),
			unit: m.unit,
			availability: m.availability,
			leadTimeDays: m.lead_time_days,
			quantityAvailable: m.quantity_available,
			suitableFor: m.suitable_for,
			characteristics: m.characteristics,
		}));

		const services = servicesResult.rows.map((s) => ({
			id: s.id,
			name: s.name,
			description: s.description,
			pricePerJob: parseFloat(s.price_per_job),
			leadTimeDays: s.lead_time_days,
			availability: s.availability,
			suitableFor: s.suitable_for,
			includes: s.includes,
		}));

		const decorators = decoratorsResult.rows.map((d) => ({
			id: d.id,
			name: d.name,
			specialty: d.specialty,
			pricePerJob: parseFloat(d.price_per_job),
			leadTimeDays: d.lead_time_days,
			availability: d.availability,
			experience: d.experience,
			rating: parseFloat(d.rating),
			services: d.services,
		}));

		return NextResponse.json({
			products,
			materials,
			services,
			decorators,
			source: "database",
		});
	} catch (error) {
		console.error("Error fetching stock data:", error);
		
		// Fallback to JSON file if database fails
		try {
			const stockData = await import("@/data/stock.json");
			return NextResponse.json({
				...stockData.default,
				source: "json-fallback",
			});
		} catch {
			return NextResponse.json(
				{ error: "Failed to fetch stock data" },
				{ status: 500 }
			);
		}
	}
}
