const debug = require('debug')('fangzhibao-supplier-mgmt:route/main');

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
	debug(uploadedFile.name);

	let uploadPath = path.join(__dirname, '..', 'uploaded_files', Date.now() + uploadedFile.name);
	debug(uploadPath);

	try {
		// Use the mv() method to place the file somewhere on your server
		await uploadedFile.mv(uploadPath);
	} catch (error) {
		debug(error);
		console.log(error);
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
		debug(error);
		console.log(error);
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
		debug(error);
		console.log(error);
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
		debug(error);
		console.log(error);
	}

	res.json(respJson)
})

function _rmUploadedFile(uploadPath) {
	fs.rm(uploadPath, (err) => {
		if (err) {
			console.error(err.message);
			debug('删除文件失败：' + err.message);
		}
		console.log(`成功删除文件：${uploadPath}`);
	});
}

module.exports = router;
