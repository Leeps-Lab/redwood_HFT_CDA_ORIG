// Message object. Used to communicate between group manager, subject manager, and market algorithm
function Message(protocol, msgType, msgData){
   this.protocol = protocol;
   this.delay = false;
   this.timeStamp = Date.now();
   this.msgType = msgType;
   this.msgData = msgData;
   this.asString = "Message using protocol: " + this.protocol + " generated at " + String(this.timeStamp);
}

// Updates timestamp of message to current timestamp
function updateMsgTime(msg){
   msg.timeStamp = Date.now();
}

// Returns packed message with "actionTime" tag used to simulate latency
function packMsg(msg, delay){
   msg.delay = delay;
   return{"actionTime" : msg.timeStamp + msg.delay, "msg" : msg};
}

// Converts timestamp to readable time
function millisToTime(millis){
   var date = new Date(millis);
   var str = '';
   str += date.getUTCHours() + "h:";
   str += date.getUTCMinutes() + "m:";
   str += date.getUTCSeconds() + "s:";
   str += date.getUTCMilliseconds() + "millis";
   return str;
}

// Logger object used to debug messages as they are recieved and sent
function MessageLogger(name, nameColor, elementId){
   this.name = name;
   this.nameColor = nameColor;
   this.element = $("#" + elementId);

   this.logSend = function(msg, reciever){
      this.element.append('<div class="log-line"><span style="color:' 
         + this.nameColor + '"> ' + this.name 
         + '</span> <span>sent message to ' + reciever + ' at</span> <span class="timestamp">' 
         + millisToTime(msg.timeStamp) + '</span> <span> containing:</span> <span class="message">'
         + msg.msgType + '</span></div>');
      this.scrollDown();
   }

   this.logRecv = function(msg, sender){
      this.element.append('<div class="log-line"><span style="color:' 
         + this.nameColor + '"> ' + this.name 
         + '</span> <span>recieved message from ' + sender +' at </span> <span class="timestamp">' 
         + millisToTime(msg.timeStamp) + '</span> <span> containing:</span> <span class="message">'
         + msg.msgType + '</span></div>');
      this.scrollDown();
   }

   this.logSendWait = function(msg){
      this.element.append('<div class="log-line"><span style="color:' 
         + this.nameColor + '"> ' + this.name 
         + '</span> <span>out wait list at</span> <span class="timestamp">' 
         + millisToTime(msg.timeStamp) + '</span> <span> delay</span> <span class="delay">' 
         + String(msg.delay) + '</span> <span> containing:</span> <span class="message">'
         + msg.msgType + '</span></div>');
      this.scrollDown();
   }

   this.logRecvWait = function(msg){
      this.element.append('<div class="log-line"><span style="color:' 
         + this.nameColor + '"> ' + this.name 
         + '</span> <span>in wait list at</span> <span class="timestamp">' 
         + millisToTime(msg.timeStamp) + '</span> <span> delay</span> <span class="delay">' 
         + String(msg.delay) + '</span> <span> containing:</span> <span class="message">'
         + msg.msgType + '</span></div>');
      this.scrollDown();
   }

   this.logString = function(str){
      this.element.append('<div class="log-line"><span style="color:' 
         + this.nameColor + '"> ' + this.name 
         + '</span> <span>' + str + '</span></div>');
      this.scrollDown();
   }

   this.scrollDown = function(){
      this.element.scrollTop(this.element[0].scrollHeight);
   }
}