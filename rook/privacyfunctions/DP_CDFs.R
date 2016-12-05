##########################################################
# DP_CDF: Class for releasing differentially private
# CDFs. The actual algorithm is coded in C++. The file 
# dpCDFfunctionToR.R is the R interface to the C++.
# The CDF as well as its pos-processing functions are
# all obtained from a TREE which contains the bins counts.
# The C++ was made by Georgios Kellaris.   
# The post-processing functions were made by Daniel Muise. 
#
# Harvard University
##########################################################

### Functions Available
##########################################################
   # CDF.getAccuracy(eps, beta, range, gran)
   # CDF.getParameters(alpha, beta, range, gran)
   # CDF.release(eps, cdfstep, data, range, gran)
##########################################################
source("../../summer2015/cdfs/dpCDFfunctionToR.r")

CDF.release <- function(eps, cdfstep, data, range, gran) {
  # Releases an approximate CDF of a data set in a DP manner. Returns these values in a vector
  #
  # Args: 
  #  eps: epsilon value for DP
  #  cdfstep: The step sized used in outputting the approximate CDF; the values output are [min, min + cdfstep], [min, min + 2 * cdfstep], etc.
  #  data: A vector of the data
  #  range: The range of the universe as a vector (min, max)
  #  gran: The granularity of the universe between the min and max
  #  It is assumed that the data input is rounded to the
  #    granularity
  #
  # Returns:
  #  a list of CDF and parameters

  returnValue <- functionH(eps, cdfstep, data, range, gran)
  # print("-------- error analysis -------- ")
  # print(mean(returnValue$bound))
  # print("----------------------------------- ")
  # returnValue <- functionS2(eps,cdfstep,data,range,gran)
  # returnValue <- functionSUB(eps,cdfstep,data,range,gran)

  params <- list(n=length(data), eps=eps, cdfstep=cdfstep, range=range, gran=gran)
  
  return(list(release=returnValue$theCDF, params=params))
}

CDF.getAccuracy <- function(eps, beta, range, gran, n) {
  # Args: 
  #  eps: epsilon value for DP
  #  beta: the true value is within the accuracy range with
  #    probability 1-beta
  #  range: The range of the universe as a vector (min, max)
  #  gran: The granularity of the universe between the min and max
  #
  # Returns:
  #  The accuracy guaranteed by the given epsilon
  #
  #  The accuracy is interpreted as follows: The alpha value returned means that with probability 1 - beta, simultaneously for all t with min <= t <= max, the algorithm's estimate of the count in [min, t] is within alpha of the true value
  
  universe_size <- ((range[2] - range[1]) / gran) + 1
  return (log2(1/beta) * 0.75 * (2.828427/eps) * 2.12 * (log2(universe_size) / log2(16))/n)
  # return(((4/eps) * log2(1/beta) * log2(universe_size)^(1.5))/(n*100)) #/(n*100) added by JM on 8/5/14 for consistency among accuracies
}

CDF.getParameters <- function(alpha, beta, range, gran, n) {
  # Args:
  #  alpha: the accuracy parameter
  #  beta: the true value is within the accuracy range (alpha)
  #    with probability 1-beta
  #  range: The range of the universe as a vector (min, max)
  #  gran: The granularity of the universe between the min and max
  #
  # Returns:
  #  The epsilon value necessary to gaurantee the given accuracy
  # alpha <- alpha*100   #added by JM on 8/5/14 for consistency among accuracies
  universe_size <- ((range[2] - range[1]) / gran) + 1
  return (log2(1/beta) * 0.75 * (2.828427/eps) * 2.12 * (log2(universe_size) / log2(16))/n)
  # return(((4/alpha) * log2(1/beta) * log2(universe_size)^(1.5))/n)
}
