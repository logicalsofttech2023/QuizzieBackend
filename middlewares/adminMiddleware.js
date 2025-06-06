const User = require('../models/user_model');
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const Admin = require('../models/AdminModel');

const adminMiddleware = asyncHandler(async (req, res, next) => {
    let token;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        token = req.headers.authorization.split(' ')[1];
        try {
            if (token) {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                console.log(decoded);
                                
                req.user = await Admin.findById(decoded.id);
                next();
            }
        }
        catch (err) {
            return res.status(401).json({ message: 'Not Authorized token expired, Please Login again' });
        }
    } else {
        return res.status(401).json({ message: 'There is no token attached to header' });
    }
});

module.exports = { adminMiddleware };
