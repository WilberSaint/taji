import util from 'util';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Colores de texto
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Colores de fondo
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

class Logger {
  constructor() {
    this.enabled = process.env.NODE_ENV !== 'production';
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    let formattedMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (data) {
      formattedMessage += '\n' + util.inspect(data, { 
        depth: 3, 
        colors: true,
        compact: false 
      });
    }
    
    return formattedMessage;
  }

  info(message, data = null) {
    if (!this.enabled) return;
    console.log(
      `${COLORS.cyan}${this.formatMessage('INFO', message, data)}${COLORS.reset}`
    );
  }

  success(message, data = null) {
    if (!this.enabled) return;
    console.log(
      `${COLORS.green}${this.formatMessage('SUCCESS', message, data)}${COLORS.reset}`
    );
  }

  warn(message, data = null) {
    if (!this.enabled) return;
    console.warn(
      `${COLORS.yellow}${this.formatMessage('WARN', message, data)}${COLORS.reset}`
    );
  }

  error(message, error = null) {
    console.error(
      `${COLORS.red}${this.formatMessage('ERROR', message, error)}${COLORS.reset}`
    );
  }

  debug(message, data = null) {
    if (!this.enabled || process.env.DEBUG !== 'true') return;
    console.log(
      `${COLORS.magenta}${this.formatMessage('DEBUG', message, data)}${COLORS.reset}`
    );
  }

  game(message, data = null) {
    if (!this.enabled) return;
    console.log(
      `${COLORS.blue}${this.formatMessage('GAME', message, data)}${COLORS.reset}`
    );
  }

  room(message, data = null) {
    if (!this.enabled) return;
    console.log(
      `${COLORS.cyan}${COLORS.bright}${this.formatMessage('ROOM', message, data)}${COLORS.reset}`
    );
  }
}

export default new Logger();
