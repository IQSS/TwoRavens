##
##  rookzselector.r
##
##  11/11/14
##


selector.app <- function(env){
    
    production<-FALSE     ## Toggle:  TRUE - Production, FALSE - Local Development
    
    
    if(production){
        sink(file = stderr(), type = "output")
    }
    
    request <- Request$new(env)
    response <- Response$new(headers = list( "Access-Control-Allow-Origin"="*"))

    everything <- jsonlite:::fromJSON(request$params()$solaJSON)
    print(everything)

    warning<-FALSE  # Probably should replace cumbersome "warning" flag with terminate function, or while/break

	if(!warning){
		mydv <- everything$zdv
        if(length(mydv) == 0){
			warning <- TRUE
			result<-list(warning="No dependent variable selected.")
		}
        if(length(mydv) > 1){
			warning <- TRUE
			result<-list(warning="Too many dependent variable selected.")
		}
	}

	if(!warning){
		mymodel <- everything$zmodel
		if(identical(mymodel,"")){
			warning <- TRUE
			result<-list(warning="No model selected.")
		}
	}
    
    if(!warning){
		if(mymodel != "logit"){
			warning <- TRUE
			result<-list(warning="Selector only works for logit models until Zelig 5 is ready.")
		}
	}
    
	if(!warning){
		mymodelcount <- everything$zmodelcount
		if(identical(mymodelcount,"")){
			warning <- TRUE
			result<-list(warning="No model count.")
		}
	}
    
    if(!warning){
        allvars <- everything$allVars
        if(is.null(allvars)) {
            warning <- TRUE
            result <- list(warning="Problem with allVars.")
        }
    }
    
    if(!warning){
        myplot <- everything$zplot
        if(is.null(myplot)){
            warning <- TRUE
            result <- list(warning="Problem with zplot.")
        }
    }
    
    if(!warning){
		mysetx <- everything$zsetx
        myvars <- everything$zvars
        setxCall <- buildSetx(mysetx, myvars)
	}

	if(!warning){
        myedges<-everything$zedges
        print(myedges)
        ## Format seems to have changed:
        #		myedges<-edgeReformat(everything$zedges)
		#if(is.null(myedges)){
		#	warning <- TRUE
		#	result<-list(warning="Problem creating edges.")
		#}
	}

	if(!warning){
        if(production){
            mydata <- getData(dataurl=everything$zdataurl)
        }else{
            # This is the Strezhnev Voeten data:
            #   		mydata <- read.delim("../data/session_affinity_scores_un_67_02132013-cow.tab")
            # This is the Fearon Laitin data:
            mydata <- read.delim("../data/fearonLaitin.tsv")
            #mydata <- read.delim("../data/QualOfGovt.tsv")
        }
		if(is.null(mydata)){
			warning <- TRUE
			result<-list(warning="Dataset not loadable from Dataverse")
		}
	}

    if(!warning){
        mysubset <- parseSubset(everything$zsubset)
        if(is.null(mysubset)){
            warning <- TRUE
            result <- list(warning="Problem with subset.")
        }
    }
    
    if(!warning){
        history <- everything$callHistory
        if(is.null(history)){
            warning<-TRUE
            result<-list(warning="callHistory is null.")
        }
    }

	if(!warning){
        mynoms <- everything$znom
		myformula <- buildFormula(dv=mydv, linkagelist=myedges, varnames=NULL, nomvars=mynoms) #names(mydata))
		if(is.null(myformula)){
			warning <- TRUE
			result<-list(warning="Problem constructing formula expression.")
		}
	}
    
    if(!warning){
        formulavars <- all.vars(myformula)
        for(i in 1:length(formulavars)) {
            evalstr <- paste("fact <- is.factor(mydata$", formulavars[i], ")", sep="")
            eval(parse(text=evalstr))
            
            if(fact) {
                warning <- TRUE
                result <- list(warning="Selector does not work with factors.")
            }
        }
    }

    if(warning){
        print(warning)
        print(result)
    }

	if(!warning){
		print(myformula)
        print(setxCall)
      
        tryCatch({
          
          ## 1. prepare mydata so that it is identical to the representation of the data in TwoRavens
          mydata <- executeHistory(data=mydata, history=history)
          
          ## 2. additional subset of the data in the event that a user wants to estimate a model on the subset, but hasn't "selected" on the subset. that is, just brushed the region, does not press "Select", and presses "Estimate"
          usedata <- subsetData(data=mydata, sub=mysubset, varnames=myvars, plot=myplot)
          usedata <- refactor(usedata) # when data is subset, factors levels do not update, and this causes an error in zelig's setx(). refactor() is a quick fix
          
          usedata$train <- rbinom(nrow(usedata), 1, .8)
          usevars<-c(all.vars(myformula), "train")
          basedata <- usedata[,usevars]
          basedata <- na.omit(basedata)
          
          traindata <- basedata[which(basedata$train==1),]
          testdata <- basedata[which(basedata$train==0),]
          
          fit <- glm(war~polity2, data=traindata, family="binomial")
          predfit <- predict.glm(fit, newdata=testdata, type="response")
          rmse <- sum((testdata$war - predfit)^2)
          
          addvars <- NULL

          for(i in 1:length(allvars)) {
                if(allvars[i] %in% all.vars(myformula)) {next}
                
                evalstr <- paste("if(is.factor(usedata$", allvars[i], ")) {next}", sep="")
                eval(parse(text=evalstr))
                
                evalstr <- paste("tempform <- update(myformula, ~.+", allvars[i], ")", sep="")
                eval(parse(text=evalstr))
                
                usevars<-c(all.vars(tempform), "train")
                basedata <- usedata[,usevars]
                basedata <- na.omit(basedata)
                
                traindata <- basedata[which(basedata$train==1),]
                testdata <- basedata[which(basedata$train==0),]
                
                fit <- glm(tempform, data=traindata, family="binomial")
                predfit <- predict.glm(fit, newdata=testdata, type="response")
                
                y <- eval(parse(text=paste("testdata$", mydv, sep="")))
                evalstr <- paste("newrmse <- sum((", y, " - predfit)^2)", sep="")
                eval(parse(text=evalstr))
                
                if(newrmse < rmse) {
                    addvars <- c(addvars, allvars[i])
                } else {
                    cat(allvars[i], " does not contribute ")
                }
          }
            if(is.null(addvars)) {
                result = "No additional variables suggested"
            } else {
                result <- addvars
            }
        },
        error=function(err){
            warning <<- TRUE ## assign up the scope
            result <- list(warning=paste("Zelig error: ", err))
            assign("result", result, envir=globalenv())
        })
	}


#usedata <- read.delim("../data/fearonLaitin.tsv")
#usedata$train <- rbinom(nrow(usedata), 1, .8)

#usedata <- usedata[,c("war", "polity2", "train")]
#usedata <- na.omit(usedata)

#traindata <- usedata[which(usedata$train==1),]
#testdata <- usedata[which(usedata$train==0),]

#fit <- glm(war~polity2, data=traindata, family="binomial")
#predfit <- predict.glm(fit, newdata=testdata, type="response")
#rmse <- sum((testdata$war - predfit)^2)


    ## package up variable lists to be sent back
    result<- jsonlite:::toJSON(result)   # rjson does not format json correctly for a list of lists
   
    print(result)
    if(production){
        sink()
    }
    response$write(result)
    response$finish()
    
}

