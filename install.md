## installation

Make sure you have Node.js installed.

```
git clone https://github.com/vjdorazio/TwoRavens.git
cd TwoRavens
npm install
npm start
```

With the last command, Webpack will run in the background, detect any changes you make to the src/ directory, and combine all files into build/app.js. Webpack starts its search at src/index.js, so any files imported there are included.

### R install

Download and install R at https://www.r-project.org. Execute the following with R to install R packages:

```
install.packages(c("VGAM", "AER", "dplyr", "quantreg", "geepack", "maxLik", "Amelia", "Rook","jsonlite","rjson", "devtools", "DescTools", "Zelig"))
```

Note: this requires libssl-dev on Ubuntu 17.04.

Then set your working directory to ~TwoRavens/rook, for example:

```
setwd("/Users/vjdorazio/Desktop/github/TwoRavens/rook")
```

Then source rooksource.R to get the app up:

```
source("rooksource.R")
```

Note that this may install many packages, depending on what already exists. If it asks, just say that you want to install things from the source. The local server with the apps should be up and R should say something like:

*Server started on host...*

You should be up and running. Play around with TwoRavens and make sure that you can do things like estimate a model, subset the data, create transformations, etc.

## style guide

We are using Mithril.js as the frontend framework, which is very similar to React. Going forward, individual items should become components. For examples of this, see the views/ directory. jQuery remains due to legacy reasons, but it should be avoided and d3 should only be used when necessary (graphs and charts). Occasionally, you will need to manually call m.redraw() at the end of jQuery or d3 event methods to keep the different libraries in sync. Examples of this are in src/app.js.

We are following the [Airbnb Javascript Style Guide](https://github.com/airbnb/javascript). 

Please familiarize yourself with it, and use modern Javascript. For example you should always use let instead of the var keyword and prefer const over let (where possible) .Techniques such as map/filter/reduce should be preferred over imperative for (...) constructs. See that guide and this codebase for examples. As part of the bundling process, Webpack uses the Babel library to compile the latest versions of Javascript to older versions compatible with browsers. 
