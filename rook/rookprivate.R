##
##  rookPrivate
##
##  Rook apps for calling differential privacy modules and updating accuracy table on ingest of private data
##
##  8/19/15 jH
##




privateStatistics.app <-function(env){
	print("Entered Submit app")
    production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development

    if(production){
        sink(file = stderr(), type = "output")
    }
    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))

    ## The names of the objects will depend on your request
    everything <- jsonlite::fromJSON(request$POST()$tableJSON)
    print(everything)

    ## Run some checking on the inputs to make valid and can go ahead
    warning<-FALSE
    message<-"nothing"

    if(!warning){
        df <- everything$df				# table as a data.frame
        fileid <- everything$fileid
        globals <- everything$globals	# dictionary of global parameters eps, del, beta
      									# and eventually n. 
        #data <- GET_THIS_FROM_DATAVERSE(fileid)
        print(data)
        metadata <- calculate_stats(data, df, globals)

        result <- jsonlite:::toJSON(metadata, digits=8)
    }else{
        result<- jsonlite:::toJSON(message)
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
	print("Entered Accuracies app")
    production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development
    
    if(production){
        sink(file = stderr(), type = "output")
    }
   
    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))
  
    ## The names of the objects will depend on your request
    everything <- jsonlite::fromJSON(request$POST()$tableJSON)
   
    print(everything)
    
    ## Run some checking on the inputs to make valid and can go ahead
    warning<-FALSE
    message<-"Something went wrong"
    
    #first check contents of everything. then unpack them
    if(is.null(everything)){
    	warning <- TRUE
    	message <- "Bad inputs"
    }
      
    df <- everything$df				# table as a data.frame
    x <- everything$x 				# number -- or row name
    y <- everything$y 				# number -- or col name
    btn <- everything$btn			# identifier of which button was last pressed
    globals <- everything$globals	# dictionary of global parameters eps, del, beta, n 
    
   if(is.null(df) || is.null(x) || is.null(y) || is.null(btn) || is.null(globals)){
   		warning <- TRUE 
   		message <- "Bad inputs"
   }
    else{  				
   		eps <- as.numeric(globals$eps)
    	del <- as.numeric(globals$del)
    	beta <- as.numeric(globals$beta)
    	n <- as.numeric(globals$n)										
   }
    
   	
	if(!warning){    
	    if(is.na(n) || n<=0 || n%%1 !=0){
	 		warning <- TRUE
	 		message <- "Invalid number of people in dataset"
	 	}
	 	
	    if(is.na(eps)){
	    	warning <- TRUE
	    	message <- "Epsilon must be a number"
	    } 
	    else if(eps <=0 || eps > 5){
	    	warning <- TRUE
	    	message <- "Epsilon out of range"
	    }
	    
	    if(is.na(del)){
	    	warning <- TRUE
	    	message <- "Delta must be a number"
	    }
	    
	    else if(del <=0 || del > .1){   #should we allow del=0? Choose upper bound.
	    	warning <- TRUE
	    	message <- "Delta out of range"
	    }
	    
	    if(is.na(beta)){
	    	warning <- TRUE
	    	message <- "Beta must be a number"
	    }
	 
	 	else if(beta <=0 || beta > .5){
	 		warning <- TRUE
	    	message <- "Beta out of range"
	 	}
	} 	
 	
 	
    checkRow <- function(row){
    	st <- row$Statistic
		rowName <- row.names(row)
		acc <- row$Accuracy
		
		#Accuracy can be blank if epsilon has not been assigned yet
		if(!is.numeric(acc) && is.numeric(row$Epsilon)){
			warning <- TRUE
			message <- paste("In row",rowName,"Accuracy must be numeric")
		}
		
    	else if(is.null(st)){
    		warning <- TRUE
    		message <- paste("In row",rowName,"no statistic selected")
    	}
    	
        else if(st == "Histogram"){
    		bins <- as.numeric(row$Numberofbins)
    		if(is.na(bins) || bins%%1 !=0 || bins <=0){
    			warning <- TRUE
    			message <- paste("In row", rowName,"invalid number of bins.")
    		}	
    	}
    	
    	else if(st == "Mean"){
    		up <- as.numeric(row$UpperBound)
    		lo <- as.numeric(row$LowerBound)
    		
    		if(is.na(up) || is.na(lo)){
    			warning <- TRUE
    			message <- paste("In row",rowName,"upper and lower bounds must be numbers")
    		} 
    		else if(up < lo){
    			warning <- TRUE
    			message <- paste("In row",rowName,"upper bound must be greater than lower bound")
    		}
    	}
    	
    	else if (st == "Quantile"){
    		up <- as.numeric(row$UpperBound)
    		lo <- as.numeric(row$LowerBound)
    		gran <- as.numeric(row$Granularity)
    		if(is.na(up) || is.na(lo) || is.na(gran)){
    			warning <- TRUE
    			message <- paste("In row",rowName,"upper and lower bounds and granularity must be numbers")
    		} 
    		else if(up < lo){
    			warning <- TRUE
    			message <- paste("In row",rowName,"upper bound must be greater than lower bound")
    		}
    		else if(gran >= (up - lo) || gran <=0){
    			warning <- TRUE
    			message <- paste("In row",rowName,"invalid granularity")
    		}
    		
    	}
    	if(!warning){
    		return("good")
    	}
    	else{
    		return(message)
    	}
      }
    
    
 if(!warning){   
   # for(row in 1:nrow(df)){  # unblock to check every row. Can just check edited row
  
    	if(x != 0 && !is.na(df$Variable[x])){
    		output <- checkRow(df[x,])
    		if(output != "good"){
    			warning <- TRUE
    			message <- output
    		}
    	}
 	 #} 
  }
    
    
    

    ## Here is the actual function of the app
    
    if(!warning){
        prd <- GUI(df,x,y,btn,globals)
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



