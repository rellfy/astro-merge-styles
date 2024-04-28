import type {AstroIntegration} from 'astro';
import {GlobOptions, globSync} from "glob";
import fs from "fs";
import {ViteDevServer} from "vite";

let serverRef: ViteDevServer;

export default function createPlugin(): AstroIntegration {
	return {
		name: "astro-merge-styles",
		hooks: {
			"astro:build:ssr": ({ manifest }) => {
				// TODO: optimise this, as a lot of duplicate CSS may be sent.
				const indexedStyles = manifest.routes.map((r, i) => ({
					styles: r.styles,
					i,
				}));
				const routes = Object.values(manifest.routes);
				for (let i = 0; i < routes.length; i++) {
					const route = routes[i];
					for (const styles of indexedStyles) {
						if (i == styles.i) {
							// Skip duplicating styles from origin route.
							continue;
						}
						route.styles.push(...styles.styles);
					}
				}
			},
			"astro:server:setup": async ({ server }) => {
				serverRef = server;
				const options: GlobOptions = {
					nodir: true,
					root: server.config.root
				};
				const filePaths = globSync("/src/**/*", options)
					.map(p => `${p}`)
					.filter(p => {
						return fs.lstatSync(p).isFile();
					});
				const modules = [];
				for (const filePath of filePaths) {
					try {
						// const result = await server.ssrFetchModule(filePath);
						// await server.warmupRequest("/info", { ssr: true });
						// modules.push(new ModuleNode(filePath));
						const module = await server.moduleGraph.ensureEntryFromUrl(filePath, true, true);
						// await server.ssrLoadModule(filePath);
					} catch (e) {
						console.error("error loading module:", e);
					}
					// await server.moduleGraph.ensureEntryFromUrl(filePath);
				}
				// await getSortedPreloadedMatches({
				// 	pipeline,
				// 	matches: manifestData.routes,
				// 	settings: pipeline.settings,
				// });
			},
			"astro:server:start": () => {
				console.log("resolved urls:", serverRef.resolvedUrls);
			},
		},
	};
};
