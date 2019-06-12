const fs = require('fs');
const express = require('express');
const bodyparser = require('body-parser');
const multer = require('multer');
const cors = require('cors');
const morgan = require('morgan');
const pathRegexp = require('path-to-regexp');
const fileUpload = require('express-fileupload');

const Auth = require('./auth');
const Errors = require('./errors');
const Container = require('./container');

class Server {
    constructor(config) {
        if (!config) {
            throw new Error('The Server requires a valid config.');
        }
        if (!config.name) {
            throw new Error('The Server requires a name.');
        }
        if (!config.routeDir) {
            throw new Error('The Server requires a directory path for the routes.');
        }
        if (config.heartbeat && typeof (config.heartbeat) !== 'function') {
            throw new Error('If provided, the heartbeat variable must be a handler function.');
        }

        this.name = config.name;
        this.routeDir = config.routeDir;
        this.env = config.env;
        this.port = config.port;
        this.version = config.version;
        this.authBypass = config.authBypass || false;
        this.appKey = config.appKey || null;
        this.heartbeat = config.heartbeat || null;
        this.container = new Container(config.services);
        this.secretKey = config.secretKey;
        process.env.NODE_ENV = this.env || 'dev';
        this.configureHttpServer();
    }

    init() {
        let routeFiles;

        return new Promise((resolve, reject) => {
            this.loadHeartbeatRoute();
            this.loadRouteFiles().then((arr) => {
                routeFiles = arr;
            }).then(() => {
                return this.checkRoutes(routeFiles);
            }).then(() => {
                return this.loadRoutes(routeFiles);
            }).then(() => {
                return this.postMiddleware();
            }).then(()=> {
                return this.start();
            }).then(() => {
                return resolve(true);
            }).catch(error => reject(error));
        })
    }

    start() {
        const self = this;
        let server;

        return new Promise((resolve) => {
        // If in test mode, return right away without actually starting HTTP
            if (this.env === 'test') {
                resolve(true);
                return;
            }

            // Start the HTTP server
            server = this.http.listen(this.port, () => {
                console.log('Server initialized:');
                console.log(`-- name: ${self.name}`);
                console.log(`-- version: ${self.version}`);
                console.log(`-- environment: ${self.env}`);
                console.log(`-- port: ${self.port}`);
                resolve(server);
                return;
            });
        });
    }

    configureHttpServer() {
        this.http = express();
        this.http.set('x-powered-by', false);
        this.http.use(cors());
        this.http.options('*', cors());
        this.http.use(bodyparser.urlencoded({
            extended: true,
        }));
        this.http.use(bodyparser.json({
            extended: true,
        }));
        this.http.use(fileUpload({
            preserveExtension: 10
        }));
        this.http.use(extractBearerToken({
            headerKey: 'Bearer',
            reqKey: 'token'
        }));

        if (this.env === 'dev') {
            this.http.use(morgan('dev'));
        } else {
            this.http.use(morgan('common'));
        }

        this.preMiddleware();
    }

    preMiddleware() {
        if (this.env !== 'test') {
            this.http.use(function changePath(req, res, next) {
                const rqst = req;
                if (typeof req.path === 'function' && typeof req.getPath === 'function') {
                    rqst.path = req.getPath();
                }
                if (next) next();
                return;
            });
        }
    }

    postMiddleware() {
        return new Promise((resolve) => {
            this.http.use((req, res, next) => {
                if (!req.route && req.accepts('json')) {
                    res.status(404).send({
                        code: 'ResourceNotFound',
                        message: req.originalUrl + ' does not exist'
                    });
                    next();
                }
            });

            resolve(true);
        })
    }

    getRequestIp(req) {
        let ipAddress;
        let clientIp = req.headers['x-client-ip'];
        let forwardedForAlt = req.headers['x-forwarded-for'];
        let realIp = req.headers['x-real-ip'];
        let forwardedIps = [];

        const reqConnectionRemoteAddress = req.connection ? req.connection.remoteAddress : null;
        const reqInfoRemoteAddress = req.info ? req.info.remoteAddress : null;

        if (clientIp) {
            ipAddress = clientIp;
        } else if (forwardedForAlt) {
            forwardedIps = forwardedForAlt.split(',');
            ipAddress = forwardedIps[0];
        } else if (realIp) {
            ipAddress = realIp;
        } else if (reqConnectionRemoteAddress) {
            ipAddress = reqConnectionRemoteAddress;
        } else if (reqInfoRemoteAddress) {
            ipAddress = reqInfoRemoteAddress;
        } else {
            ipAddress = null;
        }

        return ipAddress;
    }

