const Server = require('../src/server');
const Auth = require('../src/auth');
const assert = require('assert');
const sinon = require('sinon');

const testApi = new Server({
    name: 'test-server',
    routeDir: './test-routes',
    port: 4000,
    env: 'test',
    services: {}
});

assert.contains = (orig, key, message) => {
    assert.strictEqual(orig.indexOf(key) >= 0, true, message);
};

describe('server-test', () => {
    describe('instantiation', () => {
        it('should throw an error if a configuration object is missing', () => {
            try {
                new Server();
            } catch (e) {
                assert.contains(e.message, 'valid config');
            }
        });
        it('should throw an error if service name is missing', () => {
            try {
                new Server({
                    routeDir: './'
                });
            } catch (e) {
                assert.contains(e.message, 'name');
            }
        });
        it('should throw an error if route directory is missing', () => {
            try {
                new Server({
                    name: 'test-Server'
                });
            } catch (e) {
                assert.contains(e.message, 'route');
            }
        });
        it('should property set the port', () => {
            const Api = new Server({
                name: 'test-server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
                services: {}
            });
            assert.strictEqual(Api.port, 4000);
        });
        it('should properly set the environment', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
            });

            assert.strictEqual(Api.env, 'test');
        });
        it('should set the app key to whatever is passed in', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './routes/sample-routes',
                port: 4000,
                env: 'test',
                appKey: 'TestKey'
            });

            assert.strictEqual(Api.appKey, 'TestKey');
        });
    });

    describe('route parameters', () => {
        it('should not crash if there are no inputs provided', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
            });
            Api.buildParameters({}, null);
        });
        it('should not crash if there are no params provided', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
            });
            Api.buildParameters(null, {});
        });
        it('should pass a param with a true/false value', () => {
             const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
            });
            const output = Api.buildParameters({ grade: 0 }, {
                grade: {
                    required: true
                }
            });

            assert.strictEqual(output.grade, 0);
        });
        it('should throw an error if there is a required input that is not in the params', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
            });
            try {
                Api.buildParameters({
                        'test-param': {
                            required: true
                        },
                    },
                    {}
                );
            } catch (e) {
                console.log(e)
                assert.contains(e.message, 'Missing parameter [test-param]');
            }
        });
        it('should apply a formatter if the input provides one', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test'
            });

            let output;

            try {
                output = Api.buildParameters({
                    param1: '1',
                    param2: '2'
                }, {
                    param1: {
                        required: true,
                        formatter: (param) => {
                            assert.strictEqual(param, '1');
                            return parseInt(param, 10) + 1;
                        }
                    },
                    param2: {
                        required: true
                    }
                });

                assert.strictEqual(output.param1, 2);
                assert.strictEqual(output.param2, '2');
            } catch (e) {
                assert.ifError(e);
            }
        });
        it('should run parameters through the validator after being formatted', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
            });
            let output;
            try {
                output = Api.buildParameters({
                    param1: '1',
                    param2: '2'
                }, {
                    param1: {
                        required: true,
                        formatter: (param) => {
                            assert.strictEqual(param, '1');
                            return parseInt(param, 10) + 1;
                        },
                        validator: () => {
                            assert.strictEqual(output.param1, 2);
                        }
                    },
                    param2: {
                        required: true
                    }
                });

                assert.strictEqual(output.param1, 2);
                assert.strictEqual(output.param2, '2');
            } catch (e) {
                assert.ifError(e);
            }
        });
        it('should return only the data that is defined in the inputs', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
            });
            let output;
            try {
                output = Api.buildParameters({
                    param1: '1',
                    param2: '2',
                    param3: '3'
                }, {
                    param1: {
                        required: true
                    },
                    param2: {
                        required: true
                    }
                });

                assert.strictEqual(output.param1, '1');
                assert.strictEqual(output.param2, '2');
                assert.strictEqual(output.param3, undefined);
            } catch (e) {
                assert.ifError(e);
            }
        });
    });

    describe('#loadRoutes', () => {
        it('it should return an error if the route does not have a "run" method', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: __dirname.concat('/routes'),
                port: 4000,
                env: 'test'
            });
            const routeFiles = [
                'missing-run.js'
            ];
            Api.loadRoutes(routeFiles).catch((error) => {
                assert.contains(error.message, 'missing a "run" property');

            });
        });
        it('it should return an error if the route does not have a name', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: __dirname.concat('/routes'),
                port: 4000,
                env: 'test'
            });
            const routeFiles = [
                'missing-name.js'
            ];
            Api.loadRoutes(routeFiles).catch((error) => {
                assert.contains(error.message, 'missing a "name" property');
            });
        });
        it('should return an error if the route does not have an endpoint', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: __dirname.concat('/routes'),
                port: 4000,
                env: 'test'
            });
            const routeFiles = [
                'missing-endpoint.js'
            ];
            Api.loadRoutes(routeFiles).catch((error) => {
                assert.contains(error.message, 'missing an endpoint');
            });
        });

        it('should return an error if the input is missing', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: __dirname.concat('/routes'),
                port: 4000,
                env: 'test'
            });
            const routeFiles = [
                'missing-params.js'
            ];
            Api.loadRoutes(routeFiles).catch((error) => {
                assert.contains(error.message, 'Missing required input');
            });
        });

        it('should return an error if the route does not have a method', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: __dirname.concat('/routes'),
                port: 4000,
                env: 'test'
            });
            const routeFiles = [
                'missing-method.js'
            ];
            Api.loadRoutes(routeFiles).catch((error) => {
                assert.contains(error.message, 'missing http method');
            });
        });
    });
    describe('#loadRouteFiles', () => {
        it('should return an error if given a broken directory', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: 'missing',
                port: 4000,
                env: 'test'
            });

            Api.loadRouteFiles().catch((error) => {
                assert.contains(error.message, 'file or directory');
            });
        });
    });

    describe('#checkConflictingRoutes', () => {
        it('should not call callback if routes array is empty', () => {
            const spy = sinon.spy();
            testApi.checkConflictingRoutes([], spy);
            sinon.assert.notCalled(spy);
        });

        it('should find conflicting endpoints', () => {
            const spy = sinon.spy();
            const routes = [
                { method: 'get', endpoint: '/api/user/info' },
                { method: 'get', endpoint: '/api/user/:id' }
            ];
            testApi.checkConflictingRoutes(routes, spy);
            sinon.assert.calledOnce(spy);
            sinon.assert.calledWith(spy, routes[1], routes[0]);
        });

        it('should find conflicting endpoints with multiple dynamic parameters', () => {
            const spy = sinon.spy();
            const routes = [
                { method: 'get', endpoint: '/api/user/info/:test' },
                { method: 'get', endpoint: '/api/user/:id/:test' }
            ];
            testApi.checkConflictingRoutes(routes, spy);
            sinon.assert.calledOnce(spy);
            sinon.assert.calledWith(spy, routes[1], routes[0]);
        });

        it('should not find conflicting endpoints when HTTP verbs are different', () => {
            const spy = sinon.spy();
            const routes = [
                { method: 'post', endpoint: '/api/user/info' },
                { method: 'get', endpoint: '/api/user/:id' }
            ];
            testApi.checkConflictingRoutes(routes, spy);
            sinon.assert.notCalled(spy);
        });
    });

    describe('Auth module', () => {
        describe('instantiation', () => {
            it('should throw an error if secretKey is not provided', () => {
                try {
                    new Auth();
                    assert.fail('Should have thrown an error');
                } catch (e) {
                    assert.contains(e.message, 'must be initialized with secretKey');
                }
            });

            it('should throw an error if secretKey is null', () => {
                try {
                    new Auth(null);
                    assert.fail('Should have thrown an error');
                } catch (e) {
                    assert.contains(e.message, 'must be initialized with secretKey');
                }
            });

            it('should throw an error if secretKey is undefined', () => {
                try {
                    new Auth(undefined);
                    assert.fail('Should have thrown an error');
                } catch (e) {
                    assert.contains(e.message, 'must be initialized with secretKey');
                }
            });

            it('should create an instance when secretKey is provided', () => {
                const auth = new Auth('test-secret-key');
                assert.strictEqual(auth.secretKey, 'test-secret-key');
            });
        });

        describe('generateToken', () => {
            it('should generate a token without requiring secretKey parameter', () => {
                const auth = new Auth('test-secret-key');
                const params = { userId: 'test-user', role: 'admin' };
                const token = auth.generateToken(params);
                assert.strictEqual(typeof token, 'string');
                assert.strictEqual(token.length > 0, true);
            });

            it('should generate different tokens for different params', () => {
                const auth = new Auth('test-secret-key');
                const token1 = auth.generateToken({ userId: 'user1' });
                const token2 = auth.generateToken({ userId: 'user2' });
                assert.notStrictEqual(token1, token2);
            });
        });

        describe('verifyToken', () => {
            it('should verify a token without requiring secretKey parameter', () => {
                const auth = new Auth('test-secret-key');
                const params = { userId: 'test-user', role: 'admin' };
                const token = auth.generateToken(params);
                const decoded = auth.verifyToken(token);
                assert.strictEqual(decoded.userId, 'test-user');
                assert.strictEqual(decoded.role, 'admin');
            });

            it('should throw an error when verifying a token with wrong secretKey', () => {
                const auth1 = new Auth('secret-key-1');
                const auth2 = new Auth('secret-key-2');
                const token = auth1.generateToken({ userId: 'test-user' });
                try {
                    auth2.verifyToken(token);
                    assert.fail('Should have thrown an error');
                } catch (e) {
                    assert.contains(e.message, 'invalid signature');
                }
            });

            it('should throw an error when verifying an invalid token', () => {
                const auth = new Auth('test-secret-key');
                try {
                    auth.verifyToken('invalid-token-string');
                    assert.fail('Should have thrown an error');
                } catch (e) {
                    assert.strictEqual(typeof e.message, 'string');
                }
            });
        });

        describe('createCustomValidator', () => {
            it('should throw an error if validator is not a function', () => {
                const auth = new Auth('test-secret-key');
                try {
                    auth.createCustomValidator('not-a-function');
                    assert.fail('Should have thrown an error');
                } catch (e) {
                    assert.contains(e.message, 'Custom validator must be a function');
                }
            });

            it('should return the validator function if valid', () => {
                const auth = new Auth('test-secret-key');
                const validatorFn = () => true;
                const result = auth.createCustomValidator(validatorFn);
                assert.strictEqual(result, validatorFn);
            });
        });
    });

    describe('Server Auth integration', () => {
        it('should create auth instance when secretKey is provided', () => {
            const server = new Server({
                name: 'test-server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
                secretKey: 'test-secret-key',
                services: {}
            });
            assert.strictEqual(server.auth !== null, true);
            assert.strictEqual(server.auth.secretKey, 'test-secret-key');
        });

        it('should not create auth instance when secretKey is not provided', () => {
            const server = new Server({
                name: 'test-server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
                services: {}
            });
            assert.strictEqual(server.auth, null);
        });

        it('should not create auth instance when secretKey is null', () => {
            const server = new Server({
                name: 'test-server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
                secretKey: null,
                services: {}
            });
            assert.strictEqual(server.auth, null);
        });
    });

    describe('rawBody functionality', () => {
        it('should set rawBody as Buffer when route.rawBody is true', async () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
                services: {}
            });

            const testBody = Buffer.from(JSON.stringify({ test: 'data' }));
            const req = {
                body: testBody,
                query: {},
                params: {},
                files: {},
                headers: {},
                get: (header) => {
                    if (header === 'origin') return 'http://localhost:4000';
                    if (header === 'host') return 'localhost:4000';
                    return null;
                }
            };
            const res = {
                status: (code) => {
                    res.statusCode = code;
                    return res;
                },
                send: (data) => {
                    res.sentData = data;
                }
            };

            const route = {
                name: 'test-raw-body',
                method: 'post',
                endpoint: '/test',
                rawBody: true,
                run: (services, inputs, next) => {
                    assert.strictEqual(Buffer.isBuffer(inputs.rawBody), true);
                    assert.deepStrictEqual(inputs.rawBody, testBody);
                    next(200, { success: true });
                }
            };

            await Api.preprocessor(route, req, res);
            assert.strictEqual(res.statusCode, 200);
        });

        it('should not set rawBody when route.rawBody is false', async () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
                services: {}
            });

            const testBody = { test: 'data' };
            const req = {
                body: testBody,
                query: {},
                params: {},
                files: {},
                headers: {},
                get: (header) => {
                    if (header === 'origin') return 'http://localhost:4000';
                    if (header === 'host') return 'localhost:4000';
                    return null;
                }
            };
            const res = {
                status: (code) => {
                    res.statusCode = code;
                    return res;
                },
                send: (data) => {
                    res.sentData = data;
                }
            };

            const route = {
                name: 'test-no-raw-body',
                method: 'post',
                endpoint: '/test',
                rawBody: false,
                run: (services, inputs, next) => {
                    assert.strictEqual(inputs.rawBody, undefined);
                    next(200, { success: true });
                }
            };

            await Api.preprocessor(route, req, res);
            assert.strictEqual(res.statusCode, 200);
        });

        it('should process inputs alongside rawBody when both are present', async () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
                services: {}
            });

            const testBody = Buffer.from(JSON.stringify({ test: 'data' }));
            const req = {
                body: testBody,
                query: { param1: 'value1' },
                params: { id: '123' },
                files: {},
                headers: {},
                get: (header) => {
                    if (header === 'origin') return 'http://localhost:4000';
                    if (header === 'host') return 'localhost:4000';
                    return null;
                }
            };
            const res = {
                status: (code) => {
                    res.statusCode = code;
                    return res;
                },
                send: (data) => {
                    res.sentData = data;
                }
            };

            const route = {
                name: 'test-raw-body-with-inputs',
                method: 'post',
                endpoint: '/test/:id',
                rawBody: true,
                inputs: {
                    param1: {
                        required: true
                    },
                    id: {
                        required: true
                    }
                },
                run: (services, inputs, next) => {
                    assert.strictEqual(Buffer.isBuffer(inputs.rawBody), true);
                    assert.deepStrictEqual(inputs.rawBody, testBody);
                    assert.strictEqual(inputs.param1, 'value1');
                    assert.strictEqual(inputs.id, '123');
                    next(200, { success: true });
                }
            };

            await Api.preprocessor(route, req, res);
            assert.strictEqual(res.statusCode, 200);
        });

        it('should handle rawBody without inputs', async () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
                services: {}
            });

            const testBody = Buffer.from('raw string data');
            const req = {
                body: testBody,
                query: {},
                params: {},
                files: {},
                headers: {},
                get: (header) => {
                    if (header === 'origin') return 'http://localhost:4000';
                    if (header === 'host') return 'localhost:4000';
                    return null;
                }
            };
            const res = {
                status: (code) => {
                    res.statusCode = code;
                    return res;
                },
                send: (data) => {
                    res.sentData = data;
                }
            };

            const route = {
                name: 'test-raw-body-only',
                method: 'post',
                endpoint: '/test',
                rawBody: true,
                run: (services, inputs, next) => {
                    assert.strictEqual(Buffer.isBuffer(inputs.rawBody), true);
                    assert.deepStrictEqual(inputs.rawBody, testBody);
                    next(200, { success: true });
                }
            };

            await Api.preprocessor(route, req, res);
            assert.strictEqual(res.statusCode, 200);
        });

        it('should not include Buffer body in inputs processing when rawBody is true', async () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
                services: {}
            });

            const testBody = Buffer.from(JSON.stringify({ test: 'data', shouldNotBeParsed: true }));
            const req = {
                body: testBody,
                query: { param1: 'value1' },
                params: { id: '123' },
                files: {},
                headers: {},
                get: (header) => {
                    if (header === 'origin') return 'http://localhost:4000';
                    if (header === 'host') return 'localhost:4000';
                    return null;
                }
            };
            const res = {
                status: (code) => {
                    res.statusCode = code;
                    return res;
                },
                send: (data) => {
                    res.sentData = data;
                }
            };

            const route = {
                name: 'test-raw-body-excluded-from-inputs',
                method: 'post',
                endpoint: '/test/:id',
                rawBody: true,
                inputs: {
                    param1: {
                        required: true
                    },
                    id: {
                        required: true
                    },
                    // This should NOT be found in inputs even though it's in the Buffer body
                    test: {
                        required: false
                    },
                    shouldNotBeParsed: {
                        required: false
                    }
                },
                run: (services, inputs, next) => {
                    // Verify rawBody is still a Buffer
                    assert.strictEqual(Buffer.isBuffer(inputs.rawBody), true);
                    assert.deepStrictEqual(inputs.rawBody, testBody);
                    
                    // Verify inputs from query/params work
                    assert.strictEqual(inputs.param1, 'value1');
                    assert.strictEqual(inputs.id, '123');
                    
                    // Verify that parsed body fields are NOT in inputs (because Buffer was excluded)
                    // buildParameters sets missing optional params to empty string, not undefined
                    assert.strictEqual(inputs.test, "");
                    assert.strictEqual(inputs.shouldNotBeParsed, "");
                    
                    next(200, { success: true });
                }
            };

            await Api.preprocessor(route, req, res);
            assert.strictEqual(res.statusCode, 200);
        });
    });
});
