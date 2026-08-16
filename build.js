//client/build.js
const fs = require('fs');
const path = require('path');

// Load the CommonJS events from shared folder
const Events = require('./shared/events.js');

// Ensure the client/shared directory exists
const outDir = path.join(__dirname, 'client', 'shared');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

// Convert to ES Module format for the browser
const exportsStr = Object.entries(Events)
    .map(([key, value]) => `export const ${key} = "${value}";`)
    .join('\n');

// Save it directly into the client folder
fs.writeFileSync(path.join(outDir, 'events.js'), exportsStr);
console.log("Frontend events.js built successfully!");