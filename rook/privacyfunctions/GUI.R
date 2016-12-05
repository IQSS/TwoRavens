###########################################################################
#
# This code is an interactive, command line system in R for the Privacy Tools
# project. It allows users to input metadata for the attributes in their 
# private dataset, select which statistics they'd like to compute, and 
# tinker with the accuracy values that are reported to them. Eventually this 
# code will be integrated with a GUI that users will interact with after they
# upload their private dataset onto the Dataverse. 
# 
# The main data structure is a dataframe where each row corresponds to a single
# call of a DP algorithm. The columns store all of the information we will need
# about each call: Attribute name, Type of variable, Upper bound, Lower bound,
# Granularity, Number of bins, Which statistic that call is computing (ie mean, 
# quantile etc), Accuracy of that statistic, Epsilon, Delta, a flag telling if 
# that attribute is in the covariance matrix, and a flag telling if the user 
# has requested that the accuracy of that statistic not change even as further 
# updates to the parameters are made. 
#
# Presumably, the web GUI will not store values like this because it is more 
# natural for users to think of their data in terms of attributes rather than
# in terms of calls to a DP algorithm. For that reason, we will want to convert 
# between whatever data structure the GUI sends us and the main data structure 
# described above that our code expects. The present code assumes that the app 
# sends us a 2D table where each row is an attribute in the dataset and the columns
# store all relevant information about that attribute - metadata, which stats 
# will be computed for it, the privacy and accuracy values for all of these stats,
# etc. The convert and convert_back functions are conversions between these two 
# ways of representing the data. They might have to be adjusted once we decide on
# a final data structure on the web app side of things. 
#
# The GUI function is the only one that will communicate directly with the user's 
# browser. This takes in the data and most recent user action from the app, converts
# it into the form that we need, decides which actions need to be taken based on 
# what the user just did, executes them, converts the data back into the form the 
# app wants and returns this.  
# 
# 
# Jack Murtagh
# Harvard University
# 7/20/14
#
###


source("GetFunctions.R")
source("update_parameters.R")
source("pretty_print.R")
source("Calculate_stats.R")


#Global variables that will be chosen ahead of time:
eps <- .1
del <- 2^-20
Beta <- .05

#data <- read.csv("PUMS5Extract.csv")   # if we want to load sample data





build_table <- function(data){
	# This function builds a table from the loaded dataset where each
	# attribute has one row and the columns store all of the information
	# we want to know about those attributes. It is an example of how the 
	# web app might store this data and pass it to us. This function will 
	# actually be handled in the app itself and could eventually be pretty
	# different from the one here. Eventually it will collect metadata from
	# dublin core calls to dataverse rather than by combing the data itself.
	#
	# Args:
	#	data - user uploaded dataset
	#
	# Returns: 
	#	dataframe where each row corresponds to one attribute in data.
	
	
	# initialize all columns of the dataframe. 
	Attribute <- colnames(data)
	l <- length(Attribute)
	Type <- c()
	Compute_mean <- c()
	Compute_quantile <- c()
	Compute_CDF <- c()
	Compute_histogram <- c()
	Compute_covariance <- rep(FALSE, times = l)  
	
	# Preselect which statistics we might want to compute based on attribute type. 
	for(i in 1:l){
		if(class(data[ , i]) == "integer" || class(data[ , i]) == "numeric"){
			if(length(unique(data[ , i])) == 2){ 
				Type <- c(Type, "Boolean")
				Compute_mean <- c(Compute_mean, FALSE)
				Compute_quantile <- c(Compute_quantile, FALSE)
				Compute_CDF <- c(Compute_CDF, FALSE)
				Compute_histogram <- c(Compute_histogram, TRUE)
				}
			else{ Type <- c(Type, "Numerical")
				  Compute_mean <- c(Compute_mean, TRUE)
				  Compute_quantile <- c(Compute_quantile, TRUE)
				  Compute_CDF <- c(Compute_CDF, TRUE)
				  Compute_histogram <- c(Compute_histogram, FALSE)
				}
		}
		else{ 
			Type <- c(Type, "Categorical")
			Compute_mean <- c(Compute_mean, FALSE)
			Compute_quantile <- c(Compute_quantile, FALSE)
			Compute_CDF <- c(Compute_CDF, FALSE)
			Compute_histogram <- c(Compute_histogram, TRUE)
		}
	}
	
	
Upper <- rep(" ", times = l)
Lower <- rep(" ", times = l)
Granularity <- rep(" ", times = l)
Number_of_bins <- rep(" ", times = l)
Mean_accuracy <- rep(" ", times = l)
Quantile_accuracy <- rep(" ", times = l)
CDF_accuracy <- rep(" ", times = l)
Histogram_accuracy <- rep(" ", times = l)
Covariance_accuracy <- rep(" ", times = l)
Mean_eps <-  rep(" ", times = l)
Quant_eps <-  rep(" ", times = l)
CDF_eps <-  rep(" ", times = l)
Hist_eps <-  rep(" ", times = l)
Cov_eps <- rep(" ", times = l)
Mean_hold <- rep( 0, times = l)
Quant_hold <- rep(0, times =l)
CDF_hold <- rep(0, times =l)
Hist_hold <- rep(0, times =l)
Cov_hold <- rep(0, times = l)

# make the data frame.
df <- data.frame(Attribute, Type, Upper, Lower, Granularity, Number_of_bins, Compute_mean, Compute_quantile, Compute_CDF, Compute_histogram, Compute_covariance, Mean_accuracy, Quantile_accuracy, CDF_accuracy, Histogram_accuracy, Covariance_accuracy, Mean_eps, Quant_eps, CDF_eps, Hist_eps, Cov_eps, Mean_hold, Quant_hold, CDF_hold, Hist_hold, Cov_hold, stringsAsFactors= FALSE)

return(df)
	
}
# end build table function




