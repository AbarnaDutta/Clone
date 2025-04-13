export const logger = {
  debug: (module, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] [DEBUG] [${module}]`, message, meta);
  },
  info: (module, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.info(`[${timestamp}] [INFO] [${module}]`, message, meta);
  },
  warn: (module, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] [${module}]`, message, meta);
  },
  error: (module, message, meta = {}) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] [${module}]`, message, meta);
  }
}; 