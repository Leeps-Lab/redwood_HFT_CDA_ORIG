RedwoodHighFrequencyTrading.factory("GroupManager", function () {
   var api = {};

   api.createGroupManager = function(priceLinesFile, sendFunction){
      var groupManager = {};
      groupManager.priceChanges = [];
      groupManager.rssend = sendFunction;
      groupManager.outBoundMessages = [];
      groupManager.inBoundMessages = [];

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

      console.log(groupManager.priceChanges);

      groupManager.sendToSubjects = function(message){
         rssend("From_Group_Manager", message);
      }

      groupManager.recvFromSubject = function(message){
         console.log(message);
         console.log("recieved message:" + message.asString);
      }

      groupManager.rssend("Experiment_Begin", Date.now());
      return groupManager;
   }

   return api;
});