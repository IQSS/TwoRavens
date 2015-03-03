##
##  rooksubset.r
##
##  3/3/15
##

subset.app <- function(env){
    
    production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development
    
    if(production){
        sink(file = stderr(), type = "output")
    }
    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))
    
    everything <- jsonlite::fromJSON(request$POST()$solaJSON)
    print(everything)
    
    print(class(everything$callHistory))
    
    warning<-FALSE
    
    if(!warning){
        if(production){
            mydata <- getData(dataurl=everything$zdataurl)
        }else{
            #mydata <- read.delim("../data/session_affinity_scores_un_67_02132013-cow.tab")
            mydata <- read.delim("../data/fearonLaitin.tsv")
            #mydata <- read.delim("../data/QualOfGovt.tsv")
        }
		if(is.null(mydata)){
			warning <- TRUE
			result<-list(warning="Dataset not loadable from Dataverse")
		}
	}
    
    if(!warning){
		myvars <- everything$zvars
        if(is.null(myvars)){
            warning<-TRUE
            result<-list(warning="Problem with variables.")
        }
	}
    
    if(!warning){
        mysubset <- parseSubset(everything$zsubset)
        if(is.null(mysubset)){
            warning <- TRUE
            result <- list(warning="Problem with subset.")
        }
    }
    if(!warning){
        myplot <- everything$zplot
        if(is.null(myplot)){
            warning <- TRUE
            result <- list(warning="Problem with zplot.")
        }
    }
    
    if(!warning){
        history <- everything$callHistory
        if(is.null(history)){
            warning<-TRUE
            result<-list(warning="callHistory is null.")
        }
    }
    
    #print(dim(mydata))
    #print(dim(usedata))
    
    # this tryCatch is not fully tested.
    tryCatch(
    {
        
        ## 1. prepare mydata so that it is identical to the representation of the data in TwoRavens
        mydata <- executeHistory(history=history, data=mydata)
        
        ## 2. perform current subset and out appropriate metadata
        usedata <- subsetData(data=mydata, sub=mysubset, varnames=myvars, plot=myplot)
        sumstats <- calcSumStats(usedata)
        
        call <- ""
        for(i in 1:length(myvars)) {
            if(mysubset[[i]][1]=="" | is.na(mysubset[[i]][1])) {next}
            else {
                if(call != "") {call <- paste(call, ", ", sep="")}
                if(myplot[i]=="continuous") {
                    call <- paste(call, myvars[i], "[", mysubset[[i]][1], ":", mysubset[[i]][2], "]", sep="")
                } else if(myplot[i]=="bar") {
                    call <- paste(call, myvars[i], "[", paste(mysubset[[i]], collapse=","), "]", sep="")
                }
            }
        }
    
        # send preprocess new usedata and receive url with location
        purl <- pCall(data=usedata, production)
        #purl <- "test"
        result<- jsonlite:::toJSON(c(sumstats,list(url=purl, call=call)))
    },
    error=function(err){
        warning <<- TRUE
        result <- list(warning=paste("Subset error: ", err))
        result<-jsonlite:::toJSON(result)
        assign("result", result, envir=globalenv())
    })
    
    #result <- toJSON(sumstats)
    print(result)
    if(production){
        sink()
    }
    response$write(result)
    response$finish()
}
