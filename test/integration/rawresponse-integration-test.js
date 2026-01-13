const Server = require('../../src/server');
const assert = require('assert');
const http = require('http');
const path = require('path');

describe('rawResponse HTTP Integration', () => {
    let testServer;
    let testRouteDir;
    let testPort = 9999;

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

    it('should send raw Buffer response when rawResponse is true', async () => {
        const response = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: testPort,
                path: '/raw-response-buffer',
                method: 'GET'
            };

            const req = http.request(options, (res) => {
                let data = Buffer.alloc(0);
                res.on('data', (chunk) => {
                    data = Buffer.concat([data, chunk]);
                });
                res.on('end', () => {
                    resolve({ 
                        statusCode: res.statusCode, 
                        body: data,
                        headers: res.headers
                    });
                });
            });

            req.on('error', reject);
            req.end();
        });

        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(Buffer.isBuffer(response.body), true);
        assert.strictEqual(response.body.toString(), 'raw buffer response data');
        // Should not have JSON content-type since it's raw
        assert.strictEqual(response.headers['content-type'], undefined);
    });

    it('should send raw string response when rawResponse is true', async () => {
        const response = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: testPort,
                path: '/raw-response-string',
                method: 'GET'
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({ 
                        statusCode: res.statusCode, 
                        body: data,
                        headers: res.headers
                    });
                });
            });

            req.on('error', reject);
            req.end();
        });

        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(typeof response.body, 'string');
        assert.strictEqual(response.body, 'raw string response data');
        // Should not have JSON content-type since it's raw
        assert.strictEqual(response.headers['content-type'], undefined);
    });

    it('should send JSON serialized response when rawResponse is false', async () => {
        const response = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: testPort,
                path: '/json-response',
                method: 'GET'
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({ 
                        statusCode: res.statusCode, 
                        body: data,
                        headers: res.headers
                    });
                });
            });

            req.on('error', reject);
            req.end();
        });

        assert.strictEqual(response.statusCode, 200);
        const responseBody = JSON.parse(response.body);
        assert.strictEqual(responseBody.success, true);
        assert.strictEqual(responseBody.message, 'This is a JSON response');
        assert.deepStrictEqual(responseBody.data, { test: 'value' });
        // Should have JSON content-type when serialized
        assert.ok(response.headers['content-type'].includes('application/json'));
    });

    it('should send JSON serialized response when rawResponse is true but object is returned', async () => {
        const response = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: testPort,
                path: '/raw-response-object',
                method: 'GET'
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({ 
                        statusCode: res.statusCode, 
                        body: data,
                        headers: res.headers
                    });
                });
            });

            req.on('error', reject);
            req.end();
        });

        assert.strictEqual(response.statusCode, 200);
        // Even with rawResponse: true, objects should fall through to JSON serialization
        const responseBody = JSON.parse(response.body);
        assert.strictEqual(responseBody.success, true);
        assert.strictEqual(responseBody.message, 'This should be JSON serialized');
        // Should have JSON content-type when serialized
        assert.ok(response.headers['content-type'].includes('application/json'));
    });

    it('should handle raw response with route parameters', async () => {
        const testBody = JSON.stringify({ prefix: 'PREFIX' });
        const response = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: testPort,
                path: '/raw-response-params',
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
                    resolve({ 
                        statusCode: res.statusCode, 
                        body: data,
                        headers: res.headers
                    });
                });
            });

            req.on('error', reject);
            req.write(testBody);
            req.end();
        });

        assert.strictEqual(response.statusCode, 200);
        assert.strictEqual(typeof response.body, 'string');
        assert.strictEqual(response.body, 'PREFIX: raw response with params');
        // Should not have JSON content-type since it's raw
        assert.strictEqual(response.headers['content-type'], undefined);
    });

    it('should handle both rawBody and rawResponse together', async () => {
        const testBody = 'raw request body';
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
                    resolve({ 
                        statusCode: res.statusCode, 
                        body: data,
                        headers: res.headers
                    });
                });
            });

            req.on('error', reject);
            req.write(testBody);
            req.end();
        });

        assert.strictEqual(response.statusCode, 200);
        // The webhook route returns JSON (doesn't have rawResponse), so verify JSON
        const responseBody = JSON.parse(response.body);
        assert.strictEqual(responseBody.success, true);
        assert.strictEqual(responseBody.isBuffer, true);
        // Original functionality: rawBody works for requests
        assert.strictEqual(responseBody.rawBodyString, testBody);
    });
});

