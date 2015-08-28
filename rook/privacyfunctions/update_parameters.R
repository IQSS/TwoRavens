################################################
#
# This code contains the update_parameters function. Every time a pair of 
# privacy parameters (epsilon, delta) pair is added, removed, or changed, 
# all of the other parameters must also change in such a way as to preserve
# the global privacy budget. Currently this works as follows: assign any new
# parameters values as though we were splitting the budget completely evenly. 
# Fix these values along with any values that the user has marked as fixed (Hold feature). 
# Scale all of the other parameters by the same multiplicative factor, r. Do
# binary search on values of r, checking the output of the optimal composition
# theorem on each iteration until the global epsilon is reached.  
# 
# 
# Jack Murtagh
# Harvard University
# 7/20/14
#
###





update_parameters <- function(params, index, eps, del){
	#
	# Args:
	#	params: kx2 matrix of privacy parameters where column one corresponds
	#			to epsilons and column two is deltas.
	#	index: vector of indices corresponding to rows of params that will not 
	#		   be updated, either because they were just added or because the 
	#		   user has requested that these values stay fixed (Hold feature). 
	#	       If we are to update every parameter, set index to 0. 
	#	eps: global epsilon
	#	del: global delta
	#
	# Returns:
	#	kx2 matrix of updated parameters
	
	
	# k is the total number of calls the user wishes to make to a DP algorithm
	k <- length(params[ , 1])
	# If we are only calculating one statistic, just allocate the whole budget to that.
	if(k == 1){
		params[1,1] <- eps
		params[1,2] <- del
		return(params)
	}
	
	
	# decide what to set new parameters to. If k is large enough, dividing epsilon
	# evenly by k is no longer the best option. 
	# 1/7/15 - should this line be changed with new composition theorem?
	if(log(exp(1) + (eps/del)) < (k/4)){
		new_eps <- eps/(2*sqrt(k*log(exp(1) + (eps/del))))
	}
	else{
		new_eps <- eps/k
		}
	
	# Set all of the empty epsilon/delta values
	for(i in 1:k){
		if(is.na(params[ ,1][i]) || params[ , 1][i] == " "){
			params[ , 1][i] <- new_eps
			index <- c(index, i)
		}
			
		if(is.na(params[ ,2][i]) || params[ ,2][i] == " "){
			params[ , 2][i] <- 1 - (1-del)^(1/(2*k))
		}		
	}
	
	#convert to numeric
	col1 <- as.numeric(params[ , 1])
	col2 <- as.numeric(params[ , 2])
	params <- cbind(col1, col2)

	
	# Initialize parameters for binary search. 
	test_eps <- 1000
	
	# lower bound of search interval	
	l <- 0
	
	# upper bound: the setting of any individual epsilon cannot get larger than eps itself 
	u <- eps/min(params[ , 1]) 
	iteration <- 1
	
	# Make sure meeting the budget is possible by setting all epsilons to be 
	# updated to zero and checking if the output of the composition 
	# theorem exceeds the privacy budget. 
	
	test_params <- params
	for(i in 1:k){			
		if(!(i %in% index)){  
			test_params[i,1] <- 0
			}	
		}
	
	#If using composition bound (faster)
	temp <- optimal_composition(test_params, del) 

	if(is.na(temp) || temp > eps){
			return("error")
		}
	
	##Else if using optimal composition approximation (Jack & Salil work):
	'
	if(!isDP(test_params, eps, del)){
		return("error")
	}
	'
	
	
	# Begin binary search
	# Search continues until the achieved epsilon is less than or equal to the global epsilon
	# and not more than a factor of (1 - 10^9) away from the true global epsilon. 
	
	while((test_eps <= eps*(1 - 10^-9)) | (test_eps > eps)){	
		
		# scaling factor		
		r <- l + ((u - l)/2)
		test_params <- params
		
		# do not scale any parameters in index
		for(i in 1:k){
			if(!(i %in% index)){  
				test_params[i,1] <- params[i, 1]*r
			}
			
		}
		
		#If using composition bound (faster)
		test_eps <- optimal_composition(test_params, del)

		if(is.na(test_eps)){
			return("error")
		}
		

		# If you want to look under the hood
		
		# Reset upper and lower bounds of the search depending on outcome of test_eps
		if(test_eps < eps){
			l <- r
		}
		else if(test_eps >= eps){
			u <- r
		}
		
		##Else if using optimal composition approximation (Jack & Salil work):

        #'  what was this character doing here?
		isDP <- isDP(test_params, eps, del)
		if(is.na(isDP)){
			return("error")
		}
		# Reset upper and lower bounds of the search depending on outcome of test_eps
		if(isDP){
			l <- r
		}
		else if(!isDP){
			u <- r
		}
        #'  what was this character doing here?
		iteration <- iteration + 1
	}
	return(test_params)
}
	




