#
# Histogram.R
# Author : Victor Balcer (vbalcer@ucsd.edu)
# Summer 2014 REU - Harvard University
#
# Description:
#    Contains functions for computing a differentially private histogram of the
#    data in addition to the privacy and accuracy parameters.
#
#    The following argument names are used throughout this file:
#
#       - bins - universe from which the data is drawn
#       - nbins - number of values that data can take on
#       - binspec - if TRUE assumes that bins have been decided by the user
#
#       - data - vector of elements drawn from the universe
#       - n - number of elements in data
#
#       - eps - epsilon privacy parameter
#       - del - delta privacy parameter
#
#       - acc - alpha accuracy paramater (scaled)
#       - beta - maximum failure probability (default : .05)
#

# Imports
library(VGAM)


Histogram.release <- function(bins=NULL, data, eps, del, beta=.05)
#
# Description:
#    Wrapper function for releasing a differentially private histogram
#    choosing the best algorithm based on the given privacy parameters and
#    the parameters of the data.
#
# Input:
#    refer to source header
#    bins - if NULL, bins are created from the data (default : NULL)
#
# Return:
#    perturbed histogram as a table
#
{
   n <- length(data)


   # true when bins are specified
   nlv <- (!is.null(bins))
   nbins <- length(bins)

   if(nlv && (nbins < 1))
   {
      stop("The number of bins cannot be 0.")
   }

   # uses stabilityHistogram if bins are not given explicitly
   if(!nlv)
   {
      stabilityHistogram <- stabilityHistogram.release(NULL, data, eps, del)
      params <- list(eps=eps, del=del, n=n, nlv=nlv)

      return(list(release=stabilityHistogram, params=params))

   }

   # TODO: Provide a better decision for choosing the algorithm
      noisyHistogram <- noisyHistogram.release(bins, data, eps)
      params <- list(eps=eps, del=del, n=n, nlv=nlv)

      return(list(release=noisyHistogram, params=params))
}

Histogram.getAccuracy <- function(binspec, n, eps, del, beta=.05)
#
# Description:
#    Calculates the best alpha accuracy parameter by iterating over the
#    accuracy function of the different histogram algorithms with the
#    given parameters. Returns accuracy as a pair where the the accuracies
#    are for non-zero and zero values for the counts, respectively.
#
# Input:
#    refer to source header
#
# Return:
#    alpha accuracy parameter
#
{
   if(!binspec)
   {
      return(stabilityHistogram.getAccuracy(n, eps, del))
   }

   # TODO: Provide a better decision for choosing the algorithm
   return(noisyHistogram.getAccuracy(n, eps, beta))
}

Histogram.getParameters <- function(binspec, n, del, acc, beta=.05)
#
# Description:
#    Calculates the best epsilon privacy parameter by iterating over the
#    parameter function of the different histogram algorithms with the
#    given parameters.
#
# Input:
#    refer to source header
#
# Return:
#    epsilon privacy parameter
#
{
   if(!binspec)
   {
      return(stabilityHistogram.getParameters(n, del, acc, beta))
   }

   # TODO: Provide a better decision for choosing the algorithm
   return(noisyHistogram.getParameters(n, acc, beta))
}


noisyHistogram.release <- function(bins, data, eps, other)
#
# Description:
#    Laplace mechanism. Independent Laplace noise is added to each count.
#
# Input:
#    refer to source header
#
# Return:
#    noisy histogram as a table
#
{
   if(length(bins) < 1)
   {
      stop("The number of bins cannot be 0.")
   }

   hist <- table(factor(data, levels=bins, exclude=c()))
   hist <- hist + rlaplace(length(hist), scale=2/eps)

   return(hist)
}

noisyHistogram.getAccuracy <- function(n, eps, beta=.05)
#
# Description:
#    Calculates alpha such that the probability each count is within
#    alpha * n of its true count is 1 - beta.
#
# Input:
#    refer to source header
#
# Return:
#    alpha accuracy parameter
#
{
   acc <- -2*log(beta) / (n * eps)
   return(c(acc, acc))
}

noisyHistogram.getParameters <- function(n, acc, beta=.05)
#
# Description:
#    Calculates epsilon such that the probability each count is within
#    alpha * n of its true count is 1 - beta.
#
# Input:
#    refer to source header
#
# Return:
#    epsilon privacy parameter
#
{
   eps <- -2*log(beta) / (n * acc)
   return(eps)
}


