const { logger } = require('../logger')
const fs = require('fs/promises')
const path = require('path')
const XLSX = require('xlsx')
const _ = require('underscore')
const { Op } = require("sequelize")
const { sequelize } = require('../database')

const supplierStoreModel = sequelize.models.SupplierStore
const supplierSheetModel = sequelize.models.SupplierSheet

const MEDIUM_BLOB_MAX_SIZE = 16 * 1024 * 1024 - 1;

async function getAllSuppliers() {
	return await supplierStoreModel.findAll({
		order: [
			['sectionCode', 'ASC'],
			['storeSequence', 'ASC']
		]
	});
}

async function getSuppliersByName(name) {
	return await supplierStoreModel.findAll({
		where: {
			supplierName: {
				[Op.like]: `%${name}%`
			}
		},
		order: [
			['sectionCode', 'ASC'],
			['storeSequence', 'ASC']
		]
	});
}

async function getSuppliersByAddress(address) {
	return await supplierStoreModel.findAll({
		where: {
			storeAddress: {
				[Op.like]: `%${address}%`
			}
		},
		order: [
			['sectionCode', 'ASC'],
			['storeSequence', 'ASC']
		]
	});
}

async function addNewSuppliersFromExcel(excelFile) {
	if (_.isNull(excelFile) || _.isUndefined(excelFile) || _.isEmpty(excelFile)) {
		logger.error('excelFile参数不存在')
		throw new Error('没输入文件参数路径')
	}

	let resultJson = {
		message: ''
	}

	const workbook = XLSX.readFile(excelFile)
	const sheetName = workbook.SheetNames[0]
	const worksheet = workbook.Sheets[sheetName]

	// 将工作表转换为JSON数组 - 自动将第一行作为标题行
	const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

	if (_.isEmpty(jsonData)) {
		logger.error('excel文件为空文件');
		throw new Error('空Excel文件')
	}

	await _storeSupplierSheet(excelFile);

	// 列映射关系：Excel列名 -> 目标对象字段名
	const columnMapping = {
		'门店ID': 'storeId',
		'供应商': 'supplierName',
		'门店名称': 'storeName',
		'档口号': 'storeNo',
		'门店地址': 'storeAddress',
		'供应商类型': 'supplierType',
		'是否开启代拿': 'othersTakeGood',
		'直发订单开启用户快递': 'usingUserExpress',
		'自动推送订单打印': 'autoPushAndPrint',
		'待拿货数据同步供应商': 'autoSyncToSupplier',
		'允许改价': 'allowToChangePrice',
		'采购付款节点': 'paymentPoint',
		'联系电话': 'contactPhoneNum',
		'区域编码': 'sectionCode',
		'门店顺序': 'storeSequence'
	}

	const supplierStores = []
	const storeIds = []

	for (let i = 0; i < jsonData.length; i++) {
		const rowData = jsonData[i]
		const supplierStore = {}

		// 遍历每一列，根据映射关系转换
		for (const [excelColumn, targetField] of Object.entries(columnMapping)) {
			if (rowData.hasOwnProperty(excelColumn)) {
				const cellValue = rowData[excelColumn]

				// 根据字段类型进行转换
				if (targetField === 'storeId' || targetField === 'storeSequence') {
					supplierStore[targetField] = Number(cellValue) || null
					if (targetField === 'storeId') storeIds.push(supplierStore[targetField])
				} else {
					// 其他字段保持原样，处理空值
					supplierStore[targetField] = cellValue !== undefined ? cellValue : ''
				}
			}
		}

		// 文本格式如果不匹配则为空
		if (!_.isEmpty(supplierStore)) supplierStores.push(supplierStore)
	}

	if (_.isEmpty(supplierStores)) {
		logger.error('supplierStores与columnMapping映射关系错误')
		throw new Error('columnMapping 映射关系出错了')
	}

	const existingSuppliers = await supplierStoreModel.findAll({
		where: {
			storeId: {
				[Op.in]: storeIds
			}
		}
	})

	if (_.isEmpty(existingSuppliers)) {
		try {
			await supplierStoreModel.bulkCreate(supplierStores)
		} catch (error) {
			logger.error('supplierStoreModel.bulkCreate操作异常：', error)
			throw new Error('数据操作异常')
		}

		resultJson.message = '成功插入数据'
		return
	}

	let [existingMap, newMap] = [new Map(), new Map()]
	existingSuppliers.forEach((sup) => {
		existingMap.set(sup.storeId, sup)
	})
	supplierStores.forEach((sup) => {
		newMap.set(sup.storeId, sup)
	})

	let [newOnes, changedOnes] = [[], []]
	for (let [key, value] of newMap) {
		if (!existingMap.has(key)) {
			newOnes.push(value)
		} else if (!_isSameSupplierStore(value, existingMap.get(key))) {
			changedOnes.push(existingMap.get(key)) // old
			changedOnes.push(value) // new
		}
	}

	if (newOnes.length === 0) {
		resultJson.message = resultJson.message.concat('无新增数据项|')
	} else {
		resultJson.message = resultJson.message.concat('有 新增 数据项|')
		resultJson.newOnes = newOnes
	}

	if (changedOnes.length === 0) {
		resultJson.message = resultJson.message.concat('无更新数据项|')
	} else {
		resultJson.message = resultJson.message.concat('有 更新 数据项|')
		resultJson.changedOnes = changedOnes
	}

	return resultJson
}

