const fs = require('fs');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const pathToRegexp = require('path-to-regexp');
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
        this.auth = config.secretKey ? new Auth(config.secretKey) : null;
        this.tokenValidator = config.tokenValidator || null;
        this.errors = config.errors || Errors;
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
            }).then((serverResponse) => {
                return resolve(true);
            }).catch(error => reject(error));
        })
    }

    start() {
        return new Promise((resolve) => {
        // If in test mode, return right away without actually starting HTTP
            if (this.env === 'test') {
                resolve(true);
                return;
            }

            // Start the HTTP server - store the server instance so we can close it later
            this.server = this.http.listen(this.port, () => {
                console.log('Server initialized:');
                console.log(`-- name: ${this.name}`);
                console.log(`-- version: ${this.version}`);
                console.log(`-- environment: ${this.env}`);
                console.log(`-- port: ${this.port}`);
                resolve(true);
                return;
            });
        });
    }

    configureHttpServer() {
        this.http = express();
        this.http.set('x-powered-by', false);
        this.http.use(cors());
        this.http.options('*', cors());
        this.http.use(express.urlencoded({
            extended: true,
        }));
        // Don't use global express.json() - apply it per-route to avoid conflicts with rawBody routes
        // express.urlencoded() is safe to keep global as it only parses application/x-www-form-urlencoded
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

        function sendResponse(error, response, headers) {
            // Set headers if provided (for rawResponse mode)
            if (headers && typeof headers === 'object') {
                Object.keys(headers).forEach(key => {
                    res.setHeader(key, headers[key]);
                });
            }
            // Handle raw responses - send Buffer/string as-is without JSON serialization
            // When rawResponse is true, only Buffer and string are sent raw via res.end().
            // All other types fall through to default JSON serialization below.
            if (route.rawResponse === true) {
                if (response && !error) {
                    // Successful response - send raw if Buffer or string
                    if (Buffer.isBuffer(response) || typeof response === 'string') {
                        res.status(200).end(response);
                        return;
                    }
                    // Not raw-compatible, fall through to default JSON serialization
                } else if (error && !response) {
                    // Error response - send raw if Buffer or string
                    if (Buffer.isBuffer(error) || typeof error === 'string') {
                        const statusCode = (typeof error === 'number' && !isNaN(error)) ? error : 400;
                        res.status(statusCode).end(error);
                        return;
                    }
                    // Not raw-compatible, fall through to default JSON serialization
                } else if (error && response) {
                    // Status code with response (redirects, etc.)
                    if ((error === 302 || error === 301 || error === 307 || error === 308) && response.Location) {
                        res.status(error).header('Location', response.Location).end();
                        return;
                    } else if (Buffer.isBuffer(response) || typeof response === 'string') {
                        res.status(error).end(response);
                        return;
                    }
                    // Not raw-compatible, fall through to default JSON serialization
                }
                // If rawResponse is true but response is not Buffer/string, fall through to default
            }

            // Default JSON serialization behavior
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
                // Handle redirects (302, 301, 307, 308) with Location header
                if ((error === 302 || error === 301 || error === 307 || error === 308) && response && response.Location) {
                    res.status(error).header('Location', response.Location).send();
                } else {
                    res.status(error).send(response);
                }
            }
            return;
        }

        let username = null;
        let decoded = null;

        if (route.tokenAuth) {
            const token = (req.params && req.params.token) ||
                (req.query && req.query.token) ||
                (req.body && req.body.token) ||
                (req.headers['x-access-token'])

            if (!token) {
                const msg = `Route ${route.name} requires token auth but token was not provided. Please reference RFC6750.`
                const err = this.errors.UnauthorizedUser(msg);

                res.status(err.statusCode).send({
                    success: false,
                    error: err
                });
                return Promise.resolve();
            }

            try {
                // Use global token validator if provided, otherwise fall back to default JWT validation
                if (this.tokenValidator && typeof this.tokenValidator === 'function') {
                    decoded = await this.tokenValidator(token, this.container);
                } else {
                    // Default JWT validation
                    if (!this.auth) {
                        throw new Error(`Route ${route.name} requires token auth but server was not initialized with secretKey`);
                    }
                    decoded = this.auth.verifyToken(token);
                }
                
                // Allow route-specific validation to override the global validator
                if (route.validateToken && typeof route.validateToken === 'function') {
                    decoded = await route.validateToken(token, this.container);
                }
                
                if (decoded.username) {
                    username = decoded.username;
                }
            } catch (error) {
                const err = this.errors.UnauthorizedUser();
                res.status(err.statusCode).send({
                    success: false,
                    error
                });
                return Promise.resolve();
            }
        }

        let data = {};
        let key = req.headers.key || req.params.key ||
            (req.query && req.query.key) || (req.body && req.body.key);

        if (route.applicationAuth) {
            if (!key || key !== this.appKey) {
                sendResponse(this.errors.UnauthorizedUser());
                return Promise.resolve();
            }
        }

        if (route.requestBodyOverride === true) {
            data = req.body;
        }

        if (route.inputs) {
            try {
                // When rawBody is true, exclude req.body from inputs processing since it's a Buffer
                const paramsForInputs = route.rawBody === true
                    ? Object.assign(req.query || {}, req.params || {}, req.files || {})
                    : Object.assign(req.query || {}, req.body || {}, req.params || {}, req.files || {});
                
                data = this.buildParameters(paramsForInputs, route.inputs);
            } catch (error) {
                sendResponse(error);
                return Promise.resolve();
            }
        }

        // Handle rawBody - append the raw Buffer if rawBody flag is set
        if (route.rawBody === true) {
            data.rawBody = req.body; // This will be a Buffer, not a parsed object
        }

        if (route.headers) {
            try {
                data.headers = this.buildParameters(req.headers, route.headers);
            } catch (error) {
                sendResponse(error);
                return Promise.resolve();
            }
        }

        if (username !== null) {
            data.username = username;
        }

        data.decoded = decoded;
        data._host = req.get('origin') || req.get('host')

        return new Promise((resolve) => {
            try {
                route.run.bind(routeContext)(this.container, data, ((responseError, response, headers) => {
                    sendResponse(responseError, response, headers);
                    resolve();
                    return;
                }).bind(this));
            } catch (error) {
                // If route.run throws synchronously, handle it
                sendResponse(error);
                resolve();
            }
        });
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

        Object.keys(inputs).forEach((name) => {
            const formatter = inputs[name].formatter || proxyFormatter;
            const validator = inputs[name].validate || proxyValidator;

            if (params[name] === undefined) {
                if (inputs[name].required) {
                    throw this.errors.MissingParameter(name);
                }

                params[name] = "";
            }

            const formattedParam = formatter(params[name]);

            if (!validator(formattedParam)) {
                throw this.errors.InvalidParameter(name, params[name]);
            }

            if (formattedParam !== undefined) {
                data[name] = formattedParam;
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

    checkRoutes(files) {
        const routes = [];

        return new Promise((resolve, reject) => {
            files.forEach((file) => {
                const filepath = `${this.routeDir}/${file}`;
                const routeFile = require(filepath);

                Object.keys(routeFile).forEach((routeKey) => {
                    routes.push(routeFile[routeKey]);
                });
            });

            this.checkConflictingRoutes(routes, (route1, route2) => {
                if (this.env !== 'test') {
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
            const route1Regexp = pathToRegexp(route1.endpoint);

            routes.forEach((route2) => {
                if (
                    route1.method === route2.method &&
                    route1.endpoint !== route2.endpoint &&
                    route1Regexp.test(route2.endpoint)
                ) {
                    callback(route1, route2);
                }
            });
        });
    }

    loadRoutes(files) {
        const verbMap = {
            del: 'delete'
        };

        return new Promise((resolve, reject) => {
            if (!files || files.length < 1) {
                console.log('No route files provided');
            }

            files.forEach((file) => {
                const filepath = `${this.routeDir}/${file}`;
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
                    if (!route.name) {
                        reject(new Error(`Route [null] is missing a "name" property`));
                        return;
                    }
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
                                    break;
                                }

                                let inputName = piece.split(':')[1];
                                const isRequired = inputName[inputName.length - 1] !== '?';
                                if (!isRequired) {
                                    inputName = inputName.substr(0, inputName.length - 1);
                                }

                                if (!route.inputs[inputName]) {
                                    error = new Error(`Missing required input [${inputName}] in route [${route.name}]`)
                                    break;
                                }

                                if (route.inputs[inputName].required !== isRequired) {
                                    error = new Error(`Input [${inputName}] is marked as ${route.inputs[inputName].required ? '' : 'not '}required in the inputs and ${isRequired ? '' : 'not '}required in the path in route [${route.name}]`);
                                    break;
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

                    // For routes that need raw body (e.g., webhooks), use express.raw() instead of JSON
                    if (route.rawBody === true) {
                        this.http[verb](route.endpoint, express.raw({ type: 'application/json' }), this.preprocessor.bind(this, route));
                    } else {
                        // Apply express.json() per-route for routes that need JSON parsing
                        // express-fileupload handles multipart/form-data (including files)
                        // express.urlencoded() is already global and only parses form-encoded data
                        this.http[verb](route.endpoint, express.json({ extended: true }), this.preprocessor.bind(this, route));
                    }

                });
            });
            resolve(true);
        });
    }

    loadHeartbeatRoute() {
        const route = {
            name: 'heartbeat',
            method: 'get',
            endpoint: `/heartbeat`,
            run: (conn, params, next) => {
                const response = {
                    status: 'alive',
                };

                if (this.heartbeat) {
                    this.heartbeat(conn, params, (err, data) => {
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
        }

        req.params[reqKey] = req.params[reqKey] || token;
        req.body[reqKey] = req.body[reqKey] || token;
        req.query[reqKey] = req.query[reqKey] || token;
        next();
    };
}

module.exports = Server;
