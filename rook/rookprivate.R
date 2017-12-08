##
##  rookPrivate
##
##  Rook apps for calling differential privacy modules and updating accuracy table on ingest of private data
##  Initialized by rookSetup in development mode.  In production, called by TwoRaven's rApache.
##
##  12/11/14 jH
##


privateStatistics.app <-function(env){
    production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development
    if(production){
        sink(file = stderr(), type = "output")
    }

    print("Entered privateStatistics app")
    
    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))

    ## Run some checking on the inputs to make certain values are valid and release can go ahead
    warning <- FALSE
    message <- "nothing"
    
    valid <- jsonlite::validate(request$POST()$tableJSON)
    print(valid)

    ## Check the POST sent to the app appears to be valid JSON
    if(!valid) {
        warning <- TRUE
        message <- "The request is not valid json. Check for special characters."
    }
    
    ## Translate the JSON into R types
    if(!warning) {
        everything <- jsonlite::fromJSON(request$POST()$tableJSON)
        print(everything)

        # Unpack JSON into component parts
        dict <- everything$dict
        indices <- everything$indices
        stats <- everything$stats
        metadata <- everything$metadata
        globals <- everything$globals
        fileid <- everything$fileid
        transforms <- everything$transforms
    }

    ## Check the epsilons budgeted for the statistics come under the global epsilon
    compositioncheckready <- FALSE
	if(!warning & compositioncheckready){
		warning <- TRUE
		message <- "The individual epsilons budgeted across the list of statistics do not collectively compose below the global epsilon."
	}

    ## Get dataset from Dataverse
    ## Compare to data.app in TwoRavens and decide if this could be done more robustly
    if(!warning){

        # file id supplied; we are going to assume that we are dealing with
        # a dataverse and cook a standard dataverse data access url,
        # with the fileid supplied and the hostname we have
        # either supplied or configured:

        dataurl <- paste("https://beta.dataverse.org/api/access/datafile/", fileid, sep="")
        # Might need to investigate adding an apikey:
        #dataurl = dataurl+"?key="+apikey;
 
        # This to write locally
        # data <- download.file(dataurl, destfile = "\tmp\test.tab", method="curl", extra=c("--insecure"))

        ## This is simplest, but fragile
        # We use colClasses="character" to make sure there's no funny business with type conversion.
        # This means we should be careful later whenever we do type conversion
        # (character to logical doesn't work well!) See permissiveAsLogical in Calculate_stats.R.
        #block below when beta is down:
        # data <- tryCatch({ read.table(dataurl, header=TRUE, sep="\t", colClasses="character") }
                # , error=function(e) return(NA))
        # if(is.na(data)) {
            # warning <- TRUE
            # message <- "There was an internal error downloading or processing the data from Dataverse. Please report this error if it persists."
        # }
    }    

	#use below when beta is down
	data <- read.csv("../../data/PUMS5extract10000.csv")
    ## Generate differentially private values and return released statistics as JSON
    if(!warning){
        cat("data successfully downloaded from Dataverse \n")
        print(data[1:5,])
        cat("---------------- \n")

        

        df <- convert(dict, indices, stats, metadata)
        cat("Cleared table conversion \n")

        if(!is.null(transforms)) {
            verify <- verifyTransform(transforms, names(data))
            if(!verify$success) {
                warning <- TRUE
                message <- paste("Malformed transformation:", verify$message)
            } else {
                dataOrMessage <- applyTransform(transforms, data)
                if("data" %in% names(dataOrMessage)) {
                    data <- dataOrMessage$data
                }
                else {
                    warning <- TRUE
                    message <- dataOrMessage$message
                }
            }
        }
    }
    print("printing after transformation")
    print(head(data))
    
 #blocked below to use library instead of enforce_constraints
 # '
    # if(!warning){
        # dataOrMessage <- enforce_constraints(data, df) 
        # if("data" %in% names(dataOrMessage)) {
            # data <- dataOrMessage$data
        # }
        # else {
            # warning <- TRUE
            # message <- dataOrMessage$message
        # }
    # }
