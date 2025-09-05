const { logger } = require('../logger')

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const authenticateToken = (req, res, next) => {
	const jwt_token = req.cookies.jwt_token; // 从 Cookie 提取
	if (!jwt_token) {
		logger.debug('cookie中没有找到token，跳转登录页面');
		return res.redirect('/login');
	}

	try {
		// 验证令牌
		if (jwt.verify(jwt_token, JWT_SECRET)) {
			next();
		} else {
			logger.debug('令牌验证为False');
			return res.redirect('/login?error=登录出错啦');
		}
	} catch (error) {
		logger.debug('令牌无效或过期，重定向到登录页');
		return res.redirect('/login?error=登录失效啦');
	}
};

module.exports = authenticateToken;