#
# Mean.r
#
# This file contains a function for computing a confidence interval for a 
# differentially private mean.
#
# Author: Jessica Bu
# Summer 2015 REU - Harvard University
# 8/1/15
###

### Functions Available #########################################################
# getCI(eps, data, del, range, alpha, mean)
###

### Dependencies ################################################################
library("foreign")
library("VGAM")
source("DP_Means.R")
###

#################################################################################
# Function to compute confidence intervals for differentially private means.
# 
# Args:
#	-release - differentially private mean
#	-params - privacy parameters (epsilon and delta) and paramaters of the data
#	(n - the number of samples, range - an a priori estimate of the range)
#
# Returns:
# 	Upper and lower confidence limits
#################################################################################
Mean.getCI <- function(release, params, alpha=0.05) {

	n <- params$n
    eps <- params$eps
    del <- params$del
    range <- params$range

	sens <- range/(eps*n)	
    z <- qexp(( 1 - alpha) , rate= (1/sens))
    #z <- qlaplace(p= 1 - (alpha/2) ,  location = 0, scale = range/(eps*n))

	ub <- release + z
	lb <- release - z

	return(list(lowerbound=lb, upperbound=ub))
} # Mean.getCI()

