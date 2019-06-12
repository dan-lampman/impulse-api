const jwt = require('jsonwebtoken');
const auth = {
    generateToken(params, config) {
        return(jwt.sign(params, config.secretKey));
    },
    verifyToken(token, secretKey) {
        return jwt.verify(token, secretKey);
    }
};

module.exports = auth;