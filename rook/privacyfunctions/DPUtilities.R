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

callGUI <- function(dict, indices, stats, metadata, globals, action, var, stat){
	grouped_var_dict <- globals$grouped_var_dict
	df <- convert(dict, indices, stats, metadata, grouped_var_dict)
	print(df)
    #clear any empty rows
    empty_rows <- -which(is.na(df$Variable))
    if(length(empty_rows)>0){
   		df <- df[empty_rows,]
   	}

	
	k <- nrow(df)
	# If we are not computing any statistics yet
	if(k == 0){
		return(df)
	}
	rownum <- 0
	if(action == "accuracyEdited"){
		rownum <- which(df$Variable==var & df$Statistic == stat)
	}
	toReturn <- GUI(df, action, globals, rownum)
	#print(toReturn)
	#check for errors
	if(class(toReturn)=="character"){
		return(toReturn)
	}
	else{
		reteps <- toReturn$Epsilon
		retacc <- toReturn$Accuracy
	}
	for(i in 1:length(reteps)){
		stat <- df$Statistic[i]
		var <- as.character(df$Variable[i])
		epsind <- indices[[paste("epsilon_",stat,sep="")]]+1
		accind <- indices[[paste("accuracy_",stat,sep="")]]+1
		dict[[var]][epsind] <- reteps[i]
		dict[[var]][accind] <- retacc[i]
	}
	return(dict)
}

# Function to convert data from web app into the form that the GUI function expects
convert <- function(dict, indices, stats, metadata, grouped_var_dict){
	# add 1 because javascript indexes from 0 and R indexes from 1.
	typeindex <- indices$Variable_Type + 1
	metainds <- as.numeric(indices[metadata])+1
	content <- c()
	for(var in names(dict)){
		varinfo <- dict[[var]]
		type <- varinfo[typeindex]
		metas <- varinfo[metainds]
	  # remove following after js auto assigns metadata to bools
		if(type == "Boolean"){
			metas[1] <- 0
			metas[2] <- 1
			metas[3] <- 2
			metas[4] <- 1
			 
		}
		
    # used to delete variables with no metadata. Now just check "2" status
	#	if(sum(metas=="")!=length(metas)){
			#print(stats)
			for(stat in stats){
				ind <- indices[[stat]]+1
			
				if(as.numeric(varinfo[ind]) == 2){
					epsind <- indices[[paste("epsilon_",stat,sep="")]]+1
					accind <- indices[[paste("accuracy_",stat,sep="")]]+1
					holdind <- indices[[paste("hold_",stat,sep="")]]+1
					missing_type_ind <- indices[["Missing_Type"]]+1
					missing_input_ind <- indices[["Missing_Input"]]+1
					row <- c(var, type, stat, metas, varinfo[epsind], varinfo[accind], varinfo[holdind], varinfo[missing_type_ind], varinfo[missing_input_ind])
					content <- rbind(content,row)
				}
			}
		}
	#}
	df <- data.frame(content, row.names=NULL, stringsAsFactors=FALSE)
	colnames(df) <- c("Variable", "Type", "Statistic", metadata, "Epsilon", "Accuracy","Hold","Missing_Type","Missing_Input") #will need to add missing_type and missing_input

	#recode histogram bin names:
	binnames <- df$Bin_Names
	shorthands <- grep("+:+", binnames)
	for(i in shorthands){
		newnames <- c()
		ends <- unlist(strsplit(as.character(binnames[i]), split=":"))
		if(length(ends) == 3){
			newnames <- try(seq(as.numeric(ends[1]),as.numeric(ends[2]),as.numeric(ends[3])), silent=T)
		}
		if(length(ends) == 2){
			lett <- c()
			if(ends[1] %in% letters &&  ends[2] %in% letters){
				lett <- letters
				
			}
			else if(ends[1] %in% LETTERS &&  ends[2] %in% LETTERS){
				lett <- LETTERS
			}
			
			if(length(lett)!=0){
				coord1 <- match(ends[1], lett)
				coord2 <- match(ends[2], lett)
				newnames <- lett[coord1:coord2]
			}
			else{
				newnames <- try(seq(as.numeric(ends[1]),as.numeric(ends[2])), silent=T)
			}
		}
		
		if(length(newnames)>0 && class(newnames) != "try-error"){
			newnames <- paste(newnames,collapse=',')
			df$Bin_Names[i] <- newnames
		}
		
	}
	
	#Remove empty bottom row if it exists
	if(is.na(df$Variable[nrow(df)])){
		df <- df[1:(nrow(df) -1 ), ]
	}
	return(df)
}


