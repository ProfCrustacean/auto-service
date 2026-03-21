export function createLogger(context = {}) {
  return {
    info(event, fields = {}) {
      writeLog("info", event, context, fields);
    },
    warn(event, fields = {}) {
      writeLog("warn", event, context, fields);
    },
    error(event, fields = {}) {
      writeLog("error", event, context, fields);
    },
  };
}

function writeLog(level, event, context, fields) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
    ...fields,
  };

  process.stdout.write(`${JSON.stringify(record)}\n`);
}
