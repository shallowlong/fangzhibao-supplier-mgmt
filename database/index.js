const mysql = require('mysql2/promise');
const { Sequelize } = require("sequelize");

const { dbConfig, customPoolConfig } = require('./config');
const customConnectionPool = mysql.createPool(customPoolConfig);

const isProduction = process.env.NODE_ENV === 'production';

const sequelize = new Sequelize(
	dbConfig.database,
	dbConfig.username,
	dbConfig.password,
	dbConfig
);

const db = {
	sequelize,
	customConnectionPool,
	models: {}
};

let logger;
setTimeout(() => {
	logger = require('../logger').logger;
}, 0);

/**
 * 关闭自定义连接池
 * @returns {Promise<void>} - 无返回值
 */
async function closeCustomConnectionPool() {
	try {
		await customConnectionPool.end();
		logger?.info('自定义连接池已成功关闭');
	} catch (err) {
		logger?.error('自定义关闭连接池失败：', err);
	}
}

async function testDBConnection() {
	try {
		await sequelize.authenticate();
		logger?.info('sequelize数据库连接成功');
	} catch (error) {
		logger?.error('sequelize数据库连接失败:', error);
	}
}

async function closeDBConnection() {
	try {
		await sequelize.close();
		logger?.info('成功关闭sequelize数据库');
	} catch (error) {
		logger?.error('关闭sequelize数据库失败:', error);
	}
}

async function initTables() {
	if (!isProduction) {
		await sequelize.sync({ alter: true });
	} else {
		await sequelize.sync();
	}
}

async function initUser() {
	const userModel = db.models.User;
	await userModel.findOrCreate({
		where: { username: process.env.DB_DEFAULT_USER },
		defaults: {
			password: process.env.DB_DEFAULT_PASS
		}
	});
}

// 加载所有模型
db.models.User = require('./models/User')(sequelize, Sequelize.DataTypes);
db.models.SupplierStore = require('./models/SupplierStore')(sequelize, Sequelize.DataTypes);
db.models.SupplierSheet = require('./models/SupplierSheet')(sequelize, Sequelize.DataTypes);
db.models.ApiToken = require('./models/ApiToken')(sequelize, Sequelize.DataTypes);
db.models.SupplierStoreHistory = require('./models/SupplierStoreHistory')(sequelize, Sequelize.DataTypes);


db.User = db.models.User;
db.SupplierStore = db.models.SupplierStore;
db.SupplierSheet = db.models.SupplierSheet;
db.ApiToken = db.models.ApiToken;
db.SupplierStoreHistory = db.models.SupplierStoreHistory;
db.closeCustomConnectionPool = closeCustomConnectionPool;
db.closeDBConnection = closeDBConnection;

setTimeout(() => {
	testDBConnection().then(() => initTables().then(() => initUser()));
}, 0);

module.exports = db;
