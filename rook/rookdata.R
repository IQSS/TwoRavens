##
##  rookdata.R
##
##  3/3/15
##



data.app <- function(env){

    production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development

    if(production){
        sink(file = stderr(), type = "output")
    }

    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))
    
    everything <- jsonlite::fromJSON(request$POST()$solaJSON)
    print(everything)
    
    warning<-FALSE
    result <- list()
  
  if(!warning){
      dataurl=everything$zdataurl
      if(length(dataurl) == 0){
          warning <- TRUE
          result<-list(warning="No dataverse URL.")
      }
  }
  
  if(!warning){
      
          # this will generate a unique id on the system for Mac/Unix. Might need something else for other systems. getData() is called by rookdata.R, which is the app that is called when TwoRavens is loaded (the "Explore" button is clicked). This downloads the data in the background to /tmp/ while the user is specifying a model. /tmp/ will be wiped every so often or after inactivity.
          myid <- system("uuidgen",intern=T)
          logfile<-logFile(myid, production)
          logSessionInfo(logfile, myid)
          
          # We discovered that R's read.delim() method does not work with https URLs.
          # So I worked around it with the hack below - I first download the tab-delimited file and
          # save it locally, using download.file() method; then read the local file with read.delim.
          # If anyone knows of a prettier way of doing this - please change it accordingly...
          # -- L.A.
          #mydata<-tryCatch(expr=read.delim(file=dataurl), error=function(e) NULL)  # if data is not readable, NULL
          if(production) {
              tryCatch({
                  download.file(dataurl,destfile = paste("/tmp/data_",myid,".tab",sep=""),method="curl")
                  write(deparse(bquote(download.file(.(dataurl),destfile = .(paste("data_",myid,".tab",sep="")),method="curl"))),logfile,append=TRUE)
                  result <- list(sessionid=myid)
              }, error=function(e) {
                  result <<- list(warning="Error: Cannot download from Dataverse.") # if the url is not readable, NULL
              })
          } else {
              result <- list(sessionid=myid)
          }
  }

    print(result)
    if(production){
        sink()
    }
    
    result<-jsonlite:::toJSON(result)
    
    response$write(result)
    response$finish()
}

