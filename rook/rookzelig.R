##
##  rookzelig.r
##
##  25/2/14
##

#install.packages(c("Rook","rjson","Zelig"))

library(Rook)
library(rjson)
library(Zelig)

myPort <- 8000
myInterface <- "127.0.0.1"
status <- -1

status<-.Call(tools:::startHTTPD, myInterface, myPort)

if( status!=0 ){
    print("WARNING: Error setting interface or port")
    stop()
}#else{
#   unlockBinding("httpdPort", environment(tools:::startDynamicHelp))
#    assign("httpdPort", myPort, environment(tools:::startDynamicHelp))
#}


R.server <- Rhttpd$new()


cat("Type:", typeof(R.server), "Class:", class(R.server))
R.server$add(app = File$new(getwd()), name = "pic_dir")
print(R.server)

R.server$start()
R.server$listenAddr <- myInterface
R.server$listenPort <- myPort




zelig.app <- function(env){
    request <- Request$new(env)
    response <- Response$new()
    
    everything <- fromJSON(request$params()$solaJSON)

#mydata<-getDataverse(host=everything$host, fileid=everything$fileid)
#mydv<-everything$dependentVariable
#myformula<-buildFormula(mydata, mydv, everything$linkageList)
#mymodel<-everything$model

#z.out<-zelig(formula=myformula, model=mymodel, data=mydata)

    x<-runif(5)
    y<-runif(5)

    png(file.path(getwd(), "james.png"))
    plot(everything$x,everything$y)
    dev.off()
    
    response$write(paste("<img src =", R.server$full_url("pic_dir"), "/james.png",  ">", sep = ""))
    
    response$finish()
}







buildFormula<-function(data, dv, linkagelist){
    
    k<-ncol(data)
    varnames<-names(data)
    relationship.matrix<-matrix(0,nrow=k,ncol=k)
    
    for(i in 1:nrow(linkagelist)){
        row.position<-min( (1:k)[varnames %in% linkagelist[i,1] ] )  # min() solves ties with shared variable names
        col.position<-min( (1:k)[varnames %in% linkagelist[i,2] ] )
        relationship.matrix[row.position,col.position]<-1
    }
    
    j<-min( (1:k)[varnames %in% dv ] )
    flag<- relationship.matrix[j,]==1
    rhs.names<-varnames[flag]
    formula<-as.formula(paste(dv," ~ ", paste(rhs.names,collapse=" + ")))
            
    return(formula)
}


getDataverse<-function(hostname, fileid){
    path<-paste("http://",hostname,"/api/meta/datafile/",fileid,sep="")
    mydata<-read.csv(url=path)
    return(mydata)
}




R.server$add(app = zelig.app, name = "zeligapp")

print(R.server)



#R.server$browse("My rook app")
#R.server$stop()
#R.server$remove(all=TRUE)

