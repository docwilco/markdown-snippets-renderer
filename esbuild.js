const { build } = require("esbuild");
const fs = require("fs");

const copyAndGeneratePlugin = {
    name: 'copy-and-generate',
    setup(build) {
        build.onStart(() => {
            console.log('Copying and generating files...');
            // Create directory if it doesn't exist
            if (!fs.existsSync('./out/styles')) {
                fs.mkdirSync('./out/styles', { recursive: true });
            }
            fs.readdirSync('./node_modules/highlight.js/styles', {
                recursive: true, withFileTypes: true
            }).filter(
                file => file.isFile()
                    && file.name.endsWith('.min.css')
            ).forEach(file => {
                // remove everything up to first styles/ in path
                // Windows likes to flip to backslash
                let subdir = file.path.replace(/.*?styles[/\\]?/, '');
                // Replace any separators that might be left
                subdir = subdir.replace(/[/\\]/g, '-');
                let outname = ((subdir !== '') ? subdir + '-' : '') + file.name;
                fs.copyFileSync(file.path + '/' + file.name, './out/styles/' + outname);
            });
        });
    }
};

const baseConfig = {
    bundle: true,
    minify: process.env.NODE_ENV === "production",
    sourcemap: process.env.NODE_ENV !== "production",
};

const extensionConfig = {
    ...baseConfig,
    platform: "node",
    mainFields: ["module", "main"],
    format: "cjs",
    entryPoints: ["./src/extension.ts"],
    outfile: "./out/extension.js",
    external: ["vscode"],
    plugins: [copyAndGeneratePlugin],
};

const watchConfig = {
    watch: {
        onRebuild(error, result) {
            console.log("[watch] build started");
            if (error) {
                error.errors.forEach(error =>
                    console.error(`> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`)
                );
            } else {
                console.log("[watch] build finished");
            }
        },
    },
};

const webviewConfig = {
    ...baseConfig,
    target: "es2020",
    format: "esm",
    entryPoints: ["./src/webview/main.ts"],
    outfile: "./out/webview.js",
};

(async () => {
    const args = process.argv.slice(2);
    try {
        if (args.includes("--watch")) {
            // Build and watch extension and webview code
            console.log("[watch] build started");
            await build({
                ...extensionConfig,
                ...watchConfig,
            });
            await build({
                ...webviewConfig,
                ...watchConfig,
            });
            console.log("[watch] build finished");
        } else {
            // Build extension and webview code
            await build(extensionConfig);
            await build(webviewConfig);
            console.log("build complete");
        }
    } catch (err) {
        process.stderr.write(err.stderr);
        process.exit(1);
    }
})();
