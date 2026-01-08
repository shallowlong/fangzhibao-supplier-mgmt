const { logger } = require('../logger');

const express = require('express');
const router = express.Router();
const authToken = require('./authRoute');

const supplierService = require('../services/supplierService');

router.get('/', authToken, (req, res) => {
	res.render('history');
});

router.get('/data', authToken, async (req, res) => {
	try {
		const histories = await supplierService.getAllSupplierHistories();

		res.status(200).json({
			success: true,
			message: '供应商历史记录获取成功',
			data: histories
		});
	} catch (error) {
		logger.error('获取供应商历史记录时出错:', error);
		res.status(500).json({ success: false, message: '服务器内部错误' });
	}
});

module.exports = router;
