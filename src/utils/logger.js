export class Logger {
  constructor(name, debug = false) {
    this.name = name;
    this.debugEnabled = !!debug;
  }

  logRequest(endpoint, response, params = null, headers = null) {
    if (!this.debugEnabled) {
      return;
    }

    const log = `ESPN API Request: url: ${endpoint} params: ${JSON.stringify(params)} headers: ${JSON.stringify(headers)}\nESPN API Response: ${JSON.stringify(response)}`;
    console.debug(log);
  }
}
