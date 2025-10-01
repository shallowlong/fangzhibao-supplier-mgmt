const { logger } = require('../logger');

const crypto = require('crypto');
const { sequelize } = require('../database');
const { validateUser } = require('./userService');

const apiTokenModel = sequelize.models.ApiToken;

const _generateSecureApiToken = () => {
	return crypto.randomBytes(16).toString('hex');
};

const _generateExpirationTime = () => {
	const now = new Date();
	now.setDate(now.getDate() + 7); // 过期时间设置为7天
	return now;
};

async function validateAndRetrieve(username, password) {
	username = username.trim();
	password = password.trim();

	try {
		const isValid = await validateUser(username, password);
		if (!isValid) {
			logger.info(`用户名密码错误: ${username}`);
			return false;
		}

		const existingToken = await apiTokenModel.findOne({
			where: { username }
		});

		if (existingToken) {
			if (existingToken.expireAt > new Date()) {
				return existingToken.token;
			} else {
				const updatedToken = await existingToken.update({
					token: _generateSecureApiToken(),
					expireAt: _generateExpirationTime()
				});
				return updatedToken.token;
			}
		}

		const token = _generateSecureApiToken();
		const expireAt = _generateExpirationTime();

		const newToken = await apiTokenModel.create({
			token,
			username,
			expireAt
		});

		return newToken.token;
	} catch (error) {
		logger.error(`生成API token失败 => 用户：${username}, 错误：${error.message}`);
		return false;
	}
}

async function validateToken(token) {
	try {
		const existingToken = await apiTokenModel.findOne({
			where: { token }
		});

		if (existingToken) {
			logger.info(`验证API token成功 => token: ${token}, 过期时间: ${existingToken.expireAt}`);
			return (existingToken.expireAt > new Date());
		}

		return false;
	} catch (error) {
		logger.error(`验证API token失败 => 错误：${error.message}`);
		return false;
	}
}

module.exports = {
	validateAndRetrieve: validateAndRetrieve,
	validateToken: validateToken
}