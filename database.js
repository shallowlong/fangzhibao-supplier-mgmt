const { logger } = require('./logger');

const _database = process.env.DATABASE_NAME;
const _user = process.env.DATABASE_USER;
const _pass = process.env.DATABASE_PASS;

const mysql = require('mysql2/promise');
const customConnectionPool = mysql.createPool({
	host: 'localhost',
	user: _user,
	password: _pass,
	database: _database,
	charset: 'utf8mb4',
	connectionLimit: 3,
	idleTimeout: 60000
})

async function closeCustomConnectionPool() {
	try {
		await customConnectionPool.end();
		logger.info('自定义连接池已成功关闭');
	} catch (err) {
		logger.error('自定义关闭连接池失败：', err);
	}
}

const { Sequelize, DataTypes } = require("sequelize");
const sequelize = new Sequelize(_database, _user, _pass, {
	host: 'localhost',
	dialect: 'mysql',
	dialectOptions: {
		charset: 'utf8mb4'
	},
	define: {
		freezeTableName: true
	},
	pool: {
		max: 3,
		min: 0,
		acquire: 30000,
		idle: 60000
	}
})

sequelize.define('SupplierStore',
	{
		storeId: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			allowNull: false,
			comment: `门店ID`
		},
		supplierName: {
			type: DataTypes.STRING(100),
			allowNull: false,
			comment: `供应商`
		},
		storeName: {
			type: DataTypes.STRING(100),
			allowNull: false,
			comment: `门店名称`
		},
		storeNo: {
			type: DataTypes.STRING(50),
			allowNull: false,
			comment: `档口号`
		},
		storeAddress: {
			type: DataTypes.STRING(200),
			allowNull: false,
			comment: `门店地址`
		},
		supplierType: {
			type: DataTypes.STRING(50),
			comment: `供应商类型`
		},
		othersTakeGood: {
			type: DataTypes.STRING(10),
			comment: `是否开启代拿`
		},
		usingUserExpress: {
			type: DataTypes.STRING(10),
			comment: `直发订单开启用户快递`
		},
		autoPushAndPrint: {
			type: DataTypes.STRING(10),
			comment: `自动推送订单打印`
		},
		autoSyncToSupplier: {
			type: DataTypes.STRING(10),
			comment: `待拿货数据同步供应商`
		},
		allowToChangePrice: {
			type: DataTypes.STRING(10),
			comment: `允许改价`
		},
		paymentPoint: {
			type: DataTypes.STRING(50),
			comment: `采购付款节点`
		},
		contactPhoneNum: {
			type: DataTypes.STRING(20),
			comment: `联系电话`
		},
		sectionCode: {
			type: DataTypes.STRING(20),
			comment: `区域编码`,
			get() {
				let sc = this.getDataValue('sectionCode') || '';
				if (sc.trim().length > 0) {
					sc = '{' + sc.substring(sc.indexOf('-') + 1) + '}';
				}
				return sc;
			}
		},
		storeSequence: {
			type: DataTypes.INTEGER,
			comment: `门店顺序`
		}
	},
	{
		tableName: 'fzb_supplier_store',
		indexes: [
			{
				name: 'idx_storeName',
				unique: true,
				fields: ['storeName']
			}
		]
	})

sequelize.define('User',
	{
		username: {
			type: DataTypes.STRING(50),
			primaryKey: true,
			allowNull: false,
		},
		password: {
			type: DataTypes.STRING(100),
			allowNull: false,
		}
	},
	{
		tableName: 'fzb_user'
	}
)

sequelize.define('SupplierSheet',
	{
		sheetId: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
			allowNull: false,
		},
		sheetName: {
			type: DataTypes.STRING(100),
			allowNull: false,
		},
		sheetBinary: {
			type: DataTypes.BLOB('medium'),
			allowNull: false,
		},
		sheetSize: {
			type: DataTypes.BIGINT,
			allowNull: false
		}
	},
	{
		tableName: 'fzb_supplier_sheet'
	}
)

sequelize.define('ApiToken',
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
			allowNull: false,
		},
		token: {
			type: DataTypes.STRING(64),
			allowNull: false,
		},
		username: {
			type: DataTypes.STRING(50),
			allowNull: false,
		},
		expireAt: {
			type: DataTypes.DATE,
			allowNull: false,
		}
	},
	{
		tableName: 'fzb_api_token',
		indexes: [
			{
				name: 'idx_token',
				unique: true,
				fields: ['token']
			}
		]
	}
)


async function testDBConnection() {
	try {
		await sequelize.authenticate();
		logger.info('sequelize数据库连接成功');
	} catch (error) {
		logger.error('sequelize数据库连接失败:', error);
	}
}

async function closeDBConnection() {
	try {
		await sequelize.close();
		logger.info('成功关闭sequelize数据库');
	} catch (error) {
		logger.error('关闭sequelize数据库失败:', error);
	}
}

async function initTables() {
	await sequelize.sync();
}

async function initUser() {
	const userModel = sequelize.models.User;
	await userModel.findOrCreate({
		where: { username: process.env.DB_DEFAULT_USER },
		defaults: {
			password: process.env.DB_DEFAULT_PASS
		}
	});
}

testDBConnection().then(() => initTables().then(() => initUser()))

module.exports = {
	sequelize,
	closeDBConnection,
	customConnectionPool,
	closeCustomConnectionPool
}