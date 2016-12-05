##################################################################
#
# This code contains functions to compute different composition theorems in Differential Privacy. 
#
# Jack Murtagh
# Harvard University
# 7/20/14
#
###

isDP <- function(params, d_g, e_g, err){
	# Function called by update parameters when using 
	# optimal composition approximation
	#
	# Args:
	#	params: a kx2 matrix where the first column corresponds to epsilon_i values and the second 
	# 			corresponds to delta_i values. 
	#	d_g: global delta value
	#	e_g: global epsilon value
	#   err: error parameter
	# Returns:
	#	Boolean indicating whether the given parameters satisfy (e_g,d_g)-DP or not. Since this is 
	#   an approximation (with error governed by err) it is not always correct. However, it will never 
	#   say something satisfies privacy when it doesn't. 
	
	elist <- params[,1] 
	dlist <- params[,2]
	k <- length(elist)
	
	# First check if the KOV composition theorems can decide privacy:
	if(max(elist) == min(elist) & max(dlist) == min(dlist)){
		eps <- KOVhom(params, d_g)
		if(eps <= e_g){
			return(T)
		}
		else {
			return(F)
		}
	}
	else {
		eps <- KOVhet(params, d_g)
		if(eps <= e_g){
			return(T)
		}
	}
		
	# sort parameters by epsilon value (needed for dynamic programming step)
	params <- params[order(params[,1]), ] 
 	
 	# discretize privacy parameters and e_g
	beta <- err/(k+sum(elist)+1)
	e0 <- log(1+beta)
	as <- ceiling(elist*((1/beta)+1))
	astar <- floor(e_g/e0)
	return(isDPinternal(as, beta, dlist, astar, d_g))

}


knapsack <- function(k, B, as, weights){
	# Helper function for isDP and isDPinternal. Runs dynamic programming procedure 
	# described in [MV16] Lemma 5.1.  
	
	prevrow <- rep(1,times=(B+1))
	for(r in 1:length(as)){
		ar <- as[r]
		wr <- weights[r]
		prevrow[(ar+1):(B+1)] <- prevrow[(ar+1):(B+1)] + wr*prevrow[1:(B+1-ar)]	
	}
	return(prevrow[B+1])
}


isDPinternal <- function(as, beta, dlist, astar, d_g){
	# Helper function for approxComp. Decides given the input privacy
	# parameters and a guess for global epsilon, whether or not privacy
	# is satisfied.
	
	k <- length(as)
	sum <- sum(as)
	
	# beta lets us convert between integer as and epsilons, 
	base <- 1+beta
	eterm <- prod(1+base^as)
	dterm <- prod(1-dlist)
	
	#Right hand side of optimal composition condition
	RHS <- eterm*(1-((1-d_g)/dterm))
	coef1 <- base^sum
	coef2 <- base^astar
	B <- floor((sum-astar)/2)

	# For dynamic programming, only need as that are less than B
	as <- subset(as, as<=B)
	# If all as are larger than B, privacy is trivially achieved:
	if(length(as)==0){
		#only nonzero set contains all epsilons
		LHS <- coef1-coef2
	}
	else{
		# Set weights for dynamic program as described in [MV16] Lemma 5.2
		weights1 <- base^(-as)
		weights2 <- base^as
		
		# run dynamic programming procedure
		t1 <- knapsack(k, B, as, weights1)
		t2 <- knapsack(k, B, as, weights2)
		
		# outputs of the dynamic programming give us left hand side of
		# optimal composition condition.
		LHS <- coef1*t1 - coef2*t2
	}
	if(LHS <= RHS){
		return(T)
	}
	else{
		return(F)
	}
}


