#' DP cem
#' 
#' Function to perform coarsened exact matching on a dataset given a user input choice of coarsenings.
#'
#' @param x A dataframe containing the dataset that is to be matched. 
#' @param treatment A character vector indicating the name of the treatment variable. The treatment variable must be binary and present in the dataframe
#' @param scaleList A named list where each named entry of the list specifies the scale of the continuous variables that are to be matched on. The names in the list MUST match exactly with the 
#' names of the continuous variables in the dataframe. Currently no checks are performed to check if the variable is continous or not.
#' @param groupList A named list of lists indicating the groupings for categorical variables to be matched on. The names in the list should match the name of the 
#' categorical variables on which the grouping is to be performed. The value of the list specifies the grouping.
#' @param exactMatch A list of names on which exact matches are to be performed.
#' @param matchType A string from the set "onetoone", "onetok", "variable" that indicates the type of matching to be done.
#' 1. "onetoone" - ratio of treated to control is 1:1, extra units are dropped randomly
#' 2. "onetok" - ratio of treated to control is 1:k, extra units are dropped randomly
#' 3.  "variable", ratio of treated to control is variable, extra units are dropped randomly. 
#' @param k A positive integer indicating the structure of matched strata. 
#' If matchType = "onetoone", the value of k is set to 1. 
#' If matchtype = "onetok", k is the number of matched control units for every treated unit in each strata.
#' If matchtype = "variable", k is the upper bound on the number of matched control units for every treated unit in each strata. 
#' @param epsilon A numeric vector representing the epsilon privacy parameter.
#'    Should be of length one and should be between zero and one.
#'    
#' @return A named list with the number of matched treated and control units, matched dataset and other parameters to be passed 
#'  to the release function.
#' @rdname dp.cem
#' @export
dp.cem <- function(x, treatment, scaleList, groupList, exactMatch, matchType, k, sensitivity, epsilon) {
  
  ans = countTreatedUnitsAfterMatch(treatment=treatment,data=x,scaleList=scaleList,groupList=groupList,exactMatch=exactMatch,k=k,
                              matchType=matchType,shift=1);
  sensitivity = k;
  out <- list('name' = 'cem',
              'stat' = c(ans[[1]],ans[[2]]),
              'matchedData'= ans[[3]],
              'matchType' = matchType,
              'k' = k,
              'sensitivity' = sensitivity,
              'epsilon' = epsilon)
    return(out)
}

#' Release differentially private estimate of the number of treated and control units after matching
#'
#'
#' @param data A dataframe containing the dataset that is to be matched. 
#' @param treatment A character vector indicating the name of the treatment variable. The treatment variable must be binary and present in the dataframe
#' @param scaleList A named list where each named entry gives the scale of the continuous variables that are to be matched on. The names in the list MUST match exactly with the 
#' names of the continuous variables in the dataframe.
#' @param groupList A named list of lists indicating the groupings for categorical variables to be matched on. The names indicate the categorical variables t
#' to be matched on, and the list indicates the grouping.
#' @param exactMatch A list of names on which exact matches are to be performed.
#' @param matchType A string from the set "onetoone", "onetok", "variable" that indicates the type of matching to be done.
#' 1. "onetoone" - ratio of treated to control is 1:1, extras are dropped
#' 2. "onetok" - ratio of treated to control is 1:k
#' 3.  "variable", ratio of treated to control is variable, 
#' @param k A positive integer indicating the structure of matched sets. 
#' If matchType = "onetoone", the value of k is set to 1. 
#' If matchtype = "onetok", k gives the exact number of matched control units for every treated unit in each strata.
#' If matchtype = "variable", the value of k gives the upper bound on the number of matched control units for every treated unit in each strata. 
#' @param epsilon A numeric vector representing the epsilon privacy parameter.
#'    Should be of length one and should be between zero and one.
#'    
#' @return A differentially private estimate of the number of matched treated and control units remaining after the match.
#' @rdname matchedunits.release
#' @export
#' @examples
#' 
#' 
#' @rdname matchedunits.release
#' @export
matchedunits.release <- function(x, treatment, scaleList, groupList, exactMatch, matchType, k, sensitivity, epsilon){
  
  out = dp.cem(x, treatment, scaleList, groupList, exactMatch, matchType, k, sensitivity, epsilon)
    
  mechanism.laplace(fun = dp.cem, x=data, var.type = 'numeric', rng=c(0,nrow(data)), sensitivity=k, epsilon, postlist=NULL,
                    data=data,treatemnt=treatment,scaleList=scaleList, groupList=groupList,exactMatch = exactMatch,matchType = matchType,k=k)
                    
                    
                    
    release.noisy <- out$stat + dpNoise(n=length(out$stat), scale=(sensitivity / epsilon), dist='laplace');
    
    release.stability <- mechanism.laplace(fun=dp.histogram, x=x, var.type=var.type, rng=rng,
                                           sensitivity=1, epsilon=epsilon, stability=TRUE, bins=bins,
                                           n.bins=n.bins, n=n, postlist=postlist)
    return(release)
}


