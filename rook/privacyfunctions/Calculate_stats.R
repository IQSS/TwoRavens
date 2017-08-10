# This code enforces the metadata constraints given by the user and then calls all of the
# relevant DP algorithms to actually calculate the stats. 

# 12/09/14 update: This code has been modified to call stats for the general purpose and 
# is no longer the version that was tailored for the legal team demo. This will be called 
# after the user completes the table interface and clicks submit. It will return the values 
# that will overwrite the metadata in dataverse.


enforce_constraints <- function(data, df){
	#get full list of constraints
	meta <- df[,c("Variable","Type", "Statistic","Lower_Bound","Upper_Bound","Number_of_Bins","Granularity","Treatment_Variable", "Bin_Names")]  
	meta <- unique(meta)
	
	#copy data
	toprocess <- data
	
	#implement constraints row by row
	for(i in 1:nrow(meta)){
		#gather variables
		up <- meta$Upper_Bound[i]
		lo <- meta$Lower_Bound[i]
		gr <- meta$Granularity[i]
		col <-  which(colnames(toprocess) == meta$Variable[i]) #column number in original dataset
	
		#if upper and lower bounds are filled in...
		if((!is.na(up) & up != " " & up != "na" & up !="") & (!is.na(lo) & lo != " " & lo != "na" & lo !="")){
			up <- as.numeric(as.character(up))
			lo <- as.numeric(as.character(lo))
			
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
		# what to do with bins?
	}	
	return(toprocess)
}


calculate_stats <- function(data, df, globals, fakebinlist = c()){
	#Remove empty bottom row if it exists
	if(is.na(df$Variable[nrow(df)])){
		df <- df[1:(nrow(df) -1 ), ]
	}
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
	
	toprocess <- enforce_constraints(data, df)
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
		
		if(stat == "Mean"){
			#call mean function on this Variable, etc.
			range <- abs(up - lo)
			
			if(is.null(stats[[att]])){
				stats[[att]] <- list("mean"=NA,"cdf"=c(), "histogram"=c())
			}
			
			 released_mean <- Mean.release(e, d, toprocess[ , col], range)
			 stats[[att]]$mean <- released_mean
			 Releases <- c(Releases, toString(released_mean))
			
		}
		
		else if(stat == "Quantile"){
			#call quantile function
			#what to put as cdfstep? Some values lead to bad output
			range <- abs(up - lo)
			#cdfstep <- round(range/100)		
			cdfstep <- gr
			if(is.null(stats[[att]])){
				stats[[att]] <- list("mean"=NA,"cdf"=c(), "histogram"=c())
			}
			released_quantile <- Quantile.release(e, cdfstep, toprocess[ , col], c(lo, up), gr)	
			stats[[att]]$cdf <- 	released_quantile
			Releases <- c(Releases, toString(released_quantile))
		}
		
		else if(stat == "Histogram"){
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
		
		else if(stat == "CDF"){
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






