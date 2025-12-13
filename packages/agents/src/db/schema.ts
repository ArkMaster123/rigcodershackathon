import dotenv from "dotenv";
import { Pool } from "pg";
import * as path from "path";
import { fileURLToPath } from "url";

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../../../.env.local") });

// Create a lazy-initialized connection pool for the stock database
let _pool: Pool | null = null;

function getConnectionString(): string {
	return process.env.DB || process.env.SOCIALS_DB || "";
}

export function getPool(): Pool {
	if (!_pool) {
		const connectionString = getConnectionString();
		console.log("Creating DB pool with connection string:", connectionString ? "✓ configured" : "✗ missing");
		_pool = new Pool({
			connectionString: connectionString.replace("?sslmode=require", ""),
			ssl: connectionString.includes("sslmode=require")
				? { rejectUnauthorized: false }
				: false,
			max: 10,
			idleTimeoutMillis: 30000,
			connectionTimeoutMillis: 10000,
		});
	}
	return _pool;
}

// For backwards compatibility
export const pool = {
	connect: () => getPool().connect(),
	query: (...args: Parameters<Pool["query"]>) => getPool().query(...args),
	end: () => _pool?.end(),
};

// ============================================================================
// Types for the Stock Database
// ============================================================================

export interface Product {
	id: string;
	name: string;
	description: string;
	design_type: string;
	category: string;
	price: number;
	lead_time_days: number;
	material: string;
	material_options: string[] | null;
	dimensions_length: string;
	dimensions_width: string;
	dimensions_height: string;
	unit: string;
	stock_status: string;
	quantity_available: number;
	requires_measurement: boolean;
	features: string[] | null;
	weight_capacity: number;
	complexity: string;
	notes: string | null;
	created_at: Date;
	updated_at: Date;
}

export interface UpsellOpportunity {
	id: string;
	product_id: string;
	upsell_product_id: string;
	upsell_name: string;
	reason: string;
}

export interface Material {
	id: string;
	wood_type: string;
	grade: string;
	price_per_unit: number;
	unit: string;
	availability: string;
	lead_time_days: number;
	quantity_available: number;
	suitable_for: string[];
	characteristics: string[];
	created_at: Date;
	updated_at: Date;
}

export interface Service {
	id: string;
	name: string;
	description: string;
	price_per_job: number;
	lead_time_days: number;
	availability: string;
	suitable_for: string[];
	includes: string[];
	created_at: Date;
	updated_at: Date;
}

export interface Decorator {
	id: string;
	name: string;
	specialty: string;
	price_per_job: number;
	lead_time_days: number;
	availability: string;
	experience: string;
	rating: number;
	services: string[];
	created_at: Date;
	updated_at: Date;
}

// ============================================================================
// Initialize Database Tables
// ============================================================================

export async function initializeStockDB() {
	const client = await pool.connect();

	try {
		// Products table
		await client.query(`
			CREATE TABLE IF NOT EXISTS products (
				id VARCHAR(50) PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				description TEXT,
				design_type VARCHAR(100),
				category VARCHAR(100),
				price DECIMAL(10, 2) NOT NULL,
				lead_time_days INTEGER DEFAULT 0,
				material VARCHAR(100),
				material_options TEXT[],
				dimensions_length VARCHAR(50),
				dimensions_width VARCHAR(50),
				dimensions_height VARCHAR(50),
				unit VARCHAR(20) DEFAULT 'cm',
				stock_status VARCHAR(50) DEFAULT 'In Stock',
				quantity_available INTEGER DEFAULT 0,
				requires_measurement BOOLEAN DEFAULT FALSE,
				features TEXT[],
				weight_capacity INTEGER,
				complexity VARCHAR(50),
				notes TEXT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);

		// Upsell opportunities table
		await client.query(`
			CREATE TABLE IF NOT EXISTS upsell_opportunities (
				id SERIAL PRIMARY KEY,
				product_id VARCHAR(50) REFERENCES products(id) ON DELETE CASCADE,
				upsell_product_id VARCHAR(50),
				upsell_name VARCHAR(255),
				reason TEXT
			)
		`);

		// Materials table
		await client.query(`
			CREATE TABLE IF NOT EXISTS materials (
				id VARCHAR(50) PRIMARY KEY,
				wood_type VARCHAR(100) NOT NULL,
				grade VARCHAR(50),
				price_per_unit DECIMAL(10, 2) NOT NULL,
				unit VARCHAR(50) DEFAULT 'board foot',
				availability VARCHAR(50) DEFAULT 'In Stock',
				lead_time_days INTEGER DEFAULT 0,
				quantity_available INTEGER DEFAULT 0,
				suitable_for TEXT[],
				characteristics TEXT[],
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);

		// Services table
		await client.query(`
			CREATE TABLE IF NOT EXISTS services (
				id VARCHAR(50) PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				description TEXT,
				price_per_job DECIMAL(10, 2) NOT NULL,
				lead_time_days INTEGER DEFAULT 0,
				availability VARCHAR(50) DEFAULT 'Available',
				suitable_for TEXT[],
				includes TEXT[],
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);

		// Decorators table
		await client.query(`
			CREATE TABLE IF NOT EXISTS decorators (
				id VARCHAR(50) PRIMARY KEY,
				name VARCHAR(255) NOT NULL,
				specialty VARCHAR(255),
				price_per_job DECIMAL(10, 2) NOT NULL,
				lead_time_days INTEGER DEFAULT 0,
				availability VARCHAR(50) DEFAULT 'Available',
				experience VARCHAR(50),
				rating DECIMAL(2, 1) DEFAULT 0,
				services TEXT[],
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);

		// Orders table for tracking sales
		await client.query(`
			CREATE TABLE IF NOT EXISTS orders (
				id SERIAL PRIMARY KEY,
				product_id VARCHAR(50) REFERENCES products(id),
				customer_name VARCHAR(255),
				customer_email VARCHAR(255),
				quantity INTEGER DEFAULT 1,
				total_price DECIMAL(10, 2),
				status VARCHAR(50) DEFAULT 'pending',
				notes TEXT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			)
		`);

		console.log("✅ Stock database tables initialized successfully");
	} catch (error) {
		console.error("❌ Error initializing stock database:", error);
		throw error;
	} finally {
		client.release();
	}
}

// ============================================================================
// Check Database Connection
// ============================================================================

export async function isStockDBConnected(): Promise<boolean> {
	try {
		const client = await pool.connect();
		await client.query("SELECT 1");
		client.release();
		return true;
	} catch (error) {
		console.error("Stock database connection check failed:", error);
		return false;
	}
}
