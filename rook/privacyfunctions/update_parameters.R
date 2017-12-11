################################################
#
# This code contains the update_parameters function. Every time a pair of 
# privacy parameters (epsilon, delta) pair is added, removed, or changed, 
# all of the other parameters must also change in such a way as to preserve
# the global privacy budget. Currently this works as follows: assign any new
# parameters values as though we were splitting the budget completely evenly among 
# unheld statistics. Fix these values and the held values. Scale all of the other 
# parameters by the same multiplicative factor, r. Do binary search on values of r,
# checking the output of the optimal composition theorem on each iteration until the 
# global epsilon is reached.  
# 
# 
# Jack Murtagh
# Harvard University
# 7/20/14
#
###





update_parameters <- function(params, hold, eps, del){
	#
	# Args:
	#	params: kx2 matrix of privacy parameters where column one corresponds
	#			to epsilons and column two is deltas.
	#	hold: vector of indices corresponding to rows of params that will not 
	#		   be updated, either because they were just added or because the 
	#		   user has requested that these values stay fixed (Hold feature). 
	#	       If we are to update every parameter, set hold to 0. 
	#	eps: global epsilon
	#	del: global delta
	#
	# Returns:
	#	kx2 matrix of updated parameters
	
	
	# k is the total number of statistics currently selected
	k <- length(params[ , 1])
		
	# If we are only calculating one statistic, allocate the whole budget to it.
	if(k == 1){
		params[1,1] <- eps
		params[1,2] <- del
		return(params)
	}

	elist <- as.numeric(params[ ,1])
	dlist <- as.numeric(params[ ,2])
	#hard coded error tolerance for optimal composition approximation. Might do something more clever one day. 
	#err <- eps/10
	err <- .01
	# Check if there are unset epsilon values
	unsetEpsilons <- c(which(is.na(elist)), which(elist==" "), which(elist==""), which(elist==0))
	unsetEpsilons <- unique(unsetEpsilons)
	
	# Get list of unheld (or free) epsilon indices
	indices <- seq(1,k,1)
	free <- indices[! indices %in% hold]
	newEps <- -10
	#if no epsilons are set: 
	if(length(unsetEpsilons)==length(elist)){
		tempElist <- rep(1,times=length(elist))
		newElist <- scale_eps(tempElist, dlist, eps, del, free, err)
		toReturn <- cbind(newElist, dlist)
		return(toReturn)
	}
	else if(length(unsetEpsilons) > 0){
		# collect all of the free epsilons that have been set
		toAvg <- free[! free %in% unsetEpsilons]
		tempElist <- elist
		# replace all free epsilons with their average
		tempElist[free] <- mean(tempElist[toAvg])
		newElist <- scale_eps(tempElist, dlist, eps, del, free, err)
		neweps <- newElist[free][1]
		if(min(elist[toAvg])==max(elist[toAvg])){
			# if all free unset epsilons are the same then newElist the right update
			toReturn <- cbind(newElist, dlist)
			return(toReturn)
		}
		else{
			#set all unset epsilons to neweps and remove them from the free list
			elist[unsetEpsilons] <- neweps
			free <- free[! free %in% unsetEpsilons]
		}
	}
	# if some epsilons are being held, check that the held ones alone don't exceed the budget:
	else if(length(elist)>length(free)){
		tempElist <- elist
		tempElist[free] <- 0
		dp <- isDP(cbind(tempElist,dlist), del, eps, err)
		if(!dp){
			return("error")
		}
	}
	
	newElist <- scale_eps(elist, dlist, eps, del, free, err)
	toReturn <- cbind(newElist, dlist)
	return(toReturn)
}
	

scale_eps <- function(elist, dlist, eps, del, free, err){
	# This function returns a list of epsilon values
	# where each epsilon in elist that is not being held
	# is scaled by the same multiplicative factor until 
	# composition is satisfied
	
	# Initialize parameters for binary search. 
	l <- 0
	u <- eps/max(elist)  # no epsilon value in the composition can exceed global eps
	dp <- F
	
	goodlist <- c()
	
	# is there a better stopping condition?
	while(u-l>.0001){	
		# scaling factor		
		r <- l + ((u - l)/2)
		testElist <- elist
		testElist[free] <- r*testElist[free]
		test_params <- cbind(testElist, dlist)
		dp <- isDP(test_params, del, eps, err)
		
		# Reset upper and lower bounds of the search depending on outcome of isDP
		if(dp){
			l <- r
			goodlist <- testElist
		}
		else {
			u <- r
		}
	}
	# If result does not beat simple summing composition
	total <- sum(goodlist)
	if(total < eps){
		toadd <- (eps-total)/length(free)
		toaddlist <- rep(0,times=length(goodlist))
		toaddlist[free] <- toadd
		goodlist <- goodlist + toaddlist
	}
	return(goodlist)	
}

