##
##  rookzelig.r
##
##  25/2/14
##

install.packages(c("Rook","rjson","Zelig"), repos = "http://watson.nci.nih.gov/cran_mirror/")
##setwd("/Users/vjdorazio/Desktop/github/ZeligGUI/ZeligGUI/rook")

#!/usr/bin/env Rscript

library(Rook)
library(rjson)
library(Zelig)
source(paste(getwd(),"/preprocess/preprocess.R",sep="")) # load preprocess function

myPort <- "8000"
myInterface <- "0.0.0.0"
#myInterface <- "127.0.0.1"
#myInterface <- "140.247.0.42"
status <- -1

status<-.Call(tools:::startHTTPD, myInterface, myPort)

if( status!=0 ){
    print("WARNING: Error setting interface or port")
    stop()
} #else{
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


zelig.app <- function(env){
    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))

    everything <- fromJSON(request$params()$solaJSON)
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
		mysetx <- everything$zsetx
        myvars <- everything$zvars
        setxCall <- buildSetx(mysetx, myvars)
	}

	if(!warning){
		myedges<-edgeReformat(everything$zedges)
		if(is.null(myedges)){
			warning <- TRUE
			result<-list(warning="Problem creating edges.")
		}
	}

	if(!warning){ 
        		mydata <- read.delim("../data/session_affinity_scores_un_67_02132013-cow.tab")
        #      mydata <- getDataverse(host=everything$zhostname, fileid=everything$zfileid)
		if(is.null(mydata)){
			warning <- TRUE
			result<-list(warning="Dataset not loadable from Dataverse")
		}
	}

    if(!warning){
        mysubset <- everything$zsubset
        usedata <- subsetData(data=mydata, sub=mysubset, varnames=myvars)
        if(is.null(mysubset)){
            warning <- TRUE
            result <- list(warning="Problem with subset.")
        }
    }

	if(!warning){ 
		myformula <- buildFormula(dv=mydv, linkagelist=myedges, varnames=NULL) #names(mydata))
		if(is.null(myformula)){
			warning <- TRUE
			result<-list(warning="Problem constructing formula expression.")
		}
	}

	if(!warning){
		print(names(mydata))
		print(myformula)
        print(setxCall)
        print(dim(usedata))

#    assign("mydata", mydata, envir=globalenv())  # Zelig4 Error with Environments
        assign("usedata", usedata, envir=globalenv()) # Zelig4 Error with Environments
        
		z.out <- zelig(formula=myformula, model=mymodel, data=usedata)
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
            s.out <- sim(z.out, x=x.out)
        }
        else {
            s.out <- sim(z.out, x=x.out, x1=x.alt)
        }
		assign("s.out", s.out, envir=globalenv())  # Zelig4 Error with Environments

    	qicount<-0
    	imageVector<-list()
    	#result<-list()
    	for(i in 1:length(s.out$qi)){
    	  	if(!is.na(s.out$qi[[i]][1])){       # Should find better way of determining if empty
      			qicount<-qicount+1
    			png(file.path(getwd(), paste("output",qicount,".png",sep="")))
    			Zelig:::simulations.plot(s.out$qi[[i]], main=names(s.out$qi)[i])  #from the Zelig library
    			dev.off()
    			imageVector[[qicount]]<-paste(R.server$full_url("pic_dir"), "/output",qicount,".png", sep = "")
    			#result[[qicount]]<-paste(R.server$full_url("pic_dir"), "/output",qicount,".png", sep = "")
    	  	}
    	}

    	if(qicount>0){
    		names(imageVector)<-paste("output",1:length(imageVector),sep="")
    		result<-list(images=imageVector, call=almostCall)
    		#names(result)<-paste("output",1:length(result),sep="")
    	}else{
    		warning<-TRUE
    		result<-list(warning="There are no Zelig output graphs to show.")
	    }
	}
    #png(file.path(getwd(), "james.png"))
    #plot(runif(5),runif(5))
    #dev.off()

    #response$headers("localhost:8888")
    print(result)
    result<- toJSON(result)
    print(result)
    response$write(result)
    response$finish()
}

# Attempt at a termination function so as to streamline code 
terminate<-function(response,warning){
	jsonWarning <- toJSON(list(warning=warning))
    print(jsonWarning)
    response$write(jsonWarning)
    response$finish()
    stop()
}

getDataverse<-function(hostname, fileid){
    path<-paste("http://",hostname,"/api/access/datafile/",fileid,sep="")
    mydata<-tryCatch(expr=read.delim(file=path), error=function(e) NULL)  # if data is not readable, return NULL
    return(mydata)
}

