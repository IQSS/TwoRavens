
 if (!require("jsonlite")){
        install.packages("jsonlite", repos="http://lib.stat.cmu.edu/R/CRAN/")
    }
    
 readjson <- function(){
	 JSON_file <- paste('{"rfunctions":[{"statistic": "Mean", "stat_info": "Release the arithmetic mean of the chosen variable", "statistic_type": [{"stype": "Numerical", "parameter": ["Lower Bound", "Upper Bound"]}, {"stype": "Boolean", "parameter": []}]},',
	    '{"statistic": "Histogram", "stat_info": "Release counts of the categories represented in the chosen variable", "statistic_type": [{"stype": "Numerical", "parameter": ["Lower Bound", "Upper Bound", "Number of Bins"]}, {"stype": "Categorical", "parameter": ["Bin Names"]}]},',
	     '{"statistic": "OLS Regression", "stat_info": "Release an ordinary least squares regression on the group of variables", "statistic_type": [{"stype": "Multivar", "parameter": ["Regression"]}], "type_params_dict": {"General":["Outcome Variable"],"Numerical":["Lower Bound", "Upper Bound"],"Categorical":["Number of Bins"],"Boolean":[]},"requirements":["outcome_non_categorical"]},',
	     '{"statistic": "Logistic Regression", "stat_info": "Release a logistic regression on the group of variables", "statistic_type": [{"stype": "Multivar", "parameter": ["Regression"]}], "type_params_dict": {"General":["Outcome Variable"],"Numerical":["Lower Bound", "Upper Bound"],"Categorical":["Number of Bins"],"Boolean":[]},"requirements":["outcome_boolean"]},',
	     '{"statistic": "Quantile", "stat_info": "Release a cumulative distribution function at the given level of granularity (can extract median, percentiles, quartiles, etc from this).", "statistic_type": [{"stype": "Numerical", "parameter": ["Lower Bound", "Upper Bound", "Granularity"]}]} ],' ,
	    '"type_label": [ {"stype": "Numerical", "type_info": "Data should be treated as numbers"}, {"stype": "Boolean", "type_info": "Data contains two possible categories"}, {"stype": "Categorical", "type_info": "Datapoints should be treated as categories/bins"} ],' ,
	    '"parameter_info": [ {"parameter": "Lower Bound", "entry_type": "number", "pinfo": "Minimum value that the chosen variable can take on", "input_type": "text"}, {"parameter": "Upper Bound", "entry_type": "number", "pinfo": "Maximum value that the chosen variable can take on", "input_type": "text"}, {"parameter": "Number of Bins", "entry_type": "pos_integer", "pinfo": "Number of distinct categories the variable can take on", "input_type": "text"}, {"parameter": "Granularity", "entry_type": "pos_integer", "pinfo": "The minimum positive distance between two different records in the data", "input_type": "text"}, {"parameter": "Treatment Variable", "entry_type": "none", "pinfo": "Other axis variable", "input_type": "multiple_choice_with_other_variables"}, {"parameter": "Bin Names", "entry_type": "none", "pinfo": "Give the names of all the bins", "input_type": "text"}, {"parameter": "Outcome Variable", "entry_type": "none", "pinfo": "Outcome variable in the model", "input_type": "multiple_choice_from_group_with_reqs"} ] }')
	
	
	json <- jsonlite::fromJSON(JSON_file)
	statlist <- json$rfunctions$statistic
	return(statlist)
}

statlist <- readjson()
# eventually construct these globals from a JSON file
#add logistic regression/CEM, others?
#should it be dp.tree?? 
stat_to_func_dict <- list("Mean"="dpMean", "Histogram"="dpHistogram", "Quantile"="dpTree", "OLS Regression"="dp.ols") 
stat_to_mech_dict <- list("Mean"="mechanismLaplace", "Histogram"="mechanismLaplace", "Quantile"="mechanismLaplace", "OLS Regression"="mechanismObjective") 
# lower and upper are not in library. Need to combine them into rng.
# how to call regression?
metadata_to_argument_dict <- list("Lower_Bound"="lower", "Upper_Bound"="upper" ,"Number_of_Bins"="n.bins", "Granularity"="gran",   "Bin_Names"="bins")
type_conversion_dict <- list("Numerical"="numeric", "Categorical"="character", "Boolean"="logical")
metadata_to_type_dict <- list("Lower_Bound"="numeric", "Upper_Bound"="numeric" ,"Number_of_Bins"="numeric", "Granularity"="numeric",   "Bin_Names"="character")



































