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
   api.makeTradingGraph = function(marketSVGElementID, profitSVGElementID, tickDelayMs){
      var graph = {};

      graph.tickDelayMs = tickDelayMs;
      graph.marketElementId = marketSVGElementID;  //id of the market graph svg element
      graph.profitElementId = profitSVGElementID;  //id of the profit graph svg element
      graph.elementWidth = 0;          //Width and Height of both svg elements
      graph.elementHeight = 0;         //    (use calculateSize to determine)
      graph.axisLabelWidth = 40;       //Width of area where price axis labels are drawn
      graph.marketSVG = d3.select('#'+ graph.marketElementId); //market svg element
      graph.profitSVG = d3.select('#'+ graph.profitElementId); //profit svg element
      graph.minPrice = 85;              //min price on price axis
      graph.maxPrice = 115;             //max price on price axis
      graph.priceGridIncriment = 5;    //amount between each line on price axis
      graph.timeInterval = 30;         //Amount in seconds displayed at once on full time axis
      graph.timeIncriment = 5;         //Amount in seconds between lines on time axis
      graph.currentTime = 0;           //Time displayed on graph
      graph.priceLines = [];           //
      graph.timeLines = [];
      graph.startTime = 0;
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

      graph.mapPriceToYAxis = function(price){
         var percentOffset = (this.maxPrice - price) / (this.maxPrice - this.minPrice);
         return this.elementHeight * percentOffset;
      };

      graph.mapTimeToXAxis = function(timeStamp){
         var percentOffset = (timeStamp - (this.currentTime - (this.timeInterval * 1000))) / (this.timeInterval * 1000);
         return (this.elementWidth - this.axisLabelWidth) * percentOffset;
      };

      graph.priceUnit = function(){
         return this.elementHeight / (this.maxPrice - this.minPrice);
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

      graph.calcPriceGridLines = function(){
         var gridLineVal = this.minPrice + this.priceGridIncriment - (this.minPrice % this.priceGridIncriment);
         var lines = [];
         while(gridLineVal < this.maxPrice){
            lines.push(gridLineVal);
            gridLineVal += this.priceGridIncriment;
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


      graph.drawTimeGridLines = function(graphRefr, svgToUpdate){
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
         if(this.currentTime < this.startTime + this.timeInterval * 1000){
            svgToUpdate.append("rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", this.mapTimeToXAxis(this.startTime))
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


      graph.drawPriceGridLines = function(graphRefr){
         //Draw the lines for the price gridlines
         this.marketSVG.selectAll("line.price-grid-line")
            .data(this.priceLines)
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("x2", this.elementWidth - this.axisLabelWidth)
            .attr("y1", function(d) {return graphRefr.mapPriceToYAxis(d);})
            .attr("y2", function(d) {return graphRefr.mapPriceToYAxis(d);})
            .attr("class", "price-grid-line");
      };


      graph.drawPriceLine = function(graphRefr, dataHistory){
         //Draw the price line
         this.marketSVG.selectAll("line.price-line")
            .data(dataHistory.fundementalPrices)
            .enter()
            .append("line")
            .attr("x1", function(d){ return graphRefr.mapTimeToXAxis( d[0] ); })
            .attr("x2", function(d, i){
               if(i != dataHistory.fundementalPrices.length-1)
                  return graphRefr.mapTimeToXAxis( dataHistory.fundementalPrices[i+1][0] );
               else
                  return graphRefr.elementWidth - graphRefr.axisLabelWidth;
            })
            .attr("y1", function(d){ return graphRefr.mapPriceToYAxis(d[1]); })
            .attr("y2", function(d){ return graphRefr.mapPriceToYAxis(d[1]); })
            .attr("class", "price-line");
      };


      graph.drawStep = function(graphRefr, historyDataSet, currentData, styleClassName, svgToUpdate){

         svgToUpdate.selectAll("line." + styleClassName)
            .data(historyDataSet)
            .enter()
            .append("line")
            .attr("x1", function(d){ return graphRefr.mapTimeToXAxis(d[0]); })
            .attr("x2", function(d){ return graphRefr.mapTimeToXAxis(d[1]); })
            .attr("y1", function(d){ return graphRefr.mapPriceToYAxis(d[2]); })
            .attr("y2", function(d){ return graphRefr.mapPriceToYAxis(d[3]); })
            .attr("class", styleClassName);

         if(currentData != null) {
            var pricefinal = currentData[1] - ((Date.now() - currentData[0]) * currentData[2] / 1000); //determines how far down the line has moved
            svgToUpdate.append("line")
               .attr("x1", this.mapTimeToXAxis(currentData[0]) )
               .attr("x2", this.curTimeX)
               .attr("y1", this.mapPriceToYAxis(currentData[1]) )
               .attr("y2", this.mapPriceToYAxis(pricefinal) )
               .attr("class", styleClassName);
         }
      };

      graph.drawOffers = function(graphRefr, dataHistory){
         this.drawStep(graphRefr, dataHistory.pastBuyOffers, dataHistory.curBuyOffer, "buy-offer", this.marketSVG);
         this.drawStep(graphRefr, dataHistory.pastSellOffers, dataHistory.curSellOffer, "sell-offer", this.marketSVG);
      };

      graph.drawPriceAxis = function(graphRefr, svgToUpdate){
         //Draw rectangle on right side for price axis
         svgToUpdate.append("rect")
            .attr("x", this.elementWidth - this.axisLabelWidth)
            .attr("y", 0)
            .attr("width", this.axisLabelWidth)
            .attr("height", this.elementHeight)
            .attr("class", "price-axis-box");
         //Draw the text that goes along with the price gridlines and axis
         svgToUpdate.selectAll("text.price-grid-line-text")
            .data(this.priceLines)
            .enter()
            .append("text")
            .attr("text-anchor", "start")
            .attr("x", this.elementWidth - this.axisLabelWidth + 5)
            .attr("y", function(d) {return graphRefr.mapPriceToYAxis(d);})
            .attr("class", "price-grid-line-text")
            .text(function(d) {return d;});
      };


      graph.draw = function(dataHistory){
         //Clear the svg elements
         this.marketSVG.selectAll("*").remove();
         this.profitSVG.selectAll("*").remove();

         var graphRefr = this;

         this.currentTime = Date.now();

         //Check if it is necisary to recalculate timeLines
         if(this.currentTime > this.timeLines[0] + this.timeIncriment){
            this.timeLines = this.calcTimeGridLines(this.currentTime);
         }

         //Invoke all of the draw functions
         this.drawTimeGridLines(graphRefr, this.marketSVG);
         this.drawTimeGridLines(graphRefr, this.profitSVG);

         this.drawPriceGridLines(graphRefr);
         this.drawPriceLine(graphRefr, dataHistory);
         this.drawOffers(graphRefr, dataHistory);

         this.drawPriceAxis(graphRefr, this.marketSVG);
         this.drawPriceAxis(graphRefr, this.profitSVG);

         this.drawStep (graphRefr, dataHistory.pastProfitSegments, dataHistory.curProfitSegment, "profit-line", this.profitSVG);
      };

      graph.init = function(){

         //FOR NOW USE THIS TIME AS START TIME Eventually will get this from admin page
         this.startTime = Date.now();

         this.calculateSize();
         this.priceLines = this.calcPriceGridLines();
         this.timeLines = this.calcTimeGridLines(Date.now());
      };

      return graph;
   }



   return api;

});
