require('dotenv').config();

const { logger } = require('../logger');
const { closeDBConnection, closeCustomConnectionPool } = require('../database');

const app = require('../app');
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

const http = require('http');
const server = http.createServer(app);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

function normalizePort(val) {
	let port = parseInt(val, 10);
	if (isNaN(port)) return val; // named pipe
	if (port >= 0) return port; // port number
	return false;
}

function onError(error) {
	if (error.syscall !== 'listen') throw error;

	let bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

	// handle specific listen errors with friendly messages
	switch (error.code) {
		case 'EACCES':
			logger.error(bind + ' requires elevated privileges');
			process.exit(1);
			break;
		case 'EADDRINUSE':
			logger.error(bind + ' is already in use');
			process.exit(1);
			break;
		default:
			throw error;
	}
}

function onListening() {
	let addr = server.address();
	let bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
	logger.info('Listening on ' + bind);
}

async function cleanup() {
	try {
		logger.info('****——关闭HTTP服务器中...');
		server.close(async (err) => {
			logger.info('****——关闭数据库连接池中...');
			await closeCustomConnectionPool();
			await closeDBConnection();

			if (err) {
				logger.warn('XXXX——关闭HTTP服务器失败，强制退出:', err);
				process.exit(1);
			}
			logger.info('****——HTTP服务器已关闭，正常退出当前进程');
			process.exit(0);
		});
	} catch (err) {
		logger.fatal('XXXX——清理资源失败，强制退出当前进程:', err);
		process.exit(1);
	}
}

// 监听终止信号：SIGINT（Ctrl+C）、SIGTERM（kill命令）
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
// 处理未捕获的异常
process.on('uncaughtException', (err) => {
	logger.error('XXXX——未捕获的异常，强制退出当前进程:', err);
	cleanup().then(() => process.exit(1));
});
// 处理未捕获的Promise拒绝
process.on('unhandledRejection', (reason) => {
	logger.error('XXXX——未处理的Promise拒绝，强制退出当前进程:', reason);
	cleanup().then(() => process.exit(1));
});