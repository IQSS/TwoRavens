# This code enforces the metadata constraints given by the user and then calls all of the
# relevant DP algorithms to actually calculate the stats. 

# 12/09/14 update: This code has been modified to call stats for the general purpose and 
# is no longer the version that was tailored for the legal team demo. This will be called 
# after the user completes the table interface and clicks submit. It will return the values 
# that will overwrite the metadata in dataverse.


enforce_constraints <- function(data, df){
	#get full list of constraints
	meta <- df[,c("Variable","Statistic","UpperBound","LowerBound","Granularity","Numberofbins")]  
	meta <- unique(meta)
	
	#copy data
	toprocess <- data
	
	#implement constraints row by row
	for(i in 1:nrow(meta)){
		#gather variables
		up <- meta$UpperBound[i]
		lo <- meta$LowerBound[i]
		gr <- meta$Granularity[i]
		col <-  which(colnames(toprocess) == meta$Variable[i]) #column number in original dataset
	
		#if upper and lower bounds are filled in...
		if((!is.na(up) & up != " " & up != "na" ) & (!is.na(lo) & lo != " " & lo != "na")){
			up <- as.numeric(as.character(up))
			lo <- as.numeric(as.character(lo))
			
			#... set new upper and lower bounds of the data
			toprocess[ , col][toprocess[ , col] > up] <- up
			toprocess[ , col][toprocess[ , col] < lo] <- lo
		
			#if granularity is filled in...
			if(!is.na(gr) & gr != " " & gr != "na"){ 
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
	print(df)
	
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
		up <- as.numeric(as.character(df$UpperBound[i]))
		lo <- as.numeric(as.character(df$LowerBound[i]))
		gr <- as.numeric(as.character(df$Granularity[i]))
		bins <- as.numeric(as.character(df$Numberofbins[i]))
		col <-  which(colnames(toprocess) == df$Variable[i])
		att <- df$Variable[i]
		
		if(stat == "Mean"){
			#call mean function on this Variable, etc.
			range <- abs(up - lo)
			
			if(is.null(stats[[att]])){
				stats[[att]] <- list("mean"=NA,"cdf"=c(), "histogram"=c())
			}
			stats[[att]]$mean <- ComputeMean(e, d, toprocess[ , col], range)
			
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
			stats[[att]]$cdf <- computeCDF(e, cdfstep, toprocess[ , col], c(lo, up), gr)		
		}
		
		else if(stat == "Histogram"){
			#call histogram function
			#bins needs to be a list of names?
			
			#If using fake bin names
		'
			if(length(fakebinlist) > 0){
				binnames <- sort(c(as.numeric(unique(toprocess[ , col])), as.numeric(fakebinlist[att])))
			}
			else if(length(fakebinlist) == 0){
				binnames <- sort(as.numeric(unique(toprocess[ , col])))
			}
			'
			allbins <- sort(as.numeric(unique(toprocess[ , col])))
			hist <- histogram$release(allbins, toprocess[,col], e, d, Beta) #will have to figure out this sorting
			acc <- as.numeric(df$Accuracy[i])
			if(is.null(stats[[att]])){
				stats[[att]] <- list("mean"=NA,"cdf"=c(), "histogram"=c())
			}
			stats[[att]]$histogram <- hist
		}
		
	}


print(stats)
xml <- create_xml(stats,df,globals)
return(xml)
}






