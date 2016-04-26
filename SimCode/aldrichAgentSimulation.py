import numpy as np
import scipy.stats as stats
import matplotlib.pyplot as plt
import pdb


def truncatedGeometric(m,p):
    probs = ((1-p)**np.arange(1,m+1))*p
    probs = probs/np.sum(probs)
    return stats.rv_discrete(values=(np.arange(1,m+1),probs))
    
class marketState(object):
    def __init__(self,bestBid,bestOffer,nLevels):
        self.bidPrices = np.arange(bestBid,bestBid-nLevels,-1)
        self.bidContracts = np.hstack((1,np.zeros(nLevels-1)))
        self.bidAgents = [np.array([])]*nLevels
        self.bidAgents[0] = np.array('M')
        self.offerPrices = np.arange(bestOffer,bestOffer+nLevels)
        self.offerContracts = np.hstack((1,np.zeros(nLevels-1)))
        self.offerAgents = [np.array([])]*nLevels
        self.offerAgents[0] = np.array('M')
        self.nLevels = nLevels
        self.lastTrade = None
        
    def addOrder(self,agent,level,bid=True):
        if bid:
            if level == 0:
                self.bidPrices = np.hstack((self.bidPrices[0]+1,self.bidPrices[:-1]))
                self.bidContracts = np.hstack((1,self.bidContracts[:-1]))
                self.bidAgents.insert(0,np.array(agent.ID))
                self.bidAgents.pop(-1)
            else:
                self.bidContracts[level-1] += 1
                self.bidAgents[level-1] = np.append(self.bidAgents[level-1],agent.ID)
    
        else:
            if level == 0:
                self.offerPrices = np.hstack((self.offerPrices[0]-1,self.offerPrices[:-1]))
                self.offerContracts = np.hstack((1,self.offerContracts[:-1]))
                self.offerAgents.insert(0,np.array(agent.ID))
                self.offerAgents.pop(-1)
            else:
                self.offerContracts[level-1] += 1
                self.offerAgents[level-1] = np.append(self.offerAgents[level-1],agent.ID)
                
    def trade(self,nContracts,sell=True):
        if sell:
            if self.bidContracts[0] <= nContracts:
                self.bidPrices = np.delete(self.bidPrices,0)
                self.bidContracts = np.delete(self.bidContracts,0)
                self.bidAgents.pop(0)
                self.bidPrices = np.append(self.bidPrices,self.bidPrices[-1]-1)
                self.bidContracts = np.append(self.bidContracts,0)
                self.bidAgents.append(np.array([]))
            elif self.bidContracts[0] == 0:
                pass
            else:
                self.bidContracts[0] -= nContracts
                self.bidAgents[0] = np.delete(self.bidAgents[0],0)
            self.lastTrade = 'bid'
            
        else:
            if self.offerContracts[0] <= nContracts:
                self.offerPrices = np.delete(self.offerPrices,0)
                self.offerContracts = np.delete(self.offerContracts,0)
                self.offerAgents.pop(0)
                self.offerPrices = np.append(self.offerPrices,self.offerPrices[-1]+1)
                self.offerContracts = np.append(self.offerContracts,0)
                self.offerAgents.append(np.array([]))
            elif self.offerContracts[0] == 0:
                pass
            else:
                self.offerContracts[0] -= nContracts
                self.offerAgents[0] = np.delete(self.offerAgents[0],0)
            self.lastTrade = 'offer'
            
class marketAgent(object):
    def __init__(self,ID,position,lastTradePrice,bid,offer,pnl):
        self.ID = ID
        self.position = position
        self.lastTradePrice = lastTradePrice
        self.bid = bid
        self.offer = offer
        self.pnl = pnl

    def trade(self,orderBook,nContracts,sell=True):
        if sell:
            if nContracts > orderBook.bidContracts[0]:
                nContracts = orderBook.bidContracts[0]
            self.pnl += nContracts*np.sign(self.position)*(orderBook.bidPrices[0] - self.lastTradePrice)
            self.position -= nContracts
            self.lastTradePrice = orderBook.bidPrices[0]
            orderBook.trade(nContracts,sell=True)

        else:
            if nContracts > orderBook.offerContracts[0]:
                nContracts = orderBook.offerContracts[0]
            self.pnl += nContracts*np.sign(self.position)*(orderBook.offerPrices[0] - self.lastTradePrice)
            self.position += nContracts
            self.lastTradePrice = orderBook.offerPrices[0]
            orderBook.trade(nContracts,sell=False)

    def addOrder(self,orderBook,nLevels,geoProb,bid=True):
        spread = orderBook.offerPrices[0] - orderBook.bidPrices[0]
        if bid:
            if (spread > 1) & (orderBook.lastTrade == 'offer'):
                level = 0
            else:
                level = truncatedGeometric(nLevels,geoProb).rvs()
            orderBook.addOrder(self,level,bid=True)
            self.bid = orderBook.bidPrices[level-1]
        else:
            if (spread > 1) & (orderBook.lastTrade == 'bid'):
                level = 0
            else:
                level = truncatedGeometric(nLevels,geoProb).rvs()
            orderBook.addOrder(self,level,bid=False)
            self.offer = orderBook.offerPrices[level-1]