convert <- function(df){
	# Converts between data structure that the app might give us, where rows 
	# correspond to attributes and the data structure we need, where rows 
	# correspond to calls of a DP algorithm.
	#
	# Args: 
	#	df - a dataframe currently created by build_table, meant to mimic
	#		 what the web app might send us.
	#
	# Returns:
	#	dataframe in the form that we want.
	
	# initialize data frame
	converted_df <- data.frame(Attribute = character(), Type = character(), Upper = numeric(), Lower = numeric(), Granularity = numeric(), Number_of_bins = numeric(), Statistic = character(), Accuracy = character(), Epsilon = numeric(), Delta = numeric(), Covariance = numeric(), Hold = numeric(), stringsAsFactors = FALSE)
	
	# For each row of the given df, split it into a new row of the converted dataframe for each stat
	# that will be computed on that attribute. Note: a row is only created if the Compute_stat option 
	# is true AND all of the necessary metadata is present for that attribute (means needs upper and 
	# lower bound, etc.)
	for(i in 1:nrow(df)){

		if(as.logical(df$Compute_mean[i]) == 1 && df$Upper[i] != " " && df$Lower[i] != " "){
			
			new_row <- data.frame(df[i, ][1:6],  Statistic ="mean", Accuracy = df$Mean_accuracy[i],
								  Epsilon = df$Mean_eps[i], Delta = " ", Covariance = df$Compute_covariance[i], 
								  Hold = df$Mean_hold[i], stringsAsFactors = FALSE) 
								  
		    converted_df <-	rbind(converted_df, new_row)
		}
		
		if(as.logical(df$Compute_quantile[i]) == 1 && df$Granularity[i] != " " && df$Upper[i] != " " && df$Lower[i] != " "){ 
			
			new_row <- data.frame(df[i, ][1:6], Statistic ="quantile", Accuracy = df$Quantile_accuracy[i], 
								  Epsilon = df$Quant_eps[i], Delta = " ", Covariance = 0, Hold = df$Quant_hold[i], 
								  stringsAsFactors = FALSE)
								  
			converted_df <- rbind(converted_df, new_row)	
		} 
		
		if(as.logical(df$Compute_CDF[i]) == 1 && df$Granularity[i] != " " && df$Upper[i] != " " && df$Lower[i] != " "){ 
			
			new_row <- data.frame(df[i, ][1:6], Statistic ="CDF", Accuracy = df$CDF_accuracy[i], 
								  Epsilon = df$CDF_eps[i], Delta = " ", Covariance = 0, Hold = df$CDF_hold[i], 
								  stringsAsFactors = FALSE)
								  
			converted_df <- rbind(converted_df, new_row)	
		} 

		if(as.logical(df$Compute_histogram[i]) == 1 && df$Number_of_bins[i] != " "){
			
			new_row <- data.frame(df[i, ][1:6], Statistic = "histogram", Accuracy = df$Histogram_accuracy[i], 
			                      Epsilon = df$Hist_eps[i], Delta = " ", Covariance = 0, Hold = df$Hist_hold[i], 
			                      stringsAsFactors = FALSE) 
			                      
			converted_df <- rbind(converted_df, new_row)
		}		
		
	}
	
	# If a covariance matrix is being computed, tack on one additional row:
	
	if(nrow(converted_df) > 0 && sum(as.numeric(converted_df$Covariance)) > 1){	
		
		new_row <- data.frame(Attribute = "Covariance", Type ="Matrix", Upper = " ", Lower = " ", 
							  Granularity = " ", Number_of_bins = " ", Statistic = "covariance" , 
							  Accuracy = max(df$Covariance_accuracy), Epsilon = max(df$Cov_eps), 
							  Delta = " ", Covariance = FALSE, Hold = max(df$Cov_hold), stringsAsFactors = FALSE)
							  
		converted_df <- rbind(converted_df, new_row)
	}
	
		k <- nrow(converted_df)
		
		#Set all deltas to the same value. 
		if(k > 0){
			converted_df$Delta <- 1 - (1-del)^(1/(2*k))
		}
		
		return(converted_df)
} 
# end convert function







