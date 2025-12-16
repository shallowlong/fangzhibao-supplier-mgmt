require('dotenv').config();

const { logger } = require('../logger');
const { closeDBConnection, closeCustomConnectionPool } = require('../database');

const app = require('../app');
const http = require('http');
const server = http.createServer(app);

server.listen();
server.on('listening', onListening);

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