# This code enforces the metadata constraints given by the user and then calls all of the
# relevant DP algorithms to actually calculate the stats. 

# 12/09/14 update: This code has been modified to call stats for the general purpose and 
# is no longer the version that was tailored for the legal team demo. This will be called 
# after the user completes the table interface and clicks submit. It will return the values 
# that will overwrite the metadata in dataverse.

# This function may throw an error on an ill-formed request,
# but we make sure it does not do so contingent on the data.
enforce_constraints <- function(toprocess, df){
	#get full list of constraints
	meta <- df[,c("Variable","Type", "Statistic","Lower_Bound","Upper_Bound","Number_of_Bins","Granularity","Treatment_Variable", "Bin_Names")]  
	meta <- unique(meta)

	#implement constraints row by row
	for(i in 1:nrow(meta)){
		#gather variables
		up <- meta$Upper_Bound[i]
		lo <- meta$Lower_Bound[i]
		gr <- meta$Granularity[i]
		col <-  which(colnames(toprocess) == meta$Variable[i]) #column number in original dataset
		type <- meta$Type[i]
		coerceTo <- NA
		if(length(col) != 1) {
			return(list(message="Variable does not exist in the table. Please report this error."))
		}
		else if (type == "Numerical") {
			toprocess[ , col] = as.numeric(toprocess[ , col])
			up <- as.numeric(as.character(up))
			lo <- as.numeric(as.character(lo))
			#if upper and lower bounds are valid...
			if(!is.finite(up) || !is.finite(lo) || lo > up) {
				return(list(message=paste("Bounds not valid for", meta$Variable[i])))
			}
			else {
				#... set new upper and lower bounds of the data
				toprocess[ , col][toprocess[ , col] > up] <- up
				toprocess[ , col][toprocess[ , col] < lo] <- lo

				#if granularity is filled in...
				if(!is.na(gr) & gr != " " & gr != "na" & gr !=""){ 
					gr <- as.numeric(as.character(gr))

					#... fix lower bound and discretize the data by gr. 
					# Set every value in variable to nearest discretized value
					toprocess[ , col] <- gr*round((toprocess[,col]-lo)/gr)+lo

					#Some values may now exceed upper bound so reset the upper bound to be within the discretized set. 
					newup <- trunc((up-lo)/gr)*gr + lo
					toprocess[ , col][toprocess[ , col] > newup] <- newup
				}
			}
			coerceTo <- lo
		}
		else if (type == "Boolean") {
                        # !! We can't use as.logical because it doesn't work well for character vectors (as.logical("60") is false, as.logical(60) is true)!
                        toprocess[ , col] = permissiveAsLogical(toprocess[ , col])
			coerceTo <- FALSE
		}
		else if (type == "Categorical") {
			toprocess[ , col] = as.factor(toprocess[ , col])
			# coerceTo <- ?
			# TODO! what to do with bins?
		}
		else {
			return(list(message=paste("Type", type, "not recognized for variable",
									  meta$Variable[i], ". Please report this error.")))
		}

		# Last resort: unpleasantly coerce NAs to a value.
		# This is because our differentially private algorithms currently do not
		# guarantee privacy for NAs. TODO: We should find a better solution.
		# We could write individualized support for NA's in each algorithm,
		# or at least provide a UI tool to set coerceTo.

		# Once we properly support categorical data, uncomment the sanity check below.
		# if(is.na(coerceTo)) {
		#         return(list(message=("Coercion of NA's could not be guaranteed. Please report this internal error."))) 
		# }
		toprocess[ , col][is.na(toprocess[ , col])] <- coerceTo
	}	
	return(list(data=toprocess))
}

# To prevent issues when vec is a character vector.
permissiveAsLogical <- function(vec) {
        return(as.logical(vec) | as.logical(as.numeric(vec)))
}

