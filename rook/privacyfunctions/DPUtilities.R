###########################################################################
#
# This is a pared down version of GUI.R meant to communicate with 
# a web app through Rook. 
# 
# 
# Jack Murtagh
# Harvard University
# 11/10/14
#
###

GUI <- function(df, x, y, btn, globals){
	 # This is the function that will communicate with the web GUI. 
	 # It takes in data table in its current state, decides 
	 # what action needs to be taken, executes that action, and returns the updated table.
	 #
	 # Args:
	 #	df: data structure that the web app will give us. 
	 #	x: the row number of df that was just edited by the user
	 #	y: the column number of df that was just edited by the user
	 #  btn: Identifier telling us what the user most recently changed
	 #  globals: Vector containing global parameters (eps, del, Beta, and n)
	 #
	 # Returns:
	 #	updated dataframe 
	 	    
     
     
	# General workflow is every time a user updates a cell (ie adds/removes a statistic,
	# changes a metadata value, or edits an accuracy value), we call update_parameters to 
	# get the new privacy parameters and then get_accuracies to get the new accuracy values.
	# The only exception is if the user is specifying an accuracy value, then we must first get
	# the associated parameters through get_parameters before calling update_parameters. This
	# second case is flagged by the 'accuracy_edited' variable. 
 
	
    eps <- as.numeric(globals$eps)
    del <- as.numeric(globals$del)
    Beta <- as.numeric(globals$beta)
    n <- as.numeric(globals$n)
    
    #clear any empty rows
    empty_rows <- -which(is.na(df$Variable))
    if(length(empty_rows)>0){
   		df <- df[empty_rows,]
   	}
    parametersChanged <- FALSE
    rowDeleted <- FALSE
    accuracy_edited <- FALSE
	if(btn != 1){
		#btn = 1 if the grid was edited. So btn != 1 means a global parameter changed
		# The parametersChanged toggle is not currently used but could be useful in the future.
		if(btn == "epsChange"){
			parametersChanged <- TRUE
		}
		
		else if(btn == "deltaChange"){
			# these cases are handled separately here (rather than in a single conditional) 
			# in case we want to handle global eps changes and delta changes differently in the future.
			parametersChanged <- TRUE
		}
		
		else if(btn == "betaChange"){
			# only need to update accuracies in this case
			return_accuracies <- get_accuracies(df, n, Beta)
			if(class(return_accuracies) == "character" && return_accuracies == "error"){
				message <-"Error in get_accuracies: statistic not found or Beta invalid"
				print(message)
				return(message)
			}
		
			# If no error, set new accuracy values	
			df$Accuracy <- return_accuracies
			return(df)
		}
		else if(btn == "rowDeleted"){
			rowDeleted <- TRUE
		}
		else if(btn =="Accuracy"){
			accuracy_edited <- TRUE
		}
		else if(btn == "secChange"){
			#Option available to do something if secrecy of sample is active
		}
		#if btn isn't recognized
		else{
			message <- "Button is not recognized"
			print(message)
			return(message)
	    }
	  }   
	
    index <- 0

	k <- nrow(df)
	# If we are not computing any statistics yet
	if(k == 0){return(df)}
	
	#Create delta column and spread delta_i values evenly
	df$Delta <- 1 - (1-del)^(1/(2*k))
	
	if(!is.null(df$Hold) && length(df$Hold)>1){
		df$Hold[which(is.na(df$Hold))] <- 0	
	}
	else{
		df$Hold <- c()
		}
	
	if(accuracy_edited){
		stat <- df$Statistic[x]
		var_name <- df$Variable[x] 
	    index <- x
	
		
		# If all of the other accuracy values are being held fixed by the user, report this error
		if(sum(df$Hold) == nrow(df) - 1 && df$Hold[index] == 0){
			message <- "Cannot edit an accuracy value when every other accuracy is fixed"
			print(message)
			return(message)
		}
		
		# call get_parameters	
		val <- df[x,y] 
		attempted_eps <- get_parameters(val, index, df, n, Beta)

		# Check if get_parameters returned an error
		if(class(attempted_eps) == "character" && attempted_eps == "error"){
			message <- "No statistic specified"
			print(message)
			return(message)
		}
		
		# If no errors, then set the new epsilon value.
	    df$Epsilon[index] <- attempted_eps
	} #end handling of accuracy_edited case now that we have new epsilon value. 
	

	# Call update_parameters and check for error
	params <- cbind(df$Epsilon, df$Delta)
	index <- c(index, which(df$Hold == 1))
	
	new_params <- update_parameters(params, index, eps, del)

	if(class(new_params) == "character" && new_params == "error"){
		message <- "Cannot give statistic that accuracy value. Try removing holds on other variables."
		print(message)
		return(message)
		
	}
	
	# If no error, set new privacy parameters and call get_accuracies and check for error
	df$Epsilon <- new_params[, 1]
	df$Delta <- new_params[, 2]
	
	return_accuracies <- get_accuracies(df, n, Beta)
	
	if(class(return_accuracies) == "character" && return_accuracies == "error"){
			message <- "Error in get_accuracies: statistic not found" 
			print(message)
			return(message)		
	}
	
	# If no error, set new accuracy values	
	df$Accuracy <- return_accuracies

	return(df)
}
	
# end GUI function














