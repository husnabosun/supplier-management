const fs = require("node:fs");
const path = require("node:path");

process.chdir(__dirname);

const localEnvPath = path.join(__dirname, "default-env.json");
if (fs.existsSync(localEnvPath)) {
    const localEnv = JSON.parse(fs.readFileSync(localEnvPath, "utf8"));
    for (const [key, value] of Object.entries(localEnv)) {
        if (process.env[key] === undefined) {
            process.env[key] = typeof value === "string" ? value : JSON.stringify(value);
        }
    }
}

process.env.PORT = process.env.PORT || "5000";
require("@sap/approuter")().start();
