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


library(foreign)

#pumsdata<-read.csv("../../data/PUMS5Extract.csv")
#json5<-preprocess(testdata=pumsdata)
#write(json5,file="../../data/preprocessPUMS5Extract.txt")

tbdata <- read.delim("data.tab.tsv")

output <- preprocess(testdata = tbdata)

write(output, "tbtest.json")