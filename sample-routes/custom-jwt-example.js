// Example route using server-level custom JWT validation for Google OAuth
// The tokenValidator is configured at server initialization
exports.scanDocument = {
    name: 'scanDocument',
    description: 'Scan a document with Google OAuth authentication',
    method: 'post',
    endpoint: '/api/scan',
    version: 'v1',
    tokenAuth: true,
    // No custom validator needed - uses server-level tokenValidator
    inputs: {
        documentId: {
            required: true,
            validate: (value) => typeof value === 'string' && value.length > 0
        },
        scanType: {
            required: false,
            validate: (value) => ['text', 'image', 'pdf'].includes(value)
        }
    },
    run: (services, inputs, next) => {
        const user = inputs.decoded; // Contains Google OAuth user data from server-level tokenValidator
        const { documentId, scanType } = inputs;
        
        // Process the document scan with authenticated user
        const result = {
            success: true,
            documentId,
            scanType: scanType || 'text',
            user: {
                id: user.userId,
                email: user.email,
                name: user.name,
                picture: user.picture
            },
            timestamp: new Date().toISOString()
        };
        
        next(200, result);
    }
};

// Example route using global custom validator
exports.getUserProfile = {
    name: 'getUserProfile',
    description: 'Get user profile with custom authentication',
    method: 'get',
    endpoint: '/api/profile',
    version: 'v1',
    tokenAuth: true,
    // This route will use the global tokenValidator from config
    run: (services, inputs, next) => {
        const user = inputs.decoded; // From global tokenValidator
        
        const profile = {
            userId: user.userId,
            email: user.email,
            lastLogin: new Date().toISOString(),
            preferences: user.preferences || {}
        };
        
        next(200, profile);
    }
};

// Example route with default JWT validation (backward compatibility)
exports.legacyRoute = {
    name: 'legacyRoute',
    description: 'Legacy route using default JWT validation',
    method: 'get',
    endpoint: '/api/legacy',
    version: 'v1',
    tokenAuth: true,
    // No custom validator - uses default JWT validation
    run: (services, inputs, next) => {
        const user = inputs.decoded; // From default JWT validation
        
        next(200, {
            message: 'Legacy route works with default JWT',
            user: user
        });
    }
};
