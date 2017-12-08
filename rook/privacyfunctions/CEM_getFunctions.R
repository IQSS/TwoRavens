# get accuracy and get parameters functions for CEM. Only refers to error on number of treated units

#' CEM accuracy
#' 
#' Function to find the accuracy guarantee of a cem release at a given epsilon 
#' value. 
#'    

cem.getAccuracy <- function(epsilon, alpha=0.05, strata) {
    accuracy <- log(1 / alpha)*strata/epsilon
    return(accuracy)
}


cem.getParameters <- function(accuracy, alpha=0.05, strata) {
    epsilon <- log(1 / alpha)*strata/accuracy
    return(epsilon)
}
