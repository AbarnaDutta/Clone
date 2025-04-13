class Logger {
  constructor() {
    this.debugMode = true; // Set to false in production
    this.logHistory = [];
  }

  formatMessage(level, context, message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = {
      timestamp,
      level,
      context,
      message,
      data: data ? JSON.stringify(data) : undefined,
    };
    this.logHistory.push(logMessage);
    return `[${timestamp}] [${level}] [${context}] ${message}${data ? '\nData: ' + JSON.stringify(data, null, 2) : ''}`;
  }

  log(level, context, message, data = null) {
    const formattedMessage = this.formatMessage(level, context, message, data);
    if (this.debugMode) {
      switch (level) {
        case 'ERROR':
          console.error(formattedMessage);
          break;
        case 'WARN':
          console.warn(formattedMessage);
          break;
        case 'INFO':
          console.info(formattedMessage);
          break;
        default:
          console.log(formattedMessage);
      }
    }
    return formattedMessage;
  }

  info(context, message, data = null) {
    return this.log('INFO', context, message, data);
  }

  warn(context, message, data = null) {
    return this.log('WARN', context, message, data);
  }

  error(context, message, data = null) {
    return this.log('ERROR', context, message, data);
  }

  debug(context, message, data = null) {
    return this.log('DEBUG', context, message, data);
  }

  getLogHistory() {
    return this.logHistory;
  }

  clearHistory() {
    this.logHistory = [];
  }
}

export const logger = new Logger();
