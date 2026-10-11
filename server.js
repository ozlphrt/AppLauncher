const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const CONFIG_PATH = path.join(ROOT_DIR, 'apps.config.json');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function readConfig() {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function writeConfig(data) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

const server = http.createServer((req, res) => {
    // Handle CORS if needed
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = decodeURIComponent(reqUrl.pathname);

    // API: Set app status (keep or remove)
    if (req.method === 'POST' && pathname === '/api/set-status') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { repoName, action } = JSON.parse(body);
                const config = readConfig();
                if (!config.pinnedApps) config.pinnedApps = [];
                if (!config.hiddenApps) config.hiddenApps = [];

                if (action === 'remove') {
                    config.pinnedApps = config.pinnedApps.filter(name => name !== repoName);
                    if (!config.hiddenApps.includes(repoName)) {
                        config.hiddenApps.push(repoName);
                    }
                } else if (action === 'keep') {
                    config.hiddenApps = config.hiddenApps.filter(name => name !== repoName);
                    if (!config.pinnedApps.includes(repoName)) {
                        config.pinnedApps.push(repoName);
                    }
                }

                writeConfig(config);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, repoName, action, config }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API: Reorder apps
    if (req.method === 'POST' && pathname === '/api/reorder-apps') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { pinnedApps } = JSON.parse(body);
                if (!Array.isArray(pinnedApps)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'pinnedApps must be an array' }));
                    return;
                }
                const config = readConfig();
                config.pinnedApps = pinnedApps;
                writeConfig(config);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, pinnedApps: config.pinnedApps }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API: Set app category
    if (req.method === 'POST' && pathname === '/api/set-category') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { repoName, category } = JSON.parse(body);
                if (!repoName || !category) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'repoName and category are required' }));
                    return;
                }
                const config = readConfig();
                if (!config.overrides) config.overrides = {};
                if (!config.overrides[repoName]) config.overrides[repoName] = {};
                config.overrides[repoName].category = category;
                writeConfig(config);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, repoName, category, config }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API: Hide app
    if (req.method === 'POST' && pathname === '/api/hide-app') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { repoName } = JSON.parse(body);
                if (!repoName) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'repoName is required' }));
                    return;
                }

                const config = readConfig();
                config.pinnedApps = (config.pinnedApps || []).filter(name => name !== repoName);
                if (!config.hiddenApps) config.hiddenApps = [];
                if (!config.hiddenApps.includes(repoName)) {
                    config.hiddenApps.push(repoName);
                }

                writeConfig(config);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, repoName, config }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API: Restore app
    if (req.method === 'POST' && pathname === '/api/unhide-app') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { repoName } = JSON.parse(body);
                if (!repoName) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'repoName is required' }));
                    return;
                }

                const config = readConfig();
                config.hiddenApps = (config.hiddenApps || []).filter(name => name !== repoName);
                if (!config.pinnedApps) config.pinnedApps = [];
                if (!config.pinnedApps.includes(repoName)) {
                    config.pinnedApps.push(repoName);
                }

                writeConfig(config);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, repoName, config }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // API: Save entire config
    if (req.method === 'POST' && pathname === '/api/save-config') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const updatedConfig = JSON.parse(body);
                writeConfig(updatedConfig);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            }
        });
        return;
    }

    // Static File Serving
    let filePath = path.join(ROOT_DIR, pathname === '/' ? 'index.html' : pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not Found');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
});
