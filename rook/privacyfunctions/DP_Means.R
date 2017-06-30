################################################################################
 # DP_Means: Functions for releasing differentially private means. 
 #
 # This file contains three functions meant to interface with the differentially
 # private version of Zelig. It provides two methods to estimate the accuracy
 # of a differentially private mean given an (epsilon, delta) pair or vice
 # versa. It also is able to compute and release an (epsillon, delta)
 # differentially private mean using the Laplace Mechanism.
 #
 # @author Connor P. Bain
 # @version 1.01 2014-07-18
 # Harvard University
###

### Functions Available #########################################################
# Mean.getAccuracy(eps, del, range, n, beta)
# Mean.getParameters(acc, del, range, n, beta)
#
# Mean.release(eps, del, data, range)
###

### Dependencies ################################################################
library("VGAM")
###

### Methods #####################################################################
Mean.getAccuracy <- function(eps, del, range, n, beta) {
  # Computes the accuracy guarantee given an (epsilon, delta)
  #
  # Args:
  #   eps: The epsilon to be used
  #   del: The delta to be used
  #   range: An a priori estimate of the range
  #   n: The number of samples in the data
  #   beta: The statistical signifcance level
  #
  # Returns:
  #   The percentage accuracy guaranteed by the given epsilon
    
  returnValue <- log(1/beta)*range/(eps*n)
  returnValue <- returnValue
      
  return(returnValue)
} # Mean.getAccuracy()

Mean.getParameters <- function(acc, del, range, n, beta) {
  # Computes the epsilon value necessary for the given accuracy
  #
  # Args:
  #   acc: The accuracy we need to guarantee (percent)
  #   del: The delta to be used
  #   range: An a priori estimate of the range
  #   n: The number of samples
  #   beta: The statistical signifcance level
  #
  # Returns:
  #   The scalar epsilon necessary to guarantee the accuracy needed  
  
  t <- acc/range  # Adjust accuracy to be range agnostic
  
  # Solve for the expected error from the Laplace Distribution
  returnValue <- log(1/beta)/(n*t)
  
  return(returnValue)
} # Mean.getParameters()

Mean.release <- function(eps, del, data, range) {
  # Releases the means of all the attributes in the data in a DP manner.
  #
  # It guarantees (epsilon, delta) overall DP.
  #
  # Args:
  #   eps: The overall epsilon we want to guarantee
  #   del: The overall delta we want to guarantee
  #   data: A vector of data
  #   range: An a priori version of the range
  #
  # Returns:
  #   The scalar (eps, del)-DP mean.
  
  returnValue <- 0
  
  # Calculate the true mean
  returnValue <- mean(data)
  n <- length(data)

  # Add the noise from a laplace distribution (scaled to a range)
  noise <- rlaplace(1, location = 0, scale = range/(eps*n)) 
  returnValue <- returnValue + noise
  
  params <- list(n=n, eps=eps, del=del, range=range)

  return(list(release=returnValue, params=params))
} # Mean.release()