convert_back <- function(original, df){
	# Takes the main data structure that we use and converts it back
	# into the form that the web app will want. This function might 
	# change as design decisions are made about the app.
	#
	# Args:
	#	original: the dataframe that was converted to generate df
	#   df: The dataframe that has already been converted and operated on. 
	#		This is the one we are converting back. 
	#
	# Returns:
	#	The dataframe that contains the new information in the form that the 
	#	app expects.
	
	
	#wipe history

	original$Mean_accuracy <- " "
	original$Quantile_accuracy <- " "
	original$CDF_accuracy <- " "
	original$Histogram_accuracy <- " "
	original$Covariance_accuracy <- " "
	original$Mean_eps <- " "
	original$Quant_eps <- " "
	original$Hist_eps <- " "
	original$Cov_eps <- " "
	

	
	if(nrow(df) == 0){
		return(original)
	}
	
	# repopulate original dataframe with new privacy and accuracy values from df
	
	for(i in 1:nrow(df)){
		
		orig_index <- which(original$Attribute == df$Attribute[i])

		if(df$Statistic[i] == "mean"){
			original$Mean_accuracy[orig_index] <- df$Accuracy[i]
			original$Mean_eps[orig_index] <- df$Epsilon[i]
			
			if(df$Covariance[i] == 1){
				original$Covariance_accuracy[orig_index] <- df$Accuracy[nrow(df)]
				original$Cov_eps[orig_index] <- df$Epsilon[nrow(df)]
			}
			
		}

		if(df$Statistic[i] == "quantile"){
			original$Quantile_accuracy[orig_index] <- df$Accuracy[i]
			original$Quant_eps[orig_index] <- df$Epsilon[i]
		}
		
		if(df$Statistic[i] == "CDF"){
			original$CDF_accuracy[orig_index] <- df$Accuracy[i]
			original$CDF_eps[orig_index] <- df$Epsilon[i]
		}

		if(df$Statistic[i] == "histogram"){
			original$Histogram_accuracy[orig_index] <- df$Accuracy[i]
			original$Hist_eps[orig_index] <- df$Epsilon[i]
		}
	}
		return(original)	
}

#end convert back








