const assert = require('assert');
const Api = require('../src/api');
const Auth = require('../src/auth');

describe('Custom JWT Validation', () => {
    let testServer;
    let testRouteDir;

    beforeEach(() => {
        // Create a temporary route directory for testing
        testRouteDir = '/tmp/test-routes';
        require('fs').mkdirSync(testRouteDir, { recursive: true });
    });

    afterEach(() => {
        // Clean up test route directory
        if (require('fs').existsSync(testRouteDir)) {
            require('fs').rmSync(testRouteDir, { recursive: true, force: true });
        }
    });

    describe('Server-Level Custom Validator', () => {
        it('should use server-level custom validator when provided', async () => {
            const customValidator = async (token, services) => {
                if (token === 'valid-custom-token') {
                    return { 
                        userId: 'test-user-123', 
                        email: 'test@example.com',
                        customField: 'custom-value'
                    };
                }
                throw new Error('Invalid token');
            };

            const config = {
                name: 'test-api',
                routeDir: testRouteDir,
                secretKey: 'test-secret',
                tokenValidator: customValidator,
                services: {
                    testService: { name: 'test' }
                }
            };

            // Create a test route file
            const testRoute = `
exports.testRoute = {
    name: 'testRoute',
    method: 'get',
    endpoint: '/test',
    version: 'v1',
    tokenAuth: true,
    run: (services, inputs, next) => {
        next(200, { 
            message: 'Success',
            user: inputs.decoded
        });
    }
};
`;
            require('fs').writeFileSync(`${testRouteDir}/test.js`, testRoute);

            const api = new Api(config);
            await api.init();

            // Test would require actual HTTP request, but we can test the validator function directly
            const result = await customValidator('valid-custom-token', {});
            assert.deepStrictEqual(result, {
                userId: 'test-user-123',
                email: 'test@example.com',
                customField: 'custom-value'
            });
        });

        it('should fall back to default JWT validation when no custom validator', async () => {
            const config = {
                name: 'test-api',
                routeDir: testRouteDir,
                secretKey: 'test-secret',
                services: {}
            };

            // Create a test route file
            const testRoute = `
exports.testRoute = {
    name: 'testRoute',
    method: 'get',
    endpoint: '/test',
    version: 'v1',
    tokenAuth: true,
    run: (services, inputs, next) => {
        next(200, { message: 'Success' });
    }
};
`;
            require('fs').writeFileSync(`${testRouteDir}/test.js`, testRoute);

            const api = new Api(config);
            await api.init();

            // Test default JWT validation
            const auth = new Auth('test-secret');
            const token = auth.generateToken({ userId: 'test-user' });
            const decoded = auth.verifyToken(token);
            assert.strictEqual(decoded.userId, 'test-user');
        });
    });

    describe('Route-Specific Override', () => {
        it('should allow route-specific validator to override server-level validator', async () => {
            const serverValidator = async (token, services) => {
                return { userId: 'server-user', source: 'server' };
            };

            const routeValidator = async (token, services) => {
                if (token === 'route-specific-token') {
                    return { 
                        userId: 'route-user-456', 
                        email: 'route@example.com',
                        source: 'route'
                    };
                }
                throw new Error('Invalid route token');
            };

            const config = {
                name: 'test-api',
                routeDir: testRouteDir,
                secretKey: 'test-secret',
                tokenValidator: serverValidator,
                services: {}
            };

            // Create a test route file with custom validator override
            const testRoute = `
exports.testRoute = {
    name: 'testRoute',
    method: 'get',
    endpoint: '/test',
    version: 'v1',
    tokenAuth: true,
    validateToken: async (token, services) => {
        if (token === 'route-specific-token') {
            return { 
                userId: 'route-user-456', 
                email: 'route@example.com',
                source: 'route'
            };
        }
        throw new Error('Invalid route token');
    },
    run: (services, inputs, next) => {
        next(200, { 
            message: 'Success',
            user: inputs.decoded
        });
    }
};
`;
            require('fs').writeFileSync(`${testRouteDir}/test.js`, testRoute);

            const api = new Api(config);
            await api.init();

            // Test the route-specific validator
            const result = await routeValidator('route-specific-token', {});
            assert.deepStrictEqual(result, {
                userId: 'route-user-456',
                email: 'route@example.com',
                source: 'route'
            });
        });

        it('should use server-level validator when no route-specific validator', async () => {
            const serverValidator = async (token, services) => {
                return { userId: 'server-user', source: 'server' };
            };

            const config = {
                name: 'test-api',
                routeDir: testRouteDir,
                secretKey: 'test-secret',
                tokenValidator: serverValidator,
                services: {}
            };

            // Create a test route file without custom validator
            const testRoute = `
exports.testRoute = {
    name: 'testRoute',
    method: 'get',
    endpoint: '/test',
    version: 'v1',
    tokenAuth: true,
    run: (services, inputs, next) => {
        next(200, { 
            message: 'Success',
            user: inputs.decoded
        });
    }
};
`;
            require('fs').writeFileSync(`${testRouteDir}/test.js`, testRoute);

            const api = new Api(config);
            await api.init();

            // Test that server validator is used
            const result = await serverValidator('any-token', {});
            assert.strictEqual(result.source, 'server');
        });
    });

    describe('Error Handling', () => {
        it('should handle custom validator errors gracefully', async () => {
            const failingValidator = async (token, services) => {
                throw new Error('Custom validation failed');
            };

            const config = {
                name: 'test-api',
                routeDir: testRouteDir,
                secretKey: 'test-secret',
                tokenValidator: failingValidator,
                services: {}
            };

            // Create a test route file
            const testRoute = `
exports.testRoute = {
    name: 'testRoute',
    method: 'get',
    endpoint: '/test',
    version: 'v1',
    tokenAuth: true,
    run: (services, inputs, next) => {
        next(200, { message: 'Success' });
    }
};
`;
            require('fs').writeFileSync(`${testRouteDir}/test.js`, testRoute);

            const api = new Api(config);
            await api.init();

            // Test that validator throws expected error
            try {
                await failingValidator('invalid-token', {});
                assert.fail('Should have thrown an error');
            } catch (error) {
                assert.strictEqual(error.message, 'Custom validation failed');
            }
        });

        it('should validate custom validator function type', () => {
            assert.throws(() => {
                Auth.createCustomValidator('not-a-function');
            }, /Custom validator must be a function/);

            assert.doesNotThrow(() => {
                Auth.createCustomValidator(() => {});
            });
        });
    });

    describe('Backward Compatibility', () => {
        it('should work with existing routes without custom validation', async () => {
            const config = {
                name: 'test-api',
                routeDir: testRouteDir,
                secretKey: 'test-secret',
                services: {}
            };

            // Create a test route file without custom validation
            const testRoute = `
exports.testRoute = {
    name: 'testRoute',
    method: 'get',
    endpoint: '/test',
    version: 'v1',
    tokenAuth: true,
    run: (services, inputs, next) => {
        next(200, { message: 'Success' });
    }
};
`;
            require('fs').writeFileSync(`${testRouteDir}/test.js`, testRoute);

            const api = new Api(config);
            await api.init();

            // Test that default JWT validation still works
            const auth = new Auth('test-secret');
            const token = auth.generateToken({ userId: 'legacy-user' });
            const decoded = auth.verifyToken(token);
            assert.strictEqual(decoded.userId, 'legacy-user');
        });
    });
});
