import { z } from "zod";
import { getPool, type Product, type Material, type Service, type Decorator } from "./schema";

// Get pool reference
const pool = {
	query: (...args: Parameters<ReturnType<typeof getPool>["query"]>) => getPool().query(...args),
};

// ============================================================================
// Tool Schemas (for AI SDK tool calling)
// ============================================================================

export const getProductsSchema = z.object({
	category: z.string().optional().describe("Filter by category (e.g., 'Bedroom', 'Dining', 'Office')"),
	material: z.string().optional().describe("Filter by material (e.g., 'Oak', 'Walnut', 'Cherry')"),
	designType: z.string().optional().describe("Filter by design type (e.g., 'Custom', 'Modern', 'Traditional')"),
	inStockOnly: z.boolean().optional().describe("Only return products that are in stock"),
});

export const getProductByIdSchema = z.object({
	productId: z.string().describe("The product ID to look up (e.g., 'prod-011')"),
});

export const getMaterialsSchema = z.object({
	woodType: z.string().optional().describe("Filter by wood type (e.g., 'Oak', 'Walnut')"),
	inStockOnly: z.boolean().optional().describe("Only return materials that are in stock"),
});

export const checkMaterialAvailabilitySchema = z.object({
	woodType: z.string().describe("The type of wood to check (e.g., 'Oak', 'Teak')"),
	quantityNeeded: z.number().optional().describe("Amount needed in board feet"),
});

export const getServicesSchema = z.object({
	serviceType: z.string().optional().describe("Filter by service type or suitable use"),
});

export const getDecoratorsSchema = z.object({
	specialty: z.string().optional().describe("Filter by decorator specialty"),
	availableOnly: z.boolean().optional().describe("Only return available decorators"),
});

export const updateStockQuantitySchema = z.object({
	productId: z.string().describe("The product ID to update"),
	quantityChange: z.number().describe("Amount to add (positive) or remove (negative)"),
});

export const createOrderSchema = z.object({
	productId: z.string().describe("The product ID being ordered"),
	customerName: z.string().describe("Customer name"),
	customerEmail: z.string().optional().describe("Customer email"),
	quantity: z.number().default(1).describe("Quantity to order"),
	notes: z.string().optional().describe("Additional order notes"),
});

export const getLeadTimeSchema = z.object({
	productId: z.string().optional().describe("Product ID to check lead time"),
	serviceId: z.string().optional().describe("Service ID to check lead time"),
});

export const searchProductsSchema = z.object({
	query: z.string().describe("Search query for product name or description"),
});

// ============================================================================
// Tool Implementation Functions
// ============================================================================

/**
 * Get products with optional filters
 */
export async function getProducts(params: z.infer<typeof getProductsSchema>): Promise<Product[]> {
	const { category, material, designType, inStockOnly } = params;
	
	let query = "SELECT * FROM products WHERE 1=1";
	const values: any[] = [];
	let paramCount = 0;

	if (category) {
		paramCount++;
		query += ` AND LOWER(category) = LOWER($${paramCount})`;
		values.push(category);
	}
	if (material) {
		paramCount++;
		query += ` AND LOWER(material) = LOWER($${paramCount})`;
		values.push(material);
	}
	if (designType) {
		paramCount++;
		query += ` AND LOWER(design_type) = LOWER($${paramCount})`;
		values.push(designType);
	}
	if (inStockOnly) {
		query += " AND quantity_available > 0";
	}

	query += " ORDER BY name";

	const result = await pool.query(query, values);
	return result.rows;
}

/**
 * Get a specific product by ID with its upsell opportunities
 */
export async function getProductById(params: z.infer<typeof getProductByIdSchema>): Promise<{
	product: Product | null;
	upsellOpportunities: Array<{ name: string; reason: string }>;
}> {
	const { productId } = params;

	const productResult = await pool.query(
		"SELECT * FROM products WHERE id = $1",
		[productId]
	);

	if (productResult.rows.length === 0) {
		return { product: null, upsellOpportunities: [] };
	}

	const upsellResult = await pool.query(
		"SELECT upsell_name as name, reason FROM upsell_opportunities WHERE product_id = $1",
		[productId]
	);

	return {
		product: productResult.rows[0],
		upsellOpportunities: upsellResult.rows,
	};
}

/**
 * Get materials with optional filters
 */
