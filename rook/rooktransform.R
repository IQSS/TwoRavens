##
##  rooktransform.R
##
##  3/3/15
##



transform.app <- function(env){

    production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development
    warning<-FALSE

    if(production){
        sink(file = stderr(), type = "output")
    }

    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))
    
    valid <- jsonlite::validate(request$POST()$solaJSON)
    print(valid)
    if(!valid) {
        warning <- TRUE
        result <- list(warning="The request is not valid json. Check for special characters.")
    }
    
    if(!warning) {
        everything <- jsonlite::fromJSON(request$POST()$solaJSON)
        print(everything)
    }
    
    if(!warning){
        mysessionid <- everything$zsessionid
        mylogfile<-logFile(mysessionid, production)
        if(mysessionid==""){
            warning <- TRUE
            result <- list(warning="No session id.")
        }
    }
    
    if(!warning){
        if(production){
            mydata <- readData(sessionid=mysessionid,logfile=mylogfile)
        }else{
            #mydata <- read.delim("../data/session_affinity_scores_un_67_02132013-cow.tab")
            mydata <- read.delim("../data/fearonLaitin.tsv")
            #mydata <- read.delim("../data/FL_insurance_sample.tab.tsv")
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
        history <- everything$callHistory
        if(is.null(history)){
            warning<-TRUE
            result<-list(warning="callHistory is null.")
        }
    }
    
    if(!warning){
        typeTransform <- everything$typeTransform
        if(!is.logical(typeTransform)){
            warning<-TRUE
            result<-list(warning="typeTransform must be a logical.")
        }
    }
    
    if(!warning){
		myT <- everything$transform
        if(is.null(myT) & !typeTransform){
            warning<-TRUE
            result<-list(warning="Invalid transformation.")
        }
	}
    
    if(!warning){
        typeStuff <- everything$typeStuff
        if(!is.list(typeStuff) | (is.null(typeStuff$varnames) | is.null(typeStuff$interval) | is.null(typeStuff$numchar) | is.null(typeStuff$nature) | is.null(typeStuff$binary))){
            warning<-TRUE
            result<-list(warning="typeStuff is not a list or one of the necessary elements---varnames, interval, numchar, nature, binary---is null.")
        }
    }
    
    # transforming a variable's type
    if(!warning & typeTransform) {
        tryCatch(
        {
            ## 1. prepare mydata so that it is identical to the representation of the data in TwoRavens
            mydata <- executeHistory(history=history, data=mydata)
            
            ## 2. calculate summary statistics
            tdata <- as.data.frame(mydata[,myvars])
            colnames(tdata) <- myvars
            print(class(tdata))
            
            # preprocess just one variable
            purl <- pCall(data=tdata, production, sessionid=mysessionid, types=typeStuff)
            result<- jsonlite:::toJSON(list(url=purl, typeTransform=typeTransform))
        },
        error=function(err){
            warning <<- TRUE
            result <- list(warning=paste("Transformation error: ", err))
            result<-jsonlite:::toJSON(result)
            assign("result", result, envir=globalenv())
        },
        warning=function(err){ # for zelig.app, warnings are ignored.  here, factor^2 produces a warning, and we don't want to ignore that...
            warning <<- TRUE
            result <- list(warning=paste("Transformation warning: ", err))
            result<-jsonlite:::toJSON(result)
            assign("result", result, envir=globalenv())
        })
    }
    
    # creating a new variable with a transformation function
    if(!warning & !typeTransform) {
        tryCatch(
        {
            ## 1. prepare mydata so that it is identical to the representation of the data in TwoRavens
            mydata <- executeHistory(history=history, data=mydata)
            
            ## 2. make the current transformation
            tdata <- parseTransform(data=mydata, func=myT, vars=myvars)
            call<-colnames(tdata)
            
            # preprocess just one variable
            colnames(tdata) <- call
            purl <- pCall(data=tdata, production, sessionid=mysessionid, types=NULL)
            result<- jsonlite:::toJSON(list(call=call, url=purl, trans=c(myvars,myT), typeTransform=typeTransform))
        },
        error=function(err){
            warning <<- TRUE
            result <- list(warning=paste("Transformation error: ", err))
            result<-jsonlite:::toJSON(result)
            assign("result", result, envir=globalenv())
        },
        warning=function(err){ # for zelig.app, warnings are ignored.  here, factor^2 produces a warning, and we don't want to ignore that...
            warning <<- TRUE
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

