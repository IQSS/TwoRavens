##
##  preprocessTest.r
##
##  create simulated dataset, and run through preprocess function
##
##  10/3/14
##

library(rjson)   # rjson currectly used for preprocess, jsonlite used for zelig.app
#library(jsonlite)

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


#json2<-preprocess(hostname="dvn-build.hmdc.harvard.edu", fileid=2429360)
#json3<-preprocess(hostname="dvn-build.hmdc.harvard.edu", fileid=170)
#json4<-preprocess(hostname="dvn-build.hmdc.harvard.edu", fileid=171)

#write(json2,file="../../data/preprocess2429360.txt")
#write(json3,file="../../data/preprocess170.txt")
#write(json4,file="../../data/preprocess171.txt")

library(foreign)
pumsdata<-read.csv("../../data/PUMS5Extract.csv")
json5<-preprocess(testdata=pumsdata)
write(json5,file="../../data/preprocessPUMS5Extract.txt")

