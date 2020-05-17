# impulse-api
This module provides a quick and easy way to create powerful http servers.

## Installation
```npm install impulse-api```

## Unit Tests
```npm run test```

## Usage
A at least one .js file must exist at `{project-root}/routes` in order to initialize a new Api. See [sample-routes](https://github.com/dan-lampman/impulse-api/tree/master/sample-routes) for reference.

```js
const Impulse = require('impulse-api');

const config = {
    env: 'DEV',
    port: 3000,
    secretKey: 'topSecret!',
    appKey:  '@adminSecretKey',
    version: '1.0.0',
    name: 'Hello-World-Api',
    routeDir: __dirname.concat('/routes'),
    services: {}
}

const api = new Impulse(config);
api.init().then((response) => {
    console.log(response)
}).catch((error) => {
    console.log(error)
})
```
#### Server Parameters
-__env__ (required)
The Environment the server should be running in. Typically this can be parsed from `.env` or hoisted from `process.ENV`.

-__port__  (required)
The port on which the server should be running.

-__secretKey__
The key used for all JSON web token encoding and decoding.

-__applicationKey__
The key used for all basic application authentication.

-__name__
The name of the server.

-__version__
The version of the server.

-__routeDir__ (required)
The location of the root route directory.

-__services__
Optional object that is available on every route. Services is ideal for storing connection information to databases or any other auxiliary functionality.

#### Heartbeat endpoint
By default, all Impulse-APIs have a `/heartbeat` endpoint that returns 200 along with the following standard output:
```js
{ status: 'alive' }
```
## Routes
Routes are functions that expose HTTP path functionality.

Route files must exist in any number of folders or subfolders at `{project-root}/routes`
```js
// routes/documents.js
exports.getDocument = {
    name: 'getDocument',
    description: 'get a document by id',
    method: 'get',
    endpoint: '/api/document/:id',
    version: 'v1',
    tokenAuth: true,
    inputs: {
        id: {
            required: true,
            validate: val => parseInt(val, 10)
        },
    },
    run: (services, inputs, next) => {
        const id = inputs.id;
        next(200, {
            id
        });
    },
};
```
### Route Auth

#### Token Auth
Impulse-Api comes with [JSON web token](https://www.npmjs.com/package/jsonwebtoken) auth built in. As long as `secretKey` is provided to the server configuration on initialization, routes can use an optional `tokenAuth:true` in order to enable basic JWT authentication.

Additionally, any variables that are encoded in the token are accessible once the token has been decoded via `inputs.decoded`.

Token generation is handled via `Impulse.Auth` which again utilizes the [JSON web token](https://www.npmjs.com/package/jsonwebtoken) package.

```js
const { Auth } = require('impulse-api');
{ decode: [Function],
  verify: [Function],
  sign: [Function],
  JsonWebTokenError: [Function: JsonWebTokenError],
  NotBeforeError: [Function: NotBeforeError],
  TokenExpiredError: [Function: TokenExpiredError] }
```

#### Application Auth
For `admin` type routes, Impulse-Api also provides `applicationAuth` which secures any routes behind basic key authorization provided by `appKey` in the server configuration. The `applicationAuth` can be verified and passed in the header, parameters, query, or body as `key`.

```js
// routes/users.js
exports.createUser = {
    name: 'createUser',
    description: 'create a new user',
    method: 'post',
    endpoint: '/api/user/',
    version: 'v1',
    applicationAuth: true,
    inputs: {
        username: {
            required: true,
        },
        password: {
            required: true,
        }
    },
    run: (services, inputs, next) => {
        const id = inputs.id;
        next(200, {
            id
        });
    },
};
```
If a route specifies both Application and Token auth, Application auth will take precedence.

-- Application auth routes should not be called from any public client since this will expose `appKey`.


### Inputs

Impulse-Api automatically parses all request query, body, params, and files variables with the following priority: query, body, params, files. Header fields are always parsed.

This allows for very dynamic routes. The following routes will all parse `newEmailAddress`.

```js
PUT /user/:id/&newEmailAddress=hello@world.com

PUT /user/:id/
body: {
	newEmailAddress: 'hello@world.com'
}

PUT /user/:id/
json: {
	"newEmailAddress": "hello@world.com"
}

PUT /user/:id/
params: newEmailAddress="hello@world.com"

```
