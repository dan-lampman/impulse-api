const Server = require('../src/server');
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
    assert.equal(orig.indexOf(key) >= 0, true, message);
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
            assert.equal(Api.port, 4000);
        });
        it('should properly set the environment', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
            });

            assert.equal(Api.env, 'test');
        });
        it('should set the app key to whatever is passed in', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
                appKey: 'TestKey'
            });

            assert.equal(Api.appKey, 'TestKey');
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
        it('should pass a param with a falsy value through', () => {
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

            assert.equal(output.grade, 0);
        });
        it('should throw an error if there is a required input that is not in the params', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
            });
            try {
                Api.buildParameters({}, {
                    'test-param': {
                        required: true
                    }
                });
            } catch (e) {
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
                            assert.equal(param, '1');
                            return parseInt(param, 10) + 1;
                        }
                    },
                    param2: {
                        required: true
                    }
                });

                assert.equal(output.param1, 2);
                assert.equal(output.param2, '2');
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
                            assert.equal(param, '1');
                            return parseInt(param, 10) + 1;
                        },
                        validator: () => {
                            assert.equal(output.param1, 2);
                        }
                    },
                    param2: {
                        required: true
                    }
                });

                assert.equal(output.param1, 2);
                assert.equal(output.param2, '2');
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

                assert.equal(output.param1, '1');
                assert.equal(output.param2, '2');
                assert.equal(output.param3, undefined);
            } catch (e) {
                assert.ifError(e);
            }
        });
        it('should not run the formatter if the param is not required and not provided', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
            });
            try {
                Api.buildParameters({
                    param1: undefined
                }, {
                    param1: {
                        required: false,
                        formatter: () => {
                            // The formatter should not run, so this error should not be thrown.
                            throw new Error('param was formatted');
                        }
                    }
                });
            } catch (e) {
                assert.ifError(e);
            }
        });
        it('should not run the validator if the parameter is not required and not provided', () => {
            const Api = new Server({
                name: 'test-Server',
                routeDir: './test-routes',
                port: 4000,
                env: 'test',
            });
            try {
                Api.buildParameters({
                    param1: undefined
                }, {
                    param1: {
                        required: false,
                        validate: () => {
                            // The validator should not run, so this error should not be thrown.
                            throw new Error('param was validated');
                        }
                    }
                });
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
        it('should return an error if the route defines a url param but it doesnt include it in the inputs', () => {
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
                assert.contains(error.message, 'Missing required inputs for [missing-params]', error.message);
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
});
