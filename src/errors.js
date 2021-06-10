const httpErrors = require('http-errors');

exports.BadRequest = (msg) => {
    return httpErrors(400, msg || 'Bad request');
};

exports.MissingParameter = (param) => {
    return httpErrors(400, `Input: ${param} is required`);
};

exports.InvalidParameter = (param, name) => {
    return httpErrors(400, `Invalid input value for ${param}: ${name}`);
};

exports.UnauthorizedUser = (msg) => {
    return httpErrors(401, msg || 'User is not logged in');
};

exports.Missing = (msg) => {
    return httpErrors(404, msg || 'Requested resource is missing');
};

exports.TokenConflict = (msg) => {
    return httpErrors(409, msg || 'User auth token is invalid');
};

exports.DBError = (msg) => {
    return httpErrors(500, msg || 'Database error');
};

exports.Generic = (msg) => {
    return httpErrors(500, msg || 'A problem has occurred');
};

exports.Maintenance = (msg) => {
    return httpErrors(503, msg || 'Maintenance mode');
};
