# Parameters for jump times
totalTime = 5*60*1000
lambdaJ = 1/5000
nSimJ = 2*totalTime*lambdaJ

# Parameters for jump distribution
startPrice = 100
muJump = 0
sigJump = 1

# Simulate times and sizes
jumpTimes = cumsum(round(rexp(nSimJ,lambdaJ)))
jumpTimes = jumpTimes[jumpTimes < totalTime]
nJump = length(jumpTimes)
jumpSizes = startPrice + cumsum(rnorm(nJump,muJump,sigJump))

# Save jumps to CSV
jumpData = rbind(c(0,startPrice),cbind(jumpTimes, jumpSizes))
write.csv(jumpData,'~/Dropbox/Academics/Research/UCSC/FinEx/Code/jumpData.csv',row.names=FALSE)

# Investor parameters
lambdaI = lambdaJ*1.5
nSimI = 2*totalTime*lambdaI
buyProb = 0.5

# Simulate investor arrivals and directions
investorTimes = cumsum(round(rexp(nSimI,lambdaI)))
investorTimes = investorTimes[investorTimes < totalTime]
nInvestor = length(investorTimes)
investorDirections = rbinom(nInvestor,1,buyProb)

# Save investor arrivals to CSV
investorData = cbind(investorTimes, investorDirections)
write.csv(investorData,'~/Dropbox/Academics/Research/UCSC/FinEx/Code/investorData.csv',row.names=FALSE)