# This function expects that enforce_constraints has already been called on `toprocess`.
calculate_stats <- function(toprocess, df, globals, fakebinlist = c()){
	# Vector to store released dp statistics as strings. 
	# This is appended onto df and returned to the front end.
	# Might get rid of "stats" data structure altogether but keeping it for now in case we find some use for it.
	Releases <- c()
	#print(df)

	#initialize storage of calculated stats
	variables <- unique(df$Variable)
	stats <- vector("list",length(variables))
	names(stats) <- variables
	eps <- as.numeric(globals$eps)
	del <- as.numeric(globals$del)
	Beta <- as.numeric(globals$beta)
	n <- as.numeric(globals$n)
	k <- nrow(df)

	df$Delta <- 1 - (1-del)^(1/(2*k))

	for(i in 1:k){
		stat <- df$Statistic[i]
		e <- as.numeric(as.character(df$Epsilon[i]))
		d <- as.numeric(as.character(df$Delta[i]))
		up <- as.numeric(as.character(df$Upper_Bound[i]))
		lo <- as.numeric(as.character(df$Lower_Bound[i]))
		gr <- as.numeric(as.character(df$Granularity[i]))
		bins <- as.numeric(as.character(df$Number_of_Bins[i]))
		col <-  which(colnames(toprocess) == df$Variable[i])
		att <- df$Variable[i]

		# The budgeter shouldn't let users request statistics on variables of the wrong type, so this is just to protect against people cooking up suspicious requests.
		typeNumeric = is.numeric(toprocess[ , col]);
		typeBoolean = is.logical(toprocess[ , col]);
		typeCategorical = is.factor(toprocess[ , col]);
		if(typeBoolean) {
			# 'convert' should have made sure that hi - lo == 1,
			# but just to make sure...
			range <- 1
		}
		else if (typeNumeric) {
			range <- abs(up - lo)
		}

		if(length(col) != 1) {
			Releases <- c(Releases, "ERROR: You somehow requested a variable which does not exist in the data. Please report this error.");
		} else if(stat == "Mean" && (typeNumeric || typeBoolean)) {
			#call mean function on this Variable, etc.

			if(is.null(stats[[att]])){
				stats[[att]] <- list("mean"=NA,"cdf"=c(), "histogram"=c())
			}

			released_mean <- Mean.release(e, d, toprocess[ , col], range)
			stats[[att]]$mean <- released_mean
			Releases <- c(Releases, toString(released_mean))

		}

		else if(stat == "Quantile" && typeNumeric){
			#call quantile function
			#what to put as cdfstep? Some values lead to bad output
			#cdfstep <- round(range/100)		
			cdfstep <- gr
			if(is.null(stats[[att]])){
				stats[[att]] <- list("mean"=NA,"cdf"=c(), "histogram"=c())
			}
			released_quantile <- Quantile.release(e, cdfstep, toprocess[ , col], c(lo, up), gr)	
			stats[[att]]$cdf <- 	released_quantile
			Releases <- c(Releases, toString(released_quantile))
		}

		else if(stat == "Histogram" && (typeNumeric || typeCategorical)){
			#call histogram function
			#If variable type is categorical, get bin names from user-supplied metadata

			if(df$Type[i] == "Categorical"){
				binstring <- df$Bin_Names[i]
				#split by comma and remove leading and trailing whitespace 
				binvec <- strsplit(binstring,"," )
				trim <- function(x){
					return(gsub("^\\s+|\\s+$", "", x))
				}
				bin_names <- sapply(binvec, FUN=trim)
				#print(bin_names)
				if(length(bin_names) < 2){
					#print("Warning: fewer than two bins in a histogram")
					#print("There are fewer than 2 bin names so we are running epsilon delta laplace")
					#bin_names <- NULL
				}

			}
			else {
				#Doesn't use the user-provided number of bins. Will need to correct that with new histogram code
				bin_names <- sort(as.numeric(unique(toprocess[ , col]))) 
			}

			#If using fake bin names
			'
			if(length(fakebinlist) > 0){
				binnames <- sort(c(as.numeric(unique(toprocess[ , col])), as.numeric(fakebinlist[att])))
			}
			else if(length(fakebinlist) == 0){
				binnames <- sort(as.numeric(unique(toprocess[ , col])))
			}
			'
			#allbins <- sort(as.numeric(unique(toprocess[ , col])))
			released_histogram <- Histogram.release(bin_names, toprocess[,col], e, d, Beta) #will have to figure out this sorting
			acc <- as.numeric(df$Accuracy[i])
			if(is.null(stats[[att]])){
				stats[[att]] <- list("mean"=NA,"cdf"=c(), "histogram"=c())
			}

			stats[[att]]$histogram <- released_histogram
			Releases <- c(Releases, toString(released_histogram))
		}

		else if(stat == "CDF" && typeNumeric){
			#call quantile function
			#what to put as cdfstep? Some values lead to bad output
			range <- abs(up - lo)
			#cdfstep <- round(range/100)		
			cdfstep <- gr
			if(is.null(stats[[att]])){
				stats[[att]] <- list("mean"=NA,"cdf"=c(), "histogram"=c())
			}
			released_cdf <- CDF.release(e, cdfstep, toprocess[ , col], c(lo, up), gr)$release
			stats[[att]]$cdf <- released_cdf
			Releases <- c(Releases, toString(released_cdf))
			#Post-processing
			percentile <- 2; highBound <- 10
			stats[[att]]$mean <- MeanFromCDF(stats[[att]]$cdf, c(lo, up), gr)
			stats[[att]]$mode <- ModeFromCDF(stats[[att]]$cdf, c(lo, up), gr)
			stats[[att]]$hist <- HistfromCDF(stats[[att]]$cdf, granScale =1)
			# stats[[att]]$zeros <- ZerosFromCDF(stats[[att]]$cdf)
			# stats[[att]]$percentile <- PercentileFromCDF(stats[[att]]$cdf, c(lo, up), gr, percentile)
			# stats[[att]]$rquery <- RangeQueryFromCDF(stats[[att]]$cdf, c(lo, up), gr, lowBound=0, highBound)
			# stats[[att]]$KurtosisFromCDF <- KurtosisFromCDF(stats[[att]]$cdf, c(lo, up), gr)
			# stats[[att]]$SDFromCDF <- SDFromCDF(stats[[att]]$cdf, c(lo, up), gr)
			# stats[[att]]$VarianceFromCDF <- VarianceFromCDF(stats[[att]]$cdf, c(lo, up), gr)
			# stats[[att]]$SkewnessFromCDF <-SkewnessFromCDF(stats[[att]]$cdf, c(lo, up), gr)
		} else {
			Releases <- c(Releases, "ERROR: You somehow requested a statistic which does not exist or is not implemented for your chosen variable type. Please report this error!");
		}
	}
	#print("HERE:")
	#print(stats)
	#add release column to input df.

	#print(Releases)
	#print(df)
	#print(globals)
	df$Releases <- Releases
	return(list(globals=globals, df=df))
	#Might want to do away with the stats data structure all together.
	#Keeping it for now and 
	#used to create xml file below. Now just returning table with new columns for releases and delta. 
	#xml <- create_xml(stats,df,globals)
	#return(xml)
}


