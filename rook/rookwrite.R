##
##  rookwrite.R
##
##  6/27/15
##



write.app <- function(env){
  
  production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development
  warning<-FALSE
  
  if(production){
    sink(file = stderr(), type = "output")
  }
  request <- Request$new(env)
  response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))
  result <- list()
  
  valid <- jsonlite::validate(request$POST()$solaJSON)
  print(valid)
  
  
  if(!valid) {
    warning <- TRUE
    result <- list(warning="The request is not valid json. Check for special characters.")
  }
  
  if(!warning) {
    everything <- jsonlite::fromJSON(request$POST()$solaJSON)
  #print("value of Everything")
    print(everything)
  }
  
  #print(class(everything$callHistory))
  
  
  #if(!warning){
   # mysessionid <- everything$zsessionid
    #mylogfile<-logFile(mysessionid,production)
    #if(mysessionid==""){
     # warning <- TRUE
      #result <- list(warning="No session id.")
    #}
  #}
  
  if(!warning){
    if(production){
      mydata <- readData(sessionid=mysessionid,logfile=mylogfile)
    }else{
      #mydata <- read.delim("../data/session_affinity_scores_un_67_02132013-cow.tab")
      mydata <- read.delim("../data/fearonLaitin.tsv")
      #mydata <- read.delim("../data/QualOfGovt.tsv")
    }
  }
  
 # print("105")
  if(!warning) {
    everything <- jsonlite::fromJSON(request$POST()$solaJSON)
    
    #  print(everything)
  }

 
  
#  if(!warning){
 #   mysubset <- parseSubset(everything$zsubset)
  #  if(is.null(mysubset)){
   #   warning <- TRUE
    #  result <- list(warning="Problem with subset.")
    #}
  #}
  
  #if(!warning){
   # myplot <- everything$zplot
    #if(is.null(myplot)){
     # warning <- TRUE
      #result <- list(warning="Problem with zplot.")
    #}
  #}
  
  if(!warning){
    #print("110")
    #typeStuff$time <- "yes"
    #allnodes=everything$allnodes
    outtypes=everything$outtypes
    typeStuff <- everything$outtypes
    
    if(!is.list(typeStuff) | (is.null(typeStuff$varnamesTypes) | is.null(typeStuff$interval) | is.null(typeStuff$numchar) | is.null(typeStuff$nature) | is.null(typeStuff$binary) | is.null(typeStuff$time))){
      warning<-TRUE
      result<-list(warning="typeStuff is not a list or one of the necessary elements---varnames, interval, numchar, nature, binary---is null.")
    }
  }
  
  #if(!warning){
   # history <- everything$callHistory
    #if(is.null(history)){
     # warning<-TRUE
      #result<-list(warning="callHistory is null.")
    #}
  #}
  
  #print(dim(mydata))
  #print(dim(usedata))
  
  # this tryCatch is not fully tested.
  tryCatch(
    {
      
      ## 1. prepare mydata so that it is identical to the representation of the data in TwoRavens
      #mydata <- executeHistory(history=history, data=mydata)
      
      ## 2. perform current subset and out appropriate metadata
      #usedata <- subsetData(data=mydata, sub=mysubset, varnames=myvars, plot=myplot)
      
      #call <- ""
      #for(i in 1:length(myvars)) {
       # if(mysubset[[i]][1]=="" | is.na(mysubset[[i]][1])) {next}
      #  else {
       #   if(call != "") {call <- paste(call, ", ", sep="")}
        #  if(myplot[i]=="continuous") {
         #   call <- paste(call, myvars[i], "[", mysubset[[i]][1], ":", mysubset[[i]][2], "]", sep="")
        #  } else if(myplot[i]=="bar") {
         #   call <- paste(call, myvars[i], "[", paste(mysubset[[i]], collapse=","), "]", sep="")
        #}
        #}
      #}
      
      #  print("rohit types")
      # print(typeStuff)
      # send preprocess new usedata and receive url with location
      purl <- pCallwrite(data=mydata, production, sessionid=mysessionid, types=typeStuff)
      
      result <- jsonlite:::toJSON(list(url=purl))
    },
    error=function(err){
      warning <<- TRUE
      result <- list(warning=paste("Write Error: ", err))
      result<-jsonlite:::toJSON(result)
      assign("result", result, envir=globalenv())
    })
  
#  print("109")
  print(result)
  if(production){
    sink()
  }
  #############################################################################
  #############################################################################
  ##############################################################################
  
  
  
  

 
  
 # print("Rohit yo!! outtypes")
  #print(outtypes$varnamesTypes)
  
 # print("110.1")
  
  #purl <- pCallwrite(data=allnodes, production, sessionid=mysessionid,types=outtypes)
  #print("111")
  #result <- jsonlite:::toJSON(list(url=purl))
  #print("112")

  #result<-jsonlite:::toJSON(result)
  print("Wrote to File");
  #print(result);
  response$write(result)
  response$finish()
}



pCallwrite <- function(data,production,sessionid,types) {
 # print("114")
  
  mainDir<-"../data"
  subDir<-"newdataRohit"
  
  #create a new directory for the particular user if it doesnt exist
  if(!dir.exists(file.path(mainDir, subDir)))
  { 
    
    dir.create(file.path(mainDir, subDir))
    
    
    }
  
  
  pjson<-preprocess(testdata=data,types=types)
  #print("115")
 # print("new preprocess metadata: ")
  #print("116")
  #print(pjson)
  
  
  print("directory name:")
  print(subDir)
  if(production){
    subsetfile <- paste("/var/www/html/custom/preprocess_dir/preprocessSubset_",sessionid,".txt",sep="")
    write(pjson,file=subsetfile)
    url <- paste("https://beta.dataverse.org/custom/preprocess_dir/preprocessSubset_",sessionid,".txt",sep="")
  }else{
    url <- paste("data/",subDir,"/FearonLatin_Rohit",".json",sep="")
    write(pjson,file=paste("../",url, sep=""))
  }
  return(url)
}

