import moment from 'moment';

function messagify(obj) {
  switch (typeof obj) {
    case 'function':
      return obj();
    case 'object':
      return JSON.stringify(obj);
    default:
      return obj;
  }
}

export class Logger {
  constructor(category) {
    this._category = (category || "unspecified").toLowerCase();
    this.setLogLevel = this.setLogLevel.bind(this);

    this.error = this.error.bind(this);
    this.showError = true;
    this.warn = this.warn.bind(this);
    this.showWarn = true;
    this.info = this.info.bind(this);
    this.showInfo = true;
    this.debug = this.debug.bind(this);
    this.showDebug = true;
    this.trace = this.trace.bind(this);
    this.showTrace = false;
  }

  error(msg) {
    if (this.showError) {
      console.log(`E ${moment().toISOString()} [${this._category}] ${messagify(msg)}`);
    }
  }

  warn(msg) {
    if (this.showWarn) {
      console.log(`W ${moment().toISOString()} [${this._category}] ${messagify(msg)}`);
    }
  }

  info(msg) {
    if (this.showInfo) {
      console.log(`I ${moment().toISOString()} [${this._category}] ${messagify(msg)}`);
    }
  }

  debug(msg) {
    if (this.showDebug) {
      console.log(`D ${moment().toISOString()} [${this._category}] ${messagify(msg)}`);
    }
  }

  trace(msg) {
    if (this.showTrace) {
      console.log(`T ${moment().toISOString()} [${this._category}] ${messagify(msg)}`);
    }
  }

  setLogLevel(logger, logLevel) {
    if (!logLevel) return;

    const logValue = [ 'trace', 'debug', 'info', 'warn', 'error', 'off' ].indexOf(logLevel);

    logger.showTrace = logValue < 1;
    logger.showDebug = logValue < 2;
    logger.showInfo = logValue < 3;
    logger.showWarn = logValue < 4;
    logger.showError = logValue < 5;
  }
}

const defaultLogger = new Logger("default");

export default defaultLogger;