calculate_stats_with_PSIlence <- function(data, df, globals){
	# PSIlence syntax for each stat
	# out <-  :
	# dpMean$new(mechanism='mechanismLaplace', var.type, n, rng=c(lo,hi), epsilon=NULL, accuracy=NULL, impute.rng=NULL, alpha=0.05, boot.fun=boot.mean, ...)
	# dpTree$new(mechanism='mechanismLaplace', var.type, n, rng=c(lo,hi), gran, epsilon, impute.rng=NULL, percentiles=NULL, ...) 
	# dpHistogram$new(mechanism='mechanismLaplace', var.type, n, epsilon=NULL, accuracy=NULL, rng=NULL, bins=NULL, n.bins=NULL, alpha=0.05, delta=2^-30, error=1e-9,impute.rng=NULL, impute=FALSE, ...) #set bins=c(name1, name2,...)?
	#dpGLM$new('mechanismObjective', 'numeric', n, rng, formula=form, objective='logit', epsilon=eps) 
	# Here, the variable type argument refers to the data frame as a whole, and the code will really only work with numeric types. So we basically require a numeric #matrix. 

#For an NxP input matrix, the range is a Px2 matrix, where each row corresponds to a numeric vector with 2 elements, the lower and upper bounds for the pth column #in the data. The same is true of the impute ranges if they are given.

#For now I am constraining the formula argument to be an R formula. If it's more convenient, we could change this to a string, then just wrap it in "as.formula()" once #we are in R. 

	#
	# 
	# fill in CEM
	# out$release(data[,col])
	#finallist <- list(data=data,df=df,globals=globals)
	#save(finallist,file="finallist.RData")
	#initialize storage of calculated stats
	k <- nrow(df)
	variables <- unique(df$Variable)
	#dpReleases <- vector("list",k)
	#names(dpReleases) <- variables
	dpReleases <- list()
	releaseNames <- list()
	release_col <- c()
	eps <- as.numeric(globals$eps)
	del <- as.numeric(globals$del)
	Beta <- as.numeric(globals$beta)
	n <- as.numeric(globals$n)
	grouped_var_dict <- globals$grouped_var_dict
	df$Delta <- 1 - (1-del)^(1/(2*k))
	type_conversion_dict <- list("Numerical"="numeric", "Categorical"="character", "Boolean"="logical")
	for(i in 1:k){
		stat <- tolower(df$Statistic[i])
		eps_i <- as.numeric(df$Epsilon[i])    
		del_i <- as.numeric(df$Delta[i])
		var <- df$Variable[i]
		#col <-  which(colnames(data) == var)
		#type <- type_conversion_dict[[df$Type[i]]]
		type <- df$Type[i]
		print(stat)
		if(!(var %in% names(grouped_var_dict))){
			type <- as.character(type_conversion_dict[as.character(type)])	
			#releaseNames[i] <- as.character(var)
		}
		#else{
	#		releaseNames[i] <- grouped_var_dict[as.character(var)]	
	#	}
		missing_type <- df$Missing_Type[i]
		missing_input <- df$Missing_Input[i]
		# todo: come up with a more durable solution to missing data for booleans
		if(type == "logical" && missing_type == "separate_bin"){
			stat <- "histogram"
		}
		error <- FALSE
		 if(stat=="mean"){
		 	releaseNames[i] <- as.character(var)
			if(type =="logical"){
				up <- 1
				lo <- 0
			}
			else{
				up <- as.numeric(df$Upper_Bound[i]) 
				lo <- as.numeric(df$Lower_Bound[i])
			}
			rng <- c(lo,up)
			impute.rng <- rng
		    if (missing_type == "fixed_value"){
				fixed_val <- as.numeric(missing_input)
		    		if(!is.na(fixed_val)){
					impute.rng <- c(as.numeric(missing_input),as.numeric(missing_input))
				}
			}
			else if(missing_type == "custom_range"){
				ends <- unlist(strsplit(as.character(missing_input), split=":"))
				if(length(ends)==2){
					end1 <- as.numeric(ends[1])
					end2 <- as.numeric(ends[2])
					if(!(is.na(end1) || is.na(end2))){
						impute.rng <- c(min(end1, end2),max(end1,end2))
					}
				}
			}
			out <- dpMean$new(mechanism='mechanismLaplace', var.type=type, n=n, rng=rng, epsilon=eps_i, impute.rng=impute.rng, alpha=Beta)
			col <-  which(colnames(data) == var)
			input <- data[,col]
		}
		
		else if(stat=="quantile"){
			releaseNames[i] <- as.character(var)
			gran <- as.numeric(df$Granularity[i])
			up <- as.numeric(df$Upper_Bound[i]) 
			lo <- as.numeric(df$Lower_Bound[i])
			rng <- c(lo,up)
			impute.rng <- rng
		    if (missing_type == "fixed_value"){
		    		fixed_val <- as.numeric(missing_input)
		    		if(!is.na(fixed_val)){
					impute.rng <- c(as.numeric(missing_input),as.numeric(missing_input))
				}
			}
			else if(missing_type == "custom_range"){
				ends <- unlist(strsplit(as.character(missing_input), split=":"))
				if(length(ends)==2){
					end1 <- as.numeric(ends[1])
					end2 <- as.numeric(ends[2])
					if(!(is.na(end1) || is.na(end2))){
						impute.rng <- c(min(end1, end2),max(end1,end2))
					}
				}
			}
			out <- dpTree$new(mechanism='mechanismLaplace', var.type=type, n=n, rng=rng, gran=gran, epsilon=eps_i, impute.rng=impute.rng) 	
			col <-  which(colnames(data) == var)
			input <- data[,col]
		}
		
		else if(stat=="histogram"){
			releaseNames[i] <- as.character(var)
			rng <- NULL
			n.bins <- as.numeric(df$Number_of_Bins[i])
			bins <- df$Bin_Names[i]
			stability <- TRUE
			impute.rng <- NULL
			if(type == "numeric"){
				up <- as.numeric(df$Upper_Bound[i]) 
				lo <- as.numeric(df$Lower_Bound[i])
				rng <- c(lo,up)
				stability <- FALSE
				impute <- TRUE
				impute.rng <- rng
				if(missing_type == "fixed_value"){
					fixed_val <- as.numeric(missing_input)
		    			if(!is.na(fixed_val)){
						impute.rng <- c(as.numeric(missing_input),as.numeric(missing_input))
					}
				}
				else if(missing_type == "custom_range"){
					ends <- unlist(strsplit(as.character(missing_input), split=":"))
					if(length(ends)==2){
						end1 <- as.numeric(ends[1])
						end2 <- as.numeric(ends[2])
						if(!(is.na(end1) || is.na(end2))){
							impute.rng <- c(min(end1, end2),max(end1,end2))
						}
					}
			  }
			}
			else if(type == "logical"){
				# know bins in this case
				stability <- FALSE
				bins <- c(0, 1)
				rng <- c(0,1)
				n.bins <- 2 #library doesn't actually need this for binary histograms
				if(missing_type == "separate_bin"){
					impute <- FALSE
				}
				else if (missing_type == "random_value"){
					impute <- TRUE
				}
			}
			else if(type == "character"){
				if(missing_type == "separate_bin"){
					impute <- FALSE
				}
				else if (missing_type == "random_value"){
					impute <- TRUE
				}
				bins_spec <- TRUE
				if(is.na(n.bins) && bins ==""){
					bins_spec <- FALSE
				}
				if(bins_spec){
					stability <- FALSE
					#split by comma and remove leading and trailing whitespace 
					binvec <- strsplit(bins,"," )
					trim <- function(x){
						return(gsub("^\\s+|\\s+$", "", x))
					}
					bins <- sapply(binvec, FUN=trim)
					n.bins <- length(bins)
					if(n.bins < 1){
						error <- TRUE
					}
				}
				else{
					stability <- TRUE
				}
			}
			else{
				error <- TRUE
			}
			if(!error){
				out <- dpHistogram$new(mechanism='mechanismLaplace', var.type=type, n=n, epsilon=eps_i, rng=rng, bins=bins, n.bins=n.bins, alpha=Beta, delta=del_i, impute.rng=impute.rng, impute=impute) 
				col <-  which(colnames(data) == var)
				input <- data[,col]
			}
		}
		
		else if(stat %in% c("ols_regression","logistic_regression","probit_regression") ){	
				varlist <- grouped_var_dict[[as.character(var)]]
				outcome <- df$Outcome_Variable[i]$"row"$"General"
				covariate_list <- varlist[-which(varlist==outcome)]
				form <- paste(toString(outcome),"~")
				if(type$"row"[[outcome]]=="Boolean"){
					outcome_up <- 1
					outcome_lo <- 0
				}
				else{
					outcome_up <- df$Upper_Bound[i]$"row"[[outcome]]
					outcome_lo <- df$Lower_Bound[i]$"row"[[outcome]]	
				}
				cov_ranges <- c(as.numeric(outcome_lo),as.numeric(outcome_up))
				for(cov_num in 1:length(covariate_list)){
					form <- paste(form,toString(covariate_list[cov_num]))
					# in here: if type is boolean set up and low to 1, 0
					if(type$"row"[[covariate_list[cov_num]]]=="Boolean"){
						cov_up <- 1
						cov_lo <- 0
					}
					else{
						cov_up <- df$Upper_Bound[i]$"row"[[covariate_list[cov_num]]]
						cov_lo <- df$Lower_Bound[i]$"row"[[covariate_list[cov_num]]]
					}
					cov_range <- c(as.numeric(cov_lo), as.numeric(cov_up))
					cov_ranges <- rbind(cov_ranges,cov_range)
					if(cov_num <length(covariate_list) ){
						form <- paste(form,"+")
					}
				}
				releaseNames[i] <- form
			if(stat =="ols_regression"){
				objective <- "ols"
			}
			if(stat =="logistic_regression"){
				objective <- "logit"
			}
			if(stat =="probit_regression"){
				objective <- "probit"
			}
			#currently type only takes numeric
			#currently only support imputing with metadata ranges. So setting impute.rng to null
			out <- dpGLM$new(mechanism='mechanismObjective', var.type='numeric', n=n, rng=cov_ranges, formula=form, objective=objective, epsilon=eps_i, impute.rng=NULL) 
			input <- data
		}
				
		else if(stat =="att_with_matching"){
			varlist <- grouped_var_dict[[as.character(var)]]
			outcome <- df$Outcome_Variable[i]$"row"$"General"
			treatment <- df$Treatment_Variable[i]$"row"$"General"
			mm <- as.numeric(df$Matching_Multiplier[i]$"row"$"General")
			if(mm == 1){
				matchType <- "onetoone"
			}
			else{
				matchType <- "onetok"	
			}
			groupList <- NULL #Eventually we might want to build groupList parameter into interface
			exactMatch <- c()
			scaleList <- list()
			for(var in varlist){
				if(var != outcome && var != treatment){
					t <- type$"row"[[var]]
					if(t != "Numerical"){
						exactMatch <- c(exactMatch, var)
					}
					else{
						coarsening <- as.numeric(df$Coarsening[i]$"row"[[var]])
						scaleList[[var]] <- coarsening
					}
				}
			}
			#note that ATT is not in library so we don't get object back
			input <- data	
			dpRelease <- dpATT(data=input, outcome=outcome, treatment=treatment, scaleList=scaleList, groupList=groupList, exactMatch=exactMatch, matchType=matchType, k=mm, epsilon=eps_i,alpha=Beta)			
			dpRelease <- toString(dpRelease)
		}		
	    else {
			error <- TRUE
		}
		# call release on out object
		if(error){
			message <- "ERROR: Either a requested statistic does not exist, exists more than once in the dataset, or the statistic is not supported in the system. Please report this error."
			release_col <- c(release_col, message)
		}
		else{ 
			#once att is in library, can treat it the same as other stats here
			if(stat != "att_with_matching"){
				dpRelease <- out$release(input)
				#this is what we actually send to get put in JSON
				dpReleases[i] <- out
				#this is what we send to front end for splash page.
				release_col <- c(release_col, toString(dpRelease$release))	
			}
			else{
				release_col <- c(release_col, toString(dpRelease))
				#dpReleases[i] <- dpRelease    #only send ATT to splash page. Note to read2JSON since we don't have an object for it. 
			}
		}
	}
	#add release column to input df.
	df$Releases <- release_col
	# below blocked until fix
	print("Release names:")
	print(releaseNames)
	if(length(releaseNames)>0)
		releaseJSON <- release2json(dpReleases, releaseNames)
	}
	else{
		releaseJSON <- "Only ATTs were computed."
	}
	return(list(globals=globals, df=df, releaseJSON=releaseJSON))
	#write json from dpReleases
	
	
	#Might want to do away with the stats data structure all together.
	#Keeping it for now and 
	#used to create xml file below. Now just returning table with new columns for releases and delta. 
	#xml <- create_xml(stats,df,globals)
	#return(xml)
}




