const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

let scanned = 0;
let modified = 0;

function getApiImport(filePath) {
    const relative = path.relative(path.dirname(filePath), path.join(ROOT, "src", "services", "api"));

    return relative.replace(/\\/g, "/").replace(/\.js$/, "");
}

function processFile(file) {

    if (!file.endsWith(".js") && !file.endsWith(".jsx")) return;

    scanned++;

    let content = fs.readFileSync(file, "utf8");

    const original = content;

    const usesApi =
        /\bapi\.(get|post|put|delete|patch)\s*\(/.test(content);

    const usesAxios =
        /\baxios\.(get|post|put|delete|patch)\s*\(/.test(content);

    const hasAxiosImport =
        /import\s+axios\s+from\s+["']axios["'];?/.test(content);

    const hasApiImport =
        /import\s+api\s+from\s+["'].*api["'];?/.test(content);

    // Case 1
    if (usesApi && hasAxiosImport && !hasApiImport) {

        const apiPath = getApiImport(file);

        content = content.replace(
            /import\s+axios\s+from\s+["']axios["'];?/,
            `import api from "${apiPath}";`
        );
    }

    // Case 2
    if (usesAxios && hasApiImport) {

        content = content.replace(/\baxios\./g, "api.");
    }

    if (content !== original) {

        modified++;

        fs.writeFileSync(file, content);

        console.log("✔ Fixed:", path.relative(ROOT, file));
    }
}

function walk(dir) {

    const files = fs.readdirSync(dir);

    for (const f of files) {

        const full = path.join(dir, f);

        const stat = fs.statSync(full);

        if (stat.isDirectory()) {

            if (
                f === "node_modules" ||
                f === ".git" ||
                f === "dist"
            ) continue;

            walk(full);

        } else {

            processFile(full);
        }
    }
}

walk(path.join(ROOT, "src"));

console.log("\n-----------------------");
console.log("Files scanned :", scanned);
console.log("Files modified:", modified);
console.log("-----------------------");