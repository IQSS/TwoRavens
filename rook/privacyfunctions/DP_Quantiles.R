##########################################################
# DP_Quantiles: Class for releasing differentially private
# quantiles. This is done by outputting an approximate CDF of
# the data which can be used to approximate any quantile
#
# Author: Nathan Manohar
# Harvard University
##########################################################

### Functions Available
##########################################################
   # getAccuracy(eps, beta, range, gran)
   # getParameters(alpha, beta, range, gran)
   # release(eps, cdfstep, data, range, gran)
   #
   # Helper functions used within main functions:
   #   MovetoRange(val, range)
   #   computeInterval(tree, val, range, gran)
##########################################################


Quantile.MovetoRange <- function(val, range) {
	# Checks if val is in range = (min, max)
	# and moves it to either min or max if it is 
	# out of the range
	#
	# Args:
	#   val: The value to check if in the range
	#   range: A vector (min, max) of the range
	#
	# Returns:
	#   val if val is in the range, otherwise min or max
	
	if(val < range[1]) {
		return(range[1])
	}
	else if(val > range[2]) {
		return(range[2])
	}
	else
		return(val)
	
}

Quantile.computeInterval <- function(tree, val, range, gran) {
  #computes the count in [min, val] from the binary tree
  #
  # Args:
  #   tree: The binary tree stored as an array
  #   val: The value we want to compute the count in [min, val] for
  #  range: The range of the universe as a vector (min, max)
  #  gran: The granularity of the universe between the min and max
  #
  # Returns:
  #  The count in [min, val] given by the binary tree
  
  universe_size <- ((range[2] - range[1]) / gran) + 1	
  tree_depth <- ceiling(log2(universe_size))
  index <- ((val - range[1])/gran) + 1
  
  interval_count <- 0
  done <- 0
  current_index <- 1
  nodes_below <- 2^tree_depth
  
  while(done == 0) {
  	if(index == nodes_below) {
  		interval_count <- interval_count + tree[current_index]
  		done <- 1
  	}
  	else if(index <= nodes_below/2) {
  		nodes_below <- nodes_below/2
  		current_index <- 2 * current_index
  	}
  	else {
  		nodes_below <- nodes_below/2
  		interval_count <- interval_count + tree[2 * current_index]
  		current_index <- (2 * current_index) + 1
  		index <- index - nodes_below
  	}
  }
  
  return(interval_count)
	
}

Quantile.release <- function(eps, cdfstep, data, range, gran) {
  # Releases an approximate CDF of a data set in a DP manner. Returns these values in a vector
  #
  # Args: 
  #  eps: epsilon value for DP
  #  cdfstep: The step sized used in outputting the approximate CDF; the values output are [min, min + cdfstep], [min, min + 2 * cdfstep], etc.
  #  data: A vector of the data
  #  range: The range of the universe as a vector (min, max)
  #  gran: The granularity of the universe between the min and max
  #  It is assumed that the data input is rounded to the
  #    granularity
  #
  # Returns:
  #  A vector whose values are the approximate counts ofr
  #  [min, min + cdfstep], [min, min + 2 * cdfstep], etc.
  
  
  #Move any data outside range to min or max
  data <- lapply(data, function(x) Quantile.MovetoRange(x, range))
  
  #Create binary tree stored as an array
  universe_size <- ((range[2] - range[1]) / gran) + 1
  tree_depth <- ceiling(log2(universe_size))
  tree <- rep(0, times = (2^tree_depth + universe_size))
  
  #Add the counts of the data to the binary tree
  for(i in 1:length(data)) {
  	index <- ((as.numeric(data[i]) - range[1]) / gran) + 2^tree_depth
  	tree[index] <- tree[index] + 1
  }
  
  #Sum adjacent nodes to complete binary tree
  for(i in seq(2^tree_depth, 2^tree_depth - 1 + universe_size, 2)) {
  	tree[i/2] <- tree[i] + tree[i+1]  	
  }
  
  tree_counter <- tree_depth - 1
  
  while(tree_counter > 0) {
  	for(i in seq(2^tree_counter, 2^(tree_counter + 1) - 1, 2)) {
  		tree[i/2] <- tree[i] + tree[i+1]
  	}
  	tree_counter <- tree_counter - 1
  }
  
  #Add Laplace noise to the nodes of the tree
  for(i in 1:(2^tree_depth - 1 + universe_size)) {
  	tree[i] <- tree[i] + rlaplace(1, location = 0, scale = (2/(eps)) * log2(universe_size))
  	}
  
  returnValue <- rep(0, times = length(seq(range[1] + cdfstep, range[2], cdfstep)))
  
  #Call computeInterval function to obtain the counts in the desired intervals
  for(i in 1:length(returnValue)) {
  	returnValue[i] <- Quantile.computeInterval(tree, range[1] + (cdfstep * i), range, gran)
  }
  
  return(returnValue)
}

Quantile.getAccuracy <- function(eps, beta, range, gran, n) {
  # Args: 
  #  eps: epsilon value for DP
  #  beta: the true value is within the accuracy range with
  #    probability 1-beta
  #  range: The range of the universe as a vector (min, max)
  #  gran: The granularity of the universe between the min and max
  #
  # Returns:
  #  The accuracy guaranteed by the given epsilon
  #
  #  The accuracy is interpreted as follows: The alpha value returned means that with probability 1 - beta, simultaneously for all t with min <= t <= max, the algorithm's estimate of the count in [min, t] is within alpha of the true value
  
  universe_size <- ((range[2] - range[1]) / gran) + 1
  
  return(((4/eps) * log2(1/beta) * log2(universe_size)^(1.5))/(n*100)) #/(n*100) added by JM on 8/5/14 for consistency among accuracies

}

Quantile.getParameters <- function(alpha, beta, range, gran, n) {
  # Args:
  #  alpha: the accuracy parameter
  #  beta: the true value is within the accuracy range (alpha)
  #    with probability 1-beta
  #  range: The range of the universe as a vector (min, max)
  #  gran: The granularity of the universe between the min and max
  #
  # Returns:
  #  The epsilon value necessary to gaurantee the given accuracy
  alpha <- alpha*100   #added by JM on 8/5/14 for consistency among accuracies
  universe_size <- ((range[2] - range[1]) / gran) + 1
	
  return(((4/alpha) * log2(1/beta) * log2(universe_size)^(1.5))/n)
	
}
  