GUI <- function(df, x, y, val){
	 # This is the function that will communicate with the web GUI. 
	 # It takes in data, converts it to the form we need, decides 
	 # what action needs to be taken, executes that action, converts
	 # the updated data back to the form the GUI wants and returns.
	 #
	 # Args:
	 #	df: data structure that the web app will give us. Currently this 
	 #	    takes in tables created by build_table.
	 #	x: the row number of df that was just edited by the user
	 #	y: the column number of df that was just edited by the user
	 #  val: the new value that the user just placed in df[x,y]
	 #
	 # Returns:
	 #	updated dataframe back in the original format. 
	 	    
     
     
	# General workflow is every time a user updates a cell (ie adds/removes a statistic,
	# changes a metadata value, or edits an accuracy value), we call update_parameters to 
	# to get the new privacy parameters and then get_accuracies to get the new accuracy values.
	# The only exception is if the user is specifying an accuracy value, then we must first get
	# the associated parameters through get_parameters before calling update_parameters. This
	# second case is flagged by the case variable. 
     
	# Determine if we are editing an accuracy value or not:
	
    case2 <- c("Mean_accuracy", "Quantile_accuracy", "CDF_accuracy", "Histogram_accuracy", "Covariance_accuracy")
    case <- 1
    index <- 0
    
    if(colnames(df)[y] %in% case2){ 
     	case <- 2 	
     }

	# store original dataframe, convert dataframe, and determine k.
    original_df <- df
	df <- convert(df)
	k <- nrow(df)
	
	# If we are not computing any statistics yet
	if(nrow(df) == 0){return(convert_back(original_df,df)) }
	
	#make compatible with new column names (6/11/15)
	names(df)[3] <- "UpperBound"
	names(df)[4] <- "LowerBound"
	
	# If we are editing an accuracy value, we need to determine the index of 
	# this accuracy value in the converted dataframe in order for get_parameters
	# to know which parameter to return.
	
	if(case == 2){
	
		var_name <- original_df$Attribute[x]
		if(colnames(original_df)[y] == "Mean_accuracy"){
			stat <- "mean"
		}
		if(colnames(original_df)[y] == "Quantile_accuracy"){
			stat <- "quantile"
		}
		if(colnames(original_df)[y] == "CDF_accuracy"){
			stat <- "CDF"
		}
		if(colnames(original_df)[y] == "Histogram_accuracy"){
			stat <- "histogram"
		}
		if(colnames(original_df)[y] == "Covariance_accuracy"){
			stat <- "covariance"
		}
		if(stat == "covariance"){
			index <- nrow(df)
		}
	    else{
	    # in converted dataframe, every row is uniquely identified by an attribute name and a statistic type
	    
	    	index <- intersect(which(df$Attribute == var_name), which(df$Statistic == stat))
		}
		
		# If all of the other accuracy values are being held fixed by the user, report this error
		if(sum(df$Hold) == nrow(df) - 1 && df$Hold[index] == 0){
			
			print("Cannot edit an accuracy value when every other accuracy is fixed.")
			return("error")
			
		}
		
		# call get_parameters	
		attempted_eps <- get_parameters(val, index, df, n, Beta)
		
		# Check if get_parameters returned an error
		if(class(attempted_eps) == "character" && attempted_eps == "error"){
			
			cat("\nError: stat ", index, " does not have a statistic specified. \n")
			return("error")
			
		}
		
		# If no errors, then set the new epsilon value.
	    df$Epsilon[index] <- attempted_eps
	} #end handling of case 2 now that we have new epsilon value. 
	
	
		# Call update_parameters and check for error	
		params <- cbind(df$Epsilon, df$Delta)
		index <- c(index, which(df$Hold == 1))
		new_params <- update_parameters(params, index, eps, del)
		
		if(class(new_params) == "character" && new_params == "error"){ 
			
			print("Cannot give statistic that accuracy value. You could try deselecting another statistic first.")
			return("error")
			
		}
		
		# If no error, set new privacy parameters and call get_accuracies and check for error
		df$Epsilon <- new_params[, 1]
		df$Delta <- new_params[, 2]
		return_accuracies <- get_accuracies(df, n, Beta)
		
		if(class(return_accuracies) == "character" && return_accuracies == "error"){
			
				cat("\nError in get_accuracies: statistic not found. \n")
				return("error")
				
			}
		
		# If no error, set new accuracy values	
		df$Accuracy <- return_accuracies
		
		#make compatible with new column names (6/11/15)
		names(df)[3] <- "Upper"
		names(df)[4] <- "Lower"

	# Print new information in an organized style
	pretty_print(df)
	
	# convert the updated dataframe back to the original format and return to the app
	df <- convert_back(original_df, df)		
	return(df)
}
	
# end GUI function




### The following code might eventually be handled by a web app. It mimics the interactive 
### experience a user might have with a GUI after uploading a private dataset to Dataverse. 
### For now, it is controlled from the R console command line.	
		
	
	df <- build_table(data)
	n <- nrow(data)  
	#fakebinlist <- list()
