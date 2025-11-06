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

#### Token Generation

Token generation is handled via the `Auth` class. You must create an `Auth` instance with your `secretKey`, then you can generate and verify tokens without passing the secret key on every call.

```js
const Impulse = require('impulse-api');
const Auth = Impulse.Auth;

// Create an Auth instance with your secret key
const auth = new Auth('your-secret-key');

// Generate a token (no need to pass secretKey again)
const token = auth.generateToken({ 
    userId: '123', 
    username: 'john.doe',
    role: 'admin' 
});

// Verify a token (no need to pass secretKey again)
const decoded = auth.verifyToken(token);
console.log(decoded.userId); // '123'
console.log(decoded.username); // 'john.doe'
```

**Important:** The `Auth` class requires a `secretKey` in the constructor. If you don't provide one, it will throw an error.

```js
// This will throw an error
const auth = new Auth(); // Error: Auth instance must be initialized with secretKey

// This is correct
const auth = new Auth('your-secret-key');
```

When using the server with `secretKey` in the config, the server automatically creates an `Auth` instance internally. You can also create your own `Auth` instances for token generation in your application code (e.g., in login routes).

**Example: Login Route**

Here's a complete example of a login route that generates tokens:

```js
// routes/auth.js
const Impulse = require('impulse-api');
const Auth = Impulse.Auth;

// Create Auth instance with your secret key (same as server config)
const auth = new Auth(process.env.SECRET_KEY || 'your-secret-key');

exports.login = {
    name: 'login',
    description: 'User login endpoint',
    method: 'post',
    endpoint: '/api/login',
    version: 'v1',
    inputs: {
        email: {
            required: true,
            validate: (val) => typeof val === 'string' && val.includes('@')
        },
        password: {
            required: true
        }
    },
    run: (services, inputs, next) => {
        // Authenticate user (check database, etc.)
        const user = services.userService.authenticate(inputs.email, inputs.password);
        
        if (!user) {
            return next(401, { error: 'Invalid credentials' });
        }
        
        // Generate token with user data
        const token = auth.generateToken({
            userId: user.id,
            email: user.email,
            role: user.role
        });
        
        next(200, {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });
    }
};
```

#### Custom JWT Validation

You can override JWT validation to use custom authentication providers (like Google OAuth, Auth0, etc.) instead of the default JWT validation. This is typically configured once at the server level.

##### Server-Level Custom Validation (Recommended)
```javascript
const config = {
    name: 'my-api',
    port: 3000,
    secretKey: 'fallback-secret',
    routeDir: './routes',
    tokenValidator: async (token, services) => {
        // Global token validation for all routes with tokenAuth: true
        const userInfo = await services.googleOAuth.verifyToken(token);
        return {
            userId: userInfo.googleId,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture
        };
    },
    services: {
        googleOAuth: {
            verifyToken: async (token) => {
                // Your Google OAuth validation logic
                // This would typically make an API call to Google
                return { 
                    googleId: 'google-123', 
                    email: 'user@example.com',
                    name: 'John Doe',
                    picture: 'https://example.com/photo.jpg'
                };
            }
        }
    }
};

const api = new Impulse(config);
```

##### Per-Route Override (Optional)
If you need different validation for specific routes, you can override the global validator:

```javascript
exports.specialRoute = {
    name: 'specialRoute',
    method: 'post',
    endpoint: '/api/special',
    version: 'v1',
    tokenAuth: true,
    validateToken: async (token, services) => {
        // Override global validation for this specific route
        const userInfo = await services.specialAuth.verifyToken(token);
        return {
            userId: userInfo.specialId,
            role: userInfo.role,
            permissions: userInfo.permissions
        };
    },
    run: (services, inputs, next) => {
        const user = inputs.decoded; // From route-specific validation
        next(200, { message: 'Success', user });
    }
};
```

##### Validation Flow
1. **Global token validator** (`config.tokenValidator`) - primary validation
2. **Route-specific validator** (`route.validateToken`) - optional override
3. **Default JWT validation** - fallback when no token validator is provided

##### Backward Compatibility
Existing routes without custom validators continue to work with default JWT validation. No breaking changes to the existing API.

##### Error Handling
Custom validators should throw errors for invalid tokens. The framework will catch these and return appropriate HTTP 401 responses.

```javascript
validateToken: async (token, services) => {
    try {
        const userInfo = await services.oauth.verifyToken(token);
        return userInfo;
    } catch (error) {
        throw new Error('Invalid authentication token');
    }
}
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
