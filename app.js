const path = require('path');

const createHttpError = require('http-errors');
const express = require('express');
const session = require('express-session');
const fileUpload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const app = express();
const MySQLStore = require('express-mysql-session')(session);
const options = {
	host: 'localhost',
	port: 3306,
	user: process.env.DATABASE_USER,
	password: process.env.DATABASE_PASS,
	database: process.env.DATABASE_NAME
};
const sessionStore = new MySQLStore(options);

// view engine setup
app.engine('.html', require('ejs').__express);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');
app.set('trust proxy', true);

app.use(logger(process.env.MORGAN_OPTION));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload({
	defParamCharset: 'utf8'
}));
app.use(session({
	secret: process.env.SESSION_SECRET,
	resave: false,
	saveUninitialized: false,
	store: sessionStore,
	cookie: {
		maxAge: 60 * 60 * 1000, // 默认1小时
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax'
	}
}));


const loginRoute = require('./routes/loginRoute');
const mainRoute = require('./routes/mainRoute');
app.use('/login', loginRoute);
app.use('/', mainRoute);


// catch 404 and forward to error handler
app.use(function (req, res, next) {
	next(createHttpError(404));
});

// error handler
app.use(function (err, req, res, next) {
	// set locals, only providing error in development
	res.locals.message = err.message;
	res.locals.error = req.app.get('env') === 'development' ? err : {};

	// render the error page
	res.status(err.status || 500);
	res.render('error');
});

module.exports = app;