import { defineNuxtConfig } from "nuxt/config";
import type { NuxtConfig } from "nuxt/schema";

const isDevelopment = process.env.NODE_ENV === "development";
const isProduction = process.env.NODE_ENV === "production";

// https://nuxt.com/docs/api/configuration/nuxt-config
const config: NuxtConfig = defineNuxtConfig({
  devtools: { enabled: isDevelopment },
  devServer: {
    port: Number(process.env.WEBAPP_PORT || 3000),
  },
  nitro: {
    minify: isProduction,
    sourceMap: isDevelopment,
    output: {
      dir: "../../dist/apps/webapp",
    },
  },
  modules: ["@nuxt/ui"],
  css: ["~/assets/css/tailwind.css"],
  compatibilityDate: "2025-08-04",
  // Production optimizations
  ...(isProduction && {
    ssr: true,
    experimental: {
      payloadExtraction: false,
    },
  }),
  // Development optimizations
  ...(isDevelopment && {
    sourcemap: {
      server: true,
      client: true,
    },
  }),
});

export default config;
