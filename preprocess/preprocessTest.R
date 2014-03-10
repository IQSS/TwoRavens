##
##  preprocessTest.r
##
##  create simulated dataset, and run through preprocess function
##
##  10/3/14
##


library(rjson)

source(paste(getwd(),"/preprocess.R",sep=""))

## test dataset example
n<-100

td1<-rep(c("aa","bb","cc","dd"),25)
td2<-runif(n)
td3<-as.numeric(runif(n)>0.3)
td4<-rnorm(n=n,mean=2,sd=2)
td5<-rbinom(n=n, size=10, prob=0.2)

testdata<-data.frame(td1,td2,td3,td4,td5)
json<-preprocess(testdata=testdata)