# '
    if(!warning) {
        #releasedMetadata <- calculate_stats(data, df, globals)
        releasedMetadata <- calculate_stats_with_PSIlence(data,df,globals)
        cat("Cleared release function \n")

        result <- jsonlite:::toJSON(releasedMetadata, digits=8)
        cat("Cleared JSON conversion \n")

    }else{
        result <- jsonlite:::toJSON(list(warning=message))
    }

    print(result)
    cat("\n")
   
    if(production){
        sink()
    }

    response$write(result)
    response$finish()
}




privateAccuracies.app <- function(env){
    production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development
    
    if(production){
        sink(file = stderr(), type = "output")
    }

    print("Entered Accuracies app")
   
    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))


    ## Run some checking on the inputs to make certain values are valid and composition can go ahead
    warning <- FALSE
    message <- "nothing"
    
    valid <- jsonlite::validate(request$POST()$tableJSON)
    print(valid)

    if(!valid) {
        warning <- TRUE
        result <- list(warning="The request is not valid json. Check for special characters.")
    }
    
    if(!warning) {
        everything <- jsonlite::fromJSON(request$POST()$tableJSON)
        print(everything)
    }

    
    # #first check contents of everything. then unpack them
    # if(is.null(everything)){
    	# warning <- TRUE
    	# message <- "Bad inputs"
    # }
      
    # df <- everything$df				# table as a data.frame
    # x <- everything$x 				# number -- or row name
    # y <- everything$y 				# number -- or col name
    # btn <- everything$btn			# identifier of which button was last pressed
    # globals <- everything$globals	# dictionary of global parameters eps, del, beta, n 
    
   # if(is.null(df) || is.null(x) || is.null(y) || is.null(btn) || is.null(globals)){
   		# warning <- TRUE 
   		# message <- "Bad inputs"
   # }
    # else{  				
   		# eps <- as.numeric(globals$eps)
    	# del <- as.numeric(globals$del)
    	# beta <- as.numeric(globals$beta)
    	# n <- as.numeric(globals$n)										
   # }
    
   	
	# if(!warning){    
	    # if(is.na(n) || n<=0 || n%%1 !=0){
	 		# warning <- TRUE
	 		# message <- "Invalid number of people in dataset"
	 	# }
	 	
	    # if(is.na(eps)){
	    	# warning <- TRUE
	    	# message <- "Epsilon must be a number"
	    # } 
	    # else if(eps <=0 || eps > 5){
	    	# warning <- TRUE
	    	# message <- "Epsilon out of range"
	    # }
	    
	    # if(is.na(del)){
	    	# warning <- TRUE
	    	# message <- "Delta must be a number"
	    # }
	    
	    # else if(del <=0 || del > .1){   #should we allow del=0? Choose upper bound.
	    	# warning <- TRUE
	    	# message <- "Delta out of range"
	    # }
	    
	    # if(is.na(beta)){
	    	# warning <- TRUE
	    	# message <- "Beta must be a number"
	    # }
	 
	 	# else if(beta <=0 || beta > .5){
	 		# warning <- TRUE
	    	# message <- "Beta out of range"
	 	# }
	# } 	
 	
 	
    # checkRow <- function(row){
    	# st <- row$Statistic
		# rowName <- row.names(row)
		# acc <- row$Accuracy
		
		# #Accuracy can be blank if epsilon has not been assigned yet
		# if(!is.numeric(acc) && is.numeric(row$Epsilon)){
			# warning <- TRUE
			# message <- paste("In row",rowName,"Accuracy must be numeric")
		# }
		
    	# else if(is.null(st)){
    		# warning <- TRUE
    		# message <- paste("In row",rowName,"no statistic selected")
    	# }
    	
        # else if(st == "Histogram"){
    		# bins <- as.numeric(row$Numberofbins)
    		# if(is.na(bins) || bins%%1 !=0 || bins <=0){
    			# warning <- TRUE
    			# message <- paste("In row", rowName,"invalid number of bins.")
    		# }	
    	# }
    	
    	# else if(st == "Mean"){
    		# up <- as.numeric(row$UpperBound)
    		# lo <- as.numeric(row$LowerBound)
    		
    		# if(is.na(up) || is.na(lo)){
    			# warning <- TRUE
    			# message <- paste("In row",rowName,"upper and lower bounds must be numbers")
    		# } 
    		# else if(up < lo){
    			# warning <- TRUE
    			# message <- paste("In row",rowName,"upper bound must be greater than lower bound")
    		# }
    	# }
    	
    	# else if (st == "Quantile"){
    		# up <- as.numeric(row$UpperBound)
    		# lo <- as.numeric(row$LowerBound)
    		# gran <- as.numeric(row$Granularity)
    		# if(is.na(up) || is.na(lo) || is.na(gran)){
    			# warning <- TRUE
    			# message <- paste("In row",rowName,"upper and lower bounds and granularity must be numbers")
    		# } 
    		# else if(up < lo){
    			# warning <- TRUE
    			# message <- paste("In row",rowName,"upper bound must be greater than lower bound")
    		# }
    		# else if(gran >= (up - lo) || gran <=0){
    			# warning <- TRUE
    			# message <- paste("In row",rowName,"invalid granularity")
    		# }
    	# }

        # else if (st == "CDF"){
            # up <- as.numeric(row$UpperBound)
            # lo <- as.numeric(row$LowerBound)
            # gran <- as.numeric(row$Granularity)
            # if(is.na(up) || is.na(lo) || is.na(gran)){
                # warning <- TRUE
                # message <- paste("In row",rowName,"upper and lower bounds and granularity must be numbers")
            # } 
            # else if(up < lo){
                # warning <- TRUE
                # message <- paste("In row",rowName,"upper bound must be greater than lower bound")
            # }
            # else if(gran >= (up - lo) || gran <=0){
                # warning <- TRUE
                # message <- paste("In row",rowName,"invalid granularity")
            # }
        # }

    	# if(!warning){
    		# return("good")
    	# }
    	# else{
    		# return(message)
    	# }
      # }
    
    
 # if(!warning){   
   # # for(row in 1:nrow(df)){  # unblock to check every row. Can just check edited row
  
    	# if(x != 0 && !is.na(df$Variable[x])){
    		# output <- checkRow(df[x,])
    		# if(output != "good"){
    			# warning <- TRUE
    			# message <- output
    		# }
    	# }
 	 # #} 
  # }
    
   
    

    ## Here is the actual function of the app
    
    if(!warning){
    	### JM for small example
    	dict <- everything$dict
    	indices <- everything$indices
    	# uncomment the next lines when the front end passes all the relevant info:
    	stats <- everything$stats
    	metadata <- everything$metadata
    	globals <- everything$globals
    	 action <- everything$action
    	 var <- everything$var
    	 stat <- everything$stat
    	 prd <- callGUI(dict, indices, stats, metadata, globals, action, var, stat)
    
    	#prd <- callGUI(dict, indices)
    	### end JM for small example 
       # prd <- GUI(df,x,y,btn,globals) #JM 8/3
      
        #test if prd returned an error
        if(class(prd) == "character"){
        	toSend <- list("error"="T", "message"=prd)
        	result<- jsonlite:::toJSON(toSend)
        }
        else{
       	 	toSend <- list("error"="F", "prd"=prd)
        	result<- jsonlite:::toJSON(toSend, digits=8)     # rjson does not format json correctly for a list of lists
        }
    }
    else{
    	toSend <- list("error"="T", "message"=message)
    	result <- jsonlite:::toJSON(toSend)
    	}
    
    print(result)
    cat("\n")
    if(production){
        sink()
    }
    response$write(result)
    response$finish()   
}



# Other useful commands (see also "myrookrestart.R"):
#R.server$browse("myrookapp")
#R.server$stop()
#R.server$remove(all=TRUE)