export async function getMaterials(params: z.infer<typeof getMaterialsSchema>): Promise<Material[]> {
	const { woodType, inStockOnly } = params;

	let query = "SELECT * FROM materials WHERE 1=1";
	const values: any[] = [];
	let paramCount = 0;

	if (woodType) {
		paramCount++;
		query += ` AND LOWER(wood_type) = LOWER($${paramCount})`;
		values.push(woodType);
	}
	if (inStockOnly) {
		query += " AND quantity_available > 0";
	}

	query += " ORDER BY wood_type";

	const result = await pool.query(query, values);
	return result.rows;
}

/**
 * Check material availability and lead time
 */
export async function checkMaterialAvailability(params: z.infer<typeof checkMaterialAvailabilitySchema>): Promise<{
	available: boolean;
	woodType: string;
	quantityAvailable: number;
	pricePerUnit: number;
	leadTimeDays: number;
	status: string;
	message: string;
}> {
	const { woodType, quantityNeeded = 0 } = params;

	const result = await pool.query(
		"SELECT * FROM materials WHERE LOWER(wood_type) = LOWER($1)",
		[woodType]
	);

	if (result.rows.length === 0) {
		return {
			available: false,
			woodType,
			quantityAvailable: 0,
			pricePerUnit: 0,
			leadTimeDays: 0,
			status: "Not Found",
			message: `${woodType} is not in our inventory. Please check available wood types.`,
		};
	}

	const material = result.rows[0];
	const hasEnough = material.quantity_available >= quantityNeeded;

	return {
		available: hasEnough && material.availability !== "Out of Stock",
		woodType: material.wood_type,
		quantityAvailable: material.quantity_available,
		pricePerUnit: parseFloat(material.price_per_unit),
		leadTimeDays: material.lead_time_days,
		status: material.availability,
		message: hasEnough
			? `${woodType} is available. ${material.quantity_available} ${material.unit}s in stock at £${material.price_per_unit} per ${material.unit}.`
			: `${woodType} is ${material.availability.toLowerCase()}. Only ${material.quantity_available} ${material.unit}s available. Lead time: ${material.lead_time_days} days.`,
	};
}

/**
 * Get services with optional filters
 */
export async function getServices(params: z.infer<typeof getServicesSchema>): Promise<Service[]> {
	const { serviceType } = params;

	let query = "SELECT * FROM services WHERE 1=1";
	const values: any[] = [];

	if (serviceType) {
		query += ` AND ($1 = ANY(suitable_for) OR LOWER(name) LIKE LOWER($1))`;
		values.push(`%${serviceType}%`);
	}

	query += " ORDER BY name";

	const result = await pool.query(query, values);
	return result.rows;
}

/**
 * Get decorators with optional filters
 */
export async function getDecorators(params: z.infer<typeof getDecoratorsSchema>): Promise<Decorator[]> {
	const { specialty, availableOnly } = params;

	let query = "SELECT * FROM decorators WHERE 1=1";
	const values: any[] = [];
	let paramCount = 0;

	if (specialty) {
		paramCount++;
		query += ` AND LOWER(specialty) LIKE LOWER($${paramCount})`;
		values.push(`%${specialty}%`);
	}
	if (availableOnly) {
		query += " AND LOWER(availability) = 'available'";
	}

	query += " ORDER BY rating DESC, name";

	const result = await pool.query(query, values);
	return result.rows;
}

/**
 * Update stock quantity (for order processing)
 */
export async function updateStockQuantity(params: z.infer<typeof updateStockQuantitySchema>): Promise<{
	success: boolean;
	newQuantity: number;
	message: string;
}> {
	const { productId, quantityChange } = params;

	const result = await pool.query(
		`UPDATE products 
		 SET quantity_available = quantity_available + $1, 
		     updated_at = CURRENT_TIMESTAMP,
		     stock_status = CASE 
		       WHEN quantity_available + $1 <= 0 THEN 'Out of Stock'
		       WHEN quantity_available + $1 <= 2 THEN 'Low Stock'
		       ELSE 'In Stock'
		     END
		 WHERE id = $2 
		 RETURNING quantity_available, stock_status`,
		[quantityChange, productId]
	);

	if (result.rows.length === 0) {
		return { success: false, newQuantity: 0, message: "Product not found" };
	}

	return {
		success: true,
		newQuantity: result.rows[0].quantity_available,
		message: `Stock updated. New quantity: ${result.rows[0].quantity_available} (${result.rows[0].stock_status})`,
	};
}

/**
 * Create a new order
 */
