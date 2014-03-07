##
##  rookzelig.r
##
##  25/2/14
##

##install.packages(c("Rook","rjson","Zelig"))
##setwd("/Users/vjdorazio/Desktop/github/ZeligGUI/ZeligGUI/rook")

#!/usr/bin/env Rscript

library(Rook)
library(rjson)
library(Zelig)


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
		myedges<-edgeReformat(everything$zedges)
		if(is.null(myedges)){
			warning <- TRUE
			result<-list(warning="Problem creating edges.")
		}
	}

	if(!warning){ 
        #		mydata <- read.delim("/Users/vjdorazio/Desktop/github/ZeligGUI/ZeligGUI/data/session_affinity_scores_un_67_02132013-cow.tab")
        mydata <- getDataverse(host=everything$zhostname, fileid=everything$zfileid)
		if(is.null(mydata)){
			warning <- TRUE
			result<-list(warning="Dataset not loadable from Dataverse")
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
	

  		assign("mydata", mydata, envir=globalenv())  # Zelig4 Error with Environments
		z.out <- zelig(formula=myformula, model=mymodel, data=mydata)
		almostCall<-paste(mymodel,"( ",deparse(myformula)," )",sep="")

		print(summary(z.out))
		assign("z.out", z.out, envir=globalenv())  # Zelig4 Error with Environments
		x.out <- setx(z.out)
		assign("x.out", x.out, envir=globalenv())  # Zelig4 Error with Environments
		s.out <- sim(z.out, x=x.out)
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

R.server$add(app = zelig.app, name = "zeligapp")

print(R.server)

#R.server$browse(zeligapp)
#http://127.0.0.1:8000/custom/zeligapp?solaJSON={"x":[1,2,4,7],"y":[3,5,7,9]}
#http://0.0.0.0:8000/custom/pic_dir/james.png


#R.server$browse("zeligapp")
#R.server$stop()
#R.server$remove(all=TRUE)
#mydata<-getDataverse(hostname="dvn-build.hmdc.harvard.edu", fileid="2429360")
#z.out<-zelig(cntryerb~cntryera + dyadidyr, model="ls", data=mydata)

