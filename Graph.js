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
   api.makeTradingGraph = function (marketSVGElementID, profitSVGElementID, adminStartTime) {
      var graph = {};

      graph.marketElementId = marketSVGElementID;  //id of the market graph svg element
      graph.profitElementId = profitSVGElementID;  //id of the profit graph svg element
      graph.elementWidth = 0;          //Width and Height of both svg elements
      graph.elementHeight = 0;         //    (use calculateSize to determine)
      graph.axisLabelWidth = 40;       //Width of area where price axis labels are drawn
      graph.marketSVG = d3.select('#' + graph.marketElementId); //market svg element
      graph.profitSVG = d3.select('#' + graph.profitElementId); //profit svg element
      graph.minPriceMarket = 85;              //min price on price axis for market graph
      graph.maxPriceMarket = 115;             //max price on price axis for market graph
      graph.centerPriceMarket = (graph.maxPriceMarket + graph.minPriceMarket) / 2; //desired price for center of graph
      graph.minPriceProfit = 20;               //min price on price axis for profit graph
      graph.maxPriceProfit = 200;             //max price on price axis for profit graph
      graph.centerPriceProfit = (graph.maxPriceProfit + graph.minPriceProfit) / 2;
      graph.graphAdjustSpeedMarket = .1;      //speed that market price axis adjusts in pixels per frame
      graph.graphAdjustSpeedProfit = .75;      //speed that market price axis adjusts in pixels per frame
      graph.marketPriceGridIncriment = 5;     //amount between each line on market price axis
      graph.profitPriceGridIncriment = 15;    //amount between each line on profit price axis
      graph.contractedTimeInterval = 30;      //amount of time displayed on time axis when graph is contracted
      graph.timeInterval = graph.contractedTimeInterval; //current amount in seconds displayed at once on full time axis
      graph.timeIncriment = 5;         //Amount in seconds between lines on time axis
      graph.currentTime = 0;           //Time displayed on graph
      graph.marketPriceLines = [];           //
      graph.timeLines = [];
      graph.pricesArray = [];
      graph.adminStartTime = adminStartTime;
      graph.timeOffset = 0;            //offset to adjust for clock difference between lab computers
      graph.expandedGraph = false;
      graph.timeSinceStart = 0;        //the amount of time since the start of the experiment in seconds
      graph.dataObj = {
         prices: [],
         buyOffers: [[500, 15, 2]],
         sellOffers: [],
         drawData: []
      };

      graph.getCurOffsetTime = function () {
         return Date.now() - this.timeOffset;
      };

      graph.setExpandedGraph = function () {
         this.expandedGraph = true;
      };

      graph.setContractedGraph = function () {
         this.expandedGraph = false;
         this.timeInterval = this.contractedTimeInterval;
      };

      graph.calculateSize = function () {
         this.elementWidth = $('#' + this.marketElementId).width();
         this.elementHeight = $('#' + this.marketElementId).height();      };

      graph.mapProfitPriceToYAxis = function (price) {
         var percentOffset = (this.maxPriceProfit - price) / (this.maxPriceProfit - this.minPriceProfit);
         return this.elementHeight * percentOffset;
      };

      graph.mapMarketPriceToYAxis = function (price) {
         var percentOffset = (this.maxPriceMarket - price) / (this.maxPriceMarket - this.minPriceMarket);
         return this.elementHeight * percentOffset;
      };

      graph.mapTimeToXAxis = function (timeStamp) {
         var percentOffset;
         if (this.timeSinceStart >= this.timeInterval) {
            percentOffset = (timeStamp - (this.currentTime - (this.timeInterval * 1000))) / (this.timeInterval * 1000);
         }
         else {
            percentOffset = (timeStamp - this.adminStartTime) / (this.timeInterval * 1000);
         }
         return (this.elementWidth - this.axisLabelWidth) * percentOffset;
      };

      graph.millisToTime = function (timeStamp) {
         var x = timeStamp / 1000;
         var seconds = parseInt(x % 60);
         x /= 60;
         var minutes = parseInt(x % 60);

         x /= 60;
         var hours = parseInt(x % 24);
         return hours + ":" + minutes + ":" + seconds;
      };

      graph.calcPriceGridLines = function (maxPrice, minPrice, increment) {
         var gridLineVal = minPrice + increment - (minPrice % increment);
         // adjust for mod of negative numbers being negative
         if(minPrice < 0) gridLineVal -= increment;
         var lines = [];
         while (gridLineVal < maxPrice) {
            lines.push(gridLineVal);
            gridLineVal += increment;
         }
         return lines;
      };

      graph.calcTimeGridLines = function (timeStamp) {
         var timeLineVal = timeStamp - (timeStamp % (this.timeIncriment * 1000));
         var lines = [];
         while (timeLineVal > timeStamp - this.timeInterval * 1000) {
            lines.push(timeLineVal);
            timeLineVal -= this.timeIncriment * 1000;
         }
         lines.push(timeLineVal);
         return lines;
      };

      graph.getTimeGridClass = function (timeStamp) {
         if (timeStamp % (this.timeIncriment * 2000) == 0)
            return "time-grid-box-light";
         else return "time-grid-box-dark";
      };


      graph.drawTimeGridLines = function (graphRefr, svgToUpdate) {
         //Draw rectangles for time gridlines
         svgToUpdate.selectAll("rect")
            .data(this.timeLines)
            .enter()
            .append("rect")
            .attr("x", function (d) {
               return graphRefr.mapTimeToXAxis(d);
            })
            .attr("y", 0)
            .attr("width", this.timeIncriment / this.timeInterval * (this.elementWidth - this.axisLabelWidth))
            .attr("height", this.elementHeight)
            .attr("class", function (d) {
               return graphRefr.getTimeGridClass(d);
            });

         //Draw labels for time gridlines
         svgToUpdate.selectAll("text.time-grid-line-text")
            .data(this.timeLines)
            .enter()
            .append("text")
            .attr("text-anchor", "start")
            .attr("x", function (d) {
               return graphRefr.mapTimeToXAxis(d) + 5;
            })
            .attr("y", this.elementHeight - 5)
            .text(function (d) {
               return graphRefr.millisToTime(d)
            })
            .attr("class", "time-grid-line-text");
      };

      graph.drawPriceGridLines = function (graphRefr, priceLines, svgToUpdate, priceMapFunction) {
         //hack to fix problem with this not being set correctly for map function
         priceMapFunction = priceMapFunction.bind(graphRefr);

         //Draw the lines for the price gridlines
         svgToUpdate.selectAll("line.price-grid-line")
            .data(priceLines)
            .enter()
            .append("line")
            .attr("x1", 0)
            .attr("x2", this.elementWidth - this.axisLabelWidth)
            .attr("y1", function (d) {
               return priceMapFunction(d);
            })
            .attr("y2", function (d) {
               return priceMapFunction(d);
            })
            .attr("class", function (d) {
               return d != 0 ? "price-grid-line" : "price-grid-line-zero";
            });
      };

      //draws profit line, FP and offers
      graph.drawStep = function (graphRefr, historyDataSet, currentData, styleClassName, svgToUpdate, priceMapFunction) {
         //hack to fix problem with this not being set correctly for map function
         priceMapFunction = priceMapFunction.bind(graphRefr);

         svgToUpdate.selectAll("line." + styleClassName)
            .data(historyDataSet, function (d) {
               return d;
            })
            .enter()
            .append("line")
            .attr("x1", function (d) {
               return graphRefr.mapTimeToXAxis(d[0]);
            })
            .attr("x2", function (d) {
               return graphRefr.mapTimeToXAxis(d[1]);
            })
            .attr("y1", function (d) {
               return priceMapFunction(d[2]);
            })
            .attr("y2", function (d) {
               return priceMapFunction(d[3]);
            })
            .attr("class", styleClassName);

         if (currentData != null) {
            var pricefinal = currentData[1] - ((graphRefr.currentTime - currentData[0]) * currentData[2] / 1000); //determines how far down the line has moved
            svgToUpdate.append("line")
               .attr("x1", this.mapTimeToXAxis(currentData[0]))
               .attr("x2", this.curTimeX)
               .attr("y1", priceMapFunction(currentData[1]))
               .attr("y2", priceMapFunction(pricefinal))
               .attr("class", styleClassName);
         }
      };

      graph.drawOffers = function (graphRefr, dataHistory) {
         for (var user of dataHistory.group) {
            if (user !== dataHistory.myId) {
               this.drawStep(graphRefr, dataHistory.offers[user].pastBuyOffers, dataHistory.offers[user].curBuyOffer, "others-buy-offer", this.marketSVG, this.mapMarketPriceToYAxis);
               this.drawStep(graphRefr, dataHistory.offers[user].pastSellOffers, dataHistory.offers[user].curSellOffer, "others-sell-offer", this.marketSVG, this.mapMarketPriceToYAxis);
            }
         }
         this.drawStep(graphRefr, dataHistory.offers[dataHistory.myId].pastBuyOffers, dataHistory.offers[dataHistory.myId].curBuyOffer, "my-buy-offer", this.marketSVG, this.mapMarketPriceToYAxis);
         this.drawStep(graphRefr, dataHistory.offers[dataHistory.myId].pastSellOffers, dataHistory.offers[dataHistory.myId].curSellOffer, "my-sell-offer", this.marketSVG, this.mapMarketPriceToYAxis);
      };

      graph.drawPriceAxis = function (graphRefr, priceLines, svgToUpdate, priceMapFunction) {
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
            .attr("y", function (d) {
               return priceMapFunction(d) + 3;
            })
            .attr("class", "price-grid-line-text")
            .text(function (d) {
               return d;
            });
      };

      graph.drawTransactions = function (graphRefr, historyDataSet, myId) {
         graphRefr.marketSVG.selectAll("line.my-positive-transactions line.my-negative-transactions line.other-transactions")
            .data(historyDataSet)
            .enter()
            .append("line")
            .attr("x1", function (d) {
               return graphRefr.mapTimeToXAxis(d[0]);
            })
            .attr("x2", function (d) {
               return graphRefr.mapTimeToXAxis(d[0]);
            })
            .attr("y1", function (d) {
               return graphRefr.mapMarketPriceToYAxis(d[1]);
            })
            .attr("y2", function (d) {
               return graphRefr.mapMarketPriceToYAxis(d[2]);
            })
            .attr("class", function (d) {
               if (d[3] == myId) {
                  return d[2] - d[1] > 0 ? "my-positive-transactions" : "my-negative-transactions";
               }
               else if (d[4] == myId) {
                  return d[1] - d[2] > 0 ? "my-positive-transactions" : "my-negative-transactions";
               }
               else return "other-transactions";
            });
      };

      graph.calcPriceBounds = function (dHistory) {
         // calc bounds for market graph
         // check to see if current FP is outside of middle 80% of screen
         if (dHistory.curFundPrice[1] > (.1 * this.minPriceMarket) + (.9 * this.maxPriceMarket) ||
             dHistory.curFundPrice[1] < (.9 * this.minPriceMarket) + (.1 * this.maxPriceMarket)) {
            this.centerPriceMarket = dHistory.curFundPrice[1];
         }

         var curCenterMarket = (this.maxPriceMarket + this.minPriceMarket) / 2;

            if (Math.abs(this.centerPriceMarket - curCenterMarket) > 1) {
            this.marketPriceLines = this.calcPriceGridLines(this.maxPriceMarket, this.minPriceMarket, this.marketPriceGridIncriment);
            if (this.centerPriceMarket > curCenterMarket) {
               this.maxPriceMarket += this.graphAdjustSpeedMarket;
               this.minPriceMarket += this.graphAdjustSpeedMarket;
            }
            else {
               this.maxPriceMarket -= this.graphAdjustSpeedMarket;
               this.minPriceMarket -= this.graphAdjustSpeedMarket;
            }
         }

         //calc bounds for profit graph

         if (dHistory.profit > (.1 * this.minPriceProfit) + (.9 * this.maxPriceProfit) ||
             dHistory.profit < (.9 * this.minPriceProfit) + (.1 * this.maxPriceProfit)) {
            this.centerPriceProfit = dHistory.profit;
         }

         var curCenterProfit = (this.maxPriceProfit + this.minPriceProfit) / 2;

         if (Math.abs(this.centerPriceProfit - curCenterProfit) > 1) {
            this.profitPriceLines = this.calcPriceGridLines(this.maxPriceProfit, this.minPriceProfit, this.profitPriceGridIncriment);
            if (this.centerPriceProfit > curCenterProfit) {
               this.maxPriceProfit += this.graphAdjustSpeedProfit;
               this.minPriceProfit += this.graphAdjustSpeedProfit;
            }
            else {
               this.maxPriceProfit -= this.graphAdjustSpeedProfit;
               this.minPriceProfit -= this.graphAdjustSpeedProfit;
            }
         }
      };

      graph.draw = function (dataHistory) {
         //Clear the svg elements
         this.marketSVG.selectAll("*").remove();
         this.profitSVG.selectAll("*").remove();

         var graphRefr = this;

         this.currentTime = this.getCurOffsetTime();
         this.timeSinceStart = (this.currentTime - dataHistory.startTime) / 1000;
         if (this.expandedGraph) {
            this.timeInterval = this.timeSinceStart;
         }

         this.curTimeX = this.mapTimeToXAxis(this.currentTime);

         // recalculate market price bounds if necessary
         this.calcPriceBounds(dataHistory);

         //Check if it is necessary to recalculate timeLines
         if (this.currentTime > this.timeLines[0] + this.timeIncriment) {
            this.timeLines = this.calcTimeGridLines(this.currentTime);
         }

         //Invoke all of the draw functions
         this.drawTimeGridLines(graphRefr, this.marketSVG);
         this.drawTimeGridLines(graphRefr, this.profitSVG);

         this.drawPriceGridLines(graphRefr, this.marketPriceLines, this.marketSVG, this.mapMarketPriceToYAxis);
         this.drawPriceGridLines(graphRefr, this.profitPriceLines, this.profitSVG, this.mapProfitPriceToYAxis);

         this.drawStep(graphRefr, dataHistory.pastFundPrices, dataHistory.curFundPrice, "price-line", this.marketSVG, this.mapMarketPriceToYAxis);
         this.drawOffers(graphRefr, dataHistory);
         this.drawTransactions(graphRefr, dataHistory.transactions, dataHistory.myId);

         this.drawPriceAxis(graphRefr, this.marketPriceLines, this.marketSVG, this.mapMarketPriceToYAxis);
         this.drawPriceAxis(graphRefr, this.profitPriceLines, this.profitSVG, this.mapProfitPriceToYAxis);

         this.drawStep(graphRefr, dataHistory.pastProfitSegments, dataHistory.curProfitSegment, "profit-line", this.profitSVG, this.mapProfitPriceToYAxis);
      };

      graph.init = function () {
         this.calculateSize();
         this.marketPriceLines = this.calcPriceGridLines(this.maxPriceMarket, this.minPriceMarket, this.marketPriceGridIncriment);
         this.profitPriceLines = this.calcPriceGridLines(this.maxPriceProfit, this.minPriceProfit, this.profitPriceGridIncriment);
         this.timeLines = this.calcTimeGridLines(this.adminStartTime + this.timeInterval * 1000);
         this.timeOffset = Date.now() - this.adminStartTime;
      };

      return graph;
   };


   return api;

});