    async preprocessor(route, req, res) {
        const self = this;
        const routeContext = {
            getRequestBody: (() => {
                return self.body;
            }).bind(req)
        };

        function sendResponse(error, response) {
            if (error instanceof Error) {
                res.status(error.statusCode ? error.statusCode : 400).send(error);
            } else if (error && !response) {
                if ((typeof error === 'number' || typeof error === 'string') && !isNaN(Number(error))) {
                    res.status(error).send();
                } else {
                    res.send(error);
                }
            } else if (response && !error) {
                res.status(200).send(response);
            } else {
                res.status(error).send(response);
            }
            return;
        }

        let username = null;

        if (route.tokenAuth) {
            const token = (req.params && req.params.token) ||
                (req.query && req.query.token) ||
                (req.body && req.body.token);

            if (!token) {
                res.status(403).send({
                    success: false,
                    error: `Route ${route.name} requires token auth but token was not provided. Please reference RFC6750.`
                });
                return;
            }

            try {
                const decoded = await Auth.verifyToken(token, self.secretKey);
                if (decoded.username) {
                    username = decoded.username;
                }
            } catch (error) {
                res.status(403).send({
                    success: false,
                    error
                });
                return;
            }
        }

        let data = {};
        let key = req.headers.key || req.params.key ||
            (req.query && req.query.key) || (req.body && req.body.key);

        if (route.applicationAuth) {
            if (!key || key !== self.appKey) {
                sendResponse(Errors.UnauthorizedUser());
                return;
            }
        }

        if (route.json) {
            data = req.body;
        } else if (route.inputs) {
            try {
                data = self.buildParameters(
                    Object.assign(req.query || {}, req.body || {}, req.params || {}, req.files || {}),
                    route.inputs
                );
            } catch (error) {
                sendResponse(error);
                return;
            }
        }

        if (route.headers) {
            try {
                data.headers = self.buildParameters(req.headers, route.headers);
            } catch (error) {
                sendResponse(error);
                return;
            }
        }

        if (username !== null) {
            data.username = username;
        }

        route.run.bind(routeContext)(self.container, data, ((responseError, response) => {
            sendResponse(responseError, response);
            return;
        }).bind(self));
    }

    buildParameters(params, inputs) {
        const data = {};

        if (!inputs) {
            return data;
        }

        function proxyFormatter(param) {
            return param;
        }
        function proxyValidator() {
            return true;
        }

        Object.keys(inputs).forEach(function inputCheck(name) {
            const formatter = inputs[name].formatter || proxyFormatter;
            const validator = inputs[name].validate || proxyValidator;

            if (inputs[name].required) {
                if (params[name] === undefined) {
                    throw Errors.Missing(`Missing parameter [${name}] in request`);
                }
            }

            if (params[name] !== undefined) {
                const formattedParam = formatter(params[name]);

                if (!validator(formattedParam)) {
                    throw Errors.Missing(`Invalid parameter format [${name}]`);
                }

                if (formattedParam !== undefined) {
                    data[name] = formattedParam;
                }
            }
        });

        return data;
    }

