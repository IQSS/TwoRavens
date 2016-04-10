#
# DemoView.R
# Author : Victor Balcer (vbalcer@ucsd.edu)
# Summer 2014 REU - Harvard University
#
# Description:
#

# Imports
source("Histogram.R")

demoView <- function(hist, k=Inf, acc=0, w=.1, n=NULL, sort=F,
                     zero="set", title="Differentially Private Histogram",
                     margin="")
#
# Description:
#    Display of the differentially private histogram.
#
# Input:
#    hist - histogram to plot
#    k - if sort is TRUE, then it displays only the top-k
#    acc - if scalar error for all bins ; if pair error for nonzero/zero bins
#    w - width of error bars, NULL for none (default : .1)
#    n - if scalar, calculate the unaccounted mass assuming it is database size
#    sort - sort the bins descending (default : FALSE)
#    zero - "set": set <= 0 to 0 ; "rm": remove all <= 0 entries ; "": nothing
#    margin - text to go below title
#
{
   #par(ask=TRUE)

   # calculates unaccounted mass before additional post-processing
   unmass <- 0
   if(!is.null(n))
   {
      unmass <- n - sum(hist)
   }

   # handles negative / zero counts
   if(zero == "rm")
   {
      hist <- hist[hist > 0]
   }
   else if(zero == "set")
   {
      hist <- ifelse(hist < 0, 0, hist)
   }

   # sorts the histogram
   if(sort)
   {
      k <- min(k, length(hist))
      unmass <- unmass + sum(hist)
      hist <- sort(hist, decreasing=T)[1:k]
      unmass <- unmass - sum(hist)
   }

   # create error ranges
   if(!is.null(w) && !is.null(acc))
   {
      if(length(acc) == 1)
      {
         acc <- c(acc, acc)
      }
      low <- ifelse(hist == 0, hist - acc[2], hist - acc[1])
      high <- ifelse(hist == 0, hist + acc[2], hist + acc[1])
   }

   # set up plotting variables
   xs <- 1.2 * (1:length(hist)) - .5
   if(!is.null(n))
   {
      col <- c(matrix("grey", 1, length(hist)), "white")
      names <- c(names(hist), "other")
      hist <- c(hist, unmass)
   }
   else
   {
      col <- "grey"
      names <- names(hist)
   }

   # plot results
   bplot <- barplot(hist,
         ylim=range(0, 1.5*range(hist)),
         col=col,
         names.arg=names,
         beside=T,
         axis.lty=1,
         main=title,
         xlab="Bins",
         ylab="Frequencies")

   # display error bars
   if(!is.null(w) && !is.null(acc))
   {
      arrows(xs, low, xs, high, code=3, length=w, angle=90)
   }

   mtext(margin, side=3)

   #par(ask=FALSE)
}
