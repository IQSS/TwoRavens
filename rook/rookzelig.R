##
##  rookzelig.r
##
##  3/3/15
##


zelig.app <- function(env){
    
    production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development
    
    
    if(production){
        sink(file = stderr(), type = "output")
    }
    
    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))
    
        
    everything <- jsonlite::fromJSON(request$POST()$solaJSON)
    

    print(everything)

    warning<-FALSE  # Probably should replace cumbersome "warning" flag with terminate function, or while/break
    result <-list()

	if(!warning){
		mydv <- everything$zdv
        if(length(mydv) == 0){
			warning <- TRUE
			result<-list(warning="No dependent variable selected.")
		}
        if(length(mydv) > 1){
			warning <- TRUE
			result<-list(warning="Too many dependent variable selected.")
		}
	}

	if(!warning){
		mymodel <- everything$zmodel
		if(identical(mymodel,"")){
			warning <- TRUE
			result<-list(warning="No model selected.")
		}
	}
    
	if(!warning){
		mymodelcount <- everything$zmodelcount
		if(identical(mymodelcount,"")){
			warning <- TRUE
			result<-list(warning="No model count.")
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
		mysetx <- everything$zsetx
        myvars <- everything$zvars
        setxCall <- buildSetx(mysetx, myvars)
	}

	if(!warning){
        myedges<-everything$zedges
        print(myedges)
        ## Format seems to have changed:
        #		myedges<-edgeReformat(everything$zedges)
		#if(is.null(myedges)){
		#	warning <- TRUE
		#	result<-list(warning="Problem creating edges.")
		#}
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
            write(deparse(bquote(mydata<-read.delim(file=.(paste("data_",mysessionid,".tab",sep=""))))),mylogfile,append=TRUE)
        }else{
            # This is the Strezhnev Voeten data:
            #   		mydata <- read.delim("../data/session_affinity_scores_un_67_02132013-cow.tab")
            # This is the Fearon Laitin data:
            mydata <- read.delim("../data/fearonLaitin.tsv")
            write("mydata <- read.delim(\"../data/fearonLaitin.tsv\")",mylogfile,append=TRUE)
            #mydata <- read.delim("../data/QualOfGovt.tsv")
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
        history <- everything$callHistory
        
        t<-jsonlite::toJSON(history)
        write(deparse(bquote(history<-jsonlite::fromJSON(.(t)))),mylogfile,append=TRUE)
        
        if(is.null(history)){
            warning<-TRUE
            result<-list(warning="callHistory is null.")
        }
    }

	if(!warning){
        mynoms <- everything$znom
		myformula <- buildFormula(dv=mydv, linkagelist=myedges, varnames=NULL, nomvars=mynoms) #names(mydata))
		if(is.null(myformula)){
			warning <- TRUE
			result<-list(warning="Problem constructing formula expression.")
		}
	}

    if(warning){
        print(warning)
        print(result)
    }

	if(!warning){
		print(myformula)
        print(setxCall)
      
        tryCatch({
          
          ## 1. prepare mydata so that it is identical to the representation of the data in TwoRavens
          mydata <- executeHistory(data=mydata, history=history)
          write("mydata <- executeHistory(data=mydata, history=history)",mylogfile,append=TRUE)
          
          ## 2. additional subset of the data in the event that a user wants to estimate a model on the subset, but hasn't "selected" on the subset. that is, just brushed the region, does not press "Select", and presses "Estimate"
          usedata <- subsetData(data=mydata, sub=mysubset, varnames=myvars, plot=myplot)
          usedata <- refactor(usedata) # when data is subset, factors levels do not update, and this causes an error in zelig's setx(). refactor() is a quick fix
          write("usedata <- subsetData(data=mydata, sub=mysubset, varnames=myvars, plot=myplot)",mylogfile,append=TRUE)
          write("usedata <- refactor(usedata))",mylogfile,append=TRUE)
          
          ## VJD: Zelig5 handles missingness, no?
          # Here is present dealing with missing data
          # listwise deletion on variables in the formula
          usevars<-all.vars(myformula)
          missmap<-!is.na(usedata[,usevars])
          isobserved<-apply(missmap,1,all)
          usedata<<-usedata[isobserved,]
          print(dim(usedata))

            z.out <- zelig(formula=myformula, model=mymodel, data=usedata)   # maybe just pass variables being used?
            almostCall<-paste(mymodel,"( ",deparse(myformula)," )",sep="")
            write("z.out <- zelig(formula=myformula, model=mymodel, data=usedata)",mylogfile,append=TRUE)

            print(summary(z.out))

            eval(parse(text=setxCall[1]))   #x.out <- setx(z.out, covariates...)
            write(deparse(bquote(eval(parse(text=.(setxCall[1]))))),mylogfile,append=TRUE)

            if(length(setxCall)==2) { #if exists: x.alt <- setx(z.out, covariates...)
                eval(parse(text=setxCall[2]))
                write(deparse(bquote(eval(parse(text=.(setxCall[2]))))),mylogfile,append=TRUE)
            }
            if(length(setxCall)==1) { # there is no x.alt
                print(x.out)
                print(setxCall)
                s.out <- sim(z.out, x=x.out)
                write("s.out <- sim(z.out, x=x.out)",mylogfile,append=TRUE)
            } else {
                print(x.out)
                s.out <- sim(z.out, x=x.out, x1=x.alt)
                write("s.out <- sim(z.out, x=x.out, x1=x.alt)",mylogfile,append=TRUE)
            }
            
            if(production){
                plotpath <- "png(file.path(\"/var/www/html/custom/pic_dir\", paste(mysessionid,\"_\",mymodelcount,qicount,\".png\",sep=\"\")))"
            }else{
                plotpath <- "png(file.path(getwd(), paste(\"output\",mymodelcount,qicount,\".png\",sep=\"\")))"
            }
            
            # zplots() recreates Zelig plots
            images <- zplots(s.out, plotpath, mymodelcount, mysessionid)
            write("plot(s.out)",mylogfile,append=TRUE)

            if(length(images)>0){
                names(images)<-paste("output",1:length(images),sep="")
                result<-list(images=images, call=almostCall)
            }else{
                warning<-TRUE
                result<-list(warning="There are no Zelig output graphs to show.")
            }
        },
        error=function(err){
            warning <<- TRUE ## assign up the scope bc inside function
            result <<- list(warning=paste("Zelig error: ", err))
        })
	}


    #response$headers("localhost:8888")
    
    #add the summary table to the results
    # R can't construct an array of lists...
    # NOTE: this will likely change for Zelig 5
    #      rm(list=ls())
    #           mydata <- read.delim("../data/fearonLaitin.tsv")
    #mydata <- mydata[which(mydata$ccode>423),]
    #mydata$country <- factor(mydata$country)
    #  z.out <- zelig(ccode~country, model="ls", data=mydata)
    #x.out <- setx(z.out)
    #s.out <- sim(z.out, x.out)
    
    # putting factor(var) in the formula fails with Zelig4
    # adding a factor variable to the data, or coercing variable to be a factor, works
    # rm(list=ls())
    #mydata <- read.delim("../data/fearonLaitin.tsv")
    #mydata <- mydata[,c("war", "lpop", "region")]
    #mydata <- na.omit(mydata)
    #mydata$fregion <- factor(mydata$region)
    #mydata$region <- as.factor(mydata$region)
    #z.out <- zelig(war~lpop + factor(region), model="logit", data=mydata)
    #x.out <- setx(z.out)
    #s.out <- sim(z.out, x.out) # fail
    
    #mydata <- read.delim("../data/fearonLaitin.tsv")
    #mydata <- mydata[,c("war", "lpop")]
    #mydata <- na.omit(mydata)
    #z.out <- zelig(war~lpop, model="logit", data=mydata)
    #x.out <- setx(z.out)
    #s.out <- sim(z.out, x.out) # fail
    
    #  z.out <- zelig(war~aim+lpop+ccode, model="logit", data=mydata)
    #  imageVector <- "image"
    #  almostCall <- "call"
    #  result<-list(images=imageVector, call=almostCall)


    ## NOTE: z.out not guaranteed to exist, if some warning is tripped above.
    if(!warning){

        summaryMatrix <- summary(z.out$zelig.out$z.out[[1]])$coefficients
        
        sumColName <- c(" ", "Estimate", "SE", "t-value", "Pr(<|t|)")
        sumInfo <- list(colnames=sumColName)
    
        sumRowName <- row.names(summaryMatrix)
        row.names(summaryMatrix) <- NULL # this makes remaining parsing cleaner
        colnames(summaryMatrix) <- NULL
    
        for (i in 1:nrow(summaryMatrix)) {
            assign(paste("row", i, sep = ""), c(sumRowName[i],summaryMatrix[i,]))
            assign("sumInfo", c(sumInfo, list(eval(parse(text=paste("row",i,sep=""))))))
        }
        sumMat <- list(sumInfo=sumInfo)
    
        result<- jsonlite:::toJSON(c(result,sumMat))   # rjson does not format json correctly for a list of lists
    }else{
        result<-jsonlite:::toJSON(result)
    }
    
    print(result)
    if(production){
        sink()
    }
    response$write(result)
    response$finish()
    
}