approxComp <- function(params, d_g, err=.01){
	# Yields an approximation of optimal global epsilon for the given privacy
	# parameters with additive error err and multiplicative error of 2^(-err/2) on
	# global delta (Theorem 1.7 in Murtagh, Vadhan '16) 
	#
	# Args:
	#	params: a kx2 matrix where the first column corresponds to epsilon_i values and the second 
	# 			corresponds to delta_i values. 
	#	d_g: global delta value
	#   err: error parameter
	# Returns:
	#	Approximation of optimal global epsilon for the composition of the input parameters
	
	# sort parameters by epsilon value (needed for dynamic programming step)
	params <- params[order(params[,1]), ] 
	elist <- params[,1] 
	dlist <- params[,2]
	k <- length(elist)
	
	# if the privacy parameters are homogeneous (they do not differ across statistics)
	# just use the homogeneous optimal composition theorem KOV15.
	if(max(elist) == min(elist) & max(dlist) == min(dlist)){
		return(KOVhom(params, d_g))
	}
	
	# Constrain binary search by the best available rapidly computable upper bound:
	epsUpBound <- KOVhet(params, d_g)
	
	# Discretize epsilon values as described in [MV16]
	beta <- err/(k+sum(elist)+1)
	e0 <- log(1+beta)
	as <- ceiling(elist*((1/beta)+1))
	
	# begin binary search for optimal epsilon
	l <- 0
	u <- ceiling(epsUpBound/e0)
	done <- F
	
	# After termination astar is minimum integer such that e_g=astar*e0 satisfies privacy
	count <- 0
	while(!done){
		astar <- l+floor(((u-l)/2))
		
		# Check if current astar*e0 satisfies privacy:
		dp <- isDPinternal(as, beta, dlist, astar, d_g)
		
		# If it does, we can lower astar
		if(dp){
			if(u-l==1){
				# astar is the answer
				done <- T
			}
			else{
				u <- astar
			}
		}
		
		# If we are not satisfying privacy, must try a larger astar
		else {
			if(u-l<=2){
				# astar+1 is the answer
				astar <- astar+1
				done <- T
			}
			else{
				l <- astar	
			}
		}
	}
	return(astar*e0)
}



computeLHS <- function(eguess, k, eps){
	# helper function for KOVhom to compute 
	# the left hand side in Theorem 3.3 [KOV15]
	l <- ceiling((eguess+k*eps)/(2*eps))
	sum <- 0
	for(i in l:k){
		sum <- sum+choose(k,i)*(exp(i*eps)-exp(eguess+eps*(k-i)))
	}
	return(sum)
}

KOVhom <- function(params, d_g){
	# Computes the optimal composition theorem for the case when privacy parameters
	# do not differ across statistics. Theorem 3.3 [KOV15]. 
	# 
	# Args:
	#	params: a kx2 matrix where the first column corresponds to epsilon_i values and the second 
	# 			corresponds to delta_i values. 
	#	d_g: global delta value
	#   
	# Returns:
	#	global epsilon value guaranteed from the composition
	
	k <- length(params[,1])
	eps <- params[1,1]
    del <- params[1,2]
	eterm <- (1+exp(eps))^k
	dterm <- (1-del)^k
	RHS <- eterm*(1-((1-d_g)/dterm))
	u <- k*eps
	l <- 0
	LHS <- Inf
	e_g <- u
	
	# Must do binary search to approach optimal value
	count <- 0
	
	# Completely arbitrary cutoff of 50 rounds. Should have a more principled approach.
	while(count<50){
		eguess <- l+((u-l)/2)
		LHS <- computeLHS(eguess,k,eps)
		
		# If eguess satisfies privacy:
		if(LHS <= RHS){
			e_g <- eguess
			u <- eguess
		}
		else{
			l <- eguess
		}
		count <- count + 1
	}
	return(e_g)
}


KOVhet <- function(params, d_g, print=FALSE){
   	# Computes an upper bound of optimal composition (Theorem 3.5, [KOV15]). Works for 
    # different settings of epsilons and deltas (heterogenous case). 
	# Args:
	#	params: a kx2 matrix where the first column corresponds to epsilon_i values and the second 
	# 			corresponds to delta_i values. 
	#	d_g: global delta value
	#   print: Boolean that if TRUE will print each individual term of the theorem rather than just
	#          the minimimum.
	#   
	# Returns:
	#	global epsilon value guaranteed from the composition
	
	elist <- params[,1]
	dlist <- params[,2]
	k <- length(elist)
	del_bar <- 1-((1-d_g)/prod(1-dlist))
	sum_of_squares <- sum(elist^2)
	
	# Function that will be applied to the vector of epsilons
	fun <- function(x){
		return(((exp(x) - 1)*x)/(exp(x) + 1))		
	}
	
	first_term <- sum(sapply(elist, FUN=fun))
	
	# a, b, and c will correspond to the first, second, and third expressions in 
	# theorem 3.5 in KOV15. The minimum is returned.
	
	a <- sum(elist)
	b <- first_term + sqrt((2*log(exp(1) + (sqrt(sum_of_squares)/del_bar)))*sum_of_squares)
	c <- first_term + sqrt(2*log(1/del_bar)*sum_of_squares)
	
	# For testing purposes if one wants to print all three terms
	if(print){
	cat("\nFirst term: ", a)
	cat("\nSecond term: ", b)
	cat("\nThird term: ", c)
	cat("\nFinal result: ", min(a,b,c), "\n")
	}
	
	vec <- c(a,b,c)
	
	#If any of the outputs are NaN, return the minimum of the actual numerical results
	if(sum(!is.na(vec)) == 0){
		return(NaN)
	}
	else{
		return(min(vec[which(!is.na(vec))]))
		}	
}
