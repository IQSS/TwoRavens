#
# HistogramCI.r
#
# This file contains functions for computing confidence intervals for a 
# differentially private histogram and the threshold value for a stability
# histogram. It also contains a function that sums up the counts of the bins 
# removed by the stability histogram algorithm.
#
# Author: Jessica Bu
# Summer 2015 REU - Harvard University
# 8/1/15
###

### Functions Available #########################################################
# Histogram.getCI(bins, data, eps, del, alpha, count)
# Histogram.getThreshold(eps, del)
# Histogram.stabilityBin(data, count)
###

### Dependencies ################################################################
library("VGAM")
library("foreign")
source("Histogramnew.R")
###

#################################################################################
# Function to compute confidence intervals for a differentially private histogram.
# 
# Args:
#   -release - differentially private histogram
#	-params - privacy parameters (epsilon and delta) and paramaters of the data
#	(n - number of elements in data, binspec - if TRUE assumes that bins have 
#	been decided by the user)
#	-alpha - statistical significance level
#
# Returns:
# 	List of upper and lower confidence limits for each bin in the histogram.
#################################################################################
Histogram.getCI <- function(release, params, alpha=0.05){
	
	n <- params$n
    binspec <- params$nlv
    eps <- params$eps
    del <- params$del

	acc <- Histogram.getAccuracy(binspec=binspec, n=n, eps=eps, del=del, beta=alpha)

	nonzero <- acc[1] # accuracy if the count is not zero
	zero <- acc[2] # accuracy if the count is zero

	output <- list()
	for(i in 1:length(release$release)){

		if (release$release[i] == 0){
			ub <- zero * n
			lb <- 0
		} else {
			ub <- nonzero * n + release$release[i]
			lb <- release$release[i] - nonzero * n
			if (lb < 0) { lb=0 }
		}
        
    
		output[[i]] <- c(lowerBound=lb, upperBound=ub)
	}
	return(output)
} # Histogram.getCI()

#################################################################################
# Function to get the threshold value for a stability histogram.
# 
# Args: 
#	-params - privacy parameters (epsilon and delta)
#
# Returns:
# 	Value of the threshold
#################################################################################
Histogram.getThreshold <- function(params) {
	eps <- params$eps
    del <- params$del

	thresh <- -2 / eps * log(2 * del) + 1
	return(thresh)
} # Histogram.getThreshold()

#################################################################################
# Function to get the sum of all of the counts that the stability histogram 
# algorithm set  to zero because they were below the threshold value.
#
# Args:
#	-release - differentially private histogram
# 	-params - parameters of the data (length of dataset)
#
# Returns:
# 	The sum of all of the counts that were excluded from the stability histogram. 
#################################################################################
Histogram.stabilityBin <- function(release, params) {
	excl <- params$n

	for(i in 1:length(release)) {
		excl = excl - release[i]
	}
	return(excl)
} # Histogram.stabilityBin()