    loadRouteFiles() {
        return new Promise((resolve, reject) => {
            fs.readdir(this.routeDir, (err, files) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(files);
            });
        })
    }

    testRoute(route) {
        let pieces = [];
        if (!route.run) {
            throw new Error(`Route [${route.name}] is missing a "run" property`);
        }
        if (!route.endpoint) {
            throw new Error(`Route [${route.name}] is missing an endpoint declaration`);
        }
        if (!route.method) {
            throw new Error(`Route [${route.name}] is missing http method declaration`);
        }

        if (route.endpoint.indexOf('/:') >= 0) {
            pieces = route.endpoint.split('/');
            pieces.forEach((piece) => {
                if (piece.indexOf(':') === 0) {
                    if (!route.inputs) {
                        throw new Error(`Missing required inputs for [${route.name}]`);
                    }
                    if (!route.inputs[piece.split(':')[1]]) {
                        throw new Error(`Missing required input [${piece}] in route [${route.name}]`);
                    }
                }
            });
        }
    }

    checkRoutes(files) {
        const self = this;
        const routes = [];

        return new Promise((resolve, reject) => {
            files.forEach((file) => {
                const filepath = `${self.routeDir}/${file}`;
                const routeFile = require(filepath);

                Object.keys(routeFile).forEach((routeKey) => {
                    routes.push(routeFile[routeKey]);
                });
            });

            self.checkConflictingRoutes(routes, (route1, route2) => {
                if (self.env !== 'test') {
                    reject(new Error(`Conflicting endpoints found:
                    ${route1.method.toUpperCase()} ${route1.endpoint}
                    ${route2.method.toUpperCase()} ${route2.endpoint}`));
                }
            });

            resolve(true);
        })
    }

    checkConflictingRoutes(routes, callback) {
        routes.forEach((route1) => {
            const route1Regexp = pathRegexp(route1.endpoint);

            routes.forEach((route2) => {
                if (route1.method === route2.method
                    && route1.endpoint !== route2.endpoint
                    && RegExp(route1Regexp).test(route2.endpoint)) {
                        callback(route1, route2);
                }
            });
        });
    }

    loadRoutes(files) {
        const self = this;
        const verbMap = {
            del: 'delete'
        };

        return new Promise((resolve, reject) => {
            if (!files || files.length < 1) {
                console.log('No route files provided');
            }

            files.forEach((file) => {
                const filepath = `${self.routeDir}/${file}`;
                const routeFile = require(filepath);

                Object.keys(routeFile).forEach((routeKey) => {
                    const route = routeFile[routeKey];
                    let method;
                    let verb;

                    if (route.endpoint === `/heartbeat`) {
                        return;
                    }

                    let pieces = [];
                    let error = null;
                    if (!route.run) {
                        reject(new Error(`Route [${route.name}] is missing a "run" property`));
                        return;
                    }
                    if (!route.endpoint) {
                        reject(new Error(`Route [${route.name}] is missing an endpoint declaration`));
                        return;
                    }
                    if (!route.method) {
                        reject(new Error(`Route [${route.name}] is missing http method declaration`));
                        return;
                    }

                    if (route.endpoint.indexOf('/:') >= 0) {
                        pieces = route.endpoint.split('/');
                        for (const piece of pieces) {
                            if (piece.indexOf(':') === 0) {
                                if (!route.inputs) {
                                    error = new Error(`Missing required inputs for [${route.name}]`);
                                    return;
                                }
                                if (!route.inputs[piece.split(':')[1]]) {
                                    error = new Error(`Missing required input [${piece}] in route [${route.name}]`)
                                    return;
                                }
                            }
                        }
                    }

                    if (error) {
                        reject(error);
                        return;
                    }

                    if (!route.name) {
                        route.name = routeKey;
                    }

                    method = route.method.toLowerCase();
                    verb = (verbMap[method]) ? verbMap[method] : method;

                    if (verb === 'post' || verb === 'patch' || verb === 'put') {
                        self.http[verb](route.endpoint, multer().none(), self.preprocessor.bind(self, route));
                    } else {
                        self.http[verb](route.endpoint, self.preprocessor.bind(self, route));
                    }

                    resolve(true);
                });
            });
        });
    }

    loadHeartbeatRoute() {
        const self = this;
        const route = {
            name: 'heartbeat',
            method: 'get',
            endpoint: `/heartbeat`,
            run: (conn, params, next) => {
                const response = {
                    status: 'alive',
                };

                if (self.heartbeat) {
                    self.heartbeat(conn, params, (err, data) => {
                        response.data = err || data;
                        next(null, response);
                        return;
                    });
                } else {
                    next(null, response);
                    return;
                }
            }
        };

        this.http[route.method](route.endpoint, this.preprocessor.bind(this, route));
    }
}

function extractBearerToken(options) {
    let opts = options;

    if (!opts) {
        opts = {};
    }

    const queryKey = opts.queryKey || 'access_token';
    const bodyKey = opts.bodyKey || 'access_token';
    const headerKey = opts.headerKey || 'Bearer';
    const reqKey = opts.reqKey || 'token';
    return (req, res, next) => {
        let token, error;

        if (req.query && req.query[queryKey]) {
            token = req.query[queryKey];
        }

        if (req.body && req.body[bodyKey]) {
            if (token) {
                error = true;
            }
            token = req.body[bodyKey];
        }

        if (req.headers && req.headers.authorization) {
            const parts = req.headers.authorization.split(' ');

            if (parts.length === 2 && parts[0] === headerKey) {
                if (token) {
                    error = true;
                }
                token = parts[1];
            }
        }

        if (error) {
            return res.status(400).send({
                success: false,
                message: 'Invalid request: multiple tokens provided.'
            });
        } else {
            req.params[reqKey] = req.params[reqKey] || token;
            req.body[reqKey] = req.body[reqKey] || token;
            req.query[reqKey] = req.query[reqKey] || token;
            next();
        }
    };
}

module.exports = Server;
