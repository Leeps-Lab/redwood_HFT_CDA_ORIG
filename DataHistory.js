RedwoodHighFrequencyTrading.factory("DataHistory", function () {
   var api = {};

   api.createDataHistory = function(startTime, myId, group){
      
      //Variables
      dataHistory = {};
      dataHistory.startTime = startTime;
      dataHistory.myId = myId;
      dataHistory.group = group;
      dataHistory.fundementalPrices = [[Date.now(), 15]];  //Cheating right now by recording initial FV
      dataHistory.curBuyOffer = null;
      dataHistory.curSellOffer = null;
      dataHistory.pastBuyOffers = [];
      dataHistory.pastSellOffers = [];
      dataHistory.groupOffers = [];
      dataHistory.logger = new MessageLogger("Data History " + String(myId), "orange", "subject-log");
/*
      var i = 0;
      for(i; i<dataHistory.groupData.others.length; i++){
         dataHistory.groupData.append({
            "curBuyOffer" : null,
            "curSellOffer" : null,
            "pastBuyOffers" : [],
            "pastSellOffers" : []});
      }

      dataHistory.getOtherIndex = function(otherId){
         var i = 0;
         for(i; i < this.groupData.others.length; i++){
            if(this.groupData.others[i] == otherId){
               return i;
            }
         }
      };*/

      dataHistory.recvMessage = function(msg){
         this.logger.logRecv(msg, "Market Algorithm");

         switch(msg.msgType){
            case "FPC"     : this.recordFPCchange(msg);           break;
            case "C_UBUY"  :
            case "C_EBUY"  : this.recordBuyOffer(msg);            break;
            case "C_USELL" :
            case "C_ESELL" : this.recordSellOffer(msg);           break;
            case "C_RBUY"  : this.storeBuyOffer(msg.msgData[1]);  break;
            case "C_RSELL" : this.storeSellOffer(msg.msgData[1]); break;
         }

      };

      // Functions
      // Adds fundemental price change to history
      dataHistory.recordFPCchange = function(fpcMsg) {
         this.fundementalPrices.push([fpcMsg.msgData[0], fpcMsg.msgData[1]]); // index 0 = timestamp, index 1 = new price value
      };

      // Records a new buy offer
      dataHistory.recordBuyOffer = function(buyMsg) {
         //Check if current buy offer needs to be stored
         if(this.curBuyOffer != null){
            this.storeBuyOffer(buyMsg.msgData[2]);
         }
         //Push on new buy offer
         this.curBuyOffer = [buyMsg.msgData[2], buyMsg.msgData[1]];   // [timestamp, price]
      };

      // Records a new Sell offer
      dataHistory.recordSellOffer = function(sellMsg) {
         //Check if current sell offer needs to be stored
         if(this.curSellOffer != null){
            this.storeSellOffer(sellMsg.msgData[2]);
         }
         //Push on new sell offer
         this.curSellOffer = [sellMsg.msgData[2], sellMsg.msgData[1]];   // [timestamp, price]
      };

      // Shifts buy offer from currently being active into the history
      dataHistory.storeBuyOffer = function(endTime) {
         if(this.curBuyOffer == null){
            throw "Cannot shift buy offer because it is null";
         }
         this.pastBuyOffers.push( [this.curBuyOffer[0], endTime, this.curBuyOffer[1]] );  // [startTimestamp, endTimestamp, price]
         this.curBuyOffer = null;
      };

      // Shifts sell offer from currently being active into the history
      dataHistory.storeSellOffer = function(endTime) {
         if(this.curSellOffer == null){
            throw "Cannot shift sell offer because it is null";
         }
         this.pastSellOffers.push( [this.curSellOffer[0], endTime, this.curSellOffer[1]] );  // [startTimestamp, endTimestamp, price]
         this.curSellOffer = null;
      };

      return dataHistory;
   }

   return api;
});