#############################################################################
#This file contains the basic functions to perform CEM matching WIHTOUT Privacy
#These functions are not meant for direct use by the end user
#Some of these functions were taken from the CEM library in R and modified
##############################################################################


###############################################################################
#' Function to perform coarsened exact matching on a dataset given a user input choice of coarsenings.
#This is the main function that performs the matching.

#Input parameters:
#'
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
#'  shift -   A number between 0 and 1 that indicates the amount of shifting to be done for the binning.
#'  The bins will be shifted by scale*shift.
#'  This option is not indented to be used by the end user, but has application in the non-interactive sparse vector technique
#'  to try out various shifts in the bins to maximize the number of matched units.
#' Returns
#' A named list with the number of matched treated and control units, matched dataset

#Notes: 
#Added a new option called matchType
#matchType can take three values: (case sensitive) 
#1. "onetoone" - ratio of treated to control is 1:1, extras are dropped
#2. "onetok" - ratio of treated to control is 1:k
#3.  "variable", ratio of treated to control is variable, 
#but number of treated units is upper bounded by k times the number of controls.
#shift = a number between 0 and 1. This will shift all the bins by the fraction shift*scale
##############################################################################################################################
countTreatedUnitsAfterMatch = function(treatment=NULL,data=NULL,exactMatch=NULL, scaleList=NULL,groupList=NULL,k,
                                       matchType="variable",shift=1){
  ##################Error checking!!!############################################
  if (is.null(data)) 
    stop("Dataframe must be specified", call. = FALSE)
  if (!is.data.frame(data)) {
    stop("Data must be a dataframe", call. = FALSE)
  }
  
  if(shift < 0 || shift > 1){shift = 1}
  
  #check if the variable names supplied match the names in the dataset
  varNames = c(names(scaleList),names(groupList),exactMatch,treatment);
  dataCols = colnames(data);
  if(!all(varNames %in% dataCols))
  {
    s1 = "Some variable names in the list and the dataset dont match"
    s2 = c("Variables in dataset are:")
    s3 = dataCols;
    s4 = c("Supplied Names are:");
    s5 = varNames;
    stop( c(s1,'\n',s2,'\n',paste0(s3,sep=" "),'\n',s4,'\n',paste0(s5,sep=" ")));
  }
  
  #############################################################################
  ##############################Actual Algorithm starts here##################
  
  #First generate cutpoints for each feature from the scales provided by the user
  cutpoints = generateCutpoints(scaleList,data,shift=shift)
  
  #subset the data to include only those variables that need to be matches
  features = data[varNames]
  
  #group the categorical variables into the user supplied groups and return a newdataset
  groupedFeatures = groupVariables(data=features,grouping = groupList);
  
  #find the matched set
  mat = findMatchedSet(treatment=treatment,data=groupedFeatures,cutpoints = cutpoints,k=k,matchType=matchType)
  
  mt = sum(mat$treatment==1 & mat$keep==1)
  mc = sum(mat$treatment==0 & mat$keep==1)
  
  return(list(mat = mat,mt=mt,mc=mc))
}

##############################################################################################
#' All the functions from here on are helper functions

#This function takes as input a strata and outputs a new dataframe with an extra indicator called "keep"
#The strata is a dataframe with columns strataid, treatment and rowID
#Output is a dataframe with columns strataid, treatment, rowID, keep
#Keeps at most k*nc.s treated units, nc.s controls. 
#Example Input x = data.frame(startaID = rep(10,6),treatment = c(1,0,1,0,1,1),rowID = seq(1,6))

