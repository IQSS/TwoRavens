#####################################################
#
#	This code contains the get_accuracies and get_parameters functions
#	which communicate with the other modules to compute accuracy/privacy
#	tradeoffs. Updated 10/20/17 to communicate with PSIlence library.
#
#	Jack Murtagh
#
###

#####
# calling syntax for each stat
#Mean:
#mean.getAccuracy <- function(epsilon, n, alpha=0.05, rng)  rng = c(min, max)
#mean.getParameters <- function(accuracy, n, alpha=0.05, rng)

#histogram
#histogram.getAccuracy <- function(n.bins, n, epsilon, stability, delta=10^-6, alpha=0.05, error=1e-10) {
#histogram.getParameters <- function(n.bins, n, accuracy, stability, delta=10^-6, alpha=0.05, error=1e-10) 	

#
#tree.getAccuracy <- function(epsilon, alpha=.05, rng, gran, n) 
#tree.getParameters <- function(accuracy, alpha=.05, rng, gran, n)

# glm.getAccuracy <- function(epsilon, n, alpha) 
# glm.getParameters <- function(epsilon, n, alpha) 
	
#cem.getAccuracy <- function(epsilon, alpha=0.05, k) 
#cem.getParameters <- function(accuracy, alpha=0.05, k) 

###########


get_accuracies <- function(metadata, n, Beta){
	# Get a list of accuracy values from the appropriate DP algorithm given all of the
	# individual privacy parameters stored in metadata. 
	
	# Args: 
	#	metadata: a dataframe where each row corresponds to a single call of a DP algorithm 
	#             and contains the relevant information for that call.
	#	n: number of people in the database
	#	Beta: a global parameter that indicates that each of the accuracy values reported will be 
	#         achieved (1 - Beta) percent of the time
	#   statlist: added 10/20/17, vector of statistics available in the library
	#
	# Returns:
	#	vector of accuracy values for each of the k stats being computed.
	
	
	# total number of calls we will make to a DP algorithm.
	k <- length(metadata[ , 1]) 
	
	# Vector that will contain the list of new accuracy values. 
	new_accuracies <- c()     
	glmlist <- c("ols_regression","logistic_regression","probit_regression") 
	for(i in 1:k){
		stat <- tolower(metadata$Statistic[i])
		new_acc <- NULL 
		eps_i <- as.numeric(metadata$Epsilon[i])    
		del_i <- as.numeric(metadata$Delta[i])
		#handle the case of each statistic. Eventually we will want this done dynamically rather than hard coded
		if(stat=="mean"){
			up <- as.numeric(metadata$Upper_Bound[i]) 
			lo <- as.numeric(metadata$Lower_Bound[i])
			rng <- c(lo,up)
			new_acc <- mean.getAccuracy(epsilon=eps_i, n=n, alpha=Beta, rng=rng)
		}
		else if(stat=="quantile"){
			granularity <- as.numeric(metadata$Granularity[i])
			up <- as.numeric(metadata$Upper_Bound[i]) 
			lo <- as.numeric(metadata$Lower_Bound[i])
			rng <- c(lo,up)
			new_acc <- tree.getAccuracy(epsilon=eps_i, alpha=Beta, rng=rng, gran=granularity) 
		}
		else if(stat=="histogram"){
			n.bins <- as.numeric(metadata$Number_of_Bins[i])
			bins_spec <- TRUE
			if(is.na(n.bins) && metadata$Bin_Names[i] ==""){
				bins_spec <- FALSE
			}
			if(bins_spec){
				stability <- FALSE
			}
			else{
				stability <- TRUE
			}
			new_acc <- histogram.getAccuracy(n.bins=n.bins, n=n, epsilon=eps_i, stability=stability, delta=del_i, alpha=Beta)
		}
		else if(stat %in% glmlist){
			new_acc <- glm.getAccuracy(epsilon=eps_i, n=n, alpha=Beta) 
		}
		
		else if(stat =="att_with_matching"){
			strata <- as.numeric(metadata$Matching_Multiplier[i]$"row"$"General")
			new_acc <- cem.getAccuracy(epsilon=eps_i, alpha=Beta, strata=strata) 
		}
		
		
		#if the statistic in the metadata dataframe is unrecognized. This should only happen if the library and UI are reading different JSON files.
		else{
			return("error")
		}

		# append updated accuracy to the vector that will be returned. 
		# Store everything as characters in case somebody's report of accuracy is not a simple number. 
		new_accuracies <- c(new_accuracies, as.character(new_acc)) 		
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
	#   statlist: added 10/20/17, vector of statistics available in the library
	#	Beta: a global parameter that indicates that each of the accuracy values reported will be 
	#         achieved (1 - Beta) percent of the time
	#
	# Returns:
	#	new_eps: the epsilon_i required by the particular algorithm to ensure new_accuracy
	
	
	# pull together relevant information for the get_parameter calls
	del_i <- as.numeric(metadata$Delta[i])
	stat <- tolower(metadata$Statistic[i])
	new_accuracy <- as.numeric(new_accuracy)
	new_eps <- NULL
	glmlist <- c("ols_regression","logistic_regression","probit_regression")
	#handle the case of each statistic. Eventually we will want this done dynamically rather than hard coded
		if(stat=="mean"){
			up <- as.numeric(metadata$Upper_Bound[i]) 
			lo <- as.numeric(metadata$Lower_Bound[i])
			rng <- c(lo,up)
			new_eps <- mean.getParameters(accuracy=new_accuracy, n=n, alpha=Beta, rng=rng)
		}
		else if(stat=="quantile"){
			granularity <- as.numeric(metadata$Granularity[i])
			up <- as.numeric(metadata$Upper_Bound[i]) 
			lo <- as.numeric(metadata$Lower_Bound[i])
			rng <- c(lo,up)
			new_eps <- tree.getParameters(accuracy=new_accuracy, alpha=Beta, rng=rng, gran=granularity) 
		}
		else if(stat=="histogram"){
			n.bins <- as.numeric(metadata$Number_of_Bins[i])
			bins_spec <- TRUE
			if(is.na(n.bins) && metadata$Bin_Names[i] ==""){
				bins_spec <- FALSE
			}
			if(bins_spec){
				stability <- FALSE
			}
			else{
				stability <- TRUE
			}
			new_eps <- histogram.getParameters(n.bins=n.bins, n=n, accuracy=new_accuracy, stability=stability, delta=del_i, alpha=Beta)
		}
		else if(stat %in% glmlist){
			new_eps <- glm.getParameters(accuracy=new_accuracy, n=n, alpha=Beta) 
		}
		
		else if(stat =="att_with_matching"){
			strata <- as.numeric(metadata$Matching_Multiplier[i]$"row"$"General")
			new_eps <- cem.getParameters(accuracy=new_accuracy, alpha=Beta, strata=strata) 
		}

	#if the statistic in the metadata dataframe is unrecognized. This should only happen if the UI and back end are reading different JSONs.
	else{ 
		return("error")
	} 
	return(new_eps)
	
}

#end get_parameters