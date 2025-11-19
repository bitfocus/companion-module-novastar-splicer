export class HeartbeatManager {
  constructor({ sendHeartbeat, onTimeout, onRecover, timeout = 15000, maxRetry = 3 }) {
    this.sendHeartbeat = sendHeartbeat; // 发送心跳包的函数
    this.onTimeout = onTimeout; // 超时回调
    this.onRecover = onRecover; // 恢复回调
    this.timeout = timeout;
    this.maxRetry = maxRetry;
    this.interval = null;
    this.lastReceived = 0;
    this.retryCount = 0;
    this.active = false;
  }

  start() {
    this.stop();
    this.active = true;
    this.lastReceived = Date.now();
    this.retryCount = 0;
    this.interval = setInterval(() => {
      this.sendHeartbeat();
      if (Date.now() - this.lastReceived > this.timeout) {
        this.retryCount++;
        if (this.retryCount >= this.maxRetry) {
          this.onTimeout && this.onTimeout();
        }
      }
    }, this.timeout);
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.interval = null;
    this.active = false;
    this.retryCount = 0;
  }

  receive() {
    const wasTimeout = Date.now() - this.lastReceived > this.timeout * this.maxRetry;
    this.lastReceived = Date.now();
    this.retryCount = 0;
    if (wasTimeout && this.onRecover) {
      this.onRecover();
    }
  }
}
