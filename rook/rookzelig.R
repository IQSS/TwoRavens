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
#   unlockBinding("httpdPort", environment(tools:::startDynamicHelp))
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

    print(request$params())
    everything <- fromJSON(request$params()$solaJSON)

    print(everything)

	mydv <- everything$zdv
	myedges<-everything$zedges
	mymodel <- everything$zmodel

    print("_+_+_+_+_+_+_+_+_")
	print(myedges)

	mydata <- getDataverse(host=everything$zhostname, fileid=everything$zfileid)
	myformula <- buildFormula(dv=mydv, linkagelist=myedges, varnames=names(mydata))

	z.out <- zelig(formula=myformula, model=mymodel, data=mydata)
	x.out <- setx(z.out)
	s.out <- sim(z.out, x=x.out)

    png(file.path(getwd(), "james.png"))
    #plot(everything$x,everything$y)
    plot(s.out)
    dev.off()
    
    #response$headers("localhost:8888")
    #response$write(paste("<img src =", R.server$full_url("pic_dir"), "/james.png",  ">", sep = ""))
    
    resultgraphs <- list(output1=paste(R.server$full_url("pic_dir"), "/james.png", sep = "") )
    resultgraphs <- toJSON(resultgraphs)
    response$write(resultgraphs)

    response$finish()
}

buildFormula<-function(dv, linkagelist, varnames=NULL){
    
    if(is.null(varnames)){
    	varnames<-unique(c(dv,linkagelist))
    }

    k<-length(varnames)
    relationship.matrix<-matrix(0,nrow=k,ncol=k)
    
    # define relationship matrix
    # relmat[i,j]==1 => "i caused by j"
    for(i in 1:nrow(linkagelist)){
        row.position<-min( (1:k)[varnames %in% linkagelist[i,1] ] )  # min() solves ties with shared variable names
        col.position<-min( (1:k)[varnames %in% linkagelist[i,2] ] )
        relmat[row.position,col.position]<-1
    }
    
    # store matrix contains all backwards linked variables
    store<-relmat.n<-relmat<-a

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


getDataverse<-function(hostname, fileid){
    path<-paste("http://",hostname,"/api/access/datafile/",fileid,sep="")
    mydata<-read.csv(file=path)
    return(mydata)
}

R.server$add(app = zelig.app, name = "zeligapp")

print(R.server)

#R.server$browse(zeligapp)
#http://127.0.0.1:8000/custom/zeligapp?solaJSON={"x":[1,2,4,7],"y":[3,5,7,9]}
#http://0.0.0.0:8000/custom/pic_dir/james.png


#R.server$browse("zeligapp")
#R.server$stop()
#R.server$remove(all=TRUE)