#Added a new option called matchType
#matchType can take three values: (case sensitive) 
#1. "onetoone" - ratio of treated to control is 1:1, extras are dropped
#2. "onetok" - ratio of treated to control is 1:k
#3.  "variable", ratio of treated to control is variable, 
#but number of treated units is upper bounded by k times the number of controls.
trimMatchesStrata = function(x,k,matchType="onetoone"){
  strataSize = nrow(x);
  if(!(matchType %in% c("onetoone","onetok","variable"))){
    stop("Unknown Match type. Use either onetoone, onetok, or variable")
  }
  
  #x is the list of rows with the strata
  #count the number of treated and control in each strata
  nt.s = sum(x$treatment==1);
  nc.s = sum(x$treatment==0);
  
  if(matchType=="onetoone"){
    x$keep = rep(0,strataSize);
    
    if(nt.s > 0 & nc.s > 0){
      if(nt.s >= nc.s){
        #strata has more treated units than control. 
        #So drop extra treated units and keep all controls
        mc.s = nc.s;
        mt.s = mc.s;
        x$keep[x$treatment == 0] = 1;
        keepUnitsIndex = sample(nt.s,mt.s,replace=FALSE)
        x$keep[x$treatment == 1][keepUnitsIndex] = 1;
      }else if(nt.s < nc.s){
        #strata has more control units. so drop control units
        mt.s = nt.s;
        mc.s = mt.s;
        #keep all treatment units
        x$keep[x$treatment == 1] = 1;
        #drop extra controls
        keepUnitsIndex = sample(nc.s,mc.s,replace=FALSE)
        x$keep[x$treatment == 0][keepUnitsIndex] = 1;
        
      }
    }
  }
  
  
  if(matchType=='onetok'){
    #For every treated unit, allow k control units
    
    f = nt.s/nc.s;
    
    x$keep = rep(0,strataSize);
    #need to make sure there are at least k control units 
    #in the strata so that there can be at least one treated that they get matched to.
    #otherwise the strata is to be dropped
    if(nt.s > 0 & nc.s >= k){
      if(nc.s >= nt.s*k){
        #strata has extra control units than treated
        #So drop nc.s - nt.s*k controls
        #keep all treated units
        mc.s = k*nt.s;
        mt.s = nt.s;
        x$keep[x$treatment == 1] = 1;
        keepUnitsIndex = sample(nc.s,mc.s,replace=FALSE)
        x$keep[x$treatment == 0][keepUnitsIndex] = 1;
      }else if(nc.s < nt.s*k){
        #strata has more treated units. so drop treated units
        mt.s = floor(nc.s/k);
        mc.s = k*mt.s;
        #drop extra control units
        keepCUnitsIndex = sample(nc.s,mc.s,replace=FALSE)
        x$keep[x$treatment == 0][keepCUnitsIndex] = 1;
        #drop extra treated units
        keepTUnitsIndex = sample(nt.s,mt.s,replace=FALSE)
        x$keep[x$treatment == 1][keepTUnitsIndex] = 1;
        
      }
    }
  }
  
  if(matchType=="variable"){
    #mt.s is the number of treated units to be retained
    #if any of nt.s or nc.s is 0, mt.s is 0
    #keep all the controls
    #keep only upto k*nc.s treated units
    mt.s = min(nt.s,k*nc.s);
    mc.s = nc.s;
    
    x$keep = rep(0,strataSize);
    #now randomly delete the extra treated units
    if(mt.s > 0 & mc.s > 0){
      #if the strata contains both treated and control units
      #keep all the controls
      x$keep[x$treatment==0] = 1;
      
      #keep randomly chosen mt.s treatment units
      #listTreatedUnits = as.list(x$rowID[x$treatment==1]);
      #keepUnits = sample(listTreatedUnits,mt.s,replace = FALSE);
      
      #
      keepUnitsIndex = sample(nt.s,mt.s,replace=FALSE)
      x$keep[x$treatment==1][keepUnitsIndex] = 1;
    }
    #if any of mt.s or mc.s is 0, all units are dropped.
    
  }
  return(x)
  
}


#Given a list of scales, generate a list of cutpoints from the data
#scaleList is a named list.
#each named entry gives the scale of the feature
#the names in the list MUST match exactly the names of the features in the dataset
#output is a named list of cutpoints
generateCutpoints=function(scaleList,data,shift=1){
  nvars = length(scaleList);
  #empty list to store the cutpoints
  result = vector('list', nvars);
  names(result) = names(scaleList);
  
  varNames = names(scaleList);
  dataCols = colnames(data);
  if(!all(varNames %in% dataCols))
  {
    print(varNames(!(varNames %in% dataCols)));
    stop("These Variable Names are not in dataframe");
  }
  for(var in varNames){
    
    x = data[[var]];
    n = length(x);
    r = range(x);
    
    
    binWidth = scaleList[[var]];
    start = r[1] - shift*binWidth;
    end = r[2] + shift*binWidth;
    result[[var]] =  seq(start,end,by=binWidth)
    #result[[var]] = seq(0,max(x)+binWidth,by=binWidth)
    #if(var=="age") result[[var]] = seq(15,55,length=14);
    #start = median(x);
    #k2 = ceiling((r[2]- start)/binWidth)+2; #add two bins on both sides for safety
    #k1 = floor((r[1]- start)/binWidth)-2; 
    #result[[var]] = seq(start+k1*binWidth,start+k2*binWidth,by=binWidth)
  }
  return(result)
}

#'
#This function performs the matching on a processed dataset
#it simply converts all the variables in the data matrix to a string and does string matching
cem.match <- function (data, verbose = 0) 
{
  vnames <- colnames(data)
  n <- dim(data)[1]
  nv <- dim(data)[2]
  if (verbose > 1) {
    cat("\nmatching on variables:")
    cat(paste(vnames))
    cat("\n")
  }
  xx <- apply(data, 1, function(x) paste(x, collapse = "\r"))
  tab <- table(xx)
  st <- names(tab)
  strata <- match(xx,st)
  n.strata <- length(st)
  return(invisible(list(call = match.call(), strata = strata, 
                        n.strata = n.strata, vars = vnames)))   
}