# If we want to take advantage of secrecy of the sample:
# For PUMS data, population of california was 36 million in 2008

	big_n <- readline("Were the respondents in this data set randomly sampled from 
a larger population and will the sample selected remain unknown to the public? 
If so, please estimate the size of that larger population. 
Otherwise, type \"no\":  ")
	
	# If user enters a number, make sure it is larger than the sample in the dataset
	# and adjust global epsilon and delta parameters according to the secrecy of the
	# sample lemmas. 
	
	if(grepl("^[0-9]+$", big_n)){
		
		big_n <- as.numeric(big_n)
		
		if(big_n < n){
			
			cat("\nThe population size cannot be smaller than the size of your sample.\n\n")
			
		}else{
			
			#eps <- log(eps*(big_n/n) + 1) # This value works
			
			#improvement
			eps <- log((exp(eps)-1)*(big_n/n) + 1)
			del <- del*(big_n/n)
			cat("\nNew privacy parameters: eps: ", eps,"del: ", del, "\n")
			
		}
	}


	
	# If called through "GUI_inputs.R", there will be a myfile variable 
	# linking to a text file of commands to be executed in sequence. This
	# is useful for testing long user interactions with the system without
	# having to carry them all out by hand. 
		
	line <- 0
	if(exists("myfile")){
		commands <- readLines(myfile)
		line <- 1
		rm(myfile)
	}

# The interaction with the user is contained in a while loop. This loop does 
# not end until the user types "done", which flips this flag.	
done <- FALSE


# Report some initial instructions to the user
cat("	To update your metadata, type the coordinates, and the desired new value separated by commas. 
	Or type the Attribute name and column name, followed by a new value. 
	Example: 3, 4, 100
	Or:	age, upper, 100
	For more help, type \"help\"
	If done, type \"done\":")


