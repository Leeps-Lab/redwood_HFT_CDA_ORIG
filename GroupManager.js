RedwoodHighFrequencyTrading.factory("GroupManager", function () {
   var api = {};

   api.createGroupManager = function(priceLinesFile, sendFunction){
      var groupManager = {};
      groupManager.priceChanges = [];
      groupManager.rssend = sendFunction;
      groupManager.outBoundMessages = [];
      groupManager.inBoundMessages = [];
      groupManager.priceIndex = 0;

      console.log("hello");
      console.log(groupManager.rssend);
      console.log(sendFunction);


      //Add the logging terminal to the ui section of the html
      $("#ui").append('<div class="terminal-wrap"><div class="terminal-head">Group Message Log</div><div id="group-log" class="terminal"></div></div>');
      groupManager.logger = new MessageLogger("Group Manager", "#5555FF", "group-log");

      //Parse the price lines file
      var rows = priceLinesFile.data.split("\n");
      for (var i = 0; i < rows.length-1; i++) {
         groupManager.priceChanges[i] = [];
      }
      for (var i = 0; i < rows.length-1; i++) {
         if (rows[i] === "") continue;
         var cells = rows[i].split(",");
         for (var j = 0; j < cells.length; j++) {
            groupManager.priceChanges[i][j] = parseFloat(cells[j]);
         }
      }

      //Initialize functions
      groupManager.sendToSubjects = function(message){
         this.rssend("From_Group_Manager", message);
      }

      groupManager.recvFromSubject = function(msg){
         updateMsgTime(msg);
         this.logger.logRecv(msg, "subjects");

         //FOR TESTING ONLY
         if(msg.msgType == "EBUY"){
            var nMsg = new Message("ITCH", "C_EBUY", [msg.msgData[0], msg.msgData[1], Date.now()]);
            this.sendToSubjects(nMsg);
         }
         //FOR TESTING ONLY
         if(msg.msgType == "ESELL"){
            var nMsg = new Message("ITCH", "C_ESELL", [msg.msgData[0], msg.msgData[1], Date.now()]);
            this.sendToSubjects(nMsg);
         }
         //FOR TESTING ONLY
         if(msg.msgType == "RBUY"){
            var nMsg = new Message("ITCH", "C_RBUY", [msg.msgData[0], Date.now()]);
            this.sendToSubjects(nMsg);
         }
         //FOR TESTING ONLY
         if(msg.msgType == "RSELL"){
            var nMsg = new Message("ITCH", "C_RSELL", [msg.msgData[0], Date.now()]);
            this.sendToSubjects(nMsg);
         }
      }

      //Looks for change in fundemental price and sends message if change is found
      groupManager.update = function(){
         /*while(this.priceIndex < this.priceChanges.length
               && Date.now() > this.priceChanges[this.priceIndex][0] + this.startTime) {
            var msg = new Message("OUCH", 0, "Fundemental price changed to " + String(this.priceChanges[this.priceIndex][1]));
            this.logger.logSend(msg, "subjects");
            this.rssend("From_Group_Manager", msg);
            this.priceIndex++;
         }*/
      }

      //Send out the message that starts the experiment
      groupManager.startTime = Date.now();
      groupManager.rssend("Experiment_Begin", groupManager.startTime);

      return groupManager;
   }

   return api;
});