#This function groups the vector x by the groups given in the list named "groups" 
group.var <- function(x, groups){ 
  n <- length(x)
  #	print(str(x))
  tmp <- numeric(n)
  ngr <- length(groups)
  all.idx <- NULL
  #	cat(sprintf("n=%d, ngr=%d\n", n, ngr))
  for(i in 1:ngr){
    idx <- which(x %in% groups[[i]])
    if(length(idx)>0){
      tmp[idx] <- sprintf("g%.2d",i) 
      all.idx <- c(all.idx, idx)
    }
  } 
  if(length(all.idx)>0 && length(all.idx)<n)
    tmp[-all.idx] <- x[-all.idx]
  tmp <- factor(tmp)
}

#groups the data into variables given in the List 
groupVariables=function(data,grouping){
  if(!is.null(grouping) & !is.null(names(grouping))){
    gn <- names(grouping)
    n.gn <- length(gn)
    for(g in 1:n.gn){
      if(!is.null(data))
        data[[gn[g]]] <- group.var(data[[gn[g]]], grouping[[g]])
    }
  }
  return(data)
}


findMatchedSet<-
  function (treatment=NULL, data, cutpoints = NULL,k,matchType="onetoone"){
    verbose = 0;
    drop = NULL;
    if(!is.null(treatment)){
      groups <- as.factor(data[[treatment]])
      drop <- c(drop,treatment)
    }
    drop <- unique(drop)
    dropped <- match(drop, colnames(data))
    dropped <- dropped[!is.na(dropped)]
    
    if(length(dropped)>0) 
      data <- data[-dropped]
    vnames <- colnames(data)
    if (sum(is.na(data)) > 0) 
      cat("The data contain missing values. CEM will match on them; see the manual for other options.\n")
    
    n <- dim(data)[1]
    nv <- dim(data)[2]
    mycut <- vector(nv, mode="list")
    names(mycut) <- vnames
    # preprocessing
    if(verbose > 1)
      cat("\npre-processing data")
    for (i in 1:nv) {	
      if(verbose>1)
        cat(".")
      tmp <- reduce.var(data[[i]], cutpoints[[vnames[i]]])
      data[[i]] <- tmp$x
      mycut[[vnames[i]]] <- tmp$breaks
    }
    
    obj <- cem.match(data = data, verbose = verbose)
    
    #create the matched Strata
    strata = data.frame(strataID = obj$strata, treatment = groups, rowID = seq(1,n))
    #trim the strata and mark units that are to be dropped
    res = by(strata,strata$strataID,trimMatchesStrata,k=k,matchType=matchType)
    df = do.call(rbind,res)
    return(df)
  }



`reduce.var` <-
  function(x, breaks){
    if(is.numeric(x) | is.integer(x)){
      if(is.null(breaks)){
        breaks <- "sturges"
      }
      if(is.character(breaks)){
        breaks <- match.arg(tolower(breaks), c("sturges", 
                                               "fd", "scott", "ss"))
        breaks <- switch(breaks, sturges = nclass.Sturges(x), 
                         fd = nclass.FD(x), 
                         scott = nclass.scott(x), 
                         ss = nclass.ss(x),
                         stop("unknown 'breaks' algorithm"))
      }
      if(length(breaks) > 0){
        if(length(breaks)==1){
          rg <- range(x, na.rm=TRUE)
          breaks <- seq(rg[1],rg[2], length = breaks)
        }
        breaks <- unique(breaks)
        if(length(breaks)>1)
          x <- cut(x, breaks=breaks, include.lowest = TRUE, labels = FALSE)
        else 	
          x <- as.numeric(x) 
      }
    } else {
      x <- as.numeric(x) 
    }
    return(list(x=x, breaks=breaks)) 
  }

reduce.data <- function(data, breaks=NULL, collapse=FALSE){
  if (!is.data.frame(data))
    stop("Data must be a dataframe", call. = FALSE)
  vnames <- colnames(data)
  nv <- length(vnames)
  new.breaks <- vector(dim(data)[2], mode="list")
  names(new.breaks) <- vnames
  for (i in 1:nv){
    tmp <- reduce.var(data[[i]], breaks[[vnames[i]]] )
    new.breaks[[vnames[i]]] <- tmp$breaks
    data[[i]] <- tmp$x
  }
  if(collapse)
    return(list(data=collapse.data(data), breaks=new.breaks))
  
  return(list(data=data, breaks=new.breaks))
}

collapse.data <- function(data){
  apply(data,1, function(x) paste(x, collapse="\r"))	
}
