/** @type {import('next').NextConfig} */
const nextConfig = {
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		unoptimized: true,
	},
	transpilePackages: ["@hack/agents", "@hack/floor"],
};

export default nextConfig;
