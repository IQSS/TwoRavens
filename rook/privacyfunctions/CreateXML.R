# This code is called after the release functions are all run and private stats are 
# calculated. It creates an xml metadata file and populates it with private data
# values to be sent back to dataverse for release. The format of the generated file 
# will have to be modified as dataverse metadata file standards change.


create_xml <- function(stats, df, globals, printerror=FALSE){
	file <- "metadata.xml"
	file.create(file)
	
	#where to get ID? 
	#where to get type?
	# fileid
	# stand in values:
	ID <- "v415"
	intrvl <- "discrete"
	fileid<-"f243"
	
	for(att in names(stats)){
		type <- df$Type[which(df$Variable == att)[1]]
		n <- globals$n
		intro <- paste("<var ID=\"",ID,"\" name=\"\"",att,"\"\" intrvl=\"",type,"\">", sep="")
		loc <- paste("<location fileid=\"",fileid,"\"/>", sep="")
		label <- paste("<labl level=\"variable\">\"",att,"\"</labl>", sep="")
		write(intro,file=file, append=T)
		write(loc,file=file, append=T)
		write(label,file=file, append=T)
		
		info <- stats[[att]]
		allStats <- list()
		allStats["mean"] <- info$mean
		allStats[["cdf"]] <- info$cdf
		hist <- info$hist
		allStats[["hist"]] <- hist
		allStats[["bins"]] <- toString(names(hist))
		
		allStats["mode"] = tryCatch({
		  info$mode
		}, error = function(e) {
		  if(printerror){
		  	print("Error getting max(hist)")
		  }
		  allStats["mode"] <- ""
		})
		# if ( !is.null(hist) ) {
		# 	allStats["mode"]<- which(hist==max(hist))[1] #how to handle multiple modes?
		# } else{ allStats["mode"] <- "" }
		
		allStats["vald"] <- n #eventually need to handle missing data
		allStats["invd"] <- 0
		allStats["min"] <- df$LowerBound[which(df$Variable == att)[1]]
		allStats["max"] <- df$UpperBound[which(df$Variable == att)[1]]
		if(type=="Boolean"){
			p <- info$hist[1]/n
			allStats["stdev"] <- sqrt(p*(1-p))
		}
		else{
			allStats["stdev"] <- ""
			}
		
		for(name in names(allStats)){
			write_data(name, toString(allStats[[name]]), file)
		}
		
		close <- paste("<varFormat type=\"",type,"\"/>",sep="")
		write(close,file=file,append=T)
		write("</var>",file=file,append=T)
	}
	fileString <- paste(readLines(file),collapse=" ")
	return(fileString)
	
}

write_data <- function(name, value,file){	
	towrite <- paste("<sumStat type=\"",name,"\">",value,"<\\sumStat>",sep="")	
	write(towrite,file=file,append=T)
}

