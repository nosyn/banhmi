export class BunWsContext {
  ws
  event
  data
  constructor(ws, event, data) {
    this.ws = ws
    this.event = event
    this.data = data
  }
  send(data) {
    return this.ws.send(data)
  }
  subscribe(topic) {
    this.ws.subscribe(topic)
  }
  unsubscribe(topic) {
    this.ws.unsubscribe(topic)
  }
  publish(topic, data) {
    return this.ws.publish(topic, data)
  }
  close(code, reason) {
    this.ws.close(code, reason)
  }
  get remoteAddress() {
    return this.ws.remoteAddress
  }
}
