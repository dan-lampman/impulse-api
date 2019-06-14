# impulse-api
This module provides a quick and easy way to create new http servers.

## Installation
```npm install impulse-api```

## Unit Tests
```npm run test```

## Usage
A at least one .js file must exist at `{project-root}/routes` in order to initialize a new Api. See [sample-routes](https://github.com/dan-lampman/impulse-api/tree/master/sample-routes) for reference.

```js
const Impulse = require('impulse-api');

const config = {
    env: 'DEV'
    port: 3000,
    secretKey: 'topSecret!'
    version: 1.0.0,
    name: 'Hello-World-Api',
    routeDir: __dirname.concat('/routes')
};

const api = new Impulse(config);
await api.init();
```
#### Heartbeat endpoint
By default, all APIs have a `/heartbeat` endpoint that returns 200 along with the following standard output:
```js
{
	status: 'alive'
}

```
## Routes
Routes are files that provide HTTP functionality.

```js
// routes/document-routes.js
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
            validate: val => return parseInt(val, 10)
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
Impulse-Api comes with [JSON web token](https://www.npmjs.com/package/jsonwebtoken) auth built in. As long as `secretKey` is provided to the server configuration on initialization, routes can use an optional `tokenAuth:true` in order to enable basic JWT authentication.

Token generation should be handled outside the scope of this package but may eventually be added at a later time.

