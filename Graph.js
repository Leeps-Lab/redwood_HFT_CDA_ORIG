/* Angular service used for creating svg elements that graphically represent a market
*  Created by Zachary Petersen - zacharypetersen1@gmail.com
*
*  To use this service, inject it and call makeTradingGraph(svgElementID)
*     This will return a new graph object. Call graph.init(timeStamp) to
*     initialize the graph, call graph.draw(timeStamp) to update the graph.
*/
RedwoodHighFrequencyTrading.factory("Graphing", function () {
   var api = {};

   // Returns new grpah object - pass in id of svg element on which graph will be drawn
   api.makeTradingGraph = function(marketSVGElementID, profitSVGElementID){
      var graph = {};

      graph.marketElementId = marketSVGElementID;  //id of the market graph svg element
      graph.profitElementId = profitSVGElementID;  //id of the profit graph svg element
      graph.elementWidth = 0;          //Width and Height of both svg elements
      graph.elementHeight = 0;         //    (use calculateSize to determine)
      graph.axisLabelWidth = 40;       //Width of area where price axis labels are drawn
      graph.marketSVG = d3.select('#'+ graph.marketElementId); //market svg element
      graph.profitSVG = d3.select('#'+ graph.profitElementId); //profit svg element
      graph.minPriceMarket = 85;              //min price on price axis for market graph
      graph.maxPriceMarket = 115;             //max price on price axis for market graph
      graph.minPriceProfit = 0;               //min price on price axis for profit graph
      graph.maxPriceProfit = 150;             //max price on price axis for profit graph
      graph.marketPriceGridIncriment = 5;     //amount between each line on market price axis
      graph.profitPriceGridIncriment = 15;    //amount between each line on profit price axis
      graph.timeInterval = 30;         //Amount in seconds displayed at once on full time axis
      graph.timeIncriment = 5;         //Amount in seconds between lines on time axis
      graph.currentTime = 0;           //Time displayed on graph
      graph.marketPriceLines = [];           //
      graph.timeLines = [];
      graph.pricesArray = [];
      graph.dataObj = {
         prices: [],
         buyOffers: [[500,15,2]],
         sellOffers: [],
         drawData: []
      };

      graph.calculateSize = function(){
         this.elementWidth = $('#'+ this.marketElementId).width();
         this.elementHeight = $('#'+ this.marketElementId).height();
         this.curTimeX = this.elementWidth - this.axisLabelWidth;
      };

      graph.getSize = function(){
         return [this.elementWidth, this.elementHeight];
      };

      graph.mapProfitPriceToYAxis = function(price){
         var percentOffset = (this.maxPriceProfit - price) / (this.maxPriceProfit - this.minPriceProfit);
         return this.elementHeight * percentOffset;
      };

      graph.mapMarketPriceToYAxis = function(price){
         var percentOffset = (this.maxPriceMarket - price) / (this.maxPriceMarket - this.minPriceMarket);
         return this.elementHeight * percentOffset;
      };

      graph.mapTimeToXAxis = function(timeStamp){
         var percentOffset = (timeStamp - (this.currentTime - (this.timeInterval * 1000))) / (this.timeInterval * 1000);
         return (this.elementWidth - this.axisLabelWidth) * percentOffset;
      };

      //unused
      graph.priceUnit = function(){
         return this.elementHeight / (this.maxPriceMarket - this.minPriceMarket);
      };

      graph.millisToTime = function(timeStamp){
         var x = timeStamp / 1000;
         var seconds = parseInt(x % 60);
         x /= 60;
         var minutes = parseInt(x % 60);

         x /= 60;
         var hours = parseInt(x % 24);
         return hours + ":" + minutes + ":" + seconds;
      };

      graph.calcPriceGridLines = function(maxPrice, minPrice, increment){
         var gridLineVal = minPrice + increment - (minPrice % increment);
         var lines = [];
         while(gridLineVal < maxPrice){
            lines.push(gridLineVal);
            gridLineVal += increment;
         }
         return lines;
      };

      graph.calcTimeGridLines = function(timeStamp){
         var timeLineVal = timeStamp - (timeStamp % (this.timeIncriment * 1000));
         var lines = [];
         while(timeLineVal > timeStamp - this.timeInterval * 1000){
            lines.push(timeLineVal);
            timeLineVal -= this.timeIncriment * 1000;
         }
         lines.push(timeLineVal);
         return lines;
      };

      graph.getTimeGridClass = function(timeStamp){
         if(timeStamp % (this.timeIncriment * 2000) == 0)
            return "time-grid-box-light";
         else return "time-grid-box-dark";
      };


      graph.drawTimeGridLines = function(graphRefr, svgToUpdate, dataHistory){
         //Draw rectangles for time gridlines
         svgToUpdate.selectAll("rect")
            .data(this.timeLines)
            .enter()
            .append("rect")
            .attr("x", function(d){return graphRefr.mapTimeToXAxis(d);})
            .attr("y", 0)
            .attr("width", this.timeIncriment / this.timeInterval * (this.elementWidth - this.axisLabelWidth))
            .attr("height", this.elementHeight)
            .attr("class", function(d){return graphRefr.getTimeGridClass(d);});
         //If necisarry, draw the dark gray space to signify the "dead zone" before exp. started
         if(this.currentTime < dataHistory.startTime + this.timeInterval * 1000){
            svgToUpdate.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", this.mapTimeToXAxis(dataHistory.startTime))
            .attr("height", this.elementHeight)
            .attr("class", "dead-zone");
         }
         //Draw labels for time gridlines
         svgToUpdate.selectAll("text.time-grid-line-text")
            .data(this.timeLines)
            .enter()
            .append("text")
            .attr("text-anchor", "start")
            .attr("x", function(d){return graphRefr.mapTimeToXAxis(d)+5;})
            .attr("y", this.elementHeight-5)
            .text(function(d) {return graphRefr.millisToTime(d)})
            .attr("class", "time-grid-line-text");
      };


      graph.drawPriceGridLines = function(graphRefr, priceLines, svgToUpdate, priceMapFunction){
         //hack to fix problem with this not being set correctly for map function
         priceMapFunction = priceMapFunction.bind(graphRefr);

         //Draw the lines for the price gridlines
         svgToUpdate.selectAll("line.price-grid-line")
            .data(priceLines)
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("x2", this.elementWidth - this.axisLabelWidth)
            .attr("y1", function(d) {return priceMapFunction(d);})
            .attr("y2", function(d) {return priceMapFunction(d);})
            .attr("class", "price-grid-line");
      };


      graph.drawStep = function(graphRefr, historyDataSet, currentData, styleClassName, svgToUpdate, priceMapFunction){
         //hack to fix problem with this not being set correctly for map function
         priceMapFunction = priceMapFunction.bind(graphRefr);

         svgToUpdate.selectAll("line." + styleClassName)
            .data(historyDataSet)
            .enter()
            .append("line")
            .attr("x1", function(d){ return graphRefr.mapTimeToXAxis(d[0]); })
            .attr("x2", function(d){ return graphRefr.mapTimeToXAxis(d[1]); })
            .attr("y1", function(d){ return priceMapFunction(d[2]); })
            .attr("y2", function(d){ return priceMapFunction(d[3]); })
            .attr("class", styleClassName);

         if(currentData != null) {
            var pricefinal = currentData[1] - ((Date.now() - currentData[0]) * currentData[2] / 1000); //determines how far down the line has moved
            svgToUpdate.append("line")
               .attr("x1", this.mapTimeToXAxis(currentData[0]) )
               .attr("x2", this.curTimeX)
               .attr("y1", priceMapFunction(currentData[1]) )
               .attr("y2", priceMapFunction(pricefinal) )
               .attr("class", styleClassName);
         }
      };

      graph.drawOffers = function(graphRefr, dataHistory){
         this.drawStep(graphRefr, dataHistory.pastBuyOffers, dataHistory.curBuyOffer, "buy-offer", this.marketSVG, this.mapMarketPriceToYAxis);
         this.drawStep(graphRefr, dataHistory.pastSellOffers, dataHistory.curSellOffer, "sell-offer", this.marketSVG, this.mapMarketPriceToYAxis);
      };

      graph.drawPriceAxis = function(graphRefr, priceLines, svgToUpdate, priceMapFunction){
         //hack to fix problem with this not being set correctly for map function
         priceMapFunction = priceMapFunction.bind(graphRefr);

         //Draw rectangle on right side for price axis
         svgToUpdate.append("rect")
            .attr("x", this.elementWidth - this.axisLabelWidth)
            .attr("y", 0)
            .attr("width", this.axisLabelWidth)
            .attr("height", this.elementHeight)
            .attr("class", "price-axis-box");
         //Draw the text that goes along with the price gridlines and axis
         svgToUpdate.selectAll("text.price-grid-line-text")
            .data(priceLines)
            .enter()
            .append("text")
            .attr("text-anchor", "start")
            .attr("x", this.elementWidth - this.axisLabelWidth + 5)
            .attr("y", function(d) {return priceMapFunction(d);})
            .attr("class", "price-grid-line-text")
            .text(function(d) {return d;});
      };

      graph.drawTransactions = function(graphRefr, historyDataSet) {
         graphRefr.marketSVG.selectAll("line.my-transactions line.other-transactions")
            .data(historyDataSet)
            .enter()
            .append("line")
            .attr("x1", function(d) {return graphRefr.mapTimeToXAxis(d[0]); })
            .attr("x2", function(d) {return graphRefr.mapTimeToXAxis(d[0]); })
            .attr("y1", function(d) {return graphRefr.mapMarketPriceToYAxis(d[3]); })
            .attr("y2", function(d) {return graphRefr.mapMarketPriceToYAxis(d[4]); })
            .attr("class", function(d) {return d[1] !== "none" ? "my-transactions" : "other-transactions"});
      };

      graph.draw = function(dataHistory){
         //Clear the svg elements
         this.marketSVG.selectAll("*").remove();
         this.profitSVG.selectAll("*").remove();

         var graphRefr = this;

         this.currentTime = Date.now();

         //Check if it is necessary to recalculate timeLines
         if(this.currentTime > this.timeLines[0] + this.timeIncriment){
            this.timeLines = this.calcTimeGridLines(this.currentTime);
         }

         //Invoke all of the draw functions
         this.drawTimeGridLines(graphRefr, this.marketSVG, dataHistory);
         this.drawTimeGridLines(graphRefr, this.profitSVG, dataHistory);

         this.drawPriceGridLines(graphRefr, this.marketPriceLines, this.marketSVG, this.mapMarketPriceToYAxis);
         this.drawPriceGridLines(graphRefr, this.profitPriceLines, this.profitSVG, this.mapProfitPriceToYAxis);

         this.drawStep(graphRefr, dataHistory.pastFundPrices, dataHistory.curFundPrice, "price-line", this.marketSVG, this.mapMarketPriceToYAxis);
         this.drawOffers(graphRefr, dataHistory);
         this.drawTransactions(graphRefr, dataHistory.transactions);

         this.drawPriceAxis(graphRefr, this.marketPriceLines, this.marketSVG, this.mapMarketPriceToYAxis);
         this.drawPriceAxis(graphRefr, this.profitPriceLines, this.profitSVG, this.mapProfitPriceToYAxis);

         this.drawStep (graphRefr, dataHistory.pastProfitSegments, dataHistory.curProfitSegment, "profit-line", this.profitSVG, this.mapProfitPriceToYAxis);
      };

      graph.init = function(){
         this.calculateSize();
         this.marketPriceLines = this.calcPriceGridLines(this.maxPriceMarket, this.minPriceMarket, this.marketPriceGridIncriment);
         this.profitPriceLines = this.calcPriceGridLines(this.maxPriceProfit, this.minPriceProfit, this.profitPriceGridIncriment);
         this.timeLines = this.calcTimeGridLines(Date.now());
      };

      return graph;
   };



   return api;

});