edgeReformat<-function(edges){
	k<-length(edges)
	new<-matrix(NA,nrow=k,ncol=2)
	for(i in 1:k){
		new[i,1]<-edges[[i]][1]
		new[i,2]<-edges[[i]][2]
	}
    return(new)
}


subsetData <- function(data, sub, varnames){
    fdata<-data # not sure if this is necessary, but just to be sure that the subsetData function doesn't overwrite global mydata
    fdata$flag <- 0
    skip <- ""
    for(i in 1:length(varnames)){
        t <- unlist(sub[i])
        if(t[1]=="" & t[2]=="") {next} #no subset region
        else {
            myexpr <- paste("fdata$flag[which(fdata$",varnames[i],"<",t[1]," | fdata$",varnames[i],">",t[2],")] <- 1")
            eval(parse(text=myexpr))
            
            if(sum(fdata$flag)==nrow(fdata)) { # if this will remove all the data, skip this subset and warn the user
                fdata$flag <- 0
                skip <- c(skip, varnames[i]) ## eventually warn the user that skip[2:length(skip)] are variables that they have chosen to subset but have been skipped because if they were subsetted we would have no data left
            }
            else {
                fdata <- fdata[which(fdata$flag==0),] # subsets are the overlap of all remaining selected regions.
            }
        }
    }
    fdata$flag<-NULL
    return(fdata)
}


buildSetx <- function(setx, varnames) {
    outeq <- NULL
    alteq <- NULL
    call <- NULL
    j<-1
    k<-1
    
    for(i in 1:length(varnames)){
        t <- unlist(setx[i])
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

buildFormula<-function(dv, linkagelist, varnames=NULL){
    
    if(is.null(varnames)){
    	varnames<-unique(c(dv,linkagelist))
    }

    k<-length(varnames)
    relmat<-matrix(0,nrow=k,ncol=k)
    
    # define relationship matrix
    # relmat[i,j]==1 => "i caused by j"

    for(i in 1:nrow(linkagelist)){
        row.position<-min( (1:k)[varnames %in% linkagelist[i,2] ] )  # min() solves ties with shared variable names
        col.position<-min( (1:k)[varnames %in% linkagelist[i,1] ] )   
        relmat[row.position,col.position]<-1
    }

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
    formula<-as.formula(paste(dv," ~ ", paste(rhs.names,collapse=" + ")))

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
        else return(median(x, na.rm=TRUE))
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

pCall <- function(data) {
    url <- "data/preprocessSubset.txt"   # only one subset stored at a time, eventually these will be saved? or maybe just given unique names?
    pjson<-preprocess(data)
    write(pjson,file=paste("../",url, sep=""))
    return(url)
}

subset.app <- function(env){
    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))
    
    everything <- fromJSON(request$params()$solaJSON)
    print(everything)
    
    warning<-FALSE
    
    if(!warning){
        mydata <- read.delim("../data/session_affinity_scores_un_67_02132013-cow.tab")
        # mydata <- getDataverse(host=everything$zhostname, fileid=everything$zfileid)
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
        mysubset <- everything$zsubset
        usedata <- subsetData(data=mydata, sub=mysubset, varnames=myvars)
        if(is.null(mysubset)){
            warning <- TRUE
            result <- list(warning="Problem with subset.")
        }
    }
    
    print(dim(mydata))
    print(dim(usedata))
    sumstats <- calcSumStats(usedata)
    
    
    # send preprocess new usedata and receive url with location
    #purl <- pCall(usedata)
    #purl <- "test"
    #result<- toJSON(c(sumstats,list(url=purl)))
    
    result <- toJSON(sumstats)
    print(result)
    response$write(result)
    response$finish()
}

R.server$add(app = zelig.app, name = "zeligapp")
R.server$add(app = subset.app, name="subsetapp")
print(R.server)

#R.server$browse(zeligapp)
#http://127.0.0.1:8000/custom/zeligapp?solaJSON={"x":[1,2,4,7],"y":[3,5,7,9]}
#http://0.0.0.0:8000/custom/pic_dir/james.png


#R.server$browse("zeligapp")
#R.server$stop()
#R.server$remove(all=TRUE)
#mydata<-getDataverse(hostname="dvn-build.hmdc.harvard.edu", fileid="2429360")
#z.out<-zelig(cntryerb~cntryera + dyadidyr, model="ls", data=mydata)

