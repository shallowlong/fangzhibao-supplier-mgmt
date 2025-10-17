const { logger } = require('../logger')

const path = require('path');
const fs = require('fs');

const express = require('express');
const router = express.Router();
const authToken = require('./authRoute');

const supplierService = require('../services/supplierService');

router.get('/', authToken, async (req, res, next) => {
	let suppliers = await supplierService.getAllSuppliers();
	res.render('main', {
		suppliers: suppliers
	});
});

router.post('/upload', authToken, async (req, res) => {
	let respJson = {
		success: false,
		message: ''
	};

	if (!req.files || Object.keys(req.files).length === 0) {
		respJson.message = '没有上传的文件。。';
		res.json(respJson);
		return;
	}

	let uploadedFile = req.files.uploadedFile;
	logger.debug('uploaded file name :' + uploadedFile.name);

	let uploadPath = path.join(__dirname, '..', 'uploaded_files', Date.now() + uploadedFile.name);
	logger.debug('uploaded path: ' + uploadPath);

	try {
		// Use the mv() method to place the file somewhere on your server
		await uploadedFile.mv(uploadPath);
	} catch (error) {
		logger.error('文件操作错误：', error);
		respJson.message = '文件操作发生异常。。';
		_rmUploadedFile(uploadPath);
		res.json(respJson);
		return;
	}

	let serviceResultJson;

	try {
		serviceResultJson = await supplierService.addNewSuppliersFromExcel(uploadPath);
		respJson.success = true;
		respJson.data = serviceResultJson;
	} catch (error) {
		logger.error('处理文件内容错误：', error);
		respJson.message = '文件处理发生异常。。';
		_rmUploadedFile(uploadPath);
		res.json(respJson);
		return;
	}

	_rmUploadedFile(uploadPath);
	res.json(respJson);
});

router.post('/addNewSupplier', authToken, async (req, res) => {
	let respJson = {
		success: false,
		message: ''
	}

	let jsonData = req.body
	try {
		await supplierService.addNewSuppliersFromData(jsonData)
		respJson.success = true
	} catch (error) {
		logger.error('增加供应商操作错误：', error);
	}

	res.json(respJson)
})

router.post('/updateSupplier', authToken, async (req, res) => {
	let respJson = {
		success: false,
		message: ''
	}

	let jsonData = req.body
	try {
		await supplierService.updateSuppliersFromData(jsonData)
		respJson.success = true
	} catch (error) {
		logger.error('更新供应商操作错误：', error);
	}

	res.json(respJson)
})

function _rmUploadedFile(uploadPath) {
	fs.rm(uploadPath, (err) => {
		if (err) {
			logger.error('删除文件失败：' + err.message);
		}
		logger.debug(`成功删除文件：${uploadPath}`);
	});
}

/**
 * @route GET /getSupplierStatistics
 * @description 获取供应商统计数据
 */
router.get('/getSupplierStatistics', async (req, res) => {
	try {
		const statistics = await supplierService.getSupplierStatistics();

		res.status(200).json({
			success: true,
			message: '供应商统计数据获取成功',
			data: statistics
		});
	} catch (error) {
		logger.error('获取供应商统计数据时出错:', error);
		res.status(500).json({ success: false, message: '服务器内部错误' });
	}
});

module.exports = router;
