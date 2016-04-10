##
##  rookutils.R
##
##  3/3/15
##



# Presently unused attempt at a termination function so as to streamline code for warnings
terminate<-function(response,warning){
	jsonWarning <- toJSON(list(warning=warning))
    print(jsonWarning)
    response$write(jsonWarning)
    response$finish()
    stop()
}

# VJD: this reads a tab-delimited file. in the future, this should read and load the file based on the type of file defined at ingest. this way R can make use of important metadata such as whether a variable is a factor.
readData <- function(sessionid,logfile){
    tryCatch({
        mydata<-NULL
        mydata<-read.delim(file=paste("/tmp/data_",sessionid,".tab",sep=""))
    }, error=function(err){
        warning <<- TRUE ## assign up the scope bc inside function
        result <<- list(warning=paste("R data loading error: ", err))
    })  # if data is not readable, returns a warning and an error
    return(mydata) #note mydata might be NULL
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




pCall <- function(data,production,sessionid, types) {
    pjson<-preprocess(testdata=data, types=types)
    print("new preprocess metadata: ")
    print(pjson)
    
    if(production){
        subsetfile <- paste("/var/www/html/custom/preprocess_dir/preprocessSubset_",sessionid,".txt",sep="")
        write(pjson,file=subsetfile)
        url <- paste("https://beta.dataverse.org/custom/preprocess_dir/preprocessSubset_",sessionid,".txt",sep="")
    }else{
        url <- paste("data/preprocessSubset_",sessionid,".txt",sep="")
        write(pjson,file=paste("../",url, sep=""))
    }
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
    
    if(substr(func,1,3)=="log") {
        if(any(data[,1]<0, na.rm=TRUE)) {
            data[,1] <- data[,1] + -1*min(data[,1])
        }
        if(any(data[,1]==0, na.rm=TRUE)) {
            data[,1] <- data[,1] + .0001
        }
    }
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


# Code mostly from Zelig's plots.R function plot.qi(). Eventually, Zelig will implement a more general solution where each plot is stored in the Zelig object.
zplots <- function(obj, path, mymodelcount, mysessionid, production){
    
    writeplot <- function(exec, path, mymodelcount, mysessionid, qicount, color.x, color.x1, color.mixed, titles, production) {
        qicount <<- qicount+1
        qicount<-qicount+1
        
        eval(parse(text=path))
        eval(parse(text=exec))
        dev.off()
        
        if(production){
            imageVector[[qicount]]<<-paste("https://beta.dataverse.org/custom/pic_dir/", mysessionid,"_",mymodelcount,qicount,".png", sep = "")
        }else{
            imageVector[[qicount]]<<-paste(R.server$full_url("pic_dir"), "/output",mymodelcount,qicount,".png", sep = "")
        }
    }
    
    qicount<-0
    imageVector<-list()
    
    # Determine whether two "Expected Values" qi's exist
    both.ev.exist <- (length(obj$sim.out$x$ev)>0) & (length(obj$sim.out$x1$ev)>0)
    # Determine whether two "Predicted Values" qi's exist
    both.pv.exist <- (length(obj$sim.out$x$pv)>0) & (length(obj$sim.out$x1$pv)>0)
    
    color.x <- rgb(242, 122, 94, maxColorValue=255)
    color.x1 <- rgb(100, 149, 237, maxColorValue=255)
    # Interpolation of the above colors in rgb color space:
    color.mixed <- rgb(t(round((col2rgb(color.x) + col2rgb(color.x1))/2)), maxColorValue=255)
    
    titles <- obj$setx.labels
    
    # Plot each simulation
    if(length(obj$sim.out$x$pv)>0) {
        execMe <- "Zelig::simulations.plot(obj$sim.out$x$pv[[1]], main = titles$pv, col = color.x, line.col = \"black\")"
        writeplot(execMe, path, mymodelcount, mysessionid, qicount, color.x, color.x1, color.mixed, titles, production)
    }
    
    if(length(obj$sim.out$x1$pv)>0) {
        execMe <- "Zelig::simulations.plot(obj$sim.out$x1$pv[[1]], main = titles$pv1, col = color.x1, line.col = \"black\")"
        writeplot(execMe, path, mymodelcount, mysessionid, qicount, color.x, color.x1, color.mixed, titles, production)
    }
    
    if(length(obj$sim.out$x$ev)>0) {
        execMe <- "Zelig::simulations.plot(obj$sim.out$x$ev[[1]], main = titles$ev, col = color.x, line.col = \"black\")"
        writeplot(execMe, path, mymodelcount, mysessionid, qicount, color.x, color.x1, color.mixed, titles, production)
    }
    
    if(length(obj$sim.out$x1$ev)>0) {
        execMe <- "Zelig::simulations.plot(obj$sim.out$x1$ev[[1]], main = titles$ev1, col = color.x1, line.col = \"black\")"
        writeplot(execMe, path, mymodelcount, mysessionid, qicount, color.x, color.x1, color.mixed, titles, production)
    }
    
    if(length(obj$sim.out$x1$fd)>0) {
        execMe <- "Zelig::simulations.plot(obj$sim.out$x1$fd[[1]], main = titles$fd, col = color.mixed, line.col = \"black\")"
        writeplot(execMe, path, mymodelcount, mysessionid, qicount, color.x, color.x1, color.mixed, titles, production)
    }
    
    if(both.pv.exist) {
        execMe <- "Zelig::simulations.plot(y=obj$sim.out$x$pv[[1]], y1=obj$sim.out$x1$pv[[1]], main = \"Comparison of Y|X and Y|X1\", col = paste(c(color.x, color.x1), \"80\", sep=\"\"), line.col = \"black\")"
        writeplot(execMe, path, mymodelcount, mysessionid, qicount, color.x, color.x1, color.mixed, titles, production)
    }
    
    if(both.ev.exist) {
        execMe <- "Zelig::simulations.plot(y=obj$sim.out$x$ev[[1]], y1=obj$sim.out$x1$ev[[1]], main = \"Comparison of E(Y|X) and E(Y|X1)\", col = paste(c(color.x, color.x1), \"80\", sep=\"\"), line.col = \"black\")"
        writeplot(execMe, path, mymodelcount, mysessionid, qicount, color.x, color.x1, color.mixed, titles, production)
    }
 
    return(imageVector)
}

logFile <- function(sessionid, production){
    if(production){
        outfile<-paste("/var/www/html/custom/log_dir/log_",sessionid,".txt",sep="")
    } else {
        outfile<-paste("log_",sessionid,".txt",sep="")
    }
    return(outfile)
}

logSessionInfo <- function(logfile, sessionid, cite){
    
    write(paste("\nData file citation from Dataverse:\n\n",cite,"\n\nR session information:",sep=""),logfile,append=TRUE)
    
    sink(file = logfile, append=TRUE, type = "output")
    print(sessionInfo())
    sink()
    
    write(paste("\n\nReplication code for TwoRavens session ",sessionid,". Note that unless your session information is identical to that described above, it is not guaranteed the results will be identical. Please download rookutils.R from https://github.com/IQSS/TwoRavens/tree/master/rook and ensure that you have rookutils.R in your working directory.\n\nlibrary(Rook)\nlibrary(rjson)\nlibrary(jsonlite)\nlibrary(devtools)\ninstall_github(\"IQSS/Zelig\")\nlibrary(Zelig)\nsource(rookutils.R)\n\n",sep=""),logfile,append=TRUE)
}



