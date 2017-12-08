
###############################################################################################################################
#' Differentially Private Matching and estimation of confidence intervals in one step
#' ##########################################################################################################################
#' This function performs matching and computes the difference of means confidence intervals in a differentially private manner
#' First it obtains a differentially private estimate of the number of matched units.
#' If this number is positive, it computes a differentially private difference of means confidence interval with a point estimate.
#' Note that it is dificult to specify an data independent accuracy measure for the combination of 
#' differentially private matching and difference of means confidence interval. This is because the estimate of the confidence
#' interval depends on the noist estimate of the number of matched units.
#' ####################################################################################################################
#' 
#' Input:
##' data -       A dataframe containing the dataset that is to be matched. 
#'  treatment -  A character vector indicating the name of the treatment variable. The treatment variable must be binary and present in the dataframe
#'  scaleList  - A named list where each named entry of the list specifies the scale of the continuous variables that are to be matched on. The names in the list MUST match exactly with the 
#' names of the continuous variables in the dataframe. Currently no checks are performed to check if the variable is continous or not.
#' groupList   - A named list of lists indicating the groupings for categorical variables to be matched on. The names in the list should match the name of the 
#' categorical variables on which the grouping is to be performed. The value of the list specifies the grouping.
#' exactMatch  - A list of names on which exact matches are to be performed.
#' matchType - A string from the set "onetoone", "onetok", "variable" that indicates the type of matching to be done.
#' 1. "onetoone" - ratio of treated to control is 1:1, extra units are dropped randomly
#' 2. "onetok" - ratio of treated to control is 1:k, extra units are dropped randomly
#' 3.  "variable", ratio of treated to control is variable, extra units are dropped randomly. 
#' k  - A positive integer indicating the structure of matched strata. 
#' If matchType = "onetoone", the value of k is set to 1. 
#' If matchtype = "onetok", k is the number of matched control units for every treated unit in each strata.
#' If matchtype = "variable", k is the upper bound on the number of matched control units for every treated unit in each strata. 
#'  epsilon = this is divided equally to estimate the number of matched units and the confidence interval
#'  alpha = the confidence coeffcient, e.g. 0.05
#' Returns
#' The estimate of ATT along with the confidence interval
#' 
dpATT = function(data, outcome, treatment, scaleList, groupList, exactMatch, matchType, k, epsilon,alpha){
  if(matchType=="onetoone") (k=1);
  
  if(is.null(data[[outcome]])){
    stop("There is no outcome variable in the dataset")
  }
  
  if(nlevels(factor(data[[outcome]]))>2){
      stop("The outcome variable is not binary. The confidence interval can be estimated 
                                       only for discrete outcomes")
  }
  if(matchType=="variable"){
    warning("You have used matchtype variable, 
             but the current implementation of the private difference of means confidence interval 
            ignores the variable matched sets")}
  
  
  eps0 = epsilon/2;
  eps1 = epsilon/2;
  #Perform CEM without privacy
  ans = countTreatedUnitsAfterMatch(treatment=treatment,data=data,
                                    exactMatch=exactMatch,scaleList=scaleList,groupList=groupList,
                                    k=k,
                                    matchType=matchType,shift=1);
  sensitivity = k;
  
  #Compute the number of noisy treated units
  noisy.mt = ans$mt + rlaplace(1,0,k/eps0)
  
  
  if(noisy.mt <=0 ){stop("Cannot perform difference of means, as the number of noisy matched units is not positive")}
  if(noisy.mt > 0){
    keepRowIds = ans$mat[ans$mat$keep==1,]
    matchedSets = data[keepRowIds$rowID,]
    
    #We can create a new dataset with just the matched units to be passed to the difference of means of function
    matchedData = data.frame(matchedSets[[treatment]],matchedSets[[outcome]]);
    colnames(matchedData) = c(treatment,outcome)
    ans = attAfterMatch(matchedData,outcome,noisy.mt,k,eps1,alpha,matchType=matchType,treatment=treatment)
  }

  return(ans)
}

#################################################################################
#Function to perform differentially private cem and estimate the number of matched units

#'  data -       A dataframe containing the dataset that is to be matched. 
#'  treatment -  A character vector indicating the name of the treatment variable. The treatment variable must be binary and present in the dataframe
#'  scaleList  - A named list where each named entry of the list specifies the scale of the continuous variables that are to be matched on. The names in the list MUST match exactly with the 
#' names of the continuous variables in the dataframe. Currently no checks are performed to check if the variable is continous or not.
#' groupList   - A named list of lists indicating the groupings for categorical variables to be matched on. The names in the list should match the name of the 
#' categorical variables on which the grouping is to be performed. The value of the list specifies the grouping.
#' exactMatch  - A list of names on which exact matches are to be performed.
#' matchType - A string from the set "onetoone", "onetok", "variable" that indicates the type of matching to be done.
#' 1. "onetoone" - ratio of treated to control is 1:1, extra units are dropped randomly
#' 2. "onetok" - ratio of treated to control is 1:k, extra units are dropped randomly
#' 3.  "variable", ratio of treated to control is variable, extra units are dropped randomly. 
#' k  - A positive integer indicating the structure of matched strata. 
#' If matchType = "onetoone", the value of k is set to 1. 
#' If matchtype = "onetok", k is the number of matched control units for every treated unit in each strata.
#' If matchtype = "variable", k is the upper bound on the number of matched control units for every treated unit in each strata. 
#'  epsilon - privacy parameter
#' Returns
#' A named list with the number of matched treated and control units, matched dataset
dpCEM = function(data , treatment,
                 exactMatch,scaleList,groupList,
                 k,matchType,epsilon){
  if(matchType=="onetoone") (k=1);
  ans = countTreatedUnitsAfterMatch(treatment=treatment,data=x,
                                    exactMatch=exactMatch,scaleList=scaleList,groupList=groupList,
                                    k=k,
                                    matchType=matchType,shift=1);
  sensitivity = k;
  
  #Output the number of noisy treated units
  noisy.mt = ans$mt + rlaplace(1,0,k/epsilon)
  return(noisy.mt)
}

########################################################################################
#' Confidence intervals after matching
#########################################################################################
#' Warning: This function can be used only after calling the dpCEM function for matching
#Input:
#' matchedData = A dataframe containing at least two named columns
#' A treatment column and a outcome column named y
#' These columns are automatcially generated by the matching algorithm.
#' eps - the epsilon allocated to the confidence intervals
#' alpha - The Confidence coeffcient, a number between 0 and 1. Usually set to 0.05 to obtain
#' a 95 % confidence interval
#' 
#' Output: A named list with a differentially private estimate of the difference of means
#' and a confidence interval
#' Note that the confidence interval takes into account both the randomness due to the data and the privacy noise
#' Currently it does not take the noise in the number of treated units into account.
#########################################################################

attAfterMatch = function(matchedData,outcome,noisy.mt,k,eps1,alpha,matchType,treatment){
  if(matchType=="onetoone") (k=1);
  nt = sum(matchedData[[treatment]]==1);
  nc = sum(matchedData[[treatment]]==0);
  if(nt !=nc && k==1){
    stop("Number of treated units not equal to number of control")
  }
  noisy.mc = k*noisy.mt;
  #compute the sums
  y1Sum = sum(matchedData[[outcome]][matchedData[[treatment]]==1])
  y0Sum = sum(matchedData[[outcome]][matchedData[[treatment]]==0])
  
  #add noise to the sums and divide by noisy estimate of the counts to get the means
  p1Eps = (y1Sum + rlaplace(1,0, 1/eps1))/noisy.mt;
  p0Eps = (y0Sum + rlaplace(1,0, k/eps1))/noisy.mc;
  
  diffMeanEps = p1Eps - p0Eps;
  
  #Use a normal approximation to get the variance!
  var = (p1Eps*(1-p1Eps))/noisy.mt + (p0Eps*(1-p0Eps))/noisy.mc + 2*(1/(eps1*noisy.mt))^2 + 2*(1/(eps1*noisy.mc))^2  
  if(var < 0){ var = (1/4)*(1/noisy.mt + 1/noisy.mc) + 2*(1/(eps1*noisy.mt))^2 + 2*(1/(eps1*noisy.mc))^2 };
  
  ciL = diffMeanEps - qnorm(1-alpha/2)*sqrt(var);
  ciU = diffMeanEps + qnorm(1-alpha/2)*sqrt(var);
  
  return(list(att = diffMeanEps, ci = c(ciL,ciU)))
}