# loop that interacts with the user. Reads command line input, makes many checks that the 
# input is valid, and then calls GUI according to the present command.
	
	while(!done){
		
		# If we are reading from a file
		if(line != 0){
			
			input <- commands[line]
			
			if(line < length(commands)){
				
				line <- line + 1
							
			}
			
			else{			
				line <- 0
			}
		}
		
		# else, we are waiting for command line input
		else{		
		input <- readline(">> ")
		}
		
		# First check if the input is one of the three one-word commands we accept:
		
		check <- tolower(gsub("^\\s+|\\s+$", "", input))
		
		# "done" ends the interaction
		if(check == "done"){		
			print("Thank you!")
			break			
		}
		
		# "table" prints the large data structure behind the scenes that stores all of the data	
		if(check == "table"){
			print(df)
			next
		}
		
		# Help prints out more detailed instructions for how to use the system. 
		if(check == "help"){
			
			row_options <- cbind(c(1:nrow(df)), df$Attribute)
			col_options <- cbind(c(3:14), colnames(df)[3:14])
			dimnames(row_options) <-list(rep("", dim(row_options)[1]), rep("", dim(row_options)[2]))
			dimnames(col_options) <-list(rep("", dim(col_options)[1]), rep("", dim(col_options)[2]))

			cat("\nFirst input term should either be a row number or row name:\n")
			print(row_options, quote = FALSE, row.names = FALSE)
			
			cat("\nSecond input term should either be a column number or column name. 
Note: some columns may not be edited and those are not presented here:\n")
			print(col_options, quote = FALSE, row.names = FALSE)
			
			cat("\nThird input:\n")
			cat("\nIf editing metadata (upper, lower, granularity, or bins), the third input term must be numerical.
If editing an accuracy value, input term must either be numerical or \"hold\" or \"unhold\" which specify
that that accuracy value should remain fixed.
If editing a Compute_stat option, input must either be \"true\" or \"false\" or \"0\" or \"1\".
To see the entire stored data structure, type \"table\".
When finished, type \"done\".")
			next
		}
		
		# Input is not one of the accepted one-word commands, so 
		# parse it by comma and expect three separate arguments.
		input <- unlist(strsplit(input, ","))
		
		if(length(input) != 3){
			print("Input must have three elements separated by commas")
			next
		}
		
		# Separate input into three different arguments and check each separately. 
		# Trim leading and trailing whitespace and force to lower case letters.
		input1 <- tolower(gsub("^\\s+|\\s+$", "", input[1]))
		input2 <- tolower(gsub("^\\s+|\\s+$", "", input[2]))
		input3 <- tolower(gsub("^\\s+|\\s+$", "", input[3]))
		
		
		#Check if input 1 is a number
		x <- 0
		if(grepl("^[0-9]+$", input1)){
			
			x <- as.numeric(input1)
			
			# make sure input is within bounds that the user may edit
			if( x > nrow(df) || x <=0 ){
				
				print("x coordinate out of bounds")
				next
				
			}
		}
		
		# input 1 is not a number so must be an attribute name
		else{ 
			
			 if(input1 %in% tolower(df$Attribute)){
			 	
			 	x <- which(tolower(df$Attribute) == input1)
			 	
			 }
			 # If input is not a valid row name or number:
			 else{
			 	
			 	print("First input term is not a recognized attribute name or row number")
			 	next
			 	
			 }
		}
		
		#One final check on x. We should not reach this point. 
		if(x == 0){
			
			print("Something wrong with first input term")
			next
			
		}
		
		
		# Make similar checks for second input:
		
		y <- 0
		
		# Is it a number? 
		if(grepl("^[0-9]+$", input2)){
			
			y <- as.numeric(input2)
			
			# Note: These bounds are very dependent on the particulars of the data structure
			# defined in build_table. Currently not allowing edits of type or attribute name. 
			if( y > 14 || y <= 2){  
				
				print("y coordinate out of bounds")
				next
				
			}
		}
		
		# Input 2 is not a number so must be a column name	
		else{ 
			
			 if(input2 %in% tolower(colnames(df)[3:14])){
			 	
			 	y <- which(tolower(colnames(df)) == input2)
			 	
			 }
			 
			 else{
			 	
			 	print("Second input term is not a valid column name or number")
			 	next
			 	
			 }
		}
		
		#One final check on y. Should not reach this point.
		
		if(y == 0){
			
			print("Something wrong with second input term")
			next
			
		}



		# Check input3
		colname <- colnames(df)[y]
		
		# check if input3 is hold or unhold - special values that allow user to fix or unfix 
		# particular accuracy values. Some of the following checks might be more long-winded 
		# or redundant than they need to be. Ultimately, they'll be included in the GUI though.
		
		
		hold <- -1
		if(input3 == "hold"){ hold <- 1}
		if(input3 == "unhold"){ hold <- 0}
		
		if(hold != -1){
			
			# The user cannot place a hold on every accuracy value. Otherwise,
			# set the appropriate hold flag and move onto the next pass of the loop
			if(colname == "Mean_accuracy"){
				
				df$Mean_hold[x] <- hold
				temp_df <- convert(df)
				
				if(sum(temp_df$Hold) == nrow(temp_df)){
					
					print("Cannot place a hold on every accuracy value")
					df$Mean_hold[x] <- 0
					
				}
				
				else{
				pretty_print(temp_df)
				}
				
				next
			}
			
			else if(colname == "Quantile_accuracy"){
				
				df$Quant_hold[x] <- hold
				temp_df <- convert(df)
				
				if(sum(temp_df$Hold) == nrow(temp_df)){
					
					print("Cannot place a hold on every accuracy value")
					df$Quant_hold[x] <- 0
					
				}
				
				else{
				pretty_print(temp_df)
				}

				next
			}

			else if(colname == "CDF_accuracy"){
				
				df$CDF_hold[x] <- hold
				temp_df <- convert(df)
				
				if(sum(temp_df$Hold) == nrow(temp_df)){
					
					print("Cannot place a hold on every accuracy value")
					df$CDF_hold[x] <- 0
					
				}
				
				else{
				pretty_print(temp_df)
				}

				next
			}

			else if(colname == "Histogram_accuracy"){
				
				df$Hist_hold[x] <- hold
				temp_df <- convert(df)
				
				if(sum(temp_df$Hold) == nrow(temp_df)){
					
					print("Cannot place a hold on every accuracy value")
					df$Hist_hold[x] <- 0
					
				}
				
				else{
				pretty_print(temp_df)
				}

				next
			}
			
			else if(colname == "Covariance_accuracy"){
				df$Cov_hold[x] <- hold
				temp_df <- convert(df)
				
				if(sum(temp_df$Hold) == nrow(temp_df)){
					
					print("Cannot place a hold on every accuracy value")
					df$Cov_hold[x] <- 0
					
				}
				
				else{
				pretty_print(temp_df)
				}

				next
			}
			# If the user tried to call hold or unhold on anything but an accuracy value
			else {
				
				print("You can only place a hold or unhold on an accuracy value. Please try again.")
				next
				
			}
		} # end hold checks
		
		
		#Now check if input3 should be numeric
		val <- "^bad_string^@"
		
		if(colname %in% c("Upper","Lower", "Granularity", "Number_of_bins", "Mean_accuracy", 
		                  "Quantile_accuracy", "CDF_accuracy", "Histogram_accuracy", "Covariance_accuracy")){
			
			#New value must be numeric in this case:
			if(suppressWarnings(is.na(as.numeric(input3)))){
				
				print("Third input term must be a number for the column you've selected")
				next
				
			}
			
			else{
				val <- as.numeric(input3) # Might want to also check that the ranges are reasonable
			}
			
		}
		
		#Check if input3 should be boolean
		if(colname %in% c("Compute_mean", "Compute_quantile", "Compute_CDF", "Compute_histogram", "Compute_covariance")){
			
			 if(input3 %in% c("true", "1")){
			 	val <- TRUE
			 }
			 
			 else if(input3 %in% c("false", "0")){
			 	val <- FALSE
			 }
			 
			 else{
			 	print("Third input term must be a boolean for the column you've selected")
			 	next
			 }
		}
		
		#one last check on val
		if(val == "^bad_string^@"){
			print("Something wrong with third input value")
			next
		}
		
		#Upper cannot be less than lower
		if(colname == "Upper" & df$Lower[x] != " "){			
			if(val <= as.numeric(df$Lower[x])){
				print("Upper bound must be greater than Lower bound")
				next
			}
			
		}
		
		if(colname == "Lower" & df$Upper[x] != " "){
			if(val >= as.numeric(df$Upper[x])){
				print("Upper bound must be greater than Lower bound")
				next
			}
		}
		
		#Can't edit accuracy that hasn't been set yet
		if(colname %in% c("Mean_accuracy", "Quantile_accuracy", "CDF_accuracy", "Histogram_accuracy", "Covariance_accuracy")){
			
			if(df[x,y] == " "){
				print("Cannot edit an accuracy value before it has been set")
				next
			}
			
		}
		
		#if editing bin number, must provide names for nonexistent bins:
		'
		if(colname == "Number_of_bins"){
			data_column <- which(colnames(data) == df$Attribute[x])
			realbins <- unique(data[ , data_column])
			print(val)
			print(realbins)
			if(length(realbins) < val){
				cat("Number of bins specified is greater than true number of bins.
Below is the list of actual bin names in the data. Please provide names 
for the nonexistent bins. Otherwise, type \'back\' \n")
				print("Real bin names: ")
				print(realbins)
				numbins <- length(realbins)
				fakebins <- c()
				while(numbins < val){
					newbin <- readline("bin name: ")
					if(newbin == "back"){
						fakebins <- c()
						break
					}
					if(newbin %in% fakebins | newbin %in% realbins){
						print("Cannot have two bins with the same name")
						next
					}
					fakebins <- c(fakebins, newbin)
					numbins <- numbins + 1
				}
				if(length(fakebins) == 0){ next}
				else(fakebinlist[[df$Attribute[x]]] <- fakebins )
			}
		}
		'
		
		# All inputs have been checked. Set the new value in the dataframe, make 
		# a few more checks if the action involves the covariance matrix. 
		
		temp <- df[x,y]
		df[x,y] <- val
		
		if(colnames(df)[y] == "Covariance_accuracy"){
			df$Covariance_accuracy[which(df$Covariance_accuracy != " ")] <- val
		}
		
		# Cannot compute covariance matrix with only one variable	
		if(colnames(df)[y] == "Compute_covariance" && sum(as.numeric(df$Compute_covariance)) == 1){
			
			print("Add at least one more variable into the covariance matrix")
			next
		}
		
		
		output <- GUI(df, x, y, val)
		
		# If there are errors, undo the change
		if(class(output) == "character" && output == "error"){
			df[x,y] <- temp
		}
		
		else{ df <- output }		
}	

# If using fake bin names: pass fakebinlist
#mylist <- calculate_stats(data, convert(df), n, Beta)
