function Message(protocol, delay, message){
   this.protocol = protocol;
   this.timeStamp = Date.now();
   this.delay = delay;
   this.message = message;
   this.sendTime = this.timeStamp + this.delay;
   this.asString = "Message using protocol: " + this.protocol + " generated at " + String(this.timeStamp) + " with latency delay " + String(delay);
}