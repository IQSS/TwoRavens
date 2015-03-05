##
##  rooktransform.R
##
##  3/3/15
##



transform.app <- function(env){

    production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development

    if(production){
        sink(file = stderr(), type = "output")
    }

    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))
    
    everything <- jsonlite::fromJSON(request$POST()$solaJSON)
    print(everything)
    
    warning<-FALSE
    
    if(!warning){
        if(production){
            mydata <- readData(sessionid=everything$zsessionid)
        }else{
            #mydata <- read.delim("../data/session_affinity_scores_un_67_02132013-cow.tab")
            mydata <- read.delim("../data/fearonLaitin.tsv")
            #mydata <- read.delim("../data/QualOfGovt.tsv")
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
		myT <- everything$transform
        if(is.null(myT)){
            warning<-TRUE
            result<-list(warning="Invalid transformation.")
        }
	}

    if(!warning){
        history <- everything$callHistory
        if(is.null(history)){
            warning<-TRUE
            result<-list(warning="callHistory is null.")
        }
    }
    
    if(!warning) {
        tryCatch(
        {
            ## 1. prepare mydata so that it is identical to the representation of the data in TwoRavens
            mydata <- executeHistory(history=history, data=mydata)
            
            ## 2. make the current transformation
            tdata <- parseTransform(data=mydata, func=myT, vars=myvars)
            call<-colnames(tdata)
            sumstats <- calcSumStats(tdata)
        
        # preprocess just one variable
        colnames(tdata) <- call
        purl <- pCall(data=tdata, production)
        result<- jsonlite:::toJSON(list(sumStats=sumstats, call=call, url=purl, trans=c(myvars,myT)))
        },
        error=function(err){
            warning <<- TRUE
            result <- list(warning=paste("Transformation error: ", err))
            result<-jsonlite:::toJSON(result)
            assign("result", result, envir=globalenv())
        },
        warning=function(err){ # for zelig.app, warnings are ignored.  here, factor^2 produces a warning, and we don't want to ignore that...
            warning <- TRUE
            result <- list(warning=paste("Transformation warning: ", err))
            result<-jsonlite:::toJSON(result)
            assign("result", result, envir=globalenv())
        })
    }
    
    print(result)
    if(production){
        sink()
    }
    response$write(result)
    response$finish()
}

