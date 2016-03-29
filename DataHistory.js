RedwoodHighFrequencyTrading.factory("DataHistory", function () {
   var api = {};

   api.createDataHistory = function(){
      
      //Variables
      dataHistory = {};
      dataHistory.fundementalPrices = [[Date.now(), 15]];  //Cheating right now by recording initial FV

      //Functions
      //Adds fundemental price change to history
      dataHistory.recordFPChange = function(timestamp, newValue){
         this.fundementalPrices.push([timestamp, newValue]);
      }

      //Handles message from subject manager
      dataHistory.recvMessage = function(msg){
         if(msg.msgType == "FPC"){
            this.recordFPChange(msg.msgData[0], msg.msgData[1]);
            console.log(this.fundementalPrices);
         }
      }

      return dataHistory;
   }

   return api;
});