export async function createOrder(params: z.infer<typeof createOrderSchema>): Promise<{
	success: boolean;
	orderId: number | null;
	message: string;
}> {
	const { productId, customerName, customerEmail, quantity, notes } = params;

	// Get product price
	const productResult = await pool.query(
		"SELECT price, quantity_available, name FROM products WHERE id = $1",
		[productId]
	);

	if (productResult.rows.length === 0) {
		return { success: false, orderId: null, message: "Product not found" };
	}

	const product = productResult.rows[0];
	
	if (product.quantity_available < quantity && product.quantity_available > 0) {
		return {
			success: false,
			orderId: null,
			message: `Insufficient stock. Only ${product.quantity_available} available.`,
		};
	}

	const totalPrice = parseFloat(product.price) * quantity;

	// Create order
	const orderResult = await pool.query(
		`INSERT INTO orders (product_id, customer_name, customer_email, quantity, total_price, notes)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id`,
		[productId, customerName, customerEmail, quantity, totalPrice, notes]
	);

	// Update stock if not made-to-order
	if (product.quantity_available > 0) {
		await updateStockQuantity({ productId, quantityChange: -quantity });
	}

	return {
		success: true,
		orderId: orderResult.rows[0].id,
		message: `Order #${orderResult.rows[0].id} created for ${product.name}. Total: £${totalPrice.toFixed(2)}`,
	};
}

/**
 * Get lead time for product or service
 */
export async function getLeadTime(params: z.infer<typeof getLeadTimeSchema>): Promise<{
	found: boolean;
	itemName: string;
	leadTimeDays: number;
	message: string;
}> {
	const { productId, serviceId } = params;

	if (productId) {
		const result = await pool.query(
			"SELECT name, lead_time_days, stock_status FROM products WHERE id = $1",
			[productId]
		);
		if (result.rows.length > 0) {
			const p = result.rows[0];
			return {
				found: true,
				itemName: p.name,
				leadTimeDays: p.lead_time_days,
				message: `${p.name}: ${p.lead_time_days} days lead time (${p.stock_status})`,
			};
		}
	}

	if (serviceId) {
		const result = await pool.query(
			"SELECT name, lead_time_days FROM services WHERE id = $1",
			[serviceId]
		);
		if (result.rows.length > 0) {
			const s = result.rows[0];
			return {
				found: true,
				itemName: s.name,
				leadTimeDays: s.lead_time_days,
				message: `${s.name}: ${s.lead_time_days} days lead time`,
			};
		}
	}

	return {
		found: false,
		itemName: "",
		leadTimeDays: 0,
		message: "Item not found",
	};
}

/**
 * Search products by name or description
 */
export async function searchProducts(params: z.infer<typeof searchProductsSchema>): Promise<Product[]> {
	const { query } = params;

	const result = await pool.query(
		`SELECT * FROM products 
		 WHERE LOWER(name) LIKE LOWER($1) 
		    OR LOWER(description) LIKE LOWER($1)
		    OR LOWER(category) LIKE LOWER($1)
		 ORDER BY name`,
		[`%${query}%`]
	);

	return result.rows;
}

// ============================================================================
// Export all tools as a registry for the agents
// ============================================================================

export const stockTools = {
	getProducts: {
		description: "Get a list of products with optional filters for category, material, or design type",
		parameters: getProductsSchema,
		execute: getProducts,
	},
	getProductById: {
		description: "Get detailed information about a specific product including upsell opportunities",
		parameters: getProductByIdSchema,
		execute: getProductById,
	},
	getMaterials: {
		description: "Get a list of available wood materials with pricing and availability",
		parameters: getMaterialsSchema,
		execute: getMaterials,
	},
	checkMaterialAvailability: {
		description: "Check if a specific wood type is available and get pricing/lead time",
		parameters: checkMaterialAvailabilitySchema,
		execute: checkMaterialAvailability,
	},
	getServices: {
		description: "Get available services like installation, finishing, delivery",
		parameters: getServicesSchema,
		execute: getServices,
	},
	getDecorators: {
		description: "Get available decorators with their specialties and pricing",
		parameters: getDecoratorsSchema,
		execute: getDecorators,
	},
	updateStockQuantity: {
		description: "Update product stock quantity (add or remove units)",
		parameters: updateStockQuantitySchema,
		execute: updateStockQuantity,
	},
	createOrder: {
		description: "Create a new order for a product",
		parameters: createOrderSchema,
		execute: createOrder,
	},
	getLeadTime: {
		description: "Get the lead time for a product or service",
		parameters: getLeadTimeSchema,
		execute: getLeadTime,
	},
	searchProducts: {
		description: "Search for products by name, description, or category",
		parameters: searchProductsSchema,
		execute: searchProducts,
	},
};
