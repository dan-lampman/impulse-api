const Server = require('../../src/server');
const assert = require('assert');
const http = require('http');
const path = require('path');

describe('rawBody HTTP Integration', () => {
    let testServer;
    let testRouteDir;
    let testPort = 9998;

    before(async () => {
        testRouteDir = path.join(__dirname, 'routes');
        // Create and start test server once for all tests (use 'dev' env so server actually starts)
        testServer = new Server({
            name: 'test-server',
            routeDir: testRouteDir,
            port: testPort,
            env: 'dev',
            services: {}
        });
        await testServer.init();
    });

    after(async () => {
        // Clean up test server
        if (testServer && testServer.server) {
            await new Promise((resolve) => {
                if (testServer.server.listening) {
                    testServer.server.closeAllConnections();
                    testServer.server.close(() => {
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        }
    });

    it('should receive raw Buffer via HTTP request when rawBody is true', async () => {

        // Make HTTP POST request
        const testBody = JSON.stringify({ test: 'data', value: 123 });
        const response = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: testPort,
                path: '/webhook',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(testBody)
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({ statusCode: res.statusCode, body: data });
                });
            });

            req.on('error', reject);
            req.write(testBody);
            req.end();
        });

        assert.strictEqual(response.statusCode, 200);
        const responseBody = JSON.parse(response.body);
        assert.strictEqual(responseBody.success, true);
        assert.strictEqual(responseBody.isBuffer, true);
        assert.strictEqual(responseBody.rawBodyString, testBody);
    });

    it('should receive parsed JSON via HTTP request when rawBody is false', async () => {

        // Make HTTP POST request
        const testBody = JSON.stringify({ test: 'data', value: 123 });
        const response = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: testPort,
                path: '/normal',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(testBody)
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({ statusCode: res.statusCode, body: data });
                });
            });

            req.on('error', reject);
            req.write(testBody);
            req.end();
        });

        assert.strictEqual(response.statusCode, 200);
        const responseBody = JSON.parse(response.body);
        assert.strictEqual(responseBody.success, true);
        assert.strictEqual(responseBody.test, 'data');
        assert.strictEqual(responseBody.value, 123);
    });
});

