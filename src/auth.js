const jwt = require('jsonwebtoken');
const auth = {
    generateToken(params, config) {
        return(jwt.sign(params, config.secretKey));
    },
    verifyToken(token, secretKey) {
        return jwt.verify(token, secretKey);
    },
    // Helper function to create custom validators
    createCustomValidator(validatorFn) {
        if (typeof validatorFn !== 'function') {
            throw new Error('Custom validator must be a function');
        }
        return validatorFn;
    }
};

module.exports = auth;