##############################################
#
# This function takes the main dataframe structure from my code 
# and prints it in a more compact, organized form.
#
# Jack Murtagh
# Harvard University
# 7/20/14
#
###

pretty_print <- function(df){
	# Args:
	#	df: a dataframe where each row corresponds to a single call of a 
	#	    DP algorithm. The columns contain all useful information about
	#	    those calls.
	#
	# Output: print this dataframe in a user-friendly way.
	
	#save original df and then subset it to only the columns we want.
	orig <- df
	df <-subset(df, select=c("Statistic", "Attribute","Accuracy","Epsilon", "Delta", "Hold"))
	 
	#Round numerical entries
	df$Accuracy <- round(as.numeric(df$Accuracy), digits = 8)
	df$Epsilon <- round(as.numeric(df$Epsilon), digits = 8)
	df$Delta <- round(as.numeric(df$Delta), digits = 12)
	 
	#Start to build the print-ready version
	toprint <- data.frame("Statistic" = c(), "Attribute"= c(),"Accuracy"= c(),"Epsilon"= c(), "Delta"= c(), "Hold"= c())
	 
	# Group each stat together
	for(i in c("mean", "quantile", "histogram","covariance")){
		
		temp <- subset(df, Statistic == i)
		if(nrow(temp) > 0){
			
			temp$Statistic <- ""
			towrite <- i
			
			if(i == "mean"){ towrite <- "Means" }
			if(i == "quantile"){ towrite <- "Quantiles"}
			if(i == "histogram"){ towrite <- "Histograms"}
			
			temp$Statistic[1] <- towrite
			
			if(i == "covariance"){
				
				cov_list <- unique(subset(orig, orig$Covariance == 1)$Attribute)
				l <- length(cov_list) - 1
				temp <- data.frame(Statistic = c("Covariance", rep("", times=l)), Attribute = cov_list, 
								   Accuracy = c(temp$Accuracy, rep("", times=l)), Epsilon = c(temp$Epsilon, rep("", times = l)), 
								   Delta = c(temp$Delta, rep("", times = l)), Hold = c(temp$Hold, rep("", times = l)) )			
			}
			
			if(nrow(toprint) > 0){
				# empty row is to put space between each group of stats
				empty_row <- data.frame("Statistic" = "", "Attribute"= "","Accuracy"= "","Epsilon"= "", "Delta"= "", "Hold"= "")
				toprint <- rbind(toprint, empty_row)
			}
			
			toprint <- rbind(toprint, temp)		
		}	
	}
	
	if(nrow(toprint) > 0){
		cat("\n Selected Statistics: \n\n")
		print(toprint, right=FALSE, row.names = FALSE)
		cat("\n")
	}	
}