stabilityHistogram.release <- function(bins=NULL, data, eps, del)
#
# Description:
#    Independent Laplace noise is added to each count that exceeds the
#    given thresholds. Other counts are removed from the table if the bins
#    are not given. It can be assumed they have a value of 0.
#
# Input:
#    refer to source header
#    bins - if NULL, bins are created from the data (default : NULL)
#
# Return:
#    perturbed histogram as a table (insignificant counts may be removed)
#
{
   n <- length(data)

   # true when bins are specified
   nlv <- (!is.null(bins))

   if(nlv && (length(bins) < 1))
   {
      stop("The number of bins cannot be 0.")
   }

   # second threshold value
   thresh <- -2 / eps * log(2 * del) + 1

   if(nlv)
   {
      hist <- table(factor(data, levels=bins, exclude=c()))

      # sets all counts below thresholds to 0
      hist <- ifelse(hist < 1, 0, hist + rlaplace(n=1, scale=2/eps))
      hist <- ifelse(hist < thresh, 0, hist)
   }
   else
   {
      hist <- table(factor(data, exclude=c()), useNA="ifany")
      # excludes all counts below thresholds in the returned table
      hist <- hist[hist > 0]
      if(length(hist) == 0)
      {
         return(hist)
      }

      hist <- hist + rlaplace(n=length(hist), scale=2/eps)
      hist <- hist[hist >= thresh]
   }

   return(hist)
}

stabilityHistogram.getAccuracy <- function(n, eps, del, beta=.05, error=1e-10)
#
# Description:
#    Calculates an estimation of alpha using binary search such that the
#    probability each count is within alpha * n of its true count is
#    1 - beta.
#
# Input:
#    refer to source header
#    error - maximum devaition allowed from n (only below)
#
# Return:
#    alpha accuracy parameter
#
{
   acc <- -2 / (n * eps) * log(2 * beta) + error

   if(acc > 1)
   {
      return(Inf)
   }

   low <- acc
   high <- 1
   eval <- n + 1

   while((n < eval) || (n >= eval + error))
   {
      acc <- (low + high) / 2
      eval <- 1 / acc - 2 / (acc * eps) *
            log(2 * del * (2 * beta - exp(-acc * n * eps / 2)))

      if(n < eval)
      {
         low <- acc
      }
      else if(n >= eval + error)
      {
         high <- acc
      }

      if(high - low <= 0)
      {
         return(Inf)
      }
   }
   return(c(-2*log(beta) / (n * eps), acc))
}

stabilityHistogram.getParameters <- function(n, del, acc, beta=.05, error=1e-10)
#
# Description:
#    Calculates an estimation of epsilon using binary search such that the
#    probability each count is within alpha * n of its true count is
#    1 - beta. Note that the accuracy parameter here is the assumed to be
#    the one given from the first coordinate of the previous function.
#
# Input:
#    refer to source header
#    error - maximum devaition allowed from n (only below)
#
# Return:
#    epsilon privacy parameter
#
{
   eps <- -2 / (n * acc) * log(2 * beta) + error

   if(eps > 1)
   {
      return(Inf)
   }

   low <- eps
   high <- 1
   eval <- n + 1

   while((n < eval) || (n >= eval + error))
   {
      eps <- (low + high) / 2
      eval <- 1 / acc - 2 / (acc * eps) *
            log(2 * del * (2 * beta - exp(-acc * n * eps / 2)))

      if(n < eval)
      {
         low <- eps
      }
      else if(n >= eval + error)
      {
         high <- eps
      }

      if(high - low <= 0)
      {
         return(Inf)
      }
   }
   return(eps)
}


randomizedResponseHistogram.release <- function(bins, data, eps)
   #
   # Description:
   #    Creates a new database from the existing with bias given towards
   #    to the correct values. After the histogram of the new database.
   #    The counts in this histogram are scaled to make the expectation of
   #    the error 0 for each count.
   #
   # Input:
   #    refer to source header
   #
   # Return:
   #    noisy histogram as a table
   {
      nbins <- length(bins)
      n <- length(data)

      if(nbins < 2)
      {
         stop("There must be at least 2 bins.")
      }

      pr_diff <- 1 / nbins * exp(-eps)
      pr_same <- 1 - (nbins - 1) * pr_diff

      # performs randomized response to create new database
      for(i in 1:n)
      {
         if(runif(1) >= pr_same)
         {
           row <- sample(1:(nbins - 1), 1)

            if(row >= data[i])
            {
               data[i] <- bins[row + 1]
            }
            else
            {
               data[i] <- bins[row]
            }
         }
      }

      # post-processing
      hist <- table(factor(data, levels=bins, exclude=c()))

      m <- 1 / (pr_same - pr_diff)
      b <- pr_diff * n * m
      hist <- m * hist - b

      return(hist)
   }

randomizedResponseHistogram.getAccuracy <- function(n, eps, beta=.05)
#
# Description:
#
# Input:
#    refer to source header
#
# Return:
#    alpha accuracy parameter
#
{
   return(c(Inf, Inf))
}

randomizedResponseHistogram.getParameters <- function(n, acc, beta=.05)
#
# Description:
#
# Input:
#    refer to source header
#
# Return:
#    epsilon privacy parameter
#
{
   return(Inf)
}
