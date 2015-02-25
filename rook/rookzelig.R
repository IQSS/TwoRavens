##
##  rookzelig.r
##
##  25/2/14
##



production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development

if(!production){
   packageList<-c("Zelig","Rook","jsonlite","rjson")

   ## install missing packages, and update if newer version available
   for(i in 1:length(packageList)){
       if (!require(packageList[i],character.only = TRUE)){
           if(packageList[i]=="Zelig") {
               install.packages("Zelig", type="source", repos="http://r.iq.harvard.edu")
               next
           }
           install.packages(packageList[i], repos="http://lib.stat.cmu.edu/R/CRAN/")
       }
   }
   update.packages(ask = FALSE, dependencies = c('Suggests'), oldPkgs=packageList, repos="http://lib.stat.cmu.edu/R/CRAN/")
}

# check to make sure we have Zelig 5 installed, if not, install Zelig 5 from r.iq
if(package_version(packageVersion("Zelig"))$major != 5) {
    install.packages("Zelig", type="source", repos="http://r.iq.harvard.edu")
}

#!/usr/bin/env Rscript

library(Rook)
library(Zelig)
library(rjson)
library(jsonlite)
source(paste(getwd(),"/preprocess/preprocess.R",sep="")) # load preprocess function

if(!production){
    myPort <- "8000"
    myInterface <- "0.0.0.0"
    #myInterface <- "127.0.0.1"
    #myInterface <- "140.247.0.42"
    status <- -1
    status<-.Call(tools:::startHTTPD, myInterface, myPort)


    if( status!=0 ){
        print("WARNING: Error setting interface or port")
        stop()
    }   #else{
    #    unlockBinding("httpdPort", environment(tools:::startDynamicHelp))
    #    assign("httpdPort", myPort, environment(tools:::startDynamicHelp))
    #}

    ## maybe something like this gets around the access-control limits of CRAN?
    #R.server$add(name = "solafide", app = "/Users/vjdorazio/Desktop/github/ZeligGUI/ZeligGUI/app_ddi.js") ...but not an app...

    R.server <- Rhttpd$new()


    cat("Type:", typeof(R.server), "Class:", class(R.server))
    R.server$add(app = File$new(getwd()), name = "pic_dir")
    print(R.server)

    # vjd: added port=myPort
    R.server$start(listen=myInterface, port=myPort)
    R.server$listenAddr <- myInterface
    R.server$listenPort <- myPort

}

zelig.app <- function(env){
    
    production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development
    
    
    if(production){
        sink(file = stderr(), type = "output")
    }
    
    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))
