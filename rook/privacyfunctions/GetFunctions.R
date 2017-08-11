#####################################################
#
#	This code contains the get_accuracies and get_parameters functions
#	which communicate with the other modules to compute accuracy/privacy
#	tradeoffs.
#
#	Jack Murtagh
#	Harvard University
#	7/20/14
#
###



get_accuracies <- function(metadata, n, Beta){
	# Get a list of accuracy values from the appropriate DP algorithm given all of the
	# individual privacy parameters stored in metadata. 
	
	# Args: 
	#	metadata: a dataframe where each row corresponds to a single call of a DP algorithm 
	#             and contains the relevant information for that call.
	#	n: number of people in the database
	#	Beta: a global parameter that indicates that each of the accuracy values reported will be 
	#         achieved (1 - Beta) percent of the time
	#
	# Returns:
	#	vector of accuracy values for each of the k stats being computed.
	
	
	# total number of calls we will make to a DP algorithm.
	k <- length(metadata[ , 1]) 
	
	# Vector that will contain the list of new accuracy values. 
	new_accuracies <- c()     
	
	for(i in 1:k){
		
		# column in metadata that contains either mean, quantile, histogram, CDF or covariance. 
		# Tells us which getAccuracy function we need to call.
		stat <- tolower(metadata$Statistic[i]) 
		
		new_acc <- NULL 
		eps_i <- as.numeric(metadata$Epsilon[i])    
		del_i <- as.numeric(metadata$Delta[i])
		#print(eps_i)
		#print(Beta)
		
		# handle different cases:
		if(stat == "mean"){
			range <- abs(as.numeric(metadata$Upper_Bound[i]) - as.numeric(metadata$Lower_Bound[i])) 
			#print(range)
			new_acc <- Mean.getAccuracy(eps_i, del_i, range, n, Beta) 
		}
	
		else if(stat == "quantile"){
			granularity <- as.numeric(metadata$Granularity[i])
			range <- c(as.numeric(metadata$Lower_Bound[i]), as.numeric(metadata$Upper_Bound[i]))
			#print(granularity)
			#print(range)
			new_acc <- Quantile.getAccuracy(eps_i, Beta, range, granularity, n) 	
		}

		else if(stat == "cdf"){
			granularity <- as.numeric(metadata$Granularity[i])
			range <- c(as.numeric(metadata$Lower_Bound[i]), as.numeric(metadata$Upper_Bound[i]))
			new_acc <- CDF.getAccuracy(eps_i, Beta, range, granularity, n) 	
		}

	    else if(stat == "histogram"){
			bins <- as.numeric(metadata$Number_of_Bins[i])
			#print(bins)
			#new_acc <- histogram$getAccuracy(bins, n, eps_i, del_i, Beta) 
			#with new histogram code: changed 8/8/14
			new_acc <- Histogram.getAccuracy(TRUE, n, eps_i, del_i, Beta)[1] #returns pair of accs
		}	
		
		else if(stat == "covariance"){
			# For covariance, he will need lists of upper and lower bounds. 
			upper <- c()
			lower <- c()
			for(i in 1:length(metadata[ ,1])){
				if(metadata$Covariance[i] == 1){
					upper <- c(upper, as.numeric(metadata$Upper_Bound[i]))
					lower <- c(lower, as.numeric(metadata$Lower_Bound[i]))
				}
			}
			new_acc <- VCV.getAccuracy(eps_i, del_i, upper, lower, n, Beta)	
		}
		
		#if the statistic in the metadata dataframe is unrecognized. This should never happen.
		else{ 
			return("error")
		} 
		#print(new_acc)
		# append updated accuracy to the vector that will be returned. 
		# Store everything as characters in case somebody's report of accuracy is not a simple number. 
		new_accuracies <- c(new_accuracies, as.character(new_acc)) 
		#print(new_accuracies)
		
	}
	
	return(new_accuracies)
} 
#end get_accuracies



#############################




get_parameters <- function(new_accuracy, i, metadata, n, Beta){
	# Get the needed privacy parameter for a specific stat given the user specified accuracy.
	#
	#
	# Args:
	#	new_accuracy: user specified accuracy value.
	#	i: The row number in the metadata dataframe that the user just changed.
	#	metadata: dataframe containing a row for each call to a DP algorithm and all the necessary 
	#             information about that call (see convert function for more information)
	#	n: number of people in the dataset
	#	Beta: a global parameter that indicates that each of the accuracy values reported will be 
	#         achieved (1 - Beta) percent of the time
	#
	# Returns:
	#	new_eps: the epsilon_i required by the particular algorithm to ensure new_accuracy
	
	
	# pull together relevant information for the get_parameter calls
	del_i <- as.numeric(metadata$Delta[i])
	#print("metadata:")
	#print(metadata)
	stat <- tolower(metadata$Statistic[i])
	new_accuracy <- as.numeric(new_accuracy)

	
	# handle each kind of statistic separately:
	if(stat == "mean"){
		range <- abs(as.numeric(metadata$Upper_Bound[i]) - as.numeric(metadata$Lower_Bound[i])) 
		new_eps <- Mean.getParameters(new_accuracy, del_i, range, n, Beta) 
	}

	else if(stat == "quantile"){
		granularity <- as.numeric(metadata$Granularity[i])
		range <- c(as.numeric(metadata$Lower_Bound[i]), as.numeric(metadata$Upper_Bound[i]))
		new_eps <- Quantile.getParameters(new_accuracy, Beta, range, granularity, n) 	
	}

	else if(stat == "cdf"){
		granularity <- as.numeric(metadata$Granularity[i])
		range <- c(as.numeric(metadata$Lower_Bound[i]), as.numeric(metadata$Upper_Bound[i]))
		new_eps <- CDF.getParameters(new_accuracy, Beta, range, granularity, n) 	
	}
	
    else if(stat == "histogram"){
		bins <- as.numeric(metadata$Number_of_Bins[i])
		#new_eps <- histogram$getParameters(bins, n, del_i, new_accuracy, Beta)	
		#with new histogram code: changed 8/8/14
		new_eps <- Histogram.getParameters(TRUE, n, del_i, new_accuracy, Beta) 
	}	
	
	else if(stat == "covariance"){
		upper <- c()
		lower <- c()
		
		#For covariance, getParameters will need a list of upper and lower bounds for each attribute in the matrix
		for(j in 1:length(metadata[ ,1])){
			if(metadata$Covariance[j] == 1){      #if attribute is included in the covariance matrix
				upper <- c(upper, as.numeric(metadata$Upper_Bound[j]))	 #append values to upper and lower bound vectors
				lower <- c(lower, as.numeric(metadata$Lower_Bound[j]))
			}
		}
		new_eps <- VCV.getParameters(new_accuracy, del_i, upper, lower, n, Beta)			
	}
	
	
	#if the statistic in the metadata dataframe is unrecognized. This should never happen.
	else{ 
		return("error")
		} 
	
	
	return(new_eps)
	
}

#end get_parameters