GUI <- function(df, action, globals, rownum=0, printerror=FALSE){
	 # This is the function that will communicate with the web GUI. 
	 # It takes in data table in its current state, decides 
	 # what action needs to be taken, executes that action, and returns the updated table.
	 #
	 # Args:
	 #	df: data structure that the web app will give us. 
	 #	action: String that indicates the most recent action made by the user
	 #	rownum: the row number in df that was just edited
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
    Beta <- as.numeric(globals$Beta)
    n <- as.numeric(globals$n)
    
    if(action == "betaChange"){
			# only need to update accuracies in this case
			return_accuracies <- get_accuracies(df, n, Beta)
			if(class(return_accuracies) == "character" && return_accuracies == "error"){
				message <-"Error in get_accuracies: statistic not found or Beta invalid"
				if(printerror){
					print(message)
				}
				return(message)
			}
		
			# If no error, set new accuracy values	
			df$Accuracy <- return_accuracies
			return(df)
	}  

	k <- nrow(df)
		
	#Create delta column and spread delta_i values evenly
	df$Delta <- 1 - (1-del)^(1/(2*k))

	if(action == "accuracyEdited"){
		stat <- df$Statistic[rownum]
		var_name <- df$Variable[rownum] 
	 
		# If all of the other accuracy values are being held fixed by the user, report this error
		df$Hold <- as.numeric(df$Hold)
		if(sum(df$Hold) == nrow(df) - 1 && df$Hold[rownum] == 0){
			message <- "Cannot edit an accuracy value when every other accuracy is fixed"
			if(printerror){
				print(message)
			}
			return(message)
		}
		
		# call get_parameters	
		val <- df$Accuracy[rownum] 
		attempted_eps <- get_parameters(val, rownum, df, n, Beta)

		# Check if get_parameters returned an error
		if(class(attempted_eps) == "character" && attempted_eps == "error"){
			message <- "Error retrieving epsilon. No statistic specified"
			if(printerror){
				print(message)
			}
			return(message)
		}
		
		# If no errors, then set the new epsilon value.
	    df$Epsilon[rownum] <- attempted_eps
	} #end handling of accuracy_edited case now that we have new epsilon value. 
	

	# Call update_parameters and check for error
	params <- cbind(as.numeric(df$Epsilon), as.numeric(df$Delta))
	hold <- c(rownum, which(df$Hold == 1))
	new_params <- update_parameters(params, hold, eps, del)
	#print(new_params)
	if(class(new_params) == "character" && new_params == "error"){
		message <- "Cannot give statistic that accuracy value. Try removing holds on other variables."
		if(printerror){
			print(message)
		}
		return(message)
		
	}
	
	# If no error, set new privacy parameters and call get_accuracies and check for error
	df$Epsilon <- new_params[, 1]
	df$Delta <- new_params[, 2]
	return_accuracies <- get_accuracies(df, n, Beta)
	
	if(class(return_accuracies) == "character" && return_accuracies == "error"){
			message <- "Error in get_accuracies: statistic not found" 
			if(printerror){
				print(message)
			}
			return(message)		
	}
	# If no error, set new accuracy values	
	df$Accuracy <- return_accuracies
	return(df)
}