print("HERE")
    everything <- jsonlite::fromJSON(request$POST()$solaJSON)
    print(everything)

    warning<-FALSE  # Probably should replace cumbersome "warning" flag with terminate function, or while/break

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
        if(production){
            mydata <- getData(dataurl=everything$zdataurl)
        }else{
            # This is the Strezhnev Voeten data:
            #   		mydata <- read.delim("../data/session_affinity_scores_un_67_02132013-cow.tab")
            # This is the Fearon Laitin data:
            mydata <- read.delim("../data/fearonLaitin.tsv")
            #mydata <- read.delim("../data/QualOfGovt.tsv")
        }
		if(is.null(mydata)){
			warning <- TRUE
			result<-list(warning="Dataset not loadable from Dataverse")
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
          
          ## 2. additional subset of the data in the event that a user wants to estimate a model on the subset, but hasn't "selected" on the subset. that is, just brushed the region, does not press "Select", and presses "Estimate"
          usedata <- subsetData(data=mydata, sub=mysubset, varnames=myvars, plot=myplot)
          usedata <- refactor(usedata) # when data is subset, factors levels do not update, and this causes an error in zelig's setx(). refactor() is a quick fix
          
          # Here is present dealing with missing data
          # listwise deletion on variables in the formula
          usevars<-all.vars(myformula)
          missmap<-!is.na(usedata[,usevars])
          isobserved<-apply(missmap,1,all)
          usedata<<-usedata[isobserved,]
          print(dim(usedata))

            z.out <- zelig(formula=myformula, model=mymodel, data=usedata)   # maybe just pass variables being used?
            almostCall<-paste(mymodel,"( ",deparse(myformula)," )",sep="")

            print(summary(z.out))
            assign("z.out", z.out, envir=globalenv())  # Zelig4 Error with Environments
        
            eval(parse(text=setxCall[1]))   #x.out <- setx(z.out, covariates...)
            assign("x.out", x.out, envir=globalenv())  # Zelig4 Error with Environments
        
            if(length(setxCall)==2) { #if exists: x.alt <- setx(z.out, covariates...)
                eval(parse(text=setxCall[2]))
                assign("x.alt", x.alt, envir=globalenv())  # Zelig4 Error with Environments
            }
        
            if(length(setxCall)==1) { # there is no x.alt
                print(x.out)
                s.out <- sim(z.out, x=x.out)
            }
            else {
                s.out <- sim(z.out, x=x.out, x1=x.alt)
            }
            assign("s.out", s.out, envir=globalenv())  # Zelig4 Error with Environments
            qicount<-0
            imageVector<-list()
            for(i in 1:length(s.out$qi)){
                if(!is.na(s.out$qi[[i]][1])){       # Should find better way of determining if empty
                    qicount<-qicount+1
                    if(production){
                        mypath<-"/var/www/html/custom/pic_dir"
                        png(file.path(mypath, paste("output",mymodelcount,qicount,".png",sep="")))
                    }else{
                        png(file.path(getwd(), paste("output",mymodelcount,qicount,".png",sep="")))
                    }
                    Zelig:::simulations.plot(s.out$qi[[i]], main=names(s.out$qi)[i])  #from the Zelig library
                    dev.off()
                    if(production){
                        imageVector[[qicount]]<-paste("http://dataverse-demo.iq.harvard.edu:8008/custom/pic_dir", "/output",mymodelcount,qicount,".png", sep = "")
                    }else{
                        imageVector[[qicount]]<-paste(R.server$full_url("pic_dir"), "/output",mymodelcount,qicount,".png", sep = "")
                    }
                }
            }

            if(qicount>0){
                names(imageVector)<-paste("output",1:length(imageVector),sep="")
                result<-list(images=imageVector, call=almostCall)
                assign("result", result, envir=globalenv())
                #names(result)<-paste("output",1:length(result),sep="")
            }else{
                warning<-TRUE
                result<-list(warning="There are no Zelig output graphs to show.")
                assign("result", result, envir=globalenv())
            }
        },
        error=function(err){
            warning <<- TRUE ## assign up the scope
            result <- list(warning=paste("Zelig error: ", err))
            assign("result", result, envir=globalenv())
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
    
    #  z.out <- zelig(war~aim+lpop+ccode, model="logit", data=mydata)
    #  imageVector <- "image"
    #  almostCall <- "call"
    #  result<-list(images=imageVector, call=almostCall)


    ## NOTE: z.out not guaranteed to exist, if some warning is tripped above.
    if(!warning){
        summaryMatrix <- summary(z.out)$coefficients
        # sumColName <- c(" ",colnames(summaryMatrix))
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


# Presently unused attempt at a termination function so as to streamline code for warnings
terminate<-function(response,warning){
	jsonWarning <- toJSON(list(warning=warning))
    print(jsonWarning)
    response$write(jsonWarning)
    response$finish()
    stop()
}

getData<-function(dataurl){
    # We discovered that R's read.delim() method does not work with https URLs. 
    # So I worked around it with the hack below - I first download the tab-delimited file and 
    # save it locally, using download.file() method; then read the local file with read.delim. 
    # If anyone knows of a prettier way of doing this - please change it accordingly... 
    # -- L.A. 
    #mydata<-tryCatch(expr=read.delim(file=dataurl), error=function(e) NULL)  # if data is not readable, NULL
    tryCatch(expr=download.file(dataurl,destfile = "/tmp/temp.tab",method="curl"), error=function(e) NULL) # if the url is not readable, NULL
    mydata<-tryCatch(expr=read.delim(file="/tmp/temp.tab"), error=function(e) NULL)  # if data is not readable, NULL
    return(mydata)
}

getDataFromDataverse<-function(hostname, fileid){
    path<-paste("http://",hostname,"/api/access/datafile/",fileid,sep="")
    mydata<-tryCatch(expr=read.delim(file=path), error=function(e) NULL)  # if data is not readable, NULL
    return(mydata)
}

# quick way to reassign factor levels in the data, necessary for setx() after data have been subset
refactor <- function(data) {
    for(i in 1:ncol(data)) {
        if(is.factor(data[,i])) {
            data[,i] <- factor(data[,i])
        }
    }
    return(data)
}

# This utility function was necessary when using rjson, rather than jsonlite, to transform list-of-lists to matrix
#
#edgeReformat<-function(edges){
#	k<-length(edges)
#	new<-matrix(NA,nrow=k,ncol=2)
#	for(i in 1:k){
#		new[i,1]<-edges[[i]][1]
#		new[i,2]<-edges[[i]][2]
#	}
#    return(new)
#}





buildSetx <- function(setx, varnames) {
    outeq <- NULL
    alteq <- NULL
    call <- NULL
    j<-1
    k<-1
    
    for(i in 1:length(varnames)){
        t <- setx[i,]       # under rjson was: unlist(setx[i])
        if(t[1]=="" & t[2]=="") {next}
        if(t[1]!="") {
            outeq[j] <- paste(varnames[i],"=as.numeric(",t[1],")")
            j<-j+1
        }
        if(t[2]!="") {
            alteq[k] <- paste(varnames[i],"=as.numeric(",t[2],")")
            k<-k+1
        }
    }
    
    if(!is.null(outeq)) { # x has been set by user
        outeq <- paste(outeq, collapse=",")
        call[1] <- paste("x.out <- setx(z.out,",outeq,")")
    } else { # x has not been set by user, use defaults
        call[1] <- paste("x.out <- setx(z.out)")
    }
    if(!is.null(alteq)) { # x1 has been set by user
        alteq <- paste(alteq, collapse=",")
        call[2] <- paste("x.alt <- setx(z.out,",alteq,")")
    } else if(!is.null(outeq)) { # x1 has not been set by user, but x has been set, so use defaults
        call[2] <- paste("x.alt <- setx(z.out)")
    }
    # else user has not set any covariates, so x is default (above) and x1 is undefined
        
    return(call)
}

buildFormula<-function(dv, linkagelist, varnames=NULL, nomvars){
    
    if(is.null(varnames)){
    	varnames<-unique(c(dv,linkagelist))
    }
    print(varnames)

    k<-length(varnames)
    relmat<-matrix(0,nrow=k,ncol=k)
    
    
    # define relationship matrix
    # relmat[i,j]==1 => "i caused by j"
    
    print(linkagelist)
    print(nrow(linkagelist))

    for(i in 1:nrow(linkagelist)){
        row.position<-min( (1:k)[varnames %in% linkagelist[i,2] ] )  # min() solves ties with shared variable names
        col.position<-min( (1:k)[varnames %in% linkagelist[i,1] ] )
        relmat[row.position,col.position]<-1
    }


    print(relmat)

    # store matrix contains all backwards linked variables
    store<-relmat.n<-relmat

    continue<-TRUE
    while(continue){
      	relmat.n<-relmat.n %*% relmat
      	relmat.n[store==1]<-0   # stops following previously traced path
      	relmat.n[relmat.n>1]<-1 # converts to boolean indicator matrix 
      	store<-store + relmat.n # trace all long run paths
      	store[store>1]<-1       # converts to boolean indicator matrix
      	continue<-(sum(relmat.n)>0)  # no new paths to trace
    }
    
    j<-min( (1:k)[varnames %in% dv ] )
    rhsIndicator<-store[j,]  # these are the variables that have a path to dv
    rhsIndicator[j]<-0       # do not want dv as its own rhs variable
    flag<-rhsIndicator==1    
    rhs.names<-varnames[flag]
    rhs.names[which(rhs.names %in% nomvars)] <- paste("factor(", rhs.names[which(rhs.names %in% nomvars)], ")", sep="") # nominal variables are entered into the formula as factors
    formula<-as.formula(paste(dv," ~ ", paste(rhs.names,collapse=" + ")))

    print(formula)

    return(formula)
}

## VJD: note that this skips all factor and character classes
calcSumStats <- function(data) {

    medians <- sapply(data, function(x) {
      if(is.factor(x) | is.character(x)) return(NA)
      else return(median(x, na.rm=TRUE))
    })
    means <- sapply(data, function(x) {
        if(is.factor(x) | is.character(x)) return(NA)
        else return(mean(x, na.rm=TRUE))
    })
    modes <- sapply(data, function(x) {
        if(is.factor(x) | is.character(x)) return(NA)
        else return(Mode(x))
    })
    maxs <- sapply(data, function(x) {
        if(is.factor(x) | is.character(x)) return(NA)
        else return(max(x, na.rm=TRUE))
    })
    mins <- sapply(data, function(x) {
        if(is.factor(x) | is.character(x)) return(NA)
        else return(min(x, na.rm=TRUE))
    })
    sds <- sapply(data, function(x) {
        if(is.factor(x) | is.character(x)) return(NA)
        else return(sd(x, na.rm=TRUE))
    })
    
    invalids <- apply(data, 2, function(x) length(which(is.na(x))))
    valids <- nrow(data)-invalids
    
    out<-list(varnames=colnames(data), median=as.vector(medians), mean=as.vector(means), mode=as.vector(modes), max=as.vector(maxs), min=as.vector(mins), invalid=as.vector(invalids), valid=as.vector(valids), sd=as.vector(sds))
    return(out)
    
}

Mode <- function(x) {
    ux <- unique(x)
    ux[which.max(tabulate(match(x, ux)))]
}

pCall <- function(data,production) {
    pjson<-preprocess(testdata=data)
    # Commenting-out the "production" clause for the location of the subset file, *for now*;
    # Eventually, we need to be able to retrieve the subest file over HTTP from rApache; 
    # because if rApache is running on a different server from where TwoRavens is served, 
    # it won't be able to write the subset file directly into the data directory, as below!
    # 	-- L.A. 
    #if(production){
    #    subsetfile <- "/var/www/html/rookzelig/data/preprocessSubset.txt"
    #    write(pjson,file=subsetfile)
    #    url <- "http://dataverse-demo.iq.harvard.edu:8008/rookzelig/data/preprocessSubset.txt"
    #}else{
        url <- "data/preprocessSubset.txt"   # only one subset stored at a time, eventually these will be saved? or maybe just given unique names?
        write(pjson,file=paste("../",url, sep=""))
    #}
    return(url)
}


## called by executeHistory(), subset.app, and zelig.app.
## this function parses everything$zsubset to a list of subset values. the names of the elements in the list are 1, 2, 3, etc, and corresponds to the indices in the zvars and plot arrays
parseSubset <- function(sub) {
    if(class(sub)=="matrix") {
        mysubset <- list()
        t <- sub
        for(i in 1:nrow(t)) {
            mysubset[[i]]<-t[i,]
        }
    } else {
        mysubset <- sub
    }
    return(mysubset)
}

## called by executeHistory, subset.app, and zelig.app.
## sub is a list of subset values, from parseSubset(). varnames and plot are vectors.  if plot[i] is "bar", it subsets on all values in sub[[i]].  if plot[i] is "continuous", it subsets on the range specified by the two values in sub[[i]]
subsetData <- function(data, sub, varnames, plot){
    fdata<-data # not sure if this is necessary, but just to be sure that the subsetData function doesn't overwrite global mydata
    fdata$flag <- 0
    skip <- ""
    for(i in 1:length(varnames)){
        t <-  sub[[i]]   # under rjson was: unlist(sub[i])
        p <- plot[i]
        if(t[1]=="" | length(t)==0) {next} #no subset region
        else {
            if(p=="continuous") {
                myexpr <- paste("fdata$flag[which(fdata$\"",varnames[i],"\" < ",t[1]," | fdata$\"",varnames[i],"\" > ",t[2],")] <- 1", sep="")
                print(myexpr)
                print(colnames(fdata))
                eval(parse(text=myexpr))
                
                if(sum(fdata$flag)==nrow(fdata)) { # if this will remove all the data, skip this subset and warn the user
                    fdata$flag <- 0
                    skip <- c(skip, varnames[i]) ## eventually warn the user that skip[2:length(skip)] are variables that they have chosen to subset but have been skipped because if they were subsetted we would have no data left
                }
                else {
                    fdata <- fdata[which(fdata$flag==0),] # subsets are the overlap of all remaining selected regions.
                }
            } else if(p=="bar") {
                myexpr <- paste("fdata$flag[which(as.character(fdata$\"",varnames[i],"\")%in% t)] <- 1", sep="")
                eval(parse(text=myexpr))
                
                if(sum(fdata$flag)==nrow(fdata)) {
                    fdata$flag <- 1
                    skip <- c(skip, varnames[i])
                }
                else {
                    fdata <- fdata[which(fdata$flag==1),] # notice we keep 1s, above we keep 0s
                }
            }
        }
    }
    fdata$flag<-NULL
    return(fdata)
}


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

# data is a data.frame of columns of data used for transformation
# func is a string of the form "log(_transvar0)" or "_transvar0^2"
transform <- function(data, func) {
    x <- gsub("_transvar0", "data[,1]", func)
    if(ncol(data)>1) {
        for(i in 2:ncol(data)) {
            sub1 <- paste("_transvar", i-1, sep="")
            sub2 <- paste("data[,", i, "]")
            x <- gsub(sub1, sub2, x)
        }
    }
    x <- gsub("_plus_", "+", x)
    x <- paste("data[,1] <- ", x)
    print(x)
    eval(parse(text=x))
    return(data)
}

## called by executeHistory() and transform.app
parseTransform <- function(data, func, vars) {
    call <- "no transformation"
    t <- which(colnames(data) %in% vars)
    tdata <- as.data.frame(data[,t])
    colnames(tdata) <- colnames(data)[t]
    
    tdata <- transform(data=tdata, func=func)
    tdata <- as.data.frame(tdata[,1])
    
    call <- gsub("_plus_", "+", func) # + operator disappears, probably a jsonlite parsing bug, so + operator is mapped to '_plus_' in the javascript, and remapped to + operator here
    call <- gsub("_transvar0", vars[1], call)
    if(length(vars)>1) {
        for(i in 2:length(vars)) {
            sub1 <- paste("_transvar", i-1, sep="")
            sub2 <- vars[i]
            call <- gsub(sub1, sub2, call)
        }
    }
    
    # replace non-alphanumerics with '_' so that these variables may be used in R formulas.
    call <- gsub("[[:punct:]]", "_", call)
    call <- paste("t_", call, sep="")
    colnames(tdata) <- call
    return(tdata)
}

## called by parseTransform()
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

## called by zelig.app, subset.app, transform.app
# history is everything$callHistory, data is mydata, as initially read
# if empty, i.e. the first call from space i, history is an empty list
# else, history is a data.frame where each row contains the data to reconstruct the call
executeHistory <- function (history, data) {
    n <- nrow(history)
    if(is.null(n)) {return(data)}
    print(n)
    for(i in 1:n) {
        if(history[i,"func"]=="transform") {
            v <- history[i,"zvars"]
            if(class(v)=="list") {v <- v[[1]]} # v must be a vector of variable names
            f <- history[i,"transform"]
            tdata <- parseTransform(data=data, func=f, vars=v)
            data <- cbind(data, tdata)
        } else if(history[i,"func"]=="subset") {
            v <- history[i,"zvars"][[1]] # cell is a list so take the first element
            p <- history[i,"zplot"][[1]]
            sub <- parseSubset(history[i, "zsubset"][[1]])
            data <- subsetData(data=data, sub=sub, varnames=v, plot=p)
        }
    }
    return(data)
}


source("rookselector.R")

if(!production){
    R.server$add(app = zelig.app, name = "zeligapp")
    R.server$add(app = subset.app, name="subsetapp")
    R.server$add(app = transform.app, name="transformapp")
    R.server$add(app = selector.app, name="selectorapp")
    print(R.server)
}



#R.server$browse("zeligapp")
#R.server$stop()
#R.server$remove(all=TRUE)
#mydata<-read.delim("../data/fearonLaitin.tsv")
#mydata<-getDataverse(hostname="dvn-build.hmdc.harvard.edu", fileid="2429360")
#z.out<-zelig(cntryerb~cntryera + dyadidyr, model="ls", data=mydata)