# Probabilities
mktProb = 0.3
mktQuote = 0.6
mktQuoteBid = 0.5
mktTrade = 0.4
mktTradeBid = 0.5
geoProb = 0.85

# Initial conditions
nSim = 100
nBurn = int(1e2)
nPeriods = int(1e5)
downCount = 0
upCount = 0
crashInterval = 6000
crashSize = 200
nLevels = 10
for nx in range(nSim):

    # Initialize the market
    agentA = marketAgent('A',-1,4001,4000,4001,0)
    agentB = marketAgent('B',0,4001,None,None,0)
    agentM = marketAgent('M',0,0,None,None,0)
    orderBook = marketState(4000,4001,nLevels)
    tradePrices = np.array((4003,4002,4001))
    tradeAgents = np.array(('A','B','C'))
    upCrash = False
    downCrash = False

    # Simulation
    for ix in range(nBurn+nPeriods):
    
        # Uniform variates for various events
        unifMktHFT = np.random.uniform()
        unifQuoteTrade = np.random.uniform()
        unifBidOffer = np.random.uniform()
    
        if unifMktHFT < mktProb:
    
            # Market quote
            if (ix < nBurn) | (unifQuoteTrade < mktQuote):
                if unifBidOffer < mktQuoteBid:
                    agentM.addOrder(orderBook,nLevels,geoProb,bid=True)
                else:
                    agentM.addOrder(orderBook,nLevels,geoProb,bid=False)
                
            # Market trade
            elif (unifQuoteTrade >= mktQuote) & (unifQuoteTrade < (mktQuote+mktTrade)):
                if unifBidOffer < mktTradeBid:
                    agentM.trade(orderBook,1,sell=True)
                    tradePrices = np.append(tradePrices, agentM.lastTradePrice)
                    tradeAgents = np.append(tradeAgents, agentM.ID)
                else:
                    agentM.trade(orderBook,1,sell=False)
                    tradePrices = np.append(tradePrices, agentM.lastTradePrice)
                    tradeAgents = np.append(tradeAgents, agentM.ID)
                
            # No event
            else:
                tradePrices = np.append(tradePrices,tradePrices[-1])
                tradeAgents = np.append(tradeAgents, tradeAgents[-1])
    
    
        # HFT trade if two consecutive down moves
        elif (tradePrices[-1] - tradePrices[-3]) < -1:
            if np.random.uniform() < 0.5:
                agentB.trade(orderBook,orderBook.bidContracts[0],sell=True)
                orderBook.addOrder(agentB,0,bid=False)
                orderBook.addOrder(agentB,1,bid=True)
                tradePrices = np.append(tradePrices, agentB.lastTradePrice)
                tradeAgents = np.append(tradeAgents, agentB.ID)
            else:
                agentA.trade(orderBook,orderBook.bidContracts[0],sell=True)
                orderBook.addOrder(agentA,0,bid=False)
                orderBook.addOrder(agentA,1,bid=True)
                tradePrices = np.append(tradePrices, agentA.lastTradePrice)
                tradeAgents = np.append(tradeAgents, agentA.ID)
    
        # HFT trade if two consecutive up moves
        elif (tradePrices[-1] - tradePrices[-3]) > 1:
            if np.random.uniform() < 0.5:
                agentB.trade(orderBook,orderBook.offerContracts[0],sell=False)
                orderBook.addOrder(agentB,0,bid=True)
                orderBook.addOrder(agentB,1,bid=False)
                tradePrices = np.append(tradePrices, agentB.lastTradePrice)
                tradeAgents = np.append(tradeAgents, agentB.ID)
            else:
                agentA.trade(orderBook,orderBook.offerContracts[0],sell=False)
                orderBook.addOrder(agentA,0,bid=True)
                orderBook.addOrder(agentA,1,bid=False)
                tradePrices = np.append(tradePrices, agentA.lastTradePrice)
                tradeAgents = np.append(tradeAgents, agentA.ID)
    
        # Determine if a crash has occurred
        if len(tradePrices) > crashInterval:
            startInd = -(crashInterval+1)
        else:
            startInd = 0
        maxPrice = np.max(tradePrices[startInd:])
        if (tradePrices[-1] - maxPrice) <= -crashSize:
            downCrash = True
            downCount += 1
        if (tradePrices[-1] - maxPrice) >= crashSize:
            upCrash = True
            upCount += 1

        # If crash, stop simulation
        if downCrash | upCrash | (orderBook.bidPrices[-1] < 0):
            break
    
    # Print result of simulation
    if upCrash | downCrash:
        print 'Simulation '+str(nx)+': Crash'
    else:
        print 'Simulation '+str(nx)+': No Crash'
    
print 'mktProb: '+str(mktProb)+', mktQuote: '+str(mktQuote)+', mktQuoteBid: '+str(mktQuoteBid)+ \
    ', mktTrade: '+str(mktTrade)+', mktTradeBid: '+str(mktTradeBid)+', geoProb: '+ \
    str(geoProb)+', Down Crashes:'+str(downCount)+', Up Crashes:', upCount

fig = plt.figure(figsize=(12,6))
plt.plot(tradePrices)
#plt.plot(np.where(tradeAgents=='B')[0],tradePrices[tradeAgents=='B'],marker='o',c='red')
plt.savefig('tradePrices.png',dpi=125)
plt.close()
