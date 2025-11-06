const jwt = require('jsonwebtoken');

class Auth {
    constructor(secretKey) {
        if (!secretKey) {
            throw new Error('Auth instance must be initialized with secretKey');
        }
        this.secretKey = secretKey;
    }

    generateToken(params) {
        return jwt.sign(params, this.secretKey);
    }

    verifyToken(token) {
        return jwt.verify(token, this.secretKey);
    }

    // Helper function to create custom validators
    createCustomValidator(validatorFn) {
        if (typeof validatorFn !== 'function') {
            throw new Error('Custom validator must be a function');
        }
        return validatorFn;
    }
}

module.exports = Auth;