async function _storeSupplierSheet(filePath) {
	if (_.isEmpty(filePath)) return

	logger.debug(filePath)

	try {
		let fileName = path.basename(filePath)
		if (fileName.length > 100) {
			fileName = fileName.slice(-100)
		}

		const fileStats = await fs.stat(filePath);
		const fileSize = fileStats.size; // 核心：获取文件长度

		const msg = `最大支持 ${MEDIUM_BLOB_MAX_SIZE / 1024 / 1024}MB，当前文件 ${fileSize / 1024 / 1024}MB`
		logger.debug(msg)

		if (fileSize > MEDIUM_BLOB_MAX_SIZE) {
			throw new Error('文件大小超过限制！' + msg);
		}

		const fileBinary = await fs.readFile(filePath)

		supplierSheetModel.create({
			sheetName: fileName,
			sheetBinary: fileBinary,
			sheetSize: fileSize
		})

		logger.info(`文件存储成功：${fileName}`);
	} catch (error) {
		logger.error(`文件存储失败：`, error);
	}
}

/**
 * 辅助函数：比较两个字段是否相等（处理null和空字符串）
 * @param {*} aField - 对象a的字段值
 * @param {*} bField - 对象b的字段值
 * @returns {boolean} 两个字段是否相等
 */
function _isSameField(aField, bField) {
	// 若两个字段都为null或空字符串，视为相等
	if ((aField === null || aField === '') && (bField === null || bField === '')) {
		return true
	}
	// 否则使用严格相等比较（类型+值都相同）
	return aField === bField
}

/**
 * 判断两个供应商门店对象是否完全相同
 * @param {Object} a - 供应商门店对象a
 * @param {Object} b - 供应商门店对象b
 * @returns {boolean} 两个对象是否相同
 */
function _isSameSupplierStore(a, b) {
	// 需要比较的字段列表（与原逻辑保持一致）
	const fields = [
		'storeId',
		'supplierName',
		'storeName',
		'storeNo',
		'storeAddress',
		'supplierType',
		'othersTakeGood',
		'usingUserExpress',
		'autoPushAndPrint',
		'autoSyncToSupplier',
		'allowToChangePrice',
		'paymentPoint',
		'contactPhoneNum',
		'sectionCode',
		'storeSequence'
	]

	// 遍历所有字段，使用辅助函数逐个比较
	return fields.every(field => _isSameField(a[field], b[field]))
}


async function addNewSuppliersFromData(suppliers) {
	if (_.isNull(suppliers) || _.isUndefined(suppliers) || _.isEmpty(suppliers)) {
		throw new Error('没有可以增加的供应商数据')
	}

	if (!_.isArray(suppliers)) {
		throw new Error('增加的供应商数据格式不对，需要一个数组')
	}

	try {
		for (let supplier of suppliers) {
			await supplierStoreModel.create(supplier)
		}
	} catch (error) {
		logger.error('supplierStoreModel.create操作异常：', error)
		throw new Error('增加供应商数据出错')
	}
}

async function updateSuppliersFromData(suppliers) {
	if (_.isNull(suppliers) || _.isUndefined(suppliers) || _.isEmpty(suppliers)) {
		throw new Error('没有可以更新的供应商数据')
	}

	if (!_.isArray(suppliers)) {
		throw new Error('增加的供应商数据格式不对，需要一个数组')
	}

	try {
		for (let supplier of suppliers) {
			await supplierStoreModel.update(supplier, {
				where: {
					storeId: supplier.storeId
				}
			})
		}
	} catch (error) {
		logger.error('supplierStoreModel.update操作异常：', error)
		throw new Error('更新供应商数据出错')
	}
}

module.exports = {
	getAllSuppliers,
	getSuppliersByName,
	getSuppliersByAddress,
	addNewSuppliersFromExcel,
	addNewSuppliersFromData,
	updateSuppliersFromData
}