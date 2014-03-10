##
##  preprocess.r
##
##  10/3/14
##


preprocess<-function(hostname=NULL, fileid=NULL, testdata=NULL){
    
    histlimit<-13
    
    if(!is.null(testdata)){
        mydata<-testdata
    }else{
        mydata<-getDataverse(hostname=hostname, fileid=fileid)
    }
    
    
    k<-ncol(mydata)
    varnames<-names(mydata)
    
    hold<-list()

    count<-0
    
    for(i in 1:k){
        if(is.numeric(mydata[,i])){
            uniqueValues<-sort(unique(mydata[,i]))
            
            if(length(uniqueValues)< histlimit){
                output<- table(mydata[,i])
                hold[[i]]<- output
            }else{
                output<- density( mydata[,i], n=50 )
                hold[[i]]<- list(x=output$x, y=output$y)
                
            }
            
        }else{
            hold[[i]]<-"character"
        }
    }
    names(hold)<-varnames
    jsonHold<-toJSON(hold)
    
    return(jsonHold)
}






