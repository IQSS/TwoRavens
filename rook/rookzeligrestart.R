##
##  rookzeligrestart.r
##
##  simple restart of the R.server
##

R.server$stop()
R.server$remove(all=TRUE)
rm(list=ls())
source("rooksource.R")

