const debug = require('debug')('fangzhibao-supplier-mgmt:route/main');

const path = require('path');
const fs = require('fs');

const express = require('express');
const router = express.Router();
const authenticateToken = require('./authRoute');
const jwt = require('jsonwebtoken');

const userService = require('../services/userService');
const supplierService = require('../services/supplierService');

router.get('/', authenticateToken, async (req, res, next) => {
	let suppliers = await supplierService.getAllSuppliers();
	res.render('main', {
		suppliers: suppliers
	});
});

router.get('/login', (req, res, next) => {
	const error = req.query.error;
	res.render('login', { error });
});

router.post('/login', async (req, res, next) => {
	const { username, password } = req.body;

	let validated = await userService.validateUser(username, password);
	let message = '登录成功';

	debug(`validate result = ${validated}`);

	if (validated) {
		let jwt_token = jwt.sign(
			{ username: username },
			process.env.JWT_SECRET,
			{ expiresIn: '1h' } // 令牌1小时后过期
		);
		res.cookie('jwt_token', jwt_token, {
			httpOnly: true, // 禁止 JavaScript 访问（防 XSS）
			secure: process.env.NODE_ENV === 'production', // 生产环境仅通过 HTTPS 传输
			maxAge: 3600000, // 过期时间（1小时）
			sameSite: 'strict' // 限制跨域请求携带（防 CSRF）
		});
	} else {
		message = '用户名或密码错误';
	}

	res.json({
		success: validated,
		message: message
	});
});

router.post('/upload', authenticateToken, async (req, res) => {
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

router.post('/addNewSupplier', authenticateToken, async (req, res) => {
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

router.post('/updateSupplier', authenticateToken, async (req, res) => {
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
