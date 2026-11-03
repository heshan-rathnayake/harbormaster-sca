import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig } from "eslint/config";
import base from "./base.js";

export default defineConfig([...nextVitals, ...nextTs, base]);
