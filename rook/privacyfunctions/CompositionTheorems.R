##################################################################
#
# This code contains functions to compute different composition theorems in Differential Privacy. 
#
# Jack Murtagh
# Harvard University
# 7/20/14
#
###



# The bound of optimal composition theorem (Theorem 3.5, [Oh, Viswanath, 2013]). Works for 
# different settings of epsilons and deltas (heterogenous case). 

optimal_composition <- function(params, del, print = FALSE){
	# Compute the optimal composition theorem for the given epsilon, delta pairs
	# 
	# Args:
	#	params: a kx2 matrix where the first column corresponds to epsilon values and the second 
	# 			corresponds to delta values. 
	#	del: global delta value
	#   print: Boolean that if TRUE will print each individual term of the theorem rather than just
	#          the minimimum.
	#   
	# Returns:
	#	global epsilon value guaranteed after the composition
	#
	
	
	### Define various components of the equation:
	
	# k is the total number of DP algorithm calls that we are composing
	k <- length(params[ , 1])
	del_bar <- 1 - sqrt(1 - del)
	
	# Set del_i's to this in params if you're spreading delta evenly
	del_i <- 1 - (1 - del)^(1/(2*k))  
	del_product <- del_i*k
	sum_of_squares <- 0
	
	
	for(i in 1:k){
		sum_of_squares <- sum_of_squares + params[i,1]^2
	}
	
	# Function that will be applied to the vector of epsilons
	fun <- function(x){
		return(((exp(x) - 1)*x)/(exp(x) + 1))		
	}
	
	first_term <- sum(sapply(params[,1], FUN=fun))
	
	# a, b, and c will correspond to the first, second, and third expressions in the 
	# optimal composition theorem. The minimum is returned.
	
	a <- sum(params[,1])
	b <- first_term + sqrt((2*log(exp(1) + (sqrt(sum_of_squares)/del_bar)))*sum_of_squares)
	c <- first_term + sqrt(2*log(1/del_bar)*sum_of_squares)
	
	# For testing purposes
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



thm_3.4 <- function(params, del, print = FALSE){
	# The optimal composition theorem when all epsilons are the same and 
	# all deltas are the same and in the "high privacy regime" when eps_global <= .9
	# (homogenous case) (Theorem 3.4, [Oh, Viswanath, 2013]). 
	# 
	# Args:
	#	params: a kx2 matrix where the first column corresponds to epsilon values and the second 
	# 			corresponds to delta values. Note: this function really only needs one epsilon, delta
	#			pair since they will all be equal anyway. However for ease of use and testing, I wanted all
	#			of the composition functions to have the same signature.
	#	del: global delta value
	#   print: Boolean that if TRUE will print each individual term of the theorem rather than just
	#          the minimimum.
	# Returns:
	#	global epsilon value guaranteed after the composition
	#
	
	k <- length(params[ , 1])
	
	del_bar <- 1 - sqrt(1 - del) # set del_i's equal to 1 - (1 - del)^(-2k)
	
	eps_i <- params[1,1]
	
	# a, b, and c correspond to the three different terms of the theorem. The minimum is returned.
	a <- k*eps_i
	term <- a*eps_i
	
	b <- term + eps_i*sqrt(2*k*log(exp(1) + (sqrt(term)/del_bar)))
	c <- term + eps_i*sqrt(2*k*log(1/del_bar))
	
	# For testing purposes	
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


advanced_composition <- function(params, del){
	# Compute the advanced composition theorem for the homogenous case. [Dwork, Rothblum, Vadhan, 2010]
	# 
	# Args:
	#	params: a kx2 matrix where the first column corresponds to epsilon values and the second 
	# 			corresponds to delta values. 
	#	del: global delta value
	#
	# Returns:
	#	global epsilon value guaranteed after the composition
	#
	
	k <- length(params[,1])
	
	# If using this function, set the individual deltas in params equal to del/2k
	del_bar <- del/2  
	eps_i <- params[1,1]
	
	term1 <- k*eps_i*(exp(eps_i) -1)
	term2 <- eps_i*sqrt(2*k*log(1/del_bar))
	return(term1 + term2)
	
}

homogeneous_comp <- function(params, del){
	# This function implements the optimal composition function for 
	# homogenous mechanisms. Theorem 3.3 of Oh, Viswanath.
	# Should only call this when all epsilons and deltas are equal!!
	
	k <- length(params[,1])
	e <- params[1,1]
	d <- params[1,2]
	
	
  for(i in floor(k/2):0){
	sum <- 0
	for(l in 0:(i-1)){
		sum <- sum + choose(k,l)*(exp((k-l)*e)-exp((k-2*i+l)*e))
	}
	d_i <- sum/((1+exp(e))^k)
	e_g <- (k-2*i)*e
	d_g <- 1-((1-d)^k)*(1-d_i)
	#cat("(",e_g,",",d_g,")","\n") #this prints all results
	#to print only ones for which del doesn't get exceeded:
	if(d_g <= del){
		return(e_g)
	}
  }
  #If we're here it means we cannot achieve privacy without raising delta
   return(NA)
}



# JM added 1/7/15. Below is the code for our approximation algorithm that improves 
# composition results. 


isDP <- function(params, e_ask, d_g, err=0){
	# Function that takes in list of epsilons and
	# corresponding deltas, a global delta, a guess 
	# global epsilon, and an error term, t. 
	
	
	elist <- params[,1]
	params <- params[order(elist), ]	
	elist <- params[,1]
	dlist <- params[,2]
	k <- length(elist)
	
	# If homogeneous composition applies, run that instead (much faster) 
	if(max(elist) == min(elist) & max(dlist) == min(dlist)){
		test_eps <- homogeneous_comp(params, d_g)
		if(is.na(test_eps)){
			return(NA)
		}
		else if(test_eps <= e_ask){
			return(T)
		}
	}
	
	# If the bound in OV Thm 3.5 implemented above already satisfies privacy, we 
	# do not need to run the dynamic programming
	if(optimal_composition(params, d_g) <= e_ask){
		return(T)
	}
	
	# Not sure how we'll handle t and err yet. For now:
	if(err == 0){
		err <- e_ask/10
	}
	b <- (sum(elist) - e_ask)/2
	t <- b*k/(err) # divide err by 2 here?
	
	del_prod <- prod(1 - dlist)
	eps_prod <- prod(exp(elist) + 1)
	
	make_alphas <- function(x){
		return(floor(t*(x/b)))	
	}
	alphas <- sapply(elist, FUN = make_alphas)
	
	#scale all epsilons down by at most additive b/t
	ebarlist <- (b/t)*alphas
	epsbar_prod <- prod(exp(ebarlist) + 1)
	
	t1 <- add(alphas, ebarlist, flip = 0, t)
	t2 <- add(alphas, ebarlist, flip = 1, t)
	
	knapsacksum <- (t1 - t2*exp(e_ask))/epsbar_prod
	RHS <- knapsacksum*del_prod - del_prod + 1
	
	#test for privacy:
	if(d_g < RHS){
		return(F)
	}
	
	else{
		return(T)
	}
	
}


add <- function(alphas, elist, flip = 1, t){
	# This function implements our modification of Martin Dyer's
	# approximation algorithm for counting knapsack solutions. It 
	# is called as a subprocess of isDP above. 
	# Set flip to 0 to run the other side of the sum. 
	k <- length(elist)
	tab <- matrix(nrow = k, ncol = t + 1)
	counttab <- matrix(nrow = k, ncol = t + 1)
	
	for(r in 1:k){	    
       for(s in 0:t){		
		if(r == 1){		
			if(s < alphas[1]){ 
				
				tab[r, s+1] <- exp(((flip+1)%%2)*elist[1])
				counttab[r, s+1] <- 1
			}
			else{
				tab[r, s+1] <- exp(elist[1]) + 1  
				counttab[r, s+1] <- 2
			}			
		}
		else if (r >= 2){
			if(s - alphas[r] < 0){
				term2 <- 0
				countterm2 <- 0
				}
			else{			
				term2 <- exp(flip*elist[r])*tab[r-1, s - alphas[r] + 1]	
				countterm2 <- counttab[r-1, s - alphas[r] + 1]	
				}
			tab[r, s + 1] <- exp(((flip+1)%%2)*elist[r])*tab[r-1, s+1] + term2
			counttab[r, s+1] <- counttab[r-1, s+1] + countterm2	
		}			
	 }
  }
 
  #return(list("tab" = tab,"counttab" = counttab))		
  return(tab[k, t